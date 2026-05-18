// Preload: Brücke zwischen Main-Prozess und Renderer.
// Markdown-Rendering läuft hier, weil hier Node-Module verfügbar sind.
'use strict';

const electron = require('electron');
const { contextBridge, ipcRenderer, webUtils } = electron;
const path = require('node:path');
const fs = require('node:fs');
const MarkdownIt = require('markdown-it');
const taskLists = require('markdown-it-task-lists');
const markdownItAnchor = require('markdown-it-anchor');

// 4T-0017: Electron-Standard-Zoom (Strg + +/-/0, Strg + Mausrad) komplett
// abschalten. Der Renderer implementiert einen eigenen, pro-Tab gehaltenen
// Zoom ueber CSS auf den Inhalts-Containern. Ohne diese Limits wuerde
// Electron zusaetzlich auf webContents-Ebene zoomen — doppelt skaliert und
// inklusive Statusbar/Tabs/Menue, was wir explizit nicht wollen.
//
// Wichtig: Der Aufruf wird in DOMContentLoaded verlagert und defensiv mit
// try/catch geklammert. Direkt zur Preload-Modul-Ladezeit ist `webFrame` je
// nach Electron-Version noch nicht initialisiert; ein Zugriff darauf wirft
// dann eine Exception, die das Preload-Skript abbricht — Renderer kommt
// nicht hoch, ready-to-show feuert nicht, das Fenster bleibt unsichtbar.
window.addEventListener('DOMContentLoaded', () => {
  try {
    if (electron.webFrame && typeof electron.webFrame.setVisualZoomLevelLimits === 'function') {
      electron.webFrame.setVisualZoomLevelLimits(1, 1);
    }
  } catch (err) {
    console.warn('webFrame.setVisualZoomLevelLimits nicht verfuegbar:', err);
  }
});

// markdown-it mit GFM-naher Konfiguration.
const md = new MarkdownIt({
  html: false, // Sicherheit: kein rohes HTML aus Markdown
  linkify: true, // Auto-Links
  typographer: true,
  breaks: false,
});
md.use(taskLists, { enabled: false, label: true });

// 4T-0014: Heading-IDs (GitHub-kompatibler Slug) auf <h1>..<h6> setzen.
// Wird vom Outline-Panel als Sprungziel im Render-Pane verwendet und
// repariert nebenbei seit-Release-0.1 latent kaputte [Text](#slug)-Anker.
// Slug-Funktion folgt der GitHub-Konvention: lowercased, Whitespace zu '-',
// alles ausser [\p{L}\p{N}\-_] entfernt. Diakritika werden via NFKD-Normalize
// und Stripping der Combining-Marks entfernt, damit "Lösungsansatz" zu
// 'losungsansatz' wird (passend zu GitHubs Slug-Erwartung).
function githubLikeSlug(text) {
  const normalized = text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');
  return normalized || 'section';
}
md.use(markdownItAnchor, {
  slugify: githubLikeSlug,
  tabIndex: false,
  permalink: false,
});

// Wiki-Link-Plugin: [[Ziel]] und [[Ziel|Label]] -> <a href="Ziel.md">Label</a>.
// Wenn das Ziel bereits eine Endung hat, wird .md nicht doppelt angehängt.
// Klick-Handling im Renderer ist identisch zu normalen Markdown-Links.
function wikiLinksPlugin(mdInstance) {
  function tokenize(state, silent) {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false;
    if (state.src.charCodeAt(start + 1) !== 0x5b) return false;

    const end = state.src.indexOf(']]', start + 2);
    if (end < 0) return false;

    const inner = state.src.slice(start + 2, end);
    if (inner.length === 0 || inner.includes('\n') || inner.includes('[')) return false;

    const pipeIdx = inner.indexOf('|');
    const target = (pipeIdx >= 0 ? inner.slice(0, pipeIdx) : inner).trim();
    const label = (pipeIdx >= 0 ? inner.slice(pipeIdx + 1) : inner).trim();
    if (!target) return false;

    if (!silent) {
      const hasExtension = /\.[a-z0-9]{1,8}$/i.test(target);
      const href = hasExtension ? target : `${target}.md`;
      const open = state.push('link_open', 'a', 1);
      open.attrSet('href', href);
      open.attrSet('class', 'wikilink');
      const text = state.push('text', '', 0);
      text.content = label;
      state.push('link_close', 'a', -1);
    }

    state.pos = end + 2;
    return true;
  }
  mdInstance.inline.ruler.before('link', 'wikilink', tokenize);
}
md.use(wikiLinksPlugin);

