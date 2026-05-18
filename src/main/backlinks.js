// 4T-0015: Backlinks-Indexierung pro Wurzel.
// Eine Wurzel ist der Ordner einer aktiven Datei. Suchraum = Wurzel + 2
// zusaetzliche Unterordner-Ebenen (chokidar depth: 2). Pro Wurzel haelt
// dieses Modul einen Index aller Markdown-Dateien mit allen darin gefundenen
// Wiki-Links und relativen Markdown-Links plus chokidar-Watcher fuer
// inkrementelle Updates. Reference-Counting plus 60-s-Soft-Timer steuert,
// wann der Watcher abgebaut wird (letzter Tab in der Wurzel ist zu).

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const chokidar = require('chokidar');

// Konstanten
const SCAN_DEPTH = 2;
const MAX_FILES = 2000;
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const SNIPPET_MAX = 120;
const INVALIDATE_DEBOUNCE_MS = 200;
const SOFT_TIMEOUT_MS = 60 * 1000;
const MD_EXT_RE = /\.(md|markdown|mdown|mkd)$/i;

// Wiki-Link: [[Foo]] oder [[Foo|Label]]. Wir nutzen non-greedy bis ]].
// Mehrere Treffer pro Zeile moeglich, daher /g.
const WIKI_LINK_RE = /\[\[([^\]\n|]+?)(?:\|[^\]\n]*)?\]\]/g;

// Relative Markdown-Links: [Text](pfad.md) oder (pfad.md#anker). Kein http:,
// kein https:, kein mailto:, kein data:.
const MD_LINK_RE = /\[[^\]\n]*\]\(([^)\s#?]+\.(?:md|markdown|mdown|mkd))(?:#([^)\s]+))?\)/gi;

// State pro Wurzel.
// indexes: Map<wurzel(absolut), Eintrag>
// Eintrag = {
//   wurzel, status: 'indexing'|'ready'|'oversized',
//   files: Map<absoluterPfad, Array<{zeile, linkTyp, ziel(absolut)|null, ankerTeilTyp, anker, snippet}>>,
//   fileCount, byteSize,
//   watcher, refCount, softTimer,
//   invalidateTimer
// }
const indexes = new Map();

let broadcastFn = null;

// Registriert den Broadcast-Mechanismus aus main.js. broadcastFn(channel, payload)
// sendet an alle BrowserWindows.
function attachBroadcast(fn) {
  broadcastFn = fn;
}

// Verzeichnis-Scan, der die Datei-Liste plus Gesamt-Bytes ermittelt.
// Bricht ab, sobald MAX_FILES oder MAX_BYTES ueberschritten ist (oversized).
function collectMarkdownFiles(root) {
  const files = [];
  let bytes = 0;
  function walk(dir, depth) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < SCAN_DEPTH) walk(full, depth + 1);
      } else if (entry.isFile() && MD_EXT_RE.test(entry.name)) {
        let size = 0;
        try { size = fs.statSync(full).size; } catch { /* ignore */ }
        files.push(full);
        bytes += size;
        if (files.length > MAX_FILES || bytes > MAX_BYTES) {
          throw new OversizeError(files.length, bytes);
        }
      }
    }
  }
  try {
    walk(root, 0);
  } catch (err) {
    if (err instanceof OversizeError) return { oversized: true, fileCount: err.fileCount, byteSize: err.byteSize };
    throw err;
  }
  return { oversized: false, fileCount: files.length, byteSize: bytes, files };
}

class OversizeError extends Error {
  constructor(fileCount, byteSize) {
    super('Backlinks-Suchraum ueberschreitet Cap');
    this.fileCount = fileCount;
    this.byteSize = byteSize;
  }
}

