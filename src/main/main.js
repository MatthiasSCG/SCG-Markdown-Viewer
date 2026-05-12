// Electron Main-Prozess: Fenster, IPC, File-Watching, Datei-Assoziation, Settings.
'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, dialog, ipcMain, shell, nativeTheme, Menu, screen } = require('electron');
const chokidar = require('chokidar');

// Single-Instance-Lock: zweite Instanz reicht ihre Datei an die erste weiter.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let store = null; // electron-store, asynchron geladen (ESM-only)
const watchers = new Map(); // dateipfad -> chokidar.FSWatcher

// --- Settings ----------------------------------------------------------------

async function loadStore() {
  // electron-store v10 ist ESM-only, daher dynamic import.
  const { default: Store } = await import('electron-store');
  store = new Store({
    defaults: {
      restoreSession: true,
      openTabs: [],
      recentFiles: [],
      language: null, // null = aus Windows-Locale ableiten
      viewMode: 'split', // 'source' | 'rendered' | 'split'
      windowBounds: null, // { x, y, width, height } oder null
      windowMaximized: false,
    },
  });
}

// --- Hilfsfunktionen ---------------------------------------------------------

function isMarkdownPath(p) {
  if (!p) return false;
  const ext = path.extname(p).toLowerCase();
  return ext === '.md' || ext === '.markdown' || ext === '.mdown' || ext === '.mkd';
}

// Extrahiert Datei-Argumente aus process.argv (Windows: "Öffnen mit").
function extractFileArgs(argv) {
  return argv
    .slice(1)
    .filter((a) => !a.startsWith('--') && !a.startsWith('-'))
    .map((a) => path.resolve(a))
    .filter(isMarkdownPath);
}

function pushRecent(filePath) {
  if (!store) return;
  const recent = store.get('recentFiles', []);
  const filtered = recent.filter((p) => p !== filePath);
  filtered.unshift(filePath);
  store.set('recentFiles', filtered.slice(0, 15));
}

// --- File-Watching -----------------------------------------------------------

function watchFile(filePath) {
  if (watchers.has(filePath)) return;
  const watcher = chokidar.watch(filePath, {
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    ignoreInitial: true,
  });
  watcher.on('change', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:changed', filePath);
    }
  });
  watcher.on('unlink', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:removed', filePath);
    }
  });
  watchers.set(filePath, watcher);
}

async function unwatchFile(filePath) {
  const watcher = watchers.get(filePath);
  if (watcher) {
    await watcher.close();
    watchers.delete(filePath);
  }
}

async function unwatchAll() {
  for (const watcher of watchers.values()) {
    await watcher.close();
  }
  watchers.clear();
}

// --- Fenster -----------------------------------------------------------------

// Prueft, ob die gespeicherten Bounds noch auf einem aktiven Display sichtbar
// sind — verhindert, dass das Fenster offscreen oeffnet, wenn ein Monitor
// abgesteckt wurde. Mind. 100x100 Pixel muessen mit einem Display ueberlappen.
function isBoundsVisibleOnAnyDisplay(bounds) {
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') return false;
  if (typeof bounds.width !== 'number' || typeof bounds.height !== 'number') return false;
  const displays = screen.getAllDisplays();
  for (const d of displays) {
    const a = d.bounds;
    const x1 = Math.max(bounds.x, a.x);
    const y1 = Math.max(bounds.y, a.y);
    const x2 = Math.min(bounds.x + bounds.width, a.x + a.width);
    const y2 = Math.min(bounds.y + bounds.height, a.y + a.height);
    if (x2 - x1 > 100 && y2 - y1 > 100) return true;
  }
  return false;
}

let saveBoundsTimer = null;

function saveWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // Wenn minimiert oder Vollbild: Bounds sind nicht aussagekraeftig, also ueberspringen.
  if (mainWindow.isMinimized() || mainWindow.isFullScreen()) return;
  const isMax = mainWindow.isMaximized();
  // getNormalBounds liefert die "wiederhergestellten" Bounds, auch wenn das
  // Fenster gerade maximiert ist — damit speichern wir die echten Werte.
  const bounds = isMax ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  store?.set('windowBounds', bounds);
  store?.set('windowMaximized', isMax);
}