// Bilder mit relativen Pfaden zum data:-URI auflösen, damit sie im
// file://-Kontext zuverlässig laden. Alternativ könnten wir auf file:// URLs
// umstellen, aber data: ist robuster und vermeidet Caching-Probleme.
function resolveImagesForBase(html, basePath) {
  if (!basePath) return html;
  const baseDir = path.dirname(basePath);
  return html.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*)>/gi, (match, pre, src, post) => {
    if (/^(https?:|data:|file:)/i.test(src)) return match;
    const abs = path.resolve(baseDir, decodeURI(src));
    try {
      const ext = path.extname(abs).slice(1).toLowerCase();
      const mime = mimeForImage(ext);
      const data = fs.readFileSync(abs).toString('base64');
      return `<img ${pre}src="data:${mime};base64,${data}"${post}>`;
    } catch {
      return match;
    }
  });
}

function mimeForImage(ext) {
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'bmp': return 'image/bmp';
    default: return 'application/octet-stream';
  }
}

contextBridge.exposeInMainWorld('api', {
  // Datei-Operationen
  openDialog: () => ipcRenderer.invoke('file:openDialog'),
  readFile: (p) => ipcRenderer.invoke('file:read', p),
  saveFile: (p, content) => ipcRenderer.invoke('file:save', p, content),
  saveFileAs: (suggested, content) => ipcRenderer.invoke('file:saveAs', suggested, content),
  pushRecent: (p) => ipcRenderer.invoke('recent:push', p),

  // Dialog-Helfer fuer Dirty-State und Konflikt-Strategie
  confirmCloseDirty: (opts) => ipcRenderer.invoke('dialog:confirmCloseDirty', opts),
  confirmConflict: (opts) => ipcRenderer.invoke('dialog:confirmConflict', opts),
  showSaveError: (detail) => ipcRenderer.invoke('dialog:showSaveError', detail),

  // Window-Close-Bestaetigung: Renderer ruft dies, sobald alle dirtigen Tabs
  // gespeichert oder verworfen sind und das Fenster zugehen darf.
  confirmClose: () => ipcRenderer.invoke('window:confirmClose'),
  resolveLink: (basePath, target) => ipcRenderer.invoke('file:resolveLink', basePath, target),
  isMarkdownPath: (p) => ipcRenderer.invoke('file:isMarkdown', p),
  fileExists: (p) => ipcRenderer.invoke('file:exists', p),
  unwatchFile: (p) => ipcRenderer.invoke('file:unwatch', p),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Pfad-Helfer (Dateinamen ohne Verzeichnis)
  basename: (p) => path.basename(p),
  dirname: (p) => path.dirname(p),

  // Drag-&-Drop: seit Electron 32 ist File.path weg, daher webUtils.
  getPathForFile: (file) => webUtils.getPathForFile(file),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // System
  getLocale: () => ipcRenderer.invoke('app:locale'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  getTheme: () => ipcRenderer.invoke('theme:current'),

  // Markdown-Rendering
  renderMarkdown: (text, basePath) => {
    const html = md.render(text || '');
    return resolveImagesForBase(html, basePath);
  },
  // 4T-0014: Slug-Berechnung im Renderer-Modul verfuegbar machen,
  // damit das Outline-Panel im Render-Modus den passenden DOM-Anker findet.
  slugifyHeading: (text) => githubLikeSlug(String(text || '')),

  // 4T-0015: Backlinks. requestBacklinks erhoeht den Refcount auf die
  // Wurzel, releaseBacklinks senkt ihn (wird beim Tab-Wechsel paarweise
  // aufgerufen). onBacklinksInvalidated meldet Watcher-Updates aus dem Main.
  requestBacklinks: (filePath) => ipcRenderer.invoke('backlinks:request', { filePath }),
  releaseBacklinks: (filePath) => ipcRenderer.invoke('backlinks:release', { filePath }),
  // 4T-0020: Batch-Lookup fuer den Markdown-Linter (broken-wiki-link).
  resolveWikiTargets: (filePath, basenames) =>
    ipcRenderer.invoke('linter:resolveWikiTargets', { filePath, basenames }),
  onBacklinksInvalidated: (cb) => ipcRenderer.on('backlinks:invalidated', (_e, payload) => cb(payload)),

  // Multi-Window
  openNewWindow: (initialTabs) => ipcRenderer.invoke('window:openNew', initialTabs),
  reportPanes: (panes) => ipcRenderer.invoke('window:reportPanes', panes),
  reportMenuState: (state) => ipcRenderer.invoke('window:reportMenuState', state),
  // 4T-0012: Tab in bestehendes Fenster verschieben/kopieren und Titel-Suffix
  notifyWindowMeta: (meta) => ipcRenderer.invoke('window:metaChanged', meta),
  listWindows: () => ipcRenderer.invoke('window:list'),
  appendTabToWindow: (targetWindowId, payload) => ipcRenderer.invoke('tab:appendToWindow', { targetWindowId, payload }),

  // Events vom Main-Prozess
  onFileChanged: (cb) => ipcRenderer.on('file:changed', (_e, p) => cb(p)),
  onFileRemoved: (cb) => ipcRenderer.on('file:removed', (_e, p) => cb(p)),
  onOpenExternal: (cb) => ipcRenderer.on('file:openExternal', (_e, files) => cb(files)),
  onThemeChanged: (cb) => ipcRenderer.on('theme:changed', (_e, theme) => cb(theme)),
  onInitialState: (cb) => ipcRenderer.once('window:initialState', (_e, payload) => cb(payload)),

  // Menue-Events vom Main an den Renderer
  onMenuNew: (cb) => ipcRenderer.on('menu:new', () => cb()),
  onMenuOpenFile: (cb) => ipcRenderer.on('menu:openFile', () => cb()),
  onMenuViewChange: (cb) => ipcRenderer.on('menu:viewChange', (_e, mode) => cb(mode)),
  onMenuToggleLineNumbers: (cb) => ipcRenderer.on('menu:toggleLineNumbers', () => cb()),
  onMenuToggleWordWrap: (cb) => ipcRenderer.on('menu:toggleWordWrap', () => cb()),
  onMenuSave: (cb) => ipcRenderer.on('menu:save', () => cb()),
  onMenuSaveAs: (cb) => ipcRenderer.on('menu:saveAs', () => cb()),
  onMenuToggleAutoSave: (cb) => ipcRenderer.on('menu:toggleAutoSave', () => cb()),
  // 4T-0013: Menue-Eintrag "Ansicht -> Gliederung" sendet diesen Event;
  // Renderer toggelt die Sichtbarkeit der Folding-Spuren im aktiven Tab.
  onMenuToggleFoldGutter: (cb) => ipcRenderer.on('menu:toggleFoldGutter', () => cb()),
  // 4T-0014: Menue-Eintrag "Ansicht -> Inhaltsverzeichnis" sendet diesen
  // Event; Renderer toggelt die Outline-Sichtbarkeit der aktiven Spalte.
  onMenuToggleOutline: (cb) => ipcRenderer.on('menu:toggleOutline', () => cb()),
  // 4T-0015: Menue-Eintrag "Ansicht -> Backlinks" toggelt die Backlinks-
  // Sichtbarkeit der aktiven Spalte.
  onMenuToggleBacklinks: (cb) => ipcRenderer.on('menu:toggleBacklinks', () => cb()),
  // 4T-0019: Menue-Eintraege "Ansicht -> Fokus-Modus" und "-> Typewriter-Scroll".
  onMenuToggleFocusMode: (cb) => ipcRenderer.on('menu:toggleFocusMode', () => cb()),
  onMenuToggleTypewriterScroll: (cb) => ipcRenderer.on('menu:toggleTypewriterScroll', () => cb()),
  // 4T-0019: Menue-Eintrag "Ansicht -> Bearbeiten" (Strg+E). Ersetzt den
  // bisherigen Renderer-only-Tastenkuerzel.
  onMenuToggleEdit: (cb) => ipcRenderer.on('menu:toggleEdit', () => cb()),
  onMenuOpenHelp: (cb) => ipcRenderer.on('menu:openHelp', () => cb()),
  onMenuOpenAbout: (cb) => ipcRenderer.on('menu:openAbout', () => cb()),
  // 4T-0018: Settings-Dialog ueber Menue-Eintrag Datei -> Einstellungen.
  onMenuOpenSettings: (cb) => ipcRenderer.on('menu:openSettings', () => cb()),
  // 4T-0018: Multi-Window-Broadcast bei appearance.*-Aenderung.
  onAppearanceChanged: (cb) => ipcRenderer.on('appearance:changed', (_e, payload) => cb(payload)),
  onMenuToggleRestoreSession: (cb) => ipcRenderer.on('menu:toggleRestoreSession', () => cb()),

  // Window-Close-Anfrage: Main fragt nach Bestaetigung; Renderer prueft
  // Dirty-Tabs und ruft confirmClose() zurueck.
  onWindowRequestClose: (cb) => ipcRenderer.on('window:requestClose', () => cb()),

  // 4T-0012: Display-Nummer und Gesamtzahl der Fenster — wird bei jedem
  // Open/Close vom Main gepusht, bestimmt den `(Fenster N)`-Suffix im Titel.
  onWindowDisplayInfo: (cb) => ipcRenderer.on('window:displayInfo', (_e, info) => cb(info)),
  // 4T-0012: Tab-Append-Event vom Main, ausgeloest durch Verschieben/Kopieren
  // aus einem anderen Fenster. Payload = { path, content, dirty, settings,
  // untitledIndex }.
  onAppendTabFromOtherWindow: (cb) => ipcRenderer.on('tab:appendFromOtherWindow', (_e, payload) => cb(payload)),
});
