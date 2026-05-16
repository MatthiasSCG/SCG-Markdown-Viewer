// Electron Main-Prozess: Fenster (Multi-Window), IPC, File-Watching,
// Datei-Assoziation, Settings.
'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, dialog, ipcMain, shell, nativeTheme, Menu, screen } = require('electron');
const chokidar = require('chokidar');
const { buildMenu, clearDictCache: clearMenuDictCache } = require('./menu');

// Single-Instance-Lock: zweite Instanz reicht ihre Datei an die laufende weiter.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Multi-Window-Registry:
//   windows           : Map<webContents.id, BrowserWindow>
//   pendingInitPanes  : Map<webContents.id, panes-Array>
//     Wird beim Erstellen eines Fensters mit Pane-Inhalt gefuellt und beim
//     'did-finish-load' an den Renderer geschickt. Format identisch zum alten
//     'panes'-Settings-Schluessel: [{ paths, activeIndex, tabSettings }].
//   lastFocusedId     : id des zuletzt fokussierten Fensters (fuer second-instance-Routing)
//   isQuitting        : true ab 'before-quit', damit Window-Close-Handler in
//     dieser Phase NICHT die Persistenz veraendern (sonst wuerde das erste
//     schliessende Fenster die anderen aus der Sitzung loeschen).
const windows = new Map();
const pendingInitPanes = new Map();
let lastFocusedId = null;
let isQuitting = false;

let store = null; // electron-store, asynchron geladen (ESM-only)

// File-Watcher pro Datei mit Refcounting ueber Fenster-IDs.
//   filePath -> { watcher, owners: Set<webContents.id> }
const watchers = new Map();

// --- Settings ----------------------------------------------------------------

async function loadStore() {
  // electron-store v10 ist ESM-only, daher dynamic import.
  const { default: Store } = await import('electron-store');
  store = new Store({
    defaults: {
      restoreSession: true,
      windows: [],       // Multi-Window-Sitzung
      recentFiles: [],
      language: null,    // null = aus Windows-Locale ableiten
      // Legacy-Defaults bleiben fuer Migration verwertbar:
      openTabs: [],
      panes: null,
      windowBounds: null,
      windowMaximized: false,
    },
  });
  migrateLegacySettings();
}