// Parst eine Datei und extrahiert alle Link-Treffer. Zielpfad wird beim
// Markdown-Link gegen das Datei-Verzeichnis aufgeloest und absolut gemacht.
// Wiki-Links speichern den Basename als ziel-Erwartung (ohne .md), Aufloesung
// passiert spaeter beim Lookup ueber die files-Map.
function parseFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const dir = path.dirname(filePath);
  const lines = content.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    // Wiki-Links
    WIKI_LINK_RE.lastIndex = 0;
    let m;
    while ((m = WIKI_LINK_RE.exec(line)) !== null) {
      const target = m[1].trim();
      if (!target) continue;
      // Anker im Wiki-Link: [[Foo#anker]] -> ziel=Foo, anker=anker.
      // Wir matchen das mit '#' im Inneren, weil unser Regex '|' bereits
      // ausschliesst.
      let anker = null;
      let ziel = target;
      const hashIdx = target.indexOf('#');
      if (hashIdx > 0) {
        anker = target.slice(hashIdx + 1).trim() || null;
        ziel = target.slice(0, hashIdx).trim();
      }
      out.push({
        zeile: lineNum,
        linkTyp: 'wiki',
        zielBasename: ziel,
        zielAbsolut: null,
        anker,
        snippet: shortSnippet(line),
      });
    }
    // Markdown-Links
    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(line)) !== null) {
      const linkTarget = m[1];
      const anker = m[2] || null;
      // Externe Links rausfiltern, falls Regex doch mal greift.
      if (/^[a-z]+:\/\//i.test(linkTarget) || linkTarget.startsWith('//')) continue;
      let absolute;
      try {
        absolute = path.resolve(dir, linkTarget);
      } catch {
        continue;
      }
      out.push({
        zeile: lineNum,
        linkTyp: 'md',
        zielBasename: null,
        zielAbsolut: absolute,
        anker,
        snippet: shortSnippet(line),
      });
    }
  }
  return out;
}

function shortSnippet(line) {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= SNIPPET_MAX) return trimmed;
  return trimmed.slice(0, SNIPPET_MAX - 1) + '…';
}

// Liefert die Wurzel zur aktiven Datei.
function rootFor(filePath) {
  if (!filePath) return null;
  try { return path.dirname(path.resolve(filePath)); } catch { return null; }
}

// Stellt sicher, dass fuer eine Wurzel ein Index existiert. Beim ersten
// Aufruf wird er asynchron aufgebaut und der Watcher gestartet. Folgeaufrufe
// liefern den existierenden Eintrag (oder warten ggf. auf die laufende
// Erstellung). refCount wird hochgezaehlt und ein evtl. laufender Soft-Timer
// abgebrochen.
function ensureIndex(rootPath) {
  let entry = indexes.get(rootPath);
  if (entry) {
    entry.refCount++;
    if (entry.softTimer) {
      clearTimeout(entry.softTimer);
      entry.softTimer = null;
    }
    return entry;
  }
  entry = {
    wurzel: rootPath,
    status: 'indexing',
    files: new Map(),
    fileCount: 0,
    byteSize: 0,
    watcher: null,
    refCount: 1,
    softTimer: null,
    invalidateTimer: null,
  };
  indexes.set(rootPath, entry);

  // Synchrone Scan-Vorpruefung (cap). Bei oversized: Status setzen, kein
  // Watcher.
  const scan = collectMarkdownFiles(rootPath);
  entry.fileCount = scan.fileCount;
  entry.byteSize = scan.byteSize;
  if (scan.oversized) {
    entry.status = 'oversized';
    return entry;
  }

  // Initial-Parse aller Dateien.
  for (const f of scan.files) {
    entry.files.set(f, parseFile(f));
  }
  entry.status = 'ready';

  // Watcher starten. ignoreInitial: true, weil wir gerade selbst geparst
  // haben. Markdown-Filter via ignored-Funktion.
  entry.watcher = chokidar.watch(rootPath, {
    depth: SCAN_DEPTH,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignored: (p) => {
      // node_modules und Punkt-Ordner ausblenden, sonst alles Markdown-Dateien.
      const base = path.basename(p);
      if (base === 'node_modules' || base.startsWith('.git')) return true;
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) return false;
      } catch {
        return false;
      }
      return !MD_EXT_RE.test(base);
    },
  });
  entry.watcher.on('add', (p) => onWatcherChange(entry, p, 'add'));
  entry.watcher.on('change', (p) => onWatcherChange(entry, p, 'change'));
  entry.watcher.on('unlink', (p) => onWatcherChange(entry, p, 'unlink'));
  entry.watcher.on('error', () => {
    // Watcher kaputt: Index zuruecksetzen und Renderer benachrichtigen.
    teardownIndex(rootPath, { force: true });
    if (broadcastFn) broadcastFn('backlinks:invalidated', { wurzel: rootPath });
  });
  return entry;
}

