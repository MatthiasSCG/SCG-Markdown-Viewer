// Electron Main-Prozess: Fenster (Multi-Window), IPC, File-Watching,
// Datei-Assoziation, Settings.
'use strict';

const path = require('node:path');
const fs = require('node:fs/promises');
const { app, BrowserWindow, dialog, ipcMain, shell, nativeTheme, Menu, screen } = require('electron');
const chokidar = require('chokidar');
const { buildMenu, clearDictCache: clearMenuDictCache, tForLocale } = require('./menu');
const backlinks = require('./backlinks');

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

// Pfade, die wir gerade selbst schreiben (Save bzw. Auto-Save). Der Watcher
// soll fuer einen kurzen Moment nach dem Eigen-Schreiben keinen Change-Event
// an den Renderer melden, damit kein selbst ausgeloester Reload-Loop entsteht.
//   filePath -> Timer
const selfWritingPaths = new Map();

function markSelfWriting(filePath, durationMs = 1500) {
  const existing = selfWritingPaths.get(filePath);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => selfWritingPaths.delete(filePath), durationMs);
  selfWritingPaths.set(filePath, timer);
}

function isSelfWriting(filePath) {
  return selfWritingPaths.has(filePath);
}

// Fenster, die der Nutzer im Renderer schon abgenickt hat ("Speichern" /
// "Verwerfen" bei dirtigen Tabs). Verhindert, dass der on('close')-Hook den
// Dialog ein zweites Mal aufruft beim folgenden win.close().
const confirmedClosings = new Set();

// --- Settings ----------------------------------------------------------------

// Settings-Migration beim Rebranding (4T-0011): Bei einem App-Update von
// „Markdown Viewer" auf „SCG Markdown" wechselt der electron-store-Pfad von
// %APPDATA%/Markdown Viewer/config.json zu %APPDATA%/SCG Markdown/config.json.
// Wenn unter dem neuen Pfad noch keine Config existiert, aber unter dem alten,
// kopieren wir sie einmalig, damit Recent Files, Sprache, Sitzungs-Toggle und
// Auto-Save erhalten bleiben. Der alte Pfad bleibt defensiv erhalten.
async function migrateSettingsFromPreviousName() {
  try {
    const newConfig = path.join(app.getPath('userData'), 'config.json');
    try {
      await fs.access(newConfig);
      return; // Neue Config bereits da — nichts zu tun.
    } catch {
      // Keine neue Config — pruefen ob eine alte existiert.
    }
    const oldConfig = path.join(app.getPath('appData'), 'Markdown Viewer', 'config.json');
    try {
      await fs.access(oldConfig);
    } catch {
      return; // Auch keine alte Config — frische Installation.
    }
    await fs.mkdir(path.dirname(newConfig), { recursive: true });
    const data = await fs.readFile(oldConfig, 'utf8');
    await fs.writeFile(newConfig, data, 'utf8');
    console.log(`Settings aus Vorgaengerinstallation migriert: ${oldConfig} -> ${newConfig}`);
  } catch (err) {
    console.warn('Settings-Migration fehlgeschlagen, frische Defaults werden geladen:', err);
  }
}