// Migration alter Single-Window-Settings auf die neue Multi-Window-Struktur.
// Wirkt nur, wenn 'windows' noch leer ist und alte Schluessel vorhanden sind.
function migrateLegacySettings() {
  if (!store) return;
  const existing = store.get('windows');
  if (Array.isArray(existing) && existing.length > 0) return;

  const legacyPanes = store.get('panes');
  const legacyOpenTabs = store.get('openTabs');
  const legacyBounds = store.get('windowBounds');
  const legacyMaximized = !!store.get('windowMaximized');

  let panes = null;
  if (Array.isArray(legacyPanes) && legacyPanes.length > 0) {
    panes = legacyPanes;
  } else if (Array.isArray(legacyOpenTabs) && legacyOpenTabs.length > 0) {
    panes = [{ paths: legacyOpenTabs, activeIndex: 0, tabSettings: [] }];
  }

  // Wenn weder Bounds noch Panes vorhanden, gibt es nichts zu migrieren.
  if (!panes && !legacyBounds) return;

  store.set('windows', [{
    bounds: legacyBounds || null,
    maximized: legacyMaximized,
    panes: panes || [],
  }]);
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

// Liefert das aktuell „relevante" Fenster (zuletzt fokussiert, fallback: irgendeins).
function getActiveWindow() {
  if (lastFocusedId && windows.has(lastFocusedId)) return windows.get(lastFocusedId);
  const first = windows.values().next();
  return first.done ? null : first.value;
}

// Broadcast an alle aktiven Fenster.
function broadcast(channel, ...args) {
  for (const win of windows.values()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  }
}

// --- File-Watching mit Refcounting -------------------------------------------

function watchFile(filePath, ownerId) {
  let entry = watchers.get(filePath);
  if (!entry) {
    const watcher = chokidar.watch(filePath, {
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      ignoreInitial: true,
    });
    entry = { watcher, owners: new Set() };
    watchers.set(filePath, entry);

    watcher.on('change', () => {
      for (const id of entry.owners) {
        const win = windows.get(id);
        if (win && !win.isDestroyed()) win.webContents.send('file:changed', filePath);
      }
    });
    watcher.on('unlink', () => {
      for (const id of entry.owners) {
        const win = windows.get(id);
        if (win && !win.isDestroyed()) win.webContents.send('file:removed', filePath);
      }
    });
  }
  entry.owners.add(ownerId);
}

async function unwatchFile(filePath, ownerId) {
  const entry = watchers.get(filePath);
  if (!entry) return;
  entry.owners.delete(ownerId);
  if (entry.owners.size === 0) {
    await entry.watcher.close();
    watchers.delete(filePath);
  }
}

async function unwatchAllForOwner(ownerId) {
  const toClose = [];
  for (const [p, entry] of watchers.entries()) {
    if (entry.owners.has(ownerId)) {
      entry.owners.delete(ownerId);
      if (entry.owners.size === 0) toClose.push(p);
    }
  }
  for (const p of toClose) {
    const entry = watchers.get(p);
    if (entry) {
      await entry.watcher.close();
      watchers.delete(p);
    }
  }
}

async function unwatchAll() {
  for (const entry of watchers.values()) {
    await entry.watcher.close();
  }
  watchers.clear();
}

// --- Fenster -----------------------------------------------------------------

// Prueft, ob Bounds noch auf einem aktiven Display sichtbar sind (mind. 100x100
// Pixel Ueberlappung mit irgendeinem Display).
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

const saveBoundsTimers = new Map(); // ownerId -> Timer

function saveBoundsForWindow(win) {
  if (!win || win.isDestroyed()) return null;
  if (win.isMinimized() || win.isFullScreen()) return null;
  const isMax = win.isMaximized();
  const bounds = isMax ? win.getNormalBounds() : win.getBounds();
  return { bounds, maximized: isMax };
}

function scheduleSaveBoundsAndPersist(win) {
  if (!win || win.isDestroyed()) return;
  const id = win.webContents.id;
  const existing = saveBoundsTimers.get(id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    saveBoundsTimers.delete(id);
    persistAllWindows();
  }, 500);
  saveBoundsTimers.set(id, timer);
}

// Persistiert den aktuellen Stand ALLER Fenster (Bounds und letzte vom Renderer
// gemeldete Pane-Struktur) in store.windows. Wird bei Bounds-Aenderungen, beim
// Wechsel des Maximiert-Status und beim App-Quit aufgerufen.
function persistAllWindows() {
  if (!store) return;
  const list = [];
  for (const win of windows.values()) {
    if (win.isDestroyed()) continue;
    const bm = saveBoundsForWindow(win);
    const panes = lastReportedPanes.get(win.webContents.id) || [];
    list.push({
      bounds: bm ? bm.bounds : null,
      maximized: bm ? bm.maximized : false,
      panes,
    });
  }
  store.set('windows', list);
}

// Der Renderer meldet seine Pane-Struktur per IPC. Wir speichern hier den
// letzten gemeldeten Stand pro Fenster, damit ein Bounds-Save auch immer die
// passenden Tabs persistiert.
const lastReportedPanes = new Map(); // ownerId -> panes-Array

// Der Renderer meldet ausserdem den menue-relevanten Stand (Sprache, View-Modus,
// Zeilennummern, Umbruch). Das Menue dieses Fensters wird daraus pro Aenderung
// neu gebaut und gesetzt, damit Haekchen synchron bleiben.
const menuStates = new Map(); // ownerId -> { locale, viewMode, lineNumbers, wordWrap, togglesEnabled }

function getMenuState(id) {
  const base = menuStates.get(id) || {};
  return {
    locale: base.locale || 'en',
    viewMode: base.viewMode || 'rendered',
    lineNumbers: base.lineNumbers !== undefined ? base.lineNumbers : true,
    wordWrap: !!base.wordWrap,
    togglesEnabled: !!base.togglesEnabled,
    restoreSession: !!(store && store.get('restoreSession')),
  };
}