function onWatcherChange(entry, filePath, kind) {
  if (!MD_EXT_RE.test(filePath)) return;
  if (kind === 'unlink') {
    if (entry.files.has(filePath)) {
      const prev = entry.files.get(filePath);
      entry.files.delete(filePath);
      entry.fileCount = entry.files.size;
      // byteSize nur grob; wir laufen nicht jedesmal Vollscan, akzeptabel.
      scheduleInvalidate(entry);
    }
    return;
  }
  // add oder change
  const hits = parseFile(filePath);
  const had = entry.files.has(filePath);
  entry.files.set(filePath, hits);
  if (!had) entry.fileCount = entry.files.size;
  scheduleInvalidate(entry);
}

function scheduleInvalidate(entry) {
  if (entry.invalidateTimer) return;
  entry.invalidateTimer = setTimeout(() => {
    entry.invalidateTimer = null;
    if (broadcastFn) broadcastFn('backlinks:invalidated', { wurzel: entry.wurzel });
  }, INVALIDATE_DEBOUNCE_MS);
}

// Eine Pane gibt die Wurzel frei. Bei refCount == 0 startet der Soft-Timer.
// Wird in dieser Zeit erneut ensureIndex aufgerufen, wird der Timer abgebrochen.
function releaseRoot(rootPath) {
  const entry = indexes.get(rootPath);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount > 0) return;
  if (entry.softTimer) return;
  entry.softTimer = setTimeout(() => {
    teardownIndex(rootPath);
  }, SOFT_TIMEOUT_MS);
}

function teardownIndex(rootPath, opts = {}) {
  const entry = indexes.get(rootPath);
  if (!entry) return;
  if (!opts.force && entry.refCount > 0) return;
  if (entry.softTimer) clearTimeout(entry.softTimer);
  if (entry.invalidateTimer) clearTimeout(entry.invalidateTimer);
  if (entry.watcher) {
    try { entry.watcher.close(); } catch { /* ignore */ }
  }
  indexes.delete(rootPath);
}

// Aufloesung von Wiki-Link-Treffern: zielBasename wird gegen alle Dateien
// im Index gematcht, deren Basename ohne Markdown-Extension passt. Mehrere
// Treffer pro Wiki-Link sind erlaubt (Namens-Konflikt).
function resolveWikiLink(entry, zielBasename) {
  const wanted = zielBasename.replace(MD_EXT_RE, '');
  const out = [];
  for (const f of entry.files.keys()) {
    const baseNoExt = path.basename(f).replace(MD_EXT_RE, '');
    if (baseNoExt === wanted) out.push(f);
  }
  return out;
}

// Liefert alle Treffer in der Wurzel, deren Ziel die aktive Datei ist.
function collectBacklinksFor(activeFile, entry) {
  const activeAbs = path.resolve(activeFile);
  const groups = new Map(); // quelldatei -> Array<{zeile, anker, snippet, linkTyp}>
  for (const [src, hits] of entry.files) {
    if (src === activeAbs) continue; // Eigen-Referenz ueberspringen
    for (const h of hits) {
      let isMatch = false;
      if (h.linkTyp === 'wiki') {
        const candidates = resolveWikiLink(entry, h.zielBasename);
        if (candidates.includes(activeAbs)) isMatch = true;
      } else if (h.linkTyp === 'md') {
        // Markdown-Link kann ohne .md-Endung gesetzt sein? Unser Regex faengt
        // nur .md-aehnliche Endungen, also direkter Vergleich:
        if (h.zielAbsolut === activeAbs) isMatch = true;
      }
      if (!isMatch) continue;
      if (!groups.has(src)) groups.set(src, []);
      groups.get(src).push({
        zeile: h.zeile,
        anker: h.anker,
        snippet: h.snippet,
        linkTyp: h.linkTyp,
      });
    }
  }
  // In Group-Listen nach Zeile sortieren, Groups nach Pfad.
  const result = [];
  for (const [quelldatei, hits] of groups) {
    hits.sort((a, b) => a.zeile - b.zeile);
    result.push({ quelldatei, hits });
  }
  result.sort((a, b) => a.quelldatei.localeCompare(b.quelldatei));
  return result;
}

