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
// 4T-0050 (Epic 3E-0010): js-yaml fuer Frontmatter-Aliases-Auswertung.
// Dieselbe Library wie in preload.js; SAFE-Schema, kein Code-Eval.
const yaml = require('js-yaml');

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

// 4T-0050: Frontmatter-Schluss-Erkennung. '---' oder '...' am Zeilenanfang.
// Halt-Heuristik identisch zur extractFrontmatter in preload.js, damit
// Backlinks-Index und Render-Pfad denselben Block-Bereich erkennen.
const FRONTMATTER_END_LINE = /^(---|\.\.\.)\s*$/;

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
// 4T-0050: Liefert zusaetzlich die Aliases aus dem YAML-Frontmatter (Feld
// `aliases:`, Liste oder einzelner String). Wiki-Link- und Markdown-Link-
// Scan ueberspringt Frontmatter-Zeilen, damit YAML-Inhalte nicht als
// ausgehende Links indexiert werden.
function parseFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { hits: [], aliases: [] };
  }
  const dir = path.dirname(filePath);
  const lines = content.split(/\r?\n/);

  // 4T-0050: Frontmatter erkennen. Heuristik wie in preload.js:
  // Zeile 1 muss genau '---' sein, Schluss-Zeile '---' oder '...' an
  // exaktem Zeilenanfang. fmBodyStartLine ist die 0-basierte Index der
  // ersten Markdown-Zeile nach dem Frontmatter (oder 0, wenn kein
  // Frontmatter erkannt).
  let fmBodyStartLine = 0;
  let aliases = [];
  if (lines.length >= 2 && lines[0].trimEnd() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (FRONTMATTER_END_LINE.test(lines[i])) {
        fmBodyStartLine = i + 1;
        // YAML-Block ist lines[1..i-1].
        const yamlText = lines.slice(1, i).join('\n');
        try {
          const parsed = yaml.load(yamlText, { schema: yaml.JSON_SCHEMA });
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            aliases = normalizeAliases(parsed.aliases);
          }
        } catch {
          // Parse-Fehler: keine Aliases, Body trotzdem ab Schluss-Zeile.
          aliases = [];
        }
        break;
      }
    }
  }

  const out = [];
  for (let i = fmBodyStartLine; i < lines.length; i++) {
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
  return { hits: out, aliases };
}

// 4T-0050: Normalisiert das aliases-Feld eines Frontmatter-Objekts zu einer
// Array<string>-Liste. Akzeptierte YAML-Formen:
//   aliases: MV                    -> ['MV']
//   aliases: [MV, Viewer]          -> ['MV', 'Viewer']
//   aliases:
//     - MV
//     - Viewer                     -> ['MV', 'Viewer']
// Einzelne Werte werden getrimmt; leere Strings, null/undefined und Nicht-
// Strings ausgefiltert.
function normalizeAliases(raw) {
  if (raw === null || raw === undefined) return [];
  if (typeof raw === 'string') {
    const v = raw.trim();
    return v ? [v] : [];
  }
  if (Array.isArray(raw)) {
    const out = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        const v = item.trim();
        if (v) out.push(v);
      }
    }
    return out;
  }
  return [];
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
    // 4T-0050: Aliases pro Datei (Original-Casing aus dem YAML) plus inverse
    // Map alias-lowercase -> Set von Datei-Pfaden. Inverse Map fuer schnelles
    // Lookup beim Wiki-Link-Klick und im Linter.
    aliasesPerFile: new Map(),
    aliasMap: new Map(),
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
    const parsed = parseFile(f);
    entry.files.set(f, parsed.hits);
    if (parsed.aliases.length > 0) {
      entry.aliasesPerFile.set(f, parsed.aliases);
      addToAliasMap(entry, f, parsed.aliases);
    }
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
      entry.files.delete(filePath);
      entry.fileCount = entry.files.size;
      // 4T-0050: Aliases der entfallenen Datei aus den Maps austragen.
      const prevAliases = entry.aliasesPerFile.get(filePath);
      if (prevAliases) {
        removeFromAliasMap(entry, filePath, prevAliases);
        entry.aliasesPerFile.delete(filePath);
      }
      // byteSize nur grob; wir laufen nicht jedesmal Vollscan, akzeptabel.
      scheduleInvalidate(entry);
    }
    return;
  }
  // add oder change
  const parsed = parseFile(filePath);
  const had = entry.files.has(filePath);
  entry.files.set(filePath, parsed.hits);
  if (!had) entry.fileCount = entry.files.size;
  // 4T-0050: Aliases aktualisieren. Alte raus, neue rein. Bei change kann
  // sich die Liste in beide Richtungen aendern; Diff-Logik nutzt vorhandene
  // aliasesPerFile-Map.
  const prevAliases = entry.aliasesPerFile.get(filePath) || [];
  removeFromAliasMap(entry, filePath, prevAliases);
  if (parsed.aliases.length > 0) {
    entry.aliasesPerFile.set(filePath, parsed.aliases);
    addToAliasMap(entry, filePath, parsed.aliases);
  } else {
    entry.aliasesPerFile.delete(filePath);
  }
  scheduleInvalidate(entry);
}

// 4T-0050: Helfer fuer die inverse Alias-Map. Schluessel ist Alias-Lowercase
// (case-insensitive Lookup), Werte sind Sets von Datei-Pfaden (mehrere
// Dateien koennen denselben Alias fuehren). Leere Sets werden geloescht,
// damit aliasMap.has() ein verlaesslicher Existenz-Check bleibt.
function addToAliasMap(entry, filePath, aliases) {
  for (const a of aliases) {
    const key = a.trim().toLowerCase();
    if (!key) continue;
    let set = entry.aliasMap.get(key);
    if (!set) {
      set = new Set();
      entry.aliasMap.set(key, set);
    }
    set.add(filePath);
  }
}

