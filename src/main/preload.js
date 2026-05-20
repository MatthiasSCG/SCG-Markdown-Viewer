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
// 4T-0049 (Epic 3E-0010): js-yaml fuer YAML-Frontmatter-Parsing. SAFE_SCHEMA
// erlaubt nur Standard-YAML-Typen, kein eval/Code-Ausfuehrung. Wir nutzen es
// hier nur zum Lesen; Round-Trip-Schreiben passiert ueber die yaml-Library
// (siehe unten), die Kommentare und Schluesselreihenfolge erhaelt.
const yaml = require('js-yaml');
// 4T-0051 (Epic 3E-0010): yaml-Library (Eemeli) mit Document-API fuer
// Round-Trip-faehiges Schreiben. parseDocument liefert ein Dokument-Objekt,
// dessen set/delete-Operationen Stil und Kommentare der nicht angefassten
// Felder erhalten. Nur geaenderte Felder werden im Output neu serialisiert.
const yamlDoc = require('yaml');

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

// 4T-0049 (Epic 3E-0010): YAML-Frontmatter erkennen und vom Render-Pfad
// ausklammern. Akzeptiert wird nur ein Block, der mit '---' in Zeile 1
// oeffnet und mit '---' oder '...' in einer spaeteren Zeile schliesst.
// Ein einzelnes '---' am Datei-Anfang ohne Schluss ist regulaere Markdown-
// Trennlinie und wird nicht als Frontmatter behandelt. Bei Parse-Fehlern
// wird data=null und parseError=<message> zurueckgegeben; raw und body
// bleiben korrekt, damit der Render-Pfad nicht stoeren.
function extractFrontmatter(text) {
  const source = String(text || '');
  if (!source.startsWith('---')) {
    return { raw: null, data: null, body: source, parseError: null, endOffset: 0 };
  }
  // Erste Zeile muss genau '---' (gefolgt von \n oder \r\n oder EOF) sein.
  const firstLineEnd = source.indexOf('\n');
  const firstLine = firstLineEnd >= 0 ? source.slice(0, firstLineEnd).trimEnd() : source.trimEnd();
  if (firstLine !== '---') {
    return { raw: null, data: null, body: source, parseError: null, endOffset: 0 };
  }
  if (firstLineEnd < 0) {
    // Datei besteht nur aus '---' ohne Newline danach: keine Frontmatter.
    return { raw: null, data: null, body: source, parseError: null, endOffset: 0 };
  }
  // Suche die naechste Schliess-Zeile ('---' oder '...') exakt an Zeilenanfang.
  const closeRegex = /\r?\n(---|\.\.\.)[ \t]*(\r?\n|$)/;
  const rest = source.slice(firstLineEnd);
  const match = rest.match(closeRegex);
  if (!match) {
    // Oeffnender '---'-Block ohne Schluss: keine Frontmatter, regulaeres
    // Dokument. Damit wird ein versehentliches '---' am Datei-Anfang nicht
    // als halbgeschluckter Block interpretiert.
    return { raw: null, data: null, body: source, parseError: null, endOffset: 0 };
  }
  const blockBodyStart = firstLineEnd + 1; // Position nach erstem \n
  const blockBodyEnd = firstLineEnd + match.index; // vor dem schliessenden \n
  const yamlText = source.slice(blockBodyStart, blockBodyEnd);
  const endOffset = firstLineEnd + match.index + match[0].length;
  const raw = source.slice(0, endOffset);
  const body = source.slice(endOffset);
  let data = null;
  let parseError = null;
  try {
    const parsed = yaml.load(yamlText, { schema: yaml.JSON_SCHEMA });
    // Nur Objekte akzeptieren (kein Skalar als Frontmatter sinnvoll).
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      data = parsed;
    } else if (parsed === null || parsed === undefined) {
      data = {};
    } else {
      parseError = 'frontmatter must be a YAML mapping';
    }
  } catch (err) {
    parseError = err && err.message ? String(err.message) : 'YAML parse error';
  }
  return { raw, data, body, parseError, endOffset };
}

