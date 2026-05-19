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
const markdownItKatex = require('@vscode/markdown-it-katex').default;

// 4T-0023: highlight.js als Core-Bundle plus kuratierte Sprachliste. Damit
// landet nur das benoetigte Set im Bundle, nicht das gesamte Default-Bundle
// mit ueber 190 Sprachen. Aliase wie js/ts/sh/py/c#/c++ deckt highlight.js
// intern ueber die jeweiligen language-Definitionen ab.
const hljs = require('highlight.js/lib/core');
const HLJS_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'bash',
  'sql',
  'json',
  'yaml',
  'xml',
  'css',
  'markdown',
  'plaintext',
];
for (const lang of HLJS_LANGUAGES) {
  try {
    const def = require(`highlight.js/lib/languages/${lang}`);
    hljs.registerLanguage(lang, def);
  } catch (err) {
    console.warn(`hljs: Sprache '${lang}' konnte nicht geladen werden:`, err.message);
  }
}
// HTML wird vom xml-Modul mitabgedeckt.

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

// 4T-0023: HTML-Escape fuer den highlight-Fallback. Bewusst eigene Funktion
// statt md.utils.escapeHtml, damit sie auch innerhalb des Konstruktor-
// Callbacks verfuegbar ist (md existiert dann noch nicht).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// markdown-it mit GFM-naher Konfiguration.
const md = new MarkdownIt({
  html: false, // Sicherheit: kein rohes HTML aus Markdown
  linkify: true, // Auto-Links
  typographer: true,
  breaks: false,
  // 4T-0023: Syntax-Highlighting fuer Fenced-Code-Bloecke mit Sprach-Tag.
  // Keine Auto-Detection ohne Tag — Fehlerkennungen bei kurzen Snippets
  // stiften mehr Verwirrung als Nutzen. Unbekannte Sprache und Tokenizer-
  // Fehler fallen still auf den Plain-Block mit hljs-Klasse zurueck. Die
  // `language-<tag>`-Klasse wird auch bei unbekannten Tags mitgesetzt, damit
  // das Renderer-seitige Post-Processing (z.B. Mermaid in 4T-0021) Bloecke
  // zuverlaessig per Klassennamen finden kann.
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const value = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<pre><code class="hljs language-${escapeHtml(lang)}">${value}</code></pre>`;
      } catch (err) {
        // Fall durch zum Plain-Fallback
      }
    }
    const classes = lang ? `hljs language-${escapeHtml(lang)}` : 'hljs';
    return `<pre><code class="${classes}">${escapeHtml(str)}</code></pre>`;
  },
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

// 4T-0022: KaTeX-Mathematik. Inline `$…$` und Block `$$…$$`. Das Plugin
// erkennt `$` nur dann als Delimiter, wenn die umgebenden Zeichen die
// Heuristik erfuellen (kein Whitespace direkt neben dem inneren Inhalt) —
// damit bleiben Dollar-Betraege wie `$5 bis $10` Fliesstext. Syntaxfehler
// werden rot inline angezeigt statt den Render-Pane abzuschiessen.
md.use(markdownItKatex, {
  throwOnError: false,
  errorColor: '#cc0000',
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

// 4T-0034: scg-table — MediaWiki-aehnliche Tabellen-Syntax als Fenced-Code-
// Block mit Sprach-Tag 'scg-table'. Stufe 1 des Epics 3E-0006: Basis-Tabelle
// mit Caption (|+), Header-Zellen (!), Datenzellen (|), Zeilen-Trenner (|-)
// und mehrzeiligem Markdown-Inhalt pro Zelle.
//
// 4T-0037 (Epic 3E-0007, Stufe 2): Zell-Attribute mit strikter Whitelist
// (colspan, rowspan, align, valign) und Accessibility-scope auf <th>.
// Attribut-Block am Zellenanfang durch zweites '|' getrennt:
//   | colspan="2" align="center" | Inhalt
// Werte werden strikt validiert; ungueltige Werte stillschweigend ignoriert.
// align/valign werden auf CSS-Klassen (.align-*, .valign-*) gemappt, nicht
// auf das deprecated HTML4-align-Attribut. Damit bleibt die CSS-Hoheit beim
// App-Stylesheet (Light-/Dark-Theme-konsistent).
//
// Integration: ueberschreibt md.renderer.rules.fence am Ende der md-Setup-
// Kette. Bei lang === 'scg-table' uebernimmt renderScgTable; sonst delegiert
// der Override an den Default-Renderer, sodass Code-Highlighting via
// highlight.js (siehe highlight-Callback im Konstruktor) unangetastet bleibt.
//
// Bewusst noch nicht implementiert (geplante Folge-Stufen):
// - Shorthand ||/!! fuer mehrere Zellen pro Quellzeile.
// - Verschachtelte scg-table und HTML-Konverter fuer Portabilitaet → 3E-0008.
// - Sortierbare Tabellen, Status-Hervorhebung, Spalten-Default → 3E-0009.

// 4T-0037: Erkennt einen optionalen Attribut-Block am Zellenanfang und gibt
// gefilterte attrs (Whitelist) plus den verbleibenden Zellinhalt zurueck.
// Erkennt nur dann einen Attribut-Block, wenn der Teil vor dem ersten '|'
// dem Muster `name="value" name="value"...` entspricht. So bleiben Zellen
// ohne Attribut-Block (Stufe-1-Verhalten) unveraendert; insbesondere wird
// ein '|' im Zellinhalt nicht versehentlich als Attribut-Trenner gedeutet.
function parseScgTableCellAttrs(rawText) {
  const pipeIdx = rawText.indexOf('|');
  if (pipeIdx < 0) return { attrs: {}, content: rawText };
  const head = rawText.slice(0, pipeIdx).trim();
  if (head === '') return { attrs: {}, content: rawText };
  // Head muss ausschliesslich aus name="value"-Paaren bestehen, ggf. durch
  // Whitespace getrennt. Sonst ist es kein Attribut-Block.
  if (!/^(\w+="[^"]*")(\s+\w+="[^"]*")*$/.test(head)) {
    return { attrs: {}, content: rawText };
  }
  const tail = rawText.slice(pipeIdx + 1).trimStart();
  const attrs = {};
  const tokenRegex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = tokenRegex.exec(head)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2];
    if (name === 'colspan' || name === 'rowspan') {
      // Nur positive Ganzzahlen ohne fuehrendes/folgendes Whitespace.
      if (/^[1-9]\d*$/.test(value)) attrs[name] = value;
    } else if (name === 'align') {
      if (value === 'left' || value === 'center' || value === 'right') {
        attrs[name] = value;
      }
    } else if (name === 'valign') {
      if (value === 'top' || value === 'middle' || value === 'bottom') {
        attrs[name] = value;
      }
    }
    // Andere Attribut-Namen werden stillschweigend ignoriert (Whitelist).
  }
  return { attrs, content: tail };
}

// 4T-0037: Baut den HTML-Attribut-String fuer eine Zelle aus dem
// gefilterten attrs-Object plus scope-Setzung fuer Header-Zellen.
// Rueckgabe inklusive fuehrendem Leerzeichen, wenn Attribute vorhanden,
// sonst leerer String.
function buildScgTableCellAttrs(attrs, cellType, isHeaderRow) {
  const parts = [];
  if (attrs.colspan) parts.push(`colspan="${attrs.colspan}"`);
  if (attrs.rowspan) parts.push(`rowspan="${attrs.rowspan}"`);
  const classes = [];
  if (attrs.align) classes.push(`align-${attrs.align}`);
  if (attrs.valign) classes.push(`valign-${attrs.valign}`);
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`);
  if (cellType === 'th') {
    parts.push(isHeaderRow ? 'scope="col"' : 'scope="row"');
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

function renderScgTable(content) {
  const lines = String(content || '').split(/\r?\n/);
  let i = 0;
  // Erste signifikante Zeile muss '{|' sein
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || !lines[i].trimStart().startsWith('{|')) {
    return null;
  }
  i++;

  let caption = null;
  const rows = [];
  let currentRow = null;
  let currentCell = null;

  const commitCell = () => {
    if (currentCell) {
      currentRow.cells.push(currentCell);
      currentCell = null;
    }
  };
  const commitRow = () => {
    commitCell();
    if (currentRow && currentRow.cells.length > 0) {
      rows.push(currentRow);
    }
    currentRow = null;
  };
  const startRow = () => {
    commitRow();
    currentRow = { cells: [] };
  };
  // 4T-0037: startCell nimmt zusaetzlich einen attrs-Parameter (Default {}).
  const startCell = (type, initial, attrs) => {
    commitCell();
    if (!currentRow) currentRow = { cells: [] };
    currentCell = { type, content: initial || '', attrs: attrs || {} };
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (trimmed.startsWith('|}')) {
      commitRow();
      break;
    }
    if (trimmed.startsWith('|-')) {
      startRow();
      continue;
    }
    if (trimmed.startsWith('|+')) {
      // Caption: alles nach '|+' bis Zeilenende. Stufe 1 nur einzeilig.
      caption = trimmed.slice(2).trim();
      continue;
    }
    if (trimmed.startsWith('!')) {
      // 4T-0037: Attribut-Block parsen, falls vorhanden.
      const { attrs, content: cellContent } = parseScgTableCellAttrs(trimmed.slice(1).trimStart());
      startCell('th', cellContent, attrs);
      continue;
    }
    if (trimmed.startsWith('|')) {
      const { attrs, content: cellContent } = parseScgTableCellAttrs(trimmed.slice(1).trimStart());
      startCell('td', cellContent, attrs);
      continue;
    }
    // Andere Zeile: gehoert zum laufenden Zellinhalt. Original-Zeile (nicht
    // getrimmt) anhaengen, damit Listen-Einrueckung etc. erhalten bleibt.
    if (currentCell) {
      currentCell.content += (currentCell.content ? '\n' : '') + line;
    }
    // Zeilen ohne aktive Zelle werden stillschweigend ignoriert.
  }
  // Tabelle ohne abschliessendes |}: sauber abschliessen.
  commitRow();

  return buildScgTableHtml(caption, rows);
}

function buildScgTableHtml(caption, rows) {
  // thead, wenn die erste Zeile ausschliesslich Header-Zellen enthaelt.
  let theadRow = null;
  let bodyRows = rows;
  if (rows.length > 0 && rows[0].cells.every((c) => c.type === 'th')) {
    theadRow = rows[0];
    bodyRows = rows.slice(1);
  }
  const out = ['<table class="scg-table">'];
  if (caption !== null && caption !== '') {
    out.push(`<caption>${md.renderInline(caption)}</caption>`);
  }
  if (theadRow) {
    out.push('<thead>');
    // 4T-0037: isHeaderRow=true -> th bekommt scope="col".
    out.push(renderScgTableRow(theadRow, true));
    out.push('</thead>');
  }
  if (bodyRows.length > 0) {
    out.push('<tbody>');
    for (const row of bodyRows) {
      // 4T-0037: isHeaderRow=false -> th bekommt scope="row".
      out.push(renderScgTableRow(row, false));
    }
    out.push('</tbody>');
  }
  out.push('</table>');
  return out.join('');
}

function renderScgTableRow(row, isHeaderRow) {
  const out = ['<tr>'];
  for (const cell of row.cells) {
    const tag = cell.type === 'th' ? 'th' : 'td';
    // 4T-0037: HTML-Attribute aus dem Whitelist-gefilterten attrs-Object
    // plus scope-Setzung (col fuer thead-th, row fuer th in tbody).
    const attrsHtml = buildScgTableCellAttrs(cell.attrs || {}, cell.type, isHeaderRow);
    const trimmed = cell.content.trim();
    if (trimmed === '') {
      out.push(`<${tag}${attrsHtml}></${tag}>`);
    } else if (!/\n/.test(trimmed)) {
      // Einzeiliger Inhalt: Inline-Render ohne <p>-Wrapper.
      out.push(`<${tag}${attrsHtml}>${md.renderInline(trimmed)}</${tag}>`);
    } else {
      // Mehrzeiliger Inhalt: Block-Render fuer Listen, Codebloecke, Absaetze.
      out.push(`<${tag}${attrsHtml}>${md.render(trimmed)}</${tag}>`);
    }
  }
  out.push('</tr>');
  return out.join('');
}

const defaultFenceRenderer = md.renderer.rules.fence;
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = (token.info || '').trim();
  const lang = info.split(/\s+/g)[0];
  if (lang === 'scg-table') {
    const html = renderScgTable(token.content);
    if (html) return html;
    // Fallback: scg-table-Syntax nicht erkennbar (kein '{|'). Block wird als
    // regulaerer Code-Block gerendert, damit der Inhalt sichtbar bleibt.
  }
  return defaultFenceRenderer
    ? defaultFenceRenderer.call(this, tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

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
  // 4T-0030: Theme-Vorzug ('light' | 'dark' | 'system'). 'system' folgt dem
  // OS-Theme (alte Logik), die anderen erzwingen das jeweilige Theme.
  getThemePref: () => ipcRenderer.invoke('theme:getPref'),
  setThemePref: (value) => ipcRenderer.invoke('theme:setPref', value),

  // Markdown-Rendering
  renderMarkdown: (text, basePath) => {
    const html = md.render(text || '');
    return resolveImagesForBase(html, basePath);
  },
  // 4T-0014: Slug-Berechnung im Renderer-Modul verfuegbar machen,
  // damit das Outline-Panel im Render-Modus den passenden DOM-Anker findet.
  slugifyHeading: (text) => githubLikeSlug(String(text || '')),

  // 4T-0036: Hilfe-Tab-Inhalt fuer scg-table aus dem Main holen (Markdown-
  // Quelltext, der im Renderer durch renderMarkdown() gerendert wird).
  getScgTableHelpContent: (locale) => ipcRenderer.invoke('help:getScgTableContent', locale),

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
  // 4T-0030: Theme-Pref-Aenderung wird von Main an alle Renderer gebrodcastet,
  // damit Statusbar-Icon und Tooltip auch in anderen Fenstern synchron ziehen.
  onThemePrefChanged: (cb) => ipcRenderer.on('theme:prefChanged', (_e, pref) => cb(pref)),
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
  // 4T-0030: Menue-Eintrag 'Ansicht -> Theme -> Hell/Dunkel/System' sendet den
  // gewaehlten Wert; der Renderer ruft daraufhin setThemePref.
  onMenuSetTheme: (cb) => ipcRenderer.on('menu:setTheme', (_e, value) => cb(value)),

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