function applyMenuToWindow(win) {
  if (!win || win.isDestroyed()) return;
  const state = getMenuState(win.webContents.id);
  const menu = buildMenu(win, state);
  win.setMenu(menu);
}

function applyMenuToAllWindows() {
  for (const win of windows.values()) applyMenuToWindow(win);
}

// Erstellt ein neues Fenster. opts:
//   bounds, maximized   - Startposition/-groesse, optional
//   initialPanes        - Pane-Snapshots ([{paths, activeIndex, tabSettings}, ...]),
//                         die der Renderer beim Start uebernimmt. Bei Restore aus
//                         der Sitzung gefuellt; bei "Tab in neues Fenster" mit
//                         genau einer Pane und einem Tab; sonst leer.
function createWindow(opts = {}) {
  const useStored = isBoundsVisibleOnAnyDisplay(opts.bounds);

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
      sandbox: false,
    },
  };
  if (useStored) {
    options.x = opts.bounds.x;
    options.y = opts.bounds.y;
    options.width = Math.max(opts.bounds.width, options.minWidth);
    options.height = Math.max(opts.bounds.height, options.minHeight);
  }

  const win = new BrowserWindow(options);
  const id = win.webContents.id;
  windows.set(id, win);
  lastFocusedId = id;

  if (useStored && opts.maximized) win.maximize();

  applyMenuToWindow(win);

  const initPanes = Array.isArray(opts.initialPanes) ? opts.initialPanes : [];
  pendingInitPanes.set(id, initPanes);
  // Damit der Renderer den ersten 'reportPanes'-Push nicht versehentlich auf
  // einen veralteten Stand setzt, merken wir uns die initiale Pane-Struktur
  // sofort auch als "letzten gemeldeten Stand" dieses Fensters.
  lastReportedPanes.set(id, initPanes);

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.once('ready-to-show', () => win.show());

  // Initialen Zustand IMMER schicken — auch leer. So kann der Renderer
  // deterministisch darauf warten und entscheidet nicht selbst per Timeout,
  // wann er mit dem Rendern starten darf.
  win.webContents.once('did-finish-load', () => {
    const panes = pendingInitPanes.get(id) || [];
    win.webContents.send('window:initialState', { panes });
    pendingInitPanes.delete(id);
  });

  // Fokus tracken (fuer second-instance-Routing).
  win.on('focus', () => { lastFocusedId = id; });

  // Bounds-Aenderungen debounced persistieren.
  win.on('move', () => scheduleSaveBoundsAndPersist(win));
  win.on('resize', () => scheduleSaveBoundsAndPersist(win));
  win.on('maximize', () => persistAllWindows());
  win.on('unmaximize', () => persistAllWindows());

  win.on('close', () => {
    const timer = saveBoundsTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      saveBoundsTimers.delete(id);
    }
  });

  win.on('closed', async () => {
    windows.delete(id);
    lastReportedPanes.delete(id);
    pendingInitPanes.delete(id);
    menuStates.delete(id);
    if (lastFocusedId === id) {
      lastFocusedId = null;
      const first = windows.keys().next();
      if (!first.done) lastFocusedId = first.value;
    }
    await unwatchAllForOwner(id);
    if (!isQuitting) persistAllWindows();
  });

  // Externe Links im Standardbrowser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}