// 4T-0051 (Epic 3E-0010): Schreibt eine modifizierte Frontmatter-Map
// zurueck in den Dokument-Text. Round-Trip-faehig ueber die yaml-Library:
// Kommentare und Schluesselreihenfolge bestehender Felder bleiben erhalten,
// nur tatsaechlich geaenderte Felder werden neu serialisiert.
//
// Parameter:
//   originalText - aktueller Datei-Inhalt (Frontmatter + Body, oder nur Body)
//   newData      - Plain-JS-Objekt mit der Ziel-Map. null/undefined wird zu {}
//
// Rueckgabe:
//   { ok: true,  text: string }                 bei Erfolg
//   { ok: false, error: string, text: null }    bei Fehler
//
// Sonderfaelle:
//   - originalText ohne Frontmatter und newData leer:
//       Text bleibt unveraendert.
//   - originalText mit Frontmatter und newData leer:
//       Frontmatter-Block wird komplett entfernt; Body bleibt erhalten.
//   - originalText ohne Frontmatter und newData mit Feldern:
//       Neuer Frontmatter-Block wird am Anfang eingefuegt.
//   - originalText mit Frontmatter und newData mit Feldern:
//       Diff wird auf das bestehende Document angewendet (set/delete pro Key).
function writeFrontmatter(originalText, newData) {
  try {
    const source = String(originalText || '');
    const fm = extractFrontmatter(source);
    const safeData = (newData && typeof newData === 'object' && !Array.isArray(newData))
      ? newData
      : {};
    const newKeys = Object.keys(safeData);

    // Sonderfall 1: kein Frontmatter und nichts hinzuzufuegen.
    if (newKeys.length === 0 && fm.raw === null) {
      return { ok: true, text: source };
    }
    // Sonderfall 2: Frontmatter komplett entfernen.
    if (newKeys.length === 0 && fm.raw !== null) {
      const stripped = (fm.body || '').replace(/^\r?\n+/, '');
      return { ok: true, text: stripped };
    }

    let doc;
    let buildFresh = false;
    if (fm.raw === null || fm.parseError) {
      // Kein Frontmatter da oder vorhandener Block defekt: neu erzeugen.
      buildFresh = true;
    } else {
      // Bestehendes Document parsen, fuer Round-Trip-Treue.
      const yamlText = fm.raw
        .replace(/^---\r?\n/, '')
        .replace(/\r?\n(---|\.\.\.)\s*\r?\n?$/, '');
      doc = yamlDoc.parseDocument(yamlText);
      // contents kann leer oder kein Mapping sein; in beiden Faellen
      // bauen wir das Dokument frisch auf.
      if (!doc.contents || !doc.contents.items) buildFresh = true;
    }

    if (buildFresh) {
      doc = new yamlDoc.Document();
      doc.contents = doc.createNode(safeData);
    } else {
      const currentJs = doc.toJS() || {};
      // Schritt 1: vorhandene Keys, die in newData nicht mehr sind, loeschen.
      for (const key of Object.keys(currentJs)) {
        if (!Object.prototype.hasOwnProperty.call(safeData, key)) {
          doc.delete(key);
        }
      }
      // Schritt 2: nur tatsaechlich geaenderte/neue Felder neu setzen.
      // Identische Werte bleiben unberuehrt — damit erhaelt yaml.toString()
      // Kommentare und Stilangaben des Original-Knotens.
      for (const key of newKeys) {
        const newValue = safeData[key];
        const currentValue = currentJs[key];
        if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
          doc.set(key, newValue);
        }
      }
    }

    const yamlSerialized = doc.toString().trimEnd();
    const newFrontmatter = `---\n${yamlSerialized}\n---\n`;
    const bodyClean = (fm.body || '').replace(/^\r?\n+/, '');
    const separator = bodyClean ? '\n' : '';
    return { ok: true, text: newFrontmatter + separator + bodyClean };
  } catch (err) {
    const msg = err && err.message ? String(err.message) : 'YAML write error';
    return { ok: false, error: msg, text: null };
  }
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