// Haupt-API fuer den IPC-Handler in main.js. Bestimmt die Wurzel zur
// aktiven Datei, sorgt fuer den Index, liefert das Status-Payload zurueck.
function backlinksFor(filePath) {
  if (!filePath) {
    return { status: 'unavailable' };
  }
  const root = rootFor(filePath);
  if (!root) return { status: 'unavailable' };
  const entry = ensureIndex(root);
  if (entry.status === 'oversized') {
    return {
      status: 'oversized',
      meta: { wurzel: root, fileCount: entry.fileCount, byteSize: entry.byteSize },
    };
  }
  if (entry.status === 'indexing') {
    return { status: 'indexing', meta: { wurzel: root } };
  }
  const results = collectBacklinksFor(filePath, entry);
  return {
    status: 'ready',
    meta: { wurzel: root, fileCount: entry.fileCount },
    results,
  };
}

// Liefert den aktuellen Wurzel-Pfad fuer eine Datei (fuer Refcount-Release).
function rootForActiveFile(filePath) {
  return rootFor(filePath);
}

// Liefert true, wenn eine Datei zu der gegebenen Wurzel gehoert
// (== gleiche depth-2-Hierarchie, primitiv ueber Prefix-Match).
function fileBelongsToRoot(filePath, rootPath) {
  if (!filePath || !rootPath) return false;
  const abs = path.resolve(filePath);
  return abs === rootPath || abs.startsWith(rootPath + path.sep);
}

// 4T-0020: Lookup fuer den Markdown-Linter. Liefert fuer eine Liste von
// Wiki-Link-Basenames das Set derjenigen, deren Ziel im Suchraum der aktiven
// Datei existiert. Aufrufer (Renderer-Linter) entscheidet anhand des Status,
// ob er die broken-wiki-link-Regel anwenden darf:
// - 'ready': Index ist verfuegbar, 'existing' ist verbindlich.
// - 'indexing': Index wird gerade aufgebaut, Regel temporaer unterdruecken.
// - 'unavailable': kein Suchraum (z.B. unbenannte Datei) oder Index
//   oversized, Regel ebenfalls unterdruecken.
// Es wird hier KEIN ensureIndex aufgerufen, sondern nur ein bereits
// vorhandener Index genutzt. Damit triggert der Linter keinen Index-Aufbau
// neben dem ohnehin laufenden Backlinks-Panel-Pfad — das wuerde Refcount-
// und Soft-Timer-Logik durcheinanderbringen.
function existingWikiTargets(filePath, basenames) {
  if (!filePath || !Array.isArray(basenames)) {
    return { status: 'unavailable', existing: [] };
  }
  const root = rootFor(filePath);
  if (!root) return { status: 'unavailable', existing: [] };
  const entry = indexes.get(root);
  if (!entry) return { status: 'unavailable', existing: [] };
  if (entry.status === 'oversized') return { status: 'unavailable', existing: [] };
  if (entry.status === 'indexing') return { status: 'indexing', existing: [] };
  const existing = [];
  for (const name of basenames) {
    if (typeof name !== 'string' || !name) continue;
    if (resolveWikiLink(entry, name).length > 0) existing.push(name);
  }
  return { status: 'ready', existing };
}

module.exports = {
  attachBroadcast,
  backlinksFor,
  releaseRoot,
  rootForActiveFile,
  fileBelongsToRoot,
  // 4T-0020: Linter-Lookup fuer broken-wiki-link.
  existingWikiTargets,
};