function removeFromAliasMap(entry, filePath, aliases) {
  for (const a of aliases) {
    const key = a.trim().toLowerCase();
    if (!key) continue;
    const set = entry.aliasMap.get(key);
    if (!set) continue;
    set.delete(filePath);
    if (set.size === 0) entry.aliasMap.delete(key);
  }
}

// 4T-0050: Liefert alle Dateien im Index, die den gegebenen Alias fuehren.
// Case-insensitive Lookup. Leeres Array bei keinem Treffer.
function filesByAlias(entry, alias) {
  if (!alias) return [];
  const set = entry.aliasMap.get(String(alias).trim().toLowerCase());
  if (!set) return [];
  return [...set];
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
// 4T-0050: Aliases-aware. Ein Wiki-Link [[MV]] aus quelle.md gilt als
// Backlink auf die aktive Datei, wenn entweder
//   (a) die aktive Datei den Basename 'MV' hat, oder
//   (b) die aktive Datei einen Alias 'MV' im Frontmatter fuehrt.
// Im Treffer wird viaAlias='MV' gesetzt, wenn (b) zutrifft; sonst null.
function collectBacklinksFor(activeFile, entry) {
  const activeAbs = path.resolve(activeFile);
  // 4T-0050: Aliases der aktiven Datei (case-insensitive Vergleich gegen
  // Wiki-Link-Basenames der Quelldateien).
  const activeAliases = entry.aliasesPerFile.get(activeAbs) || [];
  const activeAliasesLower = new Set(activeAliases.map((a) => a.trim().toLowerCase()));
  const activeBasenameLower = path.basename(activeAbs).replace(MD_EXT_RE, '').toLowerCase();
  const groups = new Map(); // quelldatei -> Array<{zeile, anker, snippet, linkTyp, viaAlias}>
  for (const [src, hits] of entry.files) {
    if (src === activeAbs) continue; // Eigen-Referenz ueberspringen
    for (const h of hits) {
      let isMatch = false;
      let viaAlias = null;
      if (h.linkTyp === 'wiki') {
        // Direkter Datei-Treffer (Basename-Match).
        const candidates = resolveWikiLink(entry, h.zielBasename);
        if (candidates.includes(activeAbs)) {
          isMatch = true;
        } else {
          // 4T-0050: Alias-Match? Nur greifen, wenn kein direkter
          // Datei-Treffer existiert (sonst wuerde ein Wiki-Link auf eine
          // echte Datei zusaetzlich als Alias-Backlink auftauchen). Wenn
          // candidates.length === 0 und der Basename ein Alias der aktiven
          // Datei ist, gilt der Link.
          if (candidates.length === 0) {
            const targetLower = String(h.zielBasename || '').trim().toLowerCase();
            if (targetLower && targetLower === activeBasenameLower) {
              // Sollte nicht passieren, weil resolveWikiLink den Basename
              // matchen wuerde — Defensiv-Fallback.
              isMatch = true;
            } else if (targetLower && activeAliasesLower.has(targetLower)) {
              isMatch = true;
              viaAlias = h.zielBasename;
            }
          }
        }
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
        viaAlias,
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
    // 4T-0050: Ein Wiki-Link-Basename gilt als 'existing', wenn er
    // entweder direkt einer Datei entspricht oder als Alias gefuehrt wird.
    if (resolveWikiLink(entry, name).length > 0 || filesByAlias(entry, name).length > 0) {
      existing.push(name);
    }
  }
  return { status: 'ready', existing };
}

// 4T-0050: Aufloesung eines Wiki-Link-Basenames ueber den Alias-Index.
// Wird vom Renderer aufgerufen, wenn die direkte Datei (basename.md
// relativ zum aktiven Dokument) nicht existiert. Liefert alle Dateien,
// die den gegebenen Basename als Alias fuehren.
//
// Rueckgabe:
//   { status: 'ready'|'indexing'|'unavailable', candidates: string[], viaAlias: string|null }
//
// candidates ist:
//   []         : kein Alias-Treffer (Linter markiert spaeter als broken)
//   [pfad]     : eindeutiger Alias-Treffer (Renderer oeffnet direkt)
//   [p1, p2..] : mehrdeutiger Alias-Treffer (Renderer zeigt Auswahl-Dialog)
//
// viaAlias enthaelt den eingegebenen Alias-Text (zur Anzeige im Dialog).
function resolveWikiTargetByAlias(activeFile, basename) {
  if (!activeFile || typeof basename !== 'string' || !basename) {
    return { status: 'unavailable', candidates: [], viaAlias: null };
  }
  const root = rootFor(activeFile);
  if (!root) return { status: 'unavailable', candidates: [], viaAlias: null };
  const entry = indexes.get(root);
  if (!entry) return { status: 'unavailable', candidates: [], viaAlias: null };
  if (entry.status === 'oversized') return { status: 'unavailable', candidates: [], viaAlias: null };
  if (entry.status === 'indexing') return { status: 'indexing', candidates: [], viaAlias: null };
  const candidates = filesByAlias(entry, basename);
  return {
    status: 'ready',
    candidates,
    viaAlias: candidates.length > 0 ? basename : null,
  };
}

module.exports = {
  attachBroadcast,
  backlinksFor,
  releaseRoot,
  rootForActiveFile,
  fileBelongsToRoot,
  // 4T-0020: Linter-Lookup fuer broken-wiki-link.
  existingWikiTargets,
  // 4T-0050: Aliases-Aufloesung fuer Wiki-Link-Klick.
  resolveWikiTargetByAlias,
};