// 4T-0041 (Epic 3E-0008): Zweite markdown-it-Instanz fuer den HTML-Konverter.
// Unterschied zur Haupt-Instanz md: html=true, damit die vom Konverter
// generierten HTML-Tabellen im Zellinhalt nicht escaped werden, wenn der
// Zellinhalt rekursiv durch mdPortable.render() laeuft. Die scg-table-Fence
// wird hier NICHT ueberschrieben, weil convertMarkdownPortable scg-table-
// Bloecke separat behandelt (Top-Level-Regex + parseScgTableBlock +
// Portable-HTML mit Inline-Styles).
const mdPortable = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
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
mdPortable.use(taskLists, { enabled: false, label: true });
mdPortable.use(markdownItAnchor, { slugify: githubLikeSlug, tabIndex: false, permalink: false });
mdPortable.use(markdownItKatex, { throwOnError: false, errorColor: '#cc0000' });
mdPortable.use(wikiLinksPlugin);

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

// 4T-0044 (Epic 3E-0009): Status-Hervorhebung mit semantischen Klassen.
// Whitelist auf fuenf Werte. Punkt-Notation am Zell-/Zeilen-Marker:
// |.error Inhalt, |-.warn etc. Im Viewer-Render via CSS-Klasse
// status-<value>, im Portable-Export via Inline-Style (siehe Farb-Map).
const SCG_STATUS_CLASSES = new Set(['error', 'warn', 'ok', 'info', 'neutral']);

// Inline-Style-Farben fuer den Portable-Export. Light-Theme-Farben mit
// ausreichendem Kontrast (WCAG-AA), funktioniert in jedem externen
// Markdown-Renderer ohne unsere App-CSS.
const SCG_STATUS_INLINE_COLORS = {
  error:   { bg: '#ffebee', fg: '#b71c1c' },
  warn:    { bg: '#fff8e1', fg: '#8a6d00' },
  ok:      { bg: '#e8f5e9', fg: '#1b5e20' },
  info:    { bg: '#e3f2fd', fg: '#0d47a1' },
  neutral: { bg: '#f5f5f5', fg: '#424242' },
};

// 4T-0044: Erkennt am Anfang eines Marker-Folge-Texts eine Status-Klasse
// in Punkt-Notation (z.B. '.error '). Whitelist-Filter: nur die fuenf
// definierten Werte. Gibt { status, rest } zurueck; bei keinem Match ist
// status=null und rest=text.
function extractScgTableStatusClass(text) {
  const m = String(text || '').match(/^\.(\w+)(\s+|$)/);
  if (m && SCG_STATUS_CLASSES.has(m[1])) {
    return { status: m[1], rest: text.slice(m[0].length) };
  }
  return { status: null, rest: text };
}