async function loadStore() {
  await migrateSettingsFromPreviousName();
  // electron-store v10 ist ESM-only, daher dynamic import.
  const { default: Store } = await import('electron-store');
  store = new Store({
    defaults: {
      restoreSession: true,
      windows: [],       // Multi-Window-Sitzung
      recentFiles: [],
      language: null,    // null = aus Windows-Locale ableiten
      // 4T-0030: Theme-Vorzug. 'system' folgt der OS-Einstellung
      // (bisheriges Verhalten), 'light'/'dark' erzwingt das jeweilige Theme.
      themePref: 'system',
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
  store.set('recentFiles', filtered.slice(0, 10));
  applyMenuToAllWindows();
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

// 4T-0015: Backlinks-Modul mit dem Broadcast verdrahten, damit watcher-
// getriebene Aenderungen alle Fenster erreichen.
backlinks.attachBroadcast(broadcast);

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
      // Eigene Schreibvorgaenge nicht als externer Change melden.
      if (isSelfWriting(filePath)) return;
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

// Pro Fenster vom Renderer gemeldete Anzeige-Infos fuer die Fenster-Liste
// und das Titel-Suffix (4T-0012): aktiver Dateiname und Tab-Anzahl. Wird in
// window:list ausgeliefert, damit das Tab-Kontextmenue eines anderen Fensters
// Tooltips ohne Renderer-Round-Trip aufbauen kann.
const windowMeta = new Map(); // ownerId -> { activeTabName, tabCount }

// Verteilt an jedes registrierte Fenster seine aktuelle Display-Nummer
// (1..n in Map-Reihenfolge = Erzeugungsreihenfolge) und die Gesamtzahl. Wird
// nach jedem Open- und Close-Event aufgerufen. Beim Open landet der Aufruf im
// did-finish-load-Handler, damit auch das neu erzeugte Fenster den Push erhaelt.
function broadcastDisplayInfo() {
  const totalCount = windows.size;
  let idx = 0;
  for (const win of windows.values()) {
    idx += 1;
    if (!win.isDestroyed()) {
      win.webContents.send('window:displayInfo', { displayNumber: idx, totalCount });
    }
  }
}

function getMenuState(id) {
  const base = menuStates.get(id) || {};
  return {
    locale: base.locale || 'en',
    viewMode: base.viewMode || 'rendered',
    lineNumbers: base.lineNumbers !== undefined ? base.lineNumbers : true,
    wordWrap: !!base.wordWrap,
    togglesEnabled: !!base.togglesEnabled,
    hasActiveTab: !!base.hasActiveTab,
    restoreSession: !!(store && store.get('restoreSession')),
    autoSave: !!(store && store.get('autoSave')),
    recentFiles: (store && store.get('recentFiles')) || [],
    // 4T-0014: Haekchen-Stand fuer das Outline-Toggle im Ansicht-Menue.
    outlineVisible: !!base.outlineVisible,
    // 4T-0013: Haekchen-Stand fuer das Gliederungs-Toggle im Ansicht-Menue.
    foldGutter: base.foldGutter !== undefined ? base.foldGutter : true,
    // 4T-0015: Haekchen-Stand fuer das Backlinks-Toggle im Ansicht-Menue.
    backlinksVisible: !!base.backlinksVisible,
    // 4T-0019: Fokus-Modus und Typewriter-Scroll. Werte pro Fenster, aus
    // dem Renderer-Report uebernommen; persistierter Stand kommt nur beim
    // ersten Fenster-Start aus dem Store, danach fuehrt der Renderer.
    focusMode: !!base.focusMode,
    typewriterScroll: !!base.typewriterScroll,
    // 4T-0019: Edit-Modus pro aktivem Tab (Bearbeiten-Toggle im Ansicht-Menue).
    editMode: !!base.editMode,
    // 4T-0030: Theme-Vorzug fuer das Radio-Untermenue 'Ansicht -> Theme'.
    themePref: (() => {
      const v = store && store.get('themePref');
      return (v === 'light' || v === 'dark' || v === 'system') ? v : 'system';
    })(),
  };
}

function applyMenuToWindow(win) {
  if (!win || win.isDestroyed()) return;
  const state = getMenuState(win.webContents.id);
  const actions = {
    openRecent: (p) => openRecentFile(p, win),
    clearRecent: () => clearRecentList(win),
    save: () => {
      if (!win.isDestroyed()) win.webContents.send('menu:save');
    },
    saveAs: () => {
      if (!win.isDestroyed()) win.webContents.send('menu:saveAs');
    },
    toggleAutoSave: () => {
      if (!win.isDestroyed()) win.webContents.send('menu:toggleAutoSave');
    },
    newTab: () => {
      if (!win.isDestroyed()) win.webContents.send('menu:new');
    },
  };
  const menu = buildMenu(win, state, actions);
  win.setMenu(menu);
}

function applyMenuToAllWindows() {
  for (const win of windows.values()) applyMenuToWindow(win);
}

// Lokalisierter String mit der Sprache des angegebenen Fensters. Faellt auf
// Englisch zurueck, wenn das Fenster keine Sprache gemeldet hat.
function tForWindow(win, key) {
  const state = win && !win.isDestroyed() ? menuStates.get(win.webContents.id) : null;
  return tForLocale(state?.locale || 'en', key);
}

// Klick auf einen Recent-Eintrag im Datei-Menue. Prueft zunaechst, ob die
// Datei noch existiert; wenn nicht, raus aus der Liste und Fehlerdialog.
// Sonst: Datei als neuer Tab im sourceWindow oeffnen (analog zu "Oeffnen mit"
// im Explorer). Der Renderer aktualisiert die Recent-Liste selbst ueber
// recent:push, wenn er die Datei in openInPane verarbeitet.
async function openRecentFile(filePath, sourceWindow) {
  try {
    await fs.access(filePath);
  } catch {
    const recent = (store && store.get('recentFiles')) || [];
    const filtered = recent.filter((p) => p !== filePath);
    if (store) store.set('recentFiles', filtered);
    applyMenuToAllWindows();
    await dialog.showMessageBox(sourceWindow || undefined, {
      type: 'warning',
      title: tForWindow(sourceWindow, 'recent.missingFileTitle'),
      message: tForWindow(sourceWindow, 'recent.missingFile'),
      detail: filePath,
      buttons: ['OK'],
    });
    return;
  }
  const target = (sourceWindow && !sourceWindow.isDestroyed())
    ? sourceWindow
    : getActiveWindow();
  if (target && !target.isDestroyed()) {
    target.focus();
    target.webContents.send('file:openExternal', [filePath]);
  }
}

// Klick auf "Liste loeschen" im Recent-Submenue. Bestaetigungsdialog mit
// "Loeschen" / "Abbrechen"; bei Loeschen wird die Liste geleert und alle
// Fenster-Menues aktualisiert.
async function clearRecentList(sourceWindow) {
  const t = (key) => tForWindow(sourceWindow, key);
  const result = await dialog.showMessageBox(sourceWindow || undefined, {
    type: 'question',
    title: t('menu.file.recentClear'),
    message: t('menu.file.recentClearConfirm'),
    buttons: [t('menu.file.recentClearBtnYes'), t('menu.file.recentClearBtnNo')],
    defaultId: 0,
    cancelId: 1,
  });
  if (result.response === 0) {
    if (store) store.set('recentFiles', []);
    applyMenuToAllWindows();
  }
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
  // Workaround fuer Electron-Multi-Monitor-DPI-Bug (electron/electron Issues
  // #10862, #16444, #31999): bei Setups mit unterschiedlicher Per-Monitor-DPI
  // werden width/height beim BrowserWindow-Konstruktor sowie beim ersten
  // setBounds-Aufruf um den Skalierungsfaktor verzerrt, weil Electron sie in
  // DIPs des Quell- oder Primaermonitors interpretiert. Loesung: Fenster mit
  // Default-Optionen erzeugen (landet auf Primary), dann setBounds zweimal
  // hintereinander aufrufen. Der erste Aufruf verschiebt das Fenster auf den
  // Zielmonitor und triggert die DPI-Erkennung; der zweite Aufruf setzt die
  // Bounds mit der dann aktiven korrekten Ziel-DPI (4T-0025).
  const win = new BrowserWindow(options);
  const id = win.webContents.id;
  windows.set(id, win);
  lastFocusedId = id;

  if (useStored) {
    const targetBounds = {
      x: opts.bounds.x,
      y: opts.bounds.y,
      width: Math.max(opts.bounds.width, options.minWidth),
      height: Math.max(opts.bounds.height, options.minHeight),
    };
    win.setBounds(targetBounds);
    win.setBounds(targetBounds);
    if (opts.maximized) win.maximize();
  }

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
    // Erst NACH initialState die Display-Infos verteilen, damit das brandneue
    // Fenster bereits den Renderer-State (panes, Titel) aufbauen konnte und
    // direkt im Anschluss seine Nummer kennt. Alle anderen Fenster bekommen
    // die aktualisierte totalCount.
    broadcastDisplayInfo();
  });

  // Fokus tracken (fuer second-instance-Routing).
  win.on('focus', () => { lastFocusedId = id; });

  // Bounds-Aenderungen debounced persistieren.
  win.on('move', () => scheduleSaveBoundsAndPersist(win));
  win.on('resize', () => scheduleSaveBoundsAndPersist(win));
  win.on('maximize', () => persistAllWindows());
  win.on('unmaximize', () => persistAllWindows());

  win.on('close', (e) => {
    // Dirty-Check: wenn der Renderer noch nicht bestaetigt hat, dass das
    // Schliessen OK ist, Frage an ihn weiterreichen. Beim App-Quit greift
    // dieselbe Logik pro Fenster.
    if (!confirmedClosings.has(win)) {
      e.preventDefault();
      if (!win.isDestroyed()) win.webContents.send('window:requestClose');
      return;
    }
    confirmedClosings.delete(win);
    const timer = saveBoundsTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      saveBoundsTimers.delete(id);
    }
    // Stand persistieren, solange dieses Fenster noch in der `windows`-Map
    // steht und nicht destroyed ist. Sonst geht beim Schliessen des letzten
    // Fensters die Position verloren, weil der nachgelagerte 'closed'-Handler
    // nur noch eine leere Map sehen wuerde (4T-0025).
    if (!isQuitting) persistAllWindows();
  });

  win.on('closed', async () => {
    windows.delete(id);
    lastReportedPanes.delete(id);
    pendingInitPanes.delete(id);
    menuStates.delete(id);
    windowMeta.delete(id);
    if (lastFocusedId === id) {
      lastFocusedId = null;
      const first = windows.keys().next();
      if (!first.done) lastFocusedId = first.value;
    }
    await unwatchAllForOwner(id);
    // Nur persistieren, wenn nach dem `windows.delete(id)` noch andere Fenster
    // uebrig sind. Sonst wuerde eine leere Liste die zuletzt gemerkten Bounds
    // des soeben geschlossenen letzten Fensters ueberschreiben (4T-0025; das
    // 'close'-Event hat den Stand inkl. dieses Fensters bereits persistiert).
    if (!isQuitting && windows.size > 0) {
      persistAllWindows();
      // Display-Nummern der verbliebenen Fenster ruecken nach; sinkt die Zahl
      // auf 1, wird der `(Fenster N)`-Suffix beim verbleibenden ausgeblendet.
      broadcastDisplayInfo();
    }
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

// Theme-Aenderungen an alle Fenster broadcasten. Greift sowohl bei System-
// Wechseln (wenn themeSource === 'system') als auch nach einem manuellen
// theme:setPref-Aufruf (Electron feuert 'updated' nach themeSource-Aenderung).
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
    // Kein pushRecent hier — file:read deckt auch passive Pfade ab
    // (Sitzungs-Restore, Auto-Reload). Aktives Oeffnen meldet sich separat
    // ueber recent:push aus dem Renderer.
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
    if (key === 'restoreSession' || key === 'autoSave') applyMenuToAllWindows();
    // 4T-0018: appearance.*-Aenderung an alle Fenster broadcasten, damit
    // Schriftart und -groesse sofort ueberall greifen.
    if (typeof key === 'string' && key.startsWith('appearance.')) {
      const payload = {
        editorFont: store?.get('appearance.editorFont') || undefined,
        editorSize: store?.get('appearance.editorSize') || undefined,
        renderFont: store?.get('appearance.renderFont') || undefined,
        renderSize: store?.get('appearance.renderSize') || undefined,
      };
      for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed()) w.webContents.send('appearance:changed', payload);
      }
    }
  });

  // Renderer meldet ein aktives Datei-Oeffnen, damit der Pfad in die Recent-
  // Liste rutscht. Wird in openInPane aufgerufen, nicht beim Restore/Reload.
  ipcMain.handle('recent:push', (_event, filePath) => {
    if (!filePath) return;
    pushRecent(path.resolve(filePath));
  });

  // Datei speichern (Inhalt nach UTF-8/LF, kein BOM). Markiert den Pfad als
  // Eigen-Schreibvorgang, damit der Watcher nicht meldet.
  ipcMain.handle('file:save', async (_event, filePath, content) => {
    if (!filePath) throw new Error('file:save ohne Pfad aufgerufen');
    const absolute = path.resolve(filePath);
    const normalized = String(content || '').replace(/\r\n/g, '\n');
    markSelfWriting(absolute);
    await fs.writeFile(absolute, normalized, { encoding: 'utf8' });
    return { path: absolute };
  });

  // Speichern unter: OS-Dialog, dann schreiben. Returnt den gewaehlten Pfad
  // oder null, wenn der Nutzer abgebrochen hat.
  ipcMain.handle('file:saveAs', async (event, suggestedPath, content) => {
    const owner = senderWindow(event);
    // Wenn der Tab keinen Pfad hat, lokalisierten "Unbenannt"-Stamm plus .md
    // als Default vorschlagen (z.B. "Unbenannt.md" auf Deutsch).
    const defaultPath = suggestedPath || `${tForWindow(owner, 'save.untitled')}.md`;
    const dlgResult = await dialog.showSaveDialog(owner || undefined, {
      title: tForWindow(owner, 'save.saveAsTitle'),
      defaultPath,
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'Alle Dateien', extensions: ['*'] },
      ],
    });
    if (dlgResult.canceled || !dlgResult.filePath) return null;
    const absolute = path.resolve(dlgResult.filePath);
    const normalized = String(content || '').replace(/\r\n/g, '\n');
    markSelfWriting(absolute);
    await fs.writeFile(absolute, normalized, { encoding: 'utf8' });
    pushRecent(absolute);
    return { path: absolute };
  });

  // Dirty-Tab-Schliessen-Dialog. Returnt 'save' | 'discard' | 'cancel'.
  ipcMain.handle('dialog:confirmCloseDirty', async (event, opts) => {
    const owner = senderWindow(event);
    const t = (k) => tForWindow(owner, k);
    const result = await dialog.showMessageBox(owner || undefined, {
      type: 'warning',
      title: t('save.unsavedTitle'),
      message: t('save.unsavedMessage'),
      detail: (opts && opts.detail) ? opts.detail : '',
      buttons: [t('save.btnSave'), t('save.btnDiscard'), t('save.btnCancel')],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });
    if (result.response === 0) return 'save';
    if (result.response === 1) return 'discard';
    return 'cancel';
  });

  // Externer-Change-Konflikt-Dialog. Returnt 'reload' | 'keepOurs'.
  ipcMain.handle('dialog:confirmConflict', async (event, opts) => {
    const owner = senderWindow(event);
    const t = (k) => tForWindow(owner, k);
    const result = await dialog.showMessageBox(owner || undefined, {
      type: 'warning',
      title: t('save.conflictTitle'),
      message: t('save.conflictMessage'),
      detail: (opts && opts.detail) ? opts.detail : '',
      buttons: [t('save.conflictReload'), t('save.conflictKeepOurs')],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) return 'reload';
    return 'keepOurs';
  });

  // Schreibfehler-Dialog (Datei nicht schreibbar etc.).
  ipcMain.handle('dialog:showSaveError', async (event, detail) => {
    const owner = senderWindow(event);
    const t = (k) => tForWindow(owner, k);
    await dialog.showMessageBox(owner || undefined, {
      type: 'error',
      title: t('save.errorTitle'),
      message: t('save.errorMessage'),
      detail: detail || '',
      buttons: ['OK'],
    });
  });

  // Renderer signalisiert, dass das Fenster nun tatsaechlich geschlossen
  // werden darf (alle dirtigen Tabs wurden gespeichert oder verworfen).
  ipcMain.handle('window:confirmClose', (event) => {
    const w = senderWindow(event);
    if (w && !w.isDestroyed()) {
      confirmedClosings.add(w);
      w.close();
    }
  });

  ipcMain.handle('app:locale', () => app.getLocale());
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('theme:current', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

  // 4T-0030: Theme-Vorzug auslesen/setzen. 'system' folgt dem OS, 'light'/'dark'
  // erzwingt das jeweilige Theme app-weit. Bei Aenderung wird nativeTheme.
  // themeSource gesetzt (loest implizit 'updated' aus, broadcast 'theme:changed'),
  // der Pref wird persistiert und an alle Fenster gebrodcastet, damit Menu-
  // Radios und Statusbar-Icon synchron bleiben.
  ipcMain.handle('theme:getPref', () => {
    const value = store?.get('themePref');
    return (value === 'light' || value === 'dark' || value === 'system') ? value : 'system';
  });
  ipcMain.handle('theme:setPref', (_event, value) => {
    const normalized = (value === 'light' || value === 'dark' || value === 'system') ? value : 'system';
    if (store) store.set('themePref', normalized);
    nativeTheme.themeSource = normalized;
    broadcast('theme:prefChanged', normalized);
    applyMenuToAllWindows();
  });

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

  // Renderer meldet aktiven Tab-Namen und Tab-Anzahl seines Fensters, damit
  // andere Fenster diese Infos im Tab-Kontextmenue als Tooltip anzeigen koennen
  // (4T-0012). Wird vom Renderer bei jedem updateWindowTitle gesendet.
  ipcMain.handle('window:metaChanged', (event, payload) => {
    const data = payload || {};
    windowMeta.set(event.sender.id, {
      activeTabName: typeof data.activeTabName === 'string' ? data.activeTabName : '',
      tabCount: typeof data.tabCount === 'number' ? data.tabCount : 0,
    });
  });

  // Liefert die Liste ALLER offenen Fenster (inkl. Aufrufer; der Renderer
  // filtert sich selbst heraus). Reihenfolge nach Display-Nummer = Map-Insertion-
  // Order = Erzeugungsreihenfolge. Wird vom Tab-Kontextmenue beim Aufklappen
  // synchron abgefragt (4T-0012).
  ipcMain.handle('window:list', () => {
    const totalCount = windows.size;
    const list = [];
    let idx = 0;
    for (const [id] of windows) {
      idx += 1;
      const meta = windowMeta.get(id) || {};
      list.push({
        id,
        displayNumber: idx,
        totalCount,
        activeTabName: meta.activeTabName || '',
        tabCount: meta.tabCount || 0,
      });
    }
    return list;
  });

  // Fuegt einen vom Quell-Fenster uebergebenen Tab im Ziel-Fenster als neuen
  // Tab in der aktiven Pane hinzu (4T-0012). payload = { path, content, dirty,
  // settings: { viewMode, wrapLines, showLineNumbers }, untitledIndex }.
  // Returnt { ok: true } bei Erfolg, sonst { ok: false, reason }.
  ipcMain.handle('tab:appendToWindow', (_event, params) => {
    const targetId = params && params.targetWindowId;
    const payload = params && params.payload;
    const target = (typeof targetId === 'number') ? windows.get(targetId) : null;
    if (!target || target.isDestroyed()) {
      return { ok: false, reason: 'window-gone' };
    }
    target.webContents.send('tab:appendFromOtherWindow', payload || {});
    if (target.isMinimized()) target.restore();
    target.focus();
    return { ok: true };
  });

  // 4T-0015: Backlinks-Anfrage einer Pane. Erhoeht den Refcount auf die
  // Wurzel der angefragten Datei und liefert das aktuelle Status-Payload.
  // Der Renderer macht beim Tab-Wechsel passend zu einem 'request' immer
  // auch ein 'release' fuer die vorher angefragte Datei.
  ipcMain.handle('backlinks:request', (_event, params) => {
    const filePath = params && params.filePath;
    return backlinks.backlinksFor(filePath);
  });
  ipcMain.handle('backlinks:release', (_event, params) => {
    const filePath = params && params.filePath;
    const root = backlinks.rootForActiveFile(filePath);
    if (root) backlinks.releaseRoot(root);
    return { ok: true };
  });

  // 4T-0020: Linter-Lookup fuer broken-wiki-link. Batch-Endpunkt: pro Lint-
  // Lauf ein Roundtrip mit allen Basenames des Dokuments. Antwort siehe
  // existingWikiTargets in backlinks.js (status + Liste der gefundenen).
  // Triggert keinen Index-Aufbau; falls kein Index vorliegt, wird 'unavailable'
  // zurueckgegeben und der Linter unterdrueckt die Regel.
  ipcMain.handle('linter:resolveWikiTargets', (_event, params) => {
    const filePath = params && params.filePath;
    const basenames = params && Array.isArray(params.basenames) ? params.basenames : [];
    return backlinks.existingWikiTargets(filePath, basenames);
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

  // 4T-0030: Persistierten Theme-Pref VOR dem Erzeugen des ersten Fensters
  // anwenden, damit der Background-Color-Init in createWindow direkt korrekt
  // ist und kein Theme-Flash am Start sichtbar wird.
  const savedThemePref = store?.get('themePref');
  if (savedThemePref === 'light' || savedThemePref === 'dark' || savedThemePref === 'system') {
    nativeTheme.themeSource = savedThemePref;
  }

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
  // Letzte Persistenz, bevor die Fenster schliessen. Nur wenn beim Quit noch
  // Fenster offen sind. Wenn die Map bereits leer ist (z.B. weil der Nutzer
  // das letzte Fenster ueber X geschlossen hat und 'window-all-closed' den
  // Quit ausloest), darf nicht mit leerer Liste ueberschrieben werden, sonst
  // gingen die zuletzt im 'close'-Handler gemerkten Bounds verloren (4T-0025).
  if (windows.size > 0) persistAllWindows();
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
