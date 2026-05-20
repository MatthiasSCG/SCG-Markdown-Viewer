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

// 4T-0054: Heading-Slug-Berechnung. Identisch zur githubLikeSlug-Funktion
// in preload.js — duplizert, damit backlinks.js (Main-Modul) keine Preload-
// Imports braucht. Bei einer spaeteren Helper-Konsolidierung kann das in
// ein gemeinsames Modul gehoben werden.
function githubLikeSlug(text) {
  const normalized = String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]/gu, '');
  return normalized || 'section';
}

// 4T-0054: ATX-Heading-Erkennung (1-6 Hashes plus mind. ein Leerzeichen).
// Optionaler Trailing-Hash (`# Heading #`) wird abgeschnitten.
const HEADING_RE = /^#{1,6}\s+(.+?)(?:\s+#{1,6})?\s*$/;
// 4T-0054: Block-Anker am Zeilenende. \p{L}/\p{N} erlauben Umlaute und
// Unicode-Buchstaben in der ID.
const BLOCK_ANCHOR_RE = /\s+\^([\p{L}\p{N}_-]+)\s*$/u;
// 4T-0054: Fenced-Code-Block-Marker fuer Wiki-Link-/Heading-Tracking.
const FENCE_RE = /^\s{0,3}(```+|~~~+)/;

// 4T-0056: Inline-Tags `#tag` im Body. Gleiches Pattern wie tagsPlugin in
// preload.js. Negativer Look-behind verhindert Treffer mitten in Woertern
// (z.B. 'foo#bar') und nach `##` (Markdown-Heading-Doppelhash).
const TAG_RE = /(?<![\p{L}\p{N}_#])#([\p{L}\p{N}_/-]+)/gu;

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
    return { hits: [], aliases: [], headings: [], blockIds: [], tags: [] };
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
  const tagsSet = new Set(); // Sammelt Inline- und Frontmatter-Tags (case-preserving)
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
            // 4T-0056: Frontmatter-Tags akzeptieren YAML-Liste, einzelnen
            // String oder mehrzeilige Liste. Normalisierungs-Funktion wird
            // mit Aliases geteilt.
            const fmTags = normalizeAliases(parsed.tags);
            for (const t of fmTags) {
              // Inline-Tags duerfen kein '/' am Anfang/Ende haben; gleicher
              // Filter fuer Frontmatter-Tags zur Konsistenz.
              if (t && !t.startsWith('/') && !t.endsWith('/')) {
                tagsSet.add(t);
              }
            }
          }
        } catch {
          // Parse-Fehler: keine Aliases/Tags, Body trotzdem ab Schluss-Zeile.
          aliases = [];
        }
        break;
      }
    }
  }

  const out = [];
  // 4T-0054: Pro Datei zusaetzlich Heading-Slugs und Block-IDs sammeln,
  // damit existingWikiTargets Anker-Prueferungen machen kann. Fenced-
  // Code-Bloecke werden uebersprungen, damit Markdown-Beispiele im Code
  // nicht als echte Headings/Block-IDs zaehlen.
  const headings = [];
  const blockIds = [];
  let inFence = false;
  let fenceChar = null;

  for (let i = fmBodyStartLine; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Fenced-Code-Tracking.
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const ch = marker.charAt(0);
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
      } else if (ch === fenceChar) {
        inFence = false;
        fenceChar = null;
      }
      continue;
    }
    if (inFence) continue;

    // 4T-0054: Heading-Erkennung (ATX).
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const slug = githubLikeSlug(headingMatch[1]);
      if (slug) headings.push(slug);
    }

    // 4T-0054: Block-Anker am Zeilenende.
    const blockMatch = line.match(BLOCK_ANCHOR_RE);
    if (blockMatch) {
      blockIds.push(blockMatch[1]);
    }

    // 4T-0056: Inline-Tags `#tag` sammeln. Code-Bloecke sind durch das
    // inFence-Flag schon ausgeschlossen. Ein Tag mitten in einem Inline-
    // Code (`#tag`) wuerde theoretisch falsch gezaehlt; im Praxis-Workflow
    // selten und ohne grossen Schaden.
    TAG_RE.lastIndex = 0;
    let tagMatch;
    while ((tagMatch = TAG_RE.exec(line)) !== null) {
      const tag = tagMatch[1];
      if (!tag.startsWith('/') && !tag.endsWith('/')) {
        tagsSet.add(tag);
      }
    }

    // Wiki-Links
    WIKI_LINK_RE.lastIndex = 0;
    let m;
    while ((m = WIKI_LINK_RE.exec(line)) !== null) {
      const target = m[1].trim();
      if (!target) continue;
      // Anker im Wiki-Link: [[Foo#anker]] -> ziel=Foo, anker=anker.
      // Auch [[#Anker]] (reiner Anker im selben Doc) wird erkannt, aber
      // als ausgehender Backlink uebersprungen — ein interner Anker ist
      // kein Verweis auf eine andere Datei.
      let anker = null;
      let ziel = target;
      const hashIdx = target.indexOf('#');
      if (hashIdx >= 0) {
        anker = target.slice(hashIdx + 1).trim() || null;
        ziel = target.slice(0, hashIdx).trim();
      }
      if (!ziel) continue; // 4T-0054: reiner Anker — kein externer Backlink
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
  return { hits: out, aliases, headings, blockIds, tags: [...tagsSet] };
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
    // 4T-0054: Heading-Slugs und Block-IDs pro Datei fuer Anker-Pruefung
    // im Linter. Sets fuer O(1)-Lookup.
    //   anchorsPerFile: Map<absPath, { headings: Set<slug>, blockIds: Set<id> }>
    anchorsPerFile: new Map(),
    // 4T-0056: Tags pro Datei (Inline + Frontmatter) plus inverse Map fuer
    // O(1)-Lookup beim Filtern. tagsPerFile speichert Original-Casing,
    // tagMap-Schluessel ist Lowercase fuer case-insensitive Filter.
    //   tagsPerFile: Map<absPath, string[]>
    //   tagMap:      Map<tagLower, Set<absPath>>
    tagsPerFile: new Map(),
    tagMap: new Map(),
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
    // 4T-0054: Headings und Block-IDs pro Datei speichern.
    if (parsed.headings.length > 0 || parsed.blockIds.length > 0) {
      entry.anchorsPerFile.set(f, {
        headings: new Set(parsed.headings),
        blockIds: new Set(parsed.blockIds),
      });
    }
    // 4T-0056: Tags pro Datei speichern und in die inverse Map eintragen.
    if (parsed.tags && parsed.tags.length > 0) {
      entry.tagsPerFile.set(f, parsed.tags);
      addToTagMap(entry, f, parsed.tags);
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
      // 4T-0054: Anker-Map ebenfalls aufraeumen.
      entry.anchorsPerFile.delete(filePath);
      // 4T-0056: Tags der entfallenen Datei aus den Maps austragen.
      const prevTags = entry.tagsPerFile.get(filePath);
      if (prevTags) {
        removeFromTagMap(entry, filePath, prevTags);
        entry.tagsPerFile.delete(filePath);
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
  // 4T-0054: Anker-Map aktualisieren. Headings und Block-IDs koennen sich
  // pro Datei aendern (neue Heading hinzugefuegt, Block-Anker geloescht);
  // wir setzen die Sets jedesmal neu.
  if (parsed.headings.length > 0 || parsed.blockIds.length > 0) {
    entry.anchorsPerFile.set(filePath, {
      headings: new Set(parsed.headings),
      blockIds: new Set(parsed.blockIds),
    });
  } else {
    entry.anchorsPerFile.delete(filePath);
  }
  // 4T-0056: Tags aktualisieren. Diff-Logik analog zu Aliases.
  const prevTags = entry.tagsPerFile.get(filePath) || [];
  removeFromTagMap(entry, filePath, prevTags);
  if (parsed.tags && parsed.tags.length > 0) {
    entry.tagsPerFile.set(filePath, parsed.tags);
    addToTagMap(entry, filePath, parsed.tags);
  } else {
    entry.tagsPerFile.delete(filePath);
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

// 4T-0056: Helfer fuer die inverse Tag-Map. Schluessel ist Tag-Lowercase
// (case-insensitive Lookup), Werte sind Sets von Datei-Pfaden. Identisches
// Pattern zur Alias-Map.
function addToTagMap(entry, filePath, tags) {
  for (const t of tags) {
    const key = String(t || '').trim().toLowerCase();
    if (!key) continue;
    let set = entry.tagMap.get(key);
    if (!set) {
      set = new Set();
      entry.tagMap.set(key, set);
    }
    set.add(filePath);
  }
}

function removeFromTagMap(entry, filePath, tags) {
  for (const t of tags) {
    const key = String(t || '').trim().toLowerCase();
    if (!key) continue;
    const set = entry.tagMap.get(key);
    if (!set) continue;
    set.delete(filePath);
    if (set.size === 0) entry.tagMap.delete(key);
  }
}

// 4T-0056: Liefert alle Tags der Wurzel sortiert nach Haeufigkeit
// (absteigend), bei Gleichstand alphabetisch. Tag-Casing: das erste
// gesehene Casing wird beibehalten (deterministisch durch Iteration der
// tagMap-Schluessel-Reihenfolge).
function getAllTagsWithCounts(entry) {
  if (!entry || !entry.tagMap) return [];
  const out = [];
  for (const [keyLower, set] of entry.tagMap) {
    let displayTag = keyLower;
    // Original-Casing aus tagsPerFile-Map suchen (erstes Vorkommen).
    for (const filePath of set) {
      const fileTags = entry.tagsPerFile.get(filePath) || [];
      const found = fileTags.find((t) => String(t).toLowerCase() === keyLower);
      if (found) { displayTag = found; break; }
    }
    out.push({ tag: displayTag, count: set.size });
  }
  out.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag);
  });
  return out;
}

// 4T-0056: Liefert alle Dateien im Index, die den gegebenen Tag fuehren.
// Case-insensitive Lookup. Pfade alphabetisch sortiert fuer deterministische
// Anzeige in der Sidebar.
function filesForTag(entry, tag) {
  if (!tag) return [];
  const set = entry.tagMap.get(String(tag).trim().toLowerCase());
  if (!set) return [];
  return [...set].sort((a, b) => a.localeCompare(b));
}

// 4T-0056: High-level-API fuer Renderer. Liefert Tag-Liste mit Counts
// und ggf. Datei-Liste fuer einen ausgewaehlten Filter-Tag. Pattern
// analog zu backlinksFor: kein ensureIndex-Aufruf, nutzt nur vorhandenen
// Index.
function tagsFor(filePath, filterTag) {
  if (!filePath) return { status: 'unavailable' };
  const root = rootFor(filePath);
  if (!root) return { status: 'unavailable' };
  const entry = indexes.get(root);
  if (!entry) return { status: 'unavailable' };
  if (entry.status === 'oversized') {
    return {
      status: 'oversized',
      meta: { wurzel: root, fileCount: entry.fileCount, byteSize: entry.byteSize },
    };
  }
  if (entry.status === 'indexing') {
    return { status: 'indexing', meta: { wurzel: root } };
  }
  const tags = getAllTagsWithCounts(entry);
  const result = {
    status: 'ready',
    meta: { wurzel: root, fileCount: entry.fileCount },
    tags,
  };
  if (filterTag) {
    result.filterTag = filterTag;
    result.files = filesForTag(entry, filterTag);
  }
  return result;
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
function existingWikiTargets(filePath, targets) {
  if (!filePath || !Array.isArray(targets)) {
    return { status: 'unavailable', existing: [], brokenAnchor: [] };
  }
  const root = rootFor(filePath);
  if (!root) return { status: 'unavailable', existing: [], brokenAnchor: [] };
  const entry = indexes.get(root);
  if (!entry) return { status: 'unavailable', existing: [], brokenAnchor: [] };
  if (entry.status === 'oversized') return { status: 'unavailable', existing: [], brokenAnchor: [] };
  if (entry.status === 'indexing') return { status: 'indexing', existing: [], brokenAnchor: [] };
  const existing = [];
  const brokenAnchor = [];
  const activeFileAbs = path.resolve(filePath);

  for (const target of targets) {
    if (typeof target !== 'string' || !target) continue;
    // 4T-0054: Anker-Trennung. '#' beendet den Pfad-Teil. Reiner Anker
    // ('#Heading' oder '#^id') zaehlt gegen die aktive Datei selbst.
    let basename = target;
    let anchor = null;
    const hashIdx = target.indexOf('#');
    if (hashIdx >= 0) {
      basename = target.slice(0, hashIdx);
      anchor = target.slice(hashIdx + 1).trim() || null;
    }

    // Reiner Anker: prueft gegen die aktive Datei.
    if (!basename) {
      if (anchor && anchorExistsInFile(entry, activeFileAbs, anchor)) {
        existing.push(target);
      } else if (anchor) {
        brokenAnchor.push(target);
      }
      // Falls weder basename noch anchor: stiller Skip.
      continue;
    }

    // 4T-0050: Datei direkt oder ueber Alias auflösen.
    let candidates = resolveWikiLink(entry, basename);
    if (candidates.length === 0) {
      candidates = filesByAlias(entry, basename);
    }
    if (candidates.length === 0) {
      // Datei existiert nicht — kein 'existing'-Eintrag, kein
      // 'brokenAnchor'-Eintrag. Renderer markiert spaeter als broken-link.
      continue;
    }

    if (!anchor) {
      existing.push(target);
      continue;
    }

    // 4T-0054: Anker pruefen. Es reicht, wenn EIN Kandidat den Anker fuehrt.
    let anchorOk = false;
    for (const candPath of candidates) {
      if (anchorExistsInFile(entry, candPath, anchor)) {
        anchorOk = true;
        break;
      }
    }
    if (anchorOk) existing.push(target);
    else brokenAnchor.push(target);
  }
  return { status: 'ready', existing, brokenAnchor };
}

// 4T-0054: Prueft, ob die Datei einen Heading-Slug oder eine Block-ID
// fuehrt, die dem Anker entspricht. Anker mit '^'-Prefix sind Block-IDs;
// alle anderen werden via githubLikeSlug zu einem Slug normalisiert und
// gegen die Heading-Slugs der Datei geprueft.
function anchorExistsInFile(entry, filePath, anchor) {
  if (!entry || !entry.anchorsPerFile) return false;
  const meta = entry.anchorsPerFile.get(filePath);
  if (!meta) return false;
  if (typeof anchor !== 'string' || !anchor) return false;
  if (anchor.startsWith('^')) {
    const id = anchor.slice(1);
    return meta.blockIds.has(id);
  }
  const slug = githubLikeSlug(anchor);
  return meta.headings.has(slug);
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

// 4T-0055 (Epic 3E-0011): Schneidet aus dem Datei-Inhalt einen Anker-
// Snippet heraus. Wird vom embed:read-IPC-Handler genutzt fuer Markdown-
// Embeds mit Anker (![[Datei#Heading]] / ![[Datei#^id]]).
//
// Bei Heading-Anker: von der Heading-Zeile bis zur naechsten Heading mit
// gleichem oder hoeherem Rang (oder Datei-Ende). Heading-Zeile selbst ist
// Teil des Snippets. Fenced-Code-Bloecke werden uebersprungen, damit
// Markdown-Beispiele im Code nicht versehentlich als Heading gefunden
// werden.
//
// Bei Block-Anker (anchor.startsWith('^')): die Zeile mit dem Block-Marker
// wird zurueckgegeben (ohne den `^id`-Marker selbst). Mehrzeilige Block-
// Konstrukte (Listen-Items mit Sub-Inhalt) werden nicht extrahiert; das
// waere eine spaetere Erweiterung.
//
// Liefert null, wenn der Anker nicht gefunden wurde.
function extractEmbedSnippet(content, anchor) {
  if (!anchor) return content;
  const lines = String(content || '').split(/\r?\n/);

  if (anchor.startsWith('^')) {
    const id = anchor.slice(1);
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\s+\\^${escapedId}\\s*$`, 'u');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        return lines[i].replace(re, '');
      }
    }
    return null;
  }

  const wantedSlug = githubLikeSlug(anchor);
  let startLine = -1;
  let headingLevel = 0;
  let inFence = false;
  let fenceChar = null;
  for (let i = 0; i < lines.length; i++) {
    const fenceMatch = lines[i].match(FENCE_RE);
    if (fenceMatch) {
      const ch = fenceMatch[1].charAt(0);
      if (!inFence) { inFence = true; fenceChar = ch; }
      else if (ch === fenceChar) { inFence = false; fenceChar = null; }
      continue;
    }
    if (inFence) continue;
    const m = lines[i].match(HEADING_RE);
    if (m && githubLikeSlug(m[1]) === wantedSlug) {
      startLine = i;
      headingLevel = (lines[i].match(/^(#{1,6})/) || ['', ''])[1].length;
      break;
    }
  }
  if (startLine < 0) return null;

  let endLine = lines.length;
  inFence = false;
  fenceChar = null;
  for (let i = startLine + 1; i < lines.length; i++) {
    const fenceMatch = lines[i].match(FENCE_RE);
    if (fenceMatch) {
      const ch = fenceMatch[1].charAt(0);
      if (!inFence) { inFence = true; fenceChar = ch; }
      else if (ch === fenceChar) { inFence = false; fenceChar = null; }
      continue;
    }
    if (inFence) continue;
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= headingLevel) {
      endLine = i;
      break;
    }
  }
  return lines.slice(startLine, endLine).join('\n');
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
  // 4T-0055: Anker-Snippet-Extraktion fuer Wiki-Embeds.
  extractEmbedSnippet,
  // 4T-0056: Tag-System.
  tagsFor,
};