// 4T-0037: Baut den HTML-Attribut-String fuer eine Zelle aus dem
// gefilterten attrs-Object plus scope-Setzung fuer Header-Zellen.
// 4T-0044: Optional eine Status-Klasse, die als CSS-Klasse status-<value>
// an die Zelle gehaengt wird.
// 4T-0045: Optional ein Spalten-Default-align (vom Tabellen-Header
// `+cols="..."`), das greift, wenn die Zelle keinen eigenen align hat.
function buildScgTableCellAttrs(attrs, cellType, isHeaderRow, statusClass, columnDefault) {
  const parts = [];
  if (attrs.colspan) parts.push(`colspan="${attrs.colspan}"`);
  if (attrs.rowspan) parts.push(`rowspan="${attrs.rowspan}"`);
  const classes = [];
  if (statusClass) classes.push(`status-${statusClass}`);
  if (attrs.align) {
    classes.push(`align-${attrs.align}`);
  } else if (columnDefault) {
    classes.push(`align-${columnDefault}`);
  }
  if (attrs.valign) classes.push(`valign-${attrs.valign}`);
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`);
  if (cellType === 'th') {
    parts.push(isHeaderRow ? 'scope="col"' : 'scope="row"');
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

// 4T-0040 (Epic 3E-0008, Stufe 3): Rekursionstiefen-Schutz fuer verschachtelte
// scg-tables. Counter wird beim Eintritt in renderScgTable inkrementiert und
// beim Verlassen dekrementiert (try/finally). Beim Erreichen des Limits gibt
// die Funktion null zurueck und der Override im fence-Renderer faellt auf
// den Default (Code-Block) zurueck. Damit ist die innerste Tabelle in einer
// Quelltext-Eingabe mit > MAX_DEPTH Ebenen als Code-Block sichtbar, alle
// aeusseren Tabellen rendern weiterhin korrekt.
let scgTableRecursionDepth = 0;
const SCG_TABLE_MAX_DEPTH = 3;

// 4T-0045/4T-0046 (Epic 3E-0009): Tabellen-Header-Attribute auf der {|-Zeile.
// Aktuell unterstuetzt:
//   +cols="left center right"   -> Spalten-Default-Ausrichtung (4T-0045)
//   +sortable                   -> Tabelle sortierbar (4T-0046)
// Ungueltige Werte werden auf null abgebildet (kein Default fuer diese Spalte).
function parseScgTableHeaderAttrs(headerLine) {
  const result = { columnDefaults: [], sortable: false };
  const text = String(headerLine || '');
  // \b matcht sowohl nach '+' als auch nach Whitespace, sodass die Header-
  // Zeile in beiden Schreibweisen verarbeitet wird: '{|+cols="..."',
  // '{|+sortable cols="..."', '{|+sortable +cols="..."'.
  const colsMatch = text.match(/\bcols="([^"]*)"/);
  if (colsMatch) {
    result.columnDefaults = colsMatch[1].split(/\s+/).filter(Boolean).map((v) => {
      if (v === 'left' || v === 'center' || v === 'right') return v;
      return null;
    });
  }
  if (/\bsortable\b/.test(text)) {
    result.sortable = true;
  }
  return result;
}

// 4T-0041 (Epic 3E-0008): Parser-Logik aus renderScgTable ausgelagert, damit
// Viewer-Renderer und HTML-Konverter dieselbe Parser-Logik teilen. Liefert
// { caption, rows } oder null bei beschaedigtem Block (kein '{|'-Anfang).
// Tiefen-Schutz bleibt in den jeweiligen Aufrufern (renderScgTable,
// convertMarkdownPortable), weil sie unabhaengige Counter benoetigen.
function parseScgTableBlock(content) {
  const lines = String(content || '').split(/\r?\n/);
  let i = 0;
  // Erste signifikante Zeile muss '{|' sein
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i >= lines.length || !lines[i].trimStart().startsWith('{|')) {
    return null;
  }
  // 4T-0045: Tabellen-Header-Attribute auf der {| - Zeile parsen (z.B. +cols).
  const headerAttrs = parseScgTableHeaderAttrs(lines[i].trimStart());
  i++;

  let caption = null;
  const rows = [];
  let currentRow = null;
  let currentCell = null;
  // 4T-0040: fenceInProgress haelt die oeffnende Fence-Sequenz; siehe Detail-
  // Kommentar in 4T-0040-Implementierung.
  let fenceInProgress = null;

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
  // 4T-0044: startRow nimmt eine optionale Status-Klasse fuer die ganze Zeile.
  const startRow = (statusClass) => {
    commitRow();
    currentRow = { cells: [], statusClass: statusClass || null };
  };
  // 4T-0044: startCell nimmt zusaetzlich einen statusClass-Parameter fuer
  // die einzelne Zelle (gewinnt gegen den Zeilen-Status).
  const startCell = (type, initial, attrs, statusClass) => {
    commitCell();
    if (!currentRow) currentRow = { cells: [], statusClass: null };
    currentCell = { type, content: initial || '', attrs: attrs || {}, statusClass: statusClass || null };
  };

  const maybeOpenFence = (text) => {
    if (fenceInProgress) return;
    const lastLine = String(text || '').split('\n').pop();
    const m = lastLine.trimStart().match(/^([`~]{3,})/);
    if (m) fenceInProgress = m[1];
  };
  const maybeCloseFence = (line) => {
    if (!fenceInProgress) return;
    const m = line.trimStart().match(/^([`~]+)\s*$/);
    if (m && m[1][0] === fenceInProgress[0] && m[1].length >= fenceInProgress.length) {
      fenceInProgress = null;
    }
  };

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (fenceInProgress) {
      if (currentCell) {
        currentCell.content += (currentCell.content ? '\n' : '') + line;
      }
      maybeCloseFence(line);
      continue;
    }

    const trimmed = line.trimStart();
    if (trimmed.startsWith('|}')) {
      commitRow();
      break;
    }
    if (trimmed.startsWith('|-')) {
      // 4T-0044: Optional Status-Klasse direkt nach '|-' (z.B. '|-.error').
      const afterMarker = trimmed.slice(2).trimStart();
      const { status } = extractScgTableStatusClass(afterMarker);
      startRow(status);
      continue;
    }
    if (trimmed.startsWith('|+')) {
      caption = trimmed.slice(2).trim();
      continue;
    }
    if (trimmed.startsWith('!')) {
      // 4T-0044: Optional Status-Klasse direkt nach '!' (z.B. '!.warn').
      const afterMarker = trimmed.slice(1).trimStart();
      const { status, rest } = extractScgTableStatusClass(afterMarker);
      const { attrs, content: cellContent } = parseScgTableCellAttrs(rest);
      startCell('th', cellContent, attrs, status);
      maybeOpenFence(cellContent);
      continue;
    }
    if (trimmed.startsWith('|')) {
      // 4T-0044: Optional Status-Klasse direkt nach '|' (z.B. '|.error').
      const afterMarker = trimmed.slice(1).trimStart();
      const { status, rest } = extractScgTableStatusClass(afterMarker);
      const { attrs, content: cellContent } = parseScgTableCellAttrs(rest);
      startCell('td', cellContent, attrs, status);
      maybeOpenFence(cellContent);
      continue;
    }
    if (currentCell) {
      currentCell.content += (currentCell.content ? '\n' : '') + line;
      maybeOpenFence(line);
    }
  }
  commitRow();

  return {
    caption,
    rows,
    columnDefaults: headerAttrs.columnDefaults,
    sortable: headerAttrs.sortable,
  };
}

function renderScgTable(content) {
  if (scgTableRecursionDepth >= SCG_TABLE_MAX_DEPTH) {
    return null;
  }
  scgTableRecursionDepth++;
  try {
    const parsed = parseScgTableBlock(content);
    if (!parsed) return null;
    return buildScgTableHtml(parsed.caption, parsed.rows, parsed.columnDefaults, parsed.sortable);
  } finally {
    scgTableRecursionDepth--;
  }
}

function buildScgTableHtml(caption, rows, columnDefaults, sortable) {
  // thead, wenn die erste Zeile ausschliesslich Header-Zellen enthaelt.
  let theadRow = null;
  let bodyRows = rows;
  if (rows.length > 0 && rows[0].cells.every((c) => c.type === 'th')) {
    theadRow = rows[0];
    bodyRows = rows.slice(1);
  }
  // 4T-0046: Sortierung deaktivieren, wenn irgendeine Zelle colspan oder
  // rowspan hat. Layout-Risiko zu hoch, daher sicherer Default.
  let hasSpans = false;
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.attrs && (cell.attrs.colspan || cell.attrs.rowspan)) {
        hasSpans = true;
        break;
      }
    }
    if (hasSpans) break;
  }
  const tableClass = sortable && !hasSpans && theadRow ? 'scg-table sortable' : 'scg-table';
  const out = [`<table class="${tableClass}">`];
  if (caption !== null && caption !== '') {
    out.push(`<caption>${md.renderInline(caption)}</caption>`);
  }
  if (theadRow) {
    out.push('<thead>');
    // 4T-0037: isHeaderRow=true -> th bekommt scope="col".
    out.push(renderScgTableRow(theadRow, true, columnDefaults));
    out.push('</thead>');
  }
  if (bodyRows.length > 0) {
    out.push('<tbody>');
    for (const row of bodyRows) {
      // 4T-0037: isHeaderRow=false -> th bekommt scope="row".
      out.push(renderScgTableRow(row, false, columnDefaults));
    }
    out.push('</tbody>');
  }
  out.push('</table>');
  return out.join('');
}

function renderScgTableRow(row, isHeaderRow, columnDefaults) {
  const out = ['<tr>'];
  let colIdx = 0;
  for (const cell of row.cells) {
    const tag = cell.type === 'th' ? 'th' : 'td';
    // 4T-0044: Zell-Status gewinnt gegen Zeilen-Status. Beide werden als
    // CSS-Klasse status-<value> via buildScgTableCellAttrs gesetzt.
    const effectiveStatus = cell.statusClass || row.statusClass || null;
    // 4T-0045: Spalten-Default-Ausrichtung greift, wenn die Zelle keinen
    // eigenen align hat. Bei colspan > 1 wird kein Default angewendet
    // (Zelle ueberspannt mehrere Spalten mit ggf. unterschiedlichen
    // Defaults; eindeutige Wahl nicht moeglich).
    const span = parseInt((cell.attrs && cell.attrs.colspan) || '1', 10) || 1;
    const colDefault = span > 1 ? null : (columnDefaults && columnDefaults[colIdx]) || null;
    const attrsHtml = buildScgTableCellAttrs(cell.attrs || {}, cell.type, isHeaderRow, effectiveStatus, colDefault);
    colIdx += span;
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

// 4T-0041 (Epic 3E-0008): Konverter scg-table → inline HTML-Tabelle fuer
// Export-Datei. Findet im Markdown-Text alle scg-table-Codeblocks und ersetzt
// sie durch HTML-Tabellen mit Inline-Styles. Innere scg-table-Bloecke in
// Zellinhalten werden rekursiv mitkonvertiert (eigener Tiefen-Counter
// scgTablePortableDepth, identische SCG_TABLE_MAX_DEPTH wie Viewer-Renderer).
// Beschaedigte scg-table-Bloecke (kein '{|') bleiben unveraendert (semantisch
// konsistent zum Viewer-Render).
let scgTablePortableDepth = 0;

// 4T-0041: Marker am Anfang einer konvertierten Datei. Wird in renderMarkdown
// erkannt und schaltet die Datei auf mdPortable (html:true), damit die
// eingebetteten HTML-Tabellen im Viewer als Tabellen rendern statt als
// escapter Quelltext. Bei rekursiven Konverter-Aufrufen (Zell-Inhalt mit
// innerer scg-table) wird der Marker NICHT vorangestellt, weil er nur
// einmal an der Datei-Spitze stehen soll.
const SCG_PORTABLE_MARKER = '<!-- scg-portable -->';

function convertMarkdownPortable(markdownText, addMarker = true) {
  const fenceRegex = /^( {0,3}`{3,})scg-table[^\n]*\n([\s\S]*?)\n\1\s*$/gm;
  const converted = String(markdownText || '').replace(fenceRegex, (match, fence, content) => {
    const html = convertScgTableBlockToHtml(content);
    return html !== null ? html : match;
  });
  return addMarker ? `${SCG_PORTABLE_MARKER}\n\n${converted}` : converted;
}

function convertScgTableBlockToHtml(content) {
  if (scgTablePortableDepth >= SCG_TABLE_MAX_DEPTH) {
    return null;
  }
  scgTablePortableDepth++;
  try {
    const parsed = parseScgTableBlock(content);
    if (!parsed) return null;
    return buildScgTablePortableHtml(parsed.caption, parsed.rows, parsed.columnDefaults);
  } finally {
    scgTablePortableDepth--;
  }
}

function buildScgTablePortableHtml(caption, rows, columnDefaults) {
  let theadRow = null;
  let bodyRows = rows;
  if (rows.length > 0 && rows[0].cells.every((c) => c.type === 'th')) {
    theadRow = rows[0];
    bodyRows = rows.slice(1);
  }
  const out = ['<table>'];
  if (caption !== null && caption !== '') {
    out.push(`<caption>${mdPortable.renderInline(caption)}</caption>`);
  }
  if (theadRow) {
    out.push('<thead>');
    out.push(renderScgTablePortableRow(theadRow, true, columnDefaults));
    out.push('</thead>');
  }
  if (bodyRows.length > 0) {
    out.push('<tbody>');
    for (const row of bodyRows) {
      out.push(renderScgTablePortableRow(row, false, columnDefaults));
    }
    out.push('</tbody>');
  }
  out.push('</table>');
  return out.join('');
}

function renderScgTablePortableRow(row, isHeaderRow, columnDefaults) {
  const out = ['<tr>'];
  let colIdx = 0;
  for (const cell of row.cells) {
    const tag = cell.type === 'th' ? 'th' : 'td';
    // 4T-0044: Zell-Status gewinnt gegen Zeilen-Status; im Portable als
    // Inline-Style mit Light-Theme-Farben (SCG_STATUS_INLINE_COLORS).
    const effectiveStatus = cell.statusClass || row.statusClass || null;
    // 4T-0045: Spalten-Default-Ausrichtung greift, wenn die Zelle keinen
    // eigenen align hat und kein colspan ueber mehrere Spalten reicht.
    const span = parseInt((cell.attrs && cell.attrs.colspan) || '1', 10) || 1;
    const colDefault = span > 1 ? null : (columnDefaults && columnDefaults[colIdx]) || null;
    const attrsHtml = buildScgTablePortableCellAttrs(cell.attrs || {}, cell.type, isHeaderRow, effectiveStatus, colDefault);
    colIdx += span;
    const cellHtml = renderScgTableCellForPortable(cell.content);
    out.push(`<${tag}${attrsHtml}>${cellHtml}</${tag}>`);
  }
  out.push('</tr>');
  return out.join('');
}

function buildScgTablePortableCellAttrs(attrs, cellType, isHeaderRow, statusClass, columnDefault) {
  const parts = [];
  if (attrs.colspan) parts.push(`colspan="${attrs.colspan}"`);
  if (attrs.rowspan) parts.push(`rowspan="${attrs.rowspan}"`);
  // 4T-0041: Ausrichtung als Inline-Style (HTML5-konform), nicht als CSS-
  // Klasse. Damit funktioniert die Ausrichtung auch in fremden Renderern,
  // die unsere App-CSS nicht kennen.
  // 4T-0045: Wenn die Zelle keine eigene align hat, greift der Spalten-
  // Default; bei colspan > 1 wurde colDefault im Renderer auf null gesetzt.
  const styles = [];
  const effectiveAlign = attrs.align || columnDefault || null;
  if (effectiveAlign) styles.push(`text-align: ${effectiveAlign}`);
  if (attrs.valign) styles.push(`vertical-align: ${attrs.valign}`);
  // 4T-0044: Status-Hintergrund/Vordergrund als Inline-Style aus der
  // Farb-Map. Externe Renderer kennen unsere status-*-CSS-Klassen nicht.
  if (statusClass && SCG_STATUS_INLINE_COLORS[statusClass]) {
    const c = SCG_STATUS_INLINE_COLORS[statusClass];
    styles.push(`background-color: ${c.bg}`);
    styles.push(`color: ${c.fg}`);
  }
  if (styles.length > 0) parts.push(`style="${styles.join('; ')}"`);
  if (cellType === 'th') {
    parts.push(isHeaderRow ? 'scope="col"' : 'scope="row"');
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

function renderScgTableCellForPortable(content) {
  const trimmed = String(content || '').trim();
  if (trimmed === '') return '';
  // 4T-0041: Zweistufige Konvertierung.
  // 1. Innere scg-table-Codeblocks rekursiv durch HTML-Tabellen ersetzen.
  //    addMarker=false: der Marker steht nur einmal am Datei-Anfang, nicht
  //    in jeder Zelle.
  const withInnerHtml = convertMarkdownPortable(trimmed, false);
  // 2. Den Rest (Markdown + eingebettete HTML-Strings) durch mdPortable
  //    rendern. mdPortable hat html=true, daher werden die eingebetteten
  //    HTML-Tags nicht escaped. Einzeiliger Inhalt ohne Block-Strukturen
  //    kommt durch renderInline (kein <p>-Wrapper), sonst durch render.
  if (!/\n/.test(withInnerHtml.trim())) {
    return mdPortable.renderInline(withInnerHtml);
  }
  return mdPortable.render(withInnerHtml);
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
    // 4T-0041: Wenn die Datei den scg-portable-Marker am Anfang traegt,
    // wird sie mit mdPortable (html:true) gerendert. Damit werden die
    // HTML-Tabellen aus dem Konverter-Output im Viewer als echte Tabellen
    // angezeigt statt als escapter Quelltext. Ohne Marker bleibt das
    // sichere Standard-Verhalten (html:false), wie bei jeder regulaeren
    // .md-Datei. Der Marker ist opt-in: User-Bewusstsein vorausgesetzt
    // (siehe Doku im Hilfe-Tab).
    const isPortable = /^<!--\s*scg-portable\s*-->/.test(String(text || '').trimStart());
    const renderer = isPortable ? mdPortable : md;
    // 4T-0049: YAML-Frontmatter wird vor dem Render abgeschnitten. Der
    // '---'-Block am Datei-Anfang ist Metadaten, keine horizontale Linie.
    // body ist text wenn kein Frontmatter erkannt wurde.
    const fm = extractFrontmatter(text);
    const html = renderer.render(fm.body);
    return resolveImagesForBase(html, basePath);
  },
  // 4T-0049: Frontmatter-Daten fuer Renderer-Konsumenten. Wird in 4T-0050
  // (Aliases) und 4T-0051 (Properties-Editor) genutzt. Liefert
  // { raw, data, body, parseError, endOffset } analog extractFrontmatter.
  getFrontmatter: (text) => extractFrontmatter(text),
  // 4T-0051: Round-Trip-Schreiben von Frontmatter-Feldern. Liefert den
  // neuen Datei-Text zurueck (Renderer ruft danach api.saveFile auf).
  // Erhaltung von Kommentaren und Stil fuer nicht-geaenderte Felder.
  writeFrontmatter: (text, newData) => writeFrontmatter(text, newData),
  // 4T-0014: Slug-Berechnung im Renderer-Modul verfuegbar machen,
  // damit das Outline-Panel im Render-Modus den passenden DOM-Anker findet.
  slugifyHeading: (text) => githubLikeSlug(String(text || '')),

  // 4T-0041: Konverter scg-table → inline HTML-Tabelle. Liefert den
  // konvertierten Markdown-Text fuer den Export 'Portables Markdown'.
  convertMarkdownPortable: (text) => convertMarkdownPortable(text),

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
  // 4T-0050: Wiki-Link-Klick mit Alias-Fallback. Renderer ruft das auf,
  // wenn die direkte Datei nicht existiert; Antwort enthaelt Kandidaten-
  // Liste und optional den aufloesenden Alias-Text.
  resolveWikiTargetByAlias: (filePath, basename) =>
    ipcRenderer.invoke('wikiLink:resolveByAlias', { filePath, basename }),
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
  // 4T-0041: Menu-Event 'Datei -> Exportieren -> Portables Markdown...'
  onMenuExportPortable: (cb) => ipcRenderer.on('menu:exportPortable', () => cb()),
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
  // 4T-0051: Properties-Sidebar-Sektion ueber Menue-Eintrag Ansicht -> Properties.
  onMenuToggleProperties: (cb) => ipcRenderer.on('menu:toggleProperties', () => cb()),
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