function scheduleSaveBounds() {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    saveBoundsTimer = null;
    saveWindowBounds();
  }, 500);
}

function createWindow() {
  const storedBounds = store?.get('windowBounds');
  const storedMaximized = !!store?.get('windowMaximized');
  const useStored = isBoundsVisibleOnAnyDisplay(storedBounds);

  const options = {
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Preload braucht require() für markdown-it
    },
  };
  if (useStored) {
    options.x = storedBounds.x;
    options.y = storedBounds.y;
    options.width = Math.max(storedBounds.width, options.minWidth);
    options.height = Math.max(storedBounds.height, options.minHeight);
  }

  mainWindow = new BrowserWindow(options);

  if (useStored && storedMaximized) mainWindow.maximize();

  // Standard-Menü ausblenden (eigene Aktionen via UI/Shortcuts).
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Fenster-Geometrie persistieren (debounced bei Move/Resize, sofort bei Maximize-Wechsel und Close).
  mainWindow.on('move', scheduleSaveBounds);
  mainWindow.on('resize', scheduleSaveBounds);
  mainWindow.on('maximize', saveWindowBounds);
  mainWindow.on('unmaximize', saveWindowBounds);
  mainWindow.on('close', () => {
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer);
      saveBoundsTimer = null;
    }
    saveWindowBounds();
  });

  mainWindow.on('closed', async () => {
    await unwatchAll();
    mainWindow = null;
  });

  // Externe Links (http/https) im Standardbrowser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // System-Theme-Änderungen an Renderer durchreichen.
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    }
  });
}

// --- IPC-Handler -------------------------------------------------------------

function registerIpc() {
  ipcMain.handle('file:openDialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Markdown-Datei öffnen',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('file:read', async (_event, filePath) => {
    const absolute = path.resolve(filePath);
    const content = await fs.readFile(absolute, 'utf8');
    pushRecent(absolute);
    watchFile(absolute);
    return { path: absolute, content };
  });

  ipcMain.handle('file:resolveLink', async (_event, basePath, target) => {
    // Löst einen Markdown-Link relativ zum Basisdokument auf.
    if (!target) return null;
    if (/^[a-z]+:\/\//i.test(target)) return null; // externe URL
    const decoded = decodeURI(target.split('#')[0]);
    if (!decoded) return null;
    const absolute = path.resolve(path.dirname(basePath), decoded);
    return absolute;
  });

  ipcMain.handle('file:isMarkdown', (_event, p) => isMarkdownPath(p));

  ipcMain.handle('file:exists', async (_event, p) => {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('file:unwatch', async (_event, p) => {
    await unwatchFile(p);
  });

  ipcMain.handle('shell:openExternal', async (_event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('settings:get', (_event, key) => store?.get(key));
  ipcMain.handle('settings:set', (_event, key, value) => {
    store?.set(key, value);
  });

  ipcMain.handle('app:locale', () => app.getLocale()); // z.B. "de-DE"
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('theme:current', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));
}

// --- App-Lifecycle -----------------------------------------------------------

app.on('second-instance', (_event, argv) => {
  // Zweite Instanz weiterleiten: Dateien an erstes Fenster.
  const files = extractFileArgs(argv);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    if (files.length > 0) {
      mainWindow.webContents.send('file:openExternal', files);
    }
  }
});

app.whenReady().then(async () => {
  await loadStore();
  registerIpc();
  createWindow();

  // Beim Start übergebene Dateien (Datei-Assoziation, "Öffnen mit").
  const initialFiles = extractFileArgs(process.argv);
  if (initialFiles.length > 0) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('file:openExternal', initialFiles);
    });
  }
});

app.on('window-all-closed', async () => {
  await unwatchAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