// Theme-Aenderungen an alle Fenster broadcasten.
nativeTheme.on('updated', () => {
  broadcast('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

// --- IPC-Handler -------------------------------------------------------------

function senderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function registerIpc() {
  ipcMain.handle('file:openDialog', async (event) => {
    const owner = senderWindow(event);
    const result = await dialog.showOpenDialog(owner || undefined, {
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

  ipcMain.handle('file:read', async (event, filePath) => {
    const absolute = path.resolve(filePath);
    const content = await fs.readFile(absolute, 'utf8');
    pushRecent(absolute);
    watchFile(absolute, event.sender.id);
    return { path: absolute, content };
  });

  ipcMain.handle('file:resolveLink', async (_event, basePath, target) => {
    if (!target) return null;
    if (/^[a-z]+:\/\//i.test(target)) return null;
    const decoded = decodeURI(target.split('#')[0]);
    if (!decoded) return null;
    return path.resolve(path.dirname(basePath), decoded);
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

  ipcMain.handle('file:unwatch', async (event, p) => {
    await unwatchFile(p, event.sender.id);
  });

  ipcMain.handle('shell:openExternal', async (_event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('settings:get', (_event, key) => store?.get(key));
  ipcMain.handle('settings:set', (_event, key, value) => {
    store?.set(key, value);
    // Menue-relevante Settings spiegeln sich in den Haekchen wider. Bei einem
    // Wechsel in einem Fenster muessen alle Fenster-Menues angepasst werden.
    if (key === 'restoreSession') applyMenuToAllWindows();
  });

  ipcMain.handle('app:locale', () => app.getLocale());
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('theme:current', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

  // Renderer meldet seine aktuelle Pane-Struktur, damit Bounds-Saves auch immer
  // die passenden Tabs persistieren koennen.
  ipcMain.handle('window:reportPanes', (event, panes) => {
    lastReportedPanes.set(event.sender.id, Array.isArray(panes) ? panes : []);
  });

  // Renderer meldet den menue-relevanten Stand (Sprache, View-Modus, Toggles).
  // Wir bauen das Menue dieses Fensters daraufhin neu, damit Haekchen und
  // Disabled-States synchron sind.
  ipcMain.handle('window:reportMenuState', (event, state) => {
    const id = event.sender.id;
    menuStates.set(id, state || {});
    const win = windows.get(id);
    if (win) applyMenuToWindow(win);
  });

  // Renderer fordert ein neues Fenster mit initialen Panes/Tabs an.
  // Format von initialPanes: [{ paths, activeIndex, tabSettings }, ...]
  ipcMain.handle('window:openNew', (event, initialPanes) => {
    const sender = senderWindow(event);
    let bounds = null;
    if (sender && !sender.isDestroyed()) {
      const isMax = sender.isMaximized();
      const senderBounds = isMax ? sender.getNormalBounds() : sender.getBounds();
      bounds = {
        x: (senderBounds.x || 0) + 30,
        y: (senderBounds.y || 0) + 30,
        width: senderBounds.width,
        height: senderBounds.height,
      };
    }
    createWindow({
      bounds,
      maximized: false,
      initialPanes: Array.isArray(initialPanes) ? initialPanes : [],
    });
  });
}

// --- App-Lifecycle -----------------------------------------------------------

app.on('second-instance', (_event, argv) => {
  const files = extractFileArgs(argv);
  const target = getActiveWindow();
  if (target) {
    if (target.isMinimized()) target.restore();
    target.focus();
    if (files.length > 0) {
      target.webContents.send('file:openExternal', files);
    }
  }
});

app.whenReady().then(async () => {
  await loadStore();
  registerIpc();

  // Sitzungs-Wiederherstellung der Fenster.
  const restore = !!store.get('restoreSession');
  const savedWindows = store.get('windows');

  if (Array.isArray(savedWindows) && savedWindows.length > 0) {
    if (restore) {
      for (const entry of savedWindows) {
        createWindow({
          bounds: entry?.bounds || null,
          maximized: !!entry?.maximized,
          initialPanes: Array.isArray(entry?.panes) ? entry.panes : [],
        });
      }
    } else {
      // restoreSession aus: nur EIN Fenster, Bounds des ersten persistierten
      // Fensters uebernehmen (UX-Kontinuitaet), aber ohne Tabs.
      const first = savedWindows[0];
      createWindow({ bounds: first?.bounds || null, maximized: !!first?.maximized });
    }
  } else {
    createWindow();
  }

  // Beim Start uebergebene Dateien (Datei-Assoziation, "Öffnen mit") immer ins
  // zuerst erstellte Fenster reichen (Reihenfolge: erstes window in der Map).
  const initialFiles = extractFileArgs(process.argv);
  if (initialFiles.length > 0) {
    const first = windows.values().next().value;
    if (first) {
      first.webContents.once('did-finish-load', () => {
        first.webContents.send('file:openExternal', initialFiles);
      });
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  // Letzte Persistenz, bevor die Fenster schliessen.
  persistAllWindows();
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
