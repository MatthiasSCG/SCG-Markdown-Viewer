// Renderer-Logik: zwei Tab-Gruppen (Spalten), Tabs, Ansichten,
// Drag&Drop, i18n, Theme, Splitter, Kontextmenü.
'use strict';

import { loadTranslations, applyTranslations, setLanguage, t, normalizeLocale } from './i18n.js';
import { EditorState, Compartment, StateField, StateEffect, Prec } from '@codemirror/state';
import {
  EditorView,
  ViewPlugin,
  GutterMarker,
  gutter,
  lineNumbers as cmLineNumbers,
  keymap,
  drawSelection,
  Decoration,
  hoverTooltip,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import {
  syntaxHighlighting,
  HighlightStyle,
  syntaxTree,
  codeFolding,
  foldKeymap,
  foldedRanges,
  foldable,
  foldEffect,
  foldState,
  unfoldEffect,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Markdown-Syntax-Highlighting mit CSS-Variablen. Farben kommen aus styles.css
// und folgen automatisch dem Light/Dark-Theme (data-theme-Attribut am <html>).
const mdHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.heading2, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.heading3, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.heading4, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.heading5, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.heading6, color: 'var(--syntax-heading)', fontWeight: 'bold' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--syntax-link)' },
  { tag: tags.url, color: 'var(--syntax-url)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--syntax-code)' },
  { tag: tags.meta, color: 'var(--syntax-meta)' },
  { tag: tags.processingInstruction, color: 'var(--syntax-meta)' },
  { tag: tags.contentSeparator, color: 'var(--syntax-meta)' },
  { tag: tags.list, color: 'var(--syntax-list)' },
  { tag: tags.quote, color: 'var(--syntax-quote)', fontStyle: 'italic' },
  { tag: tags.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: tags.keyword, color: 'var(--syntax-keyword)' },
  { tag: tags.string, color: 'var(--syntax-string)' },
  { tag: tags.number, color: 'var(--syntax-number)' },
]);

// CodeMirror-Such-Decorations (4T-0007): aktive Such-Treffer im Source-Pane
// werden ueber ein StateField/Decoration-Set gerendert und ueberleben CM-Re-
// Renders. setSearchDecorations setzt das Decoration-Set, clearSearchDecorations
// loescht es. Bei jeder Doc-Aenderung werden alte Decorations verworfen, weil
// die Indizes ohnehin nicht mehr stimmen.
const setSearchDecorations = StateEffect.define();
const clearSearchDecorations = StateEffect.define();

const searchHighlightField = StateField.define({
  create() { return Decoration.none; },
  update(deco, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSearchDecorations)) {
        const { matches, currentIndex } = effect.value;
        const items = matches.map((m, i) => Decoration.mark({
          class: i === currentIndex ? 'cm-search-match cm-search-match-current' : 'cm-search-match',
        }).range(m.from, m.to));
        return Decoration.set(items, true);
      }
      if (effect.is(clearSearchDecorations)) {
        return Decoration.none;
      }
    }
    if (tr.docChanged) return Decoration.none;
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 4T-0013: Folding-Struktur-Cache. Wird bei jeder Doc-Aenderung aus dem
// CodeMirror-syntaxTree neu aufgebaut. Enthaelt:
// - headings: pro Heading {kind:'heading', level, fromLine, toLine, track}.
//   toLine ist die letzte Zeile der Heading-Region, track entspricht dem
//   Heading-Level (1..6).
// - blocks: pro mehrzeiligem Block-Foldable (ListItem, Blockquote, FencedCode,
//   HTMLBlock, Table) {kind:'block', fromLine, toLine, from, to, track}.
//   track liegt rechts der Heading-Spuren: maxHeadingLevel + Verschachtelungs-
//   tiefe innerhalb anderer Blocks (Top-Level-Block => maxHeadingLevel + 1).
// - allRegions: vereinte Liste, sortiert nach fromLine fuer schnelle Iteration.
// - totalTracks: Spurenanzahl insgesamt (maxHeadingLevel + maxBlockDepth).
// Die Spurenanzahl ist dynamisch: nur die in der Datei vorkommenden Heading-
// Ebenen und Block-Verschachtelungstiefen bekommen Platz. Beim Einfuegen
// neuer Ebenen waechst der Gutter ueber den Spacer-Mechanismus mit.
const FOLDABLE_BLOCK_TYPES = new Set([
  'ListItem', 'Blockquote', 'FencedCode', 'HTMLBlock', 'Table',
]);

function computeFoldStructure(state) {
  const headings = [];
  const blocks = [];
  syntaxTree(state).iterate({
    enter(node) {
      const match = /^(?:ATX|Setext)Heading([1-6])$/.exec(node.name);
      if (match) {
        const level = parseInt(match[1], 10);
        const fromLine = state.doc.lineAt(node.from).number;
        headings.push({
          kind: 'heading',
          level,
          fromLine,
          toLine: 0,
          track: level,
        });
        return;
      }
      if (FOLDABLE_BLOCK_TYPES.has(node.name)) {
        const startLine = state.doc.lineAt(node.from);
        const endLine = state.doc.lineAt(node.to);
        if (endLine.number <= startLine.number) return; // einzeilig -> nicht faltbar
        blocks.push({
          kind: 'block',
          fromLine: startLine.number,
          toLine: endLine.number,
          from: startLine.to,
          to: node.to,
          track: 0,
        });
      }
    },
  });
  const totalLines = state.doc.lines;
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    let end = totalLines;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        end = headings[j].fromLine - 1;
        break;
      }
    }
    h.toLine = end;
  }
  let maxHeadingLevel = 0;
  for (const h of headings) {
    if (h.level > maxHeadingLevel) maxHeadingLevel = h.level;
  }
  for (const b of blocks) {
    let depth = 1;
    for (const other of blocks) {
      if (other === b) continue;
      const envelopes = other.fromLine <= b.fromLine
        && other.toLine >= b.toLine
        && (other.fromLine < b.fromLine || other.toLine > b.toLine);
      if (envelopes) depth++;
    }
    b.track = maxHeadingLevel + depth;
  }
  let maxBlockDepth = 0;
  for (const b of blocks) {
    const d = b.track - maxHeadingLevel;
    if (d > maxBlockDepth) maxBlockDepth = d;
  }
  const allRegions = headings.concat(blocks).sort((a, b) => a.fromLine - b.fromLine);
  return {
    headings,
    blocks,
    allRegions,
    maxHeadingLevel,
    totalTracks: maxHeadingLevel + maxBlockDepth,
  };
}

const foldStructureField = StateField.define({
  create(state) { return computeFoldStructure(state); },
  update(value, tr) {
    // Auch ohne docChange neu berechnen, wenn sich der syntaxTree geaendert
    // hat. Der lezer-markdown-Parser laeuft asynchron und liefert den
    // fertigen Tree haeufig erst ueber ein spaeteres, nicht-doc-aenderndes
    // Update nach (besonders bei groesseren Dateien). Ohne diesen Check
    // bliebe das Field mit dem initial leeren Tree haengen.
    if (!tr.docChanged && syntaxTree(tr.state) === syntaxTree(tr.startState)) {
      return value;
    }
    return computeFoldStructure(tr.state);
  },
});

// 4T-0013: Eigener Folding-Gutter mit dynamischen Hierarchie-Spuren. Pro
// tatsaechlich vorkommender Heading-Ebene UND pro Block-Verschachtelungstiefe
// (Listen, Blockquotes, Code, Tables) eine eigene Spur. Heading-Spuren liegen
// links, Block-Spuren direkt daneben rechts. Auf der Start-Zeile einer Region
// sitzt der Pfeil (⌄ offen / › zugeklappt), darunter laeuft eine senkrechte
// Linie bis zum Ende der Region. Gilt einheitlich fuer Headings und Bloecke.

function isRegionFolded(state, region) {
  let folded = false;
  foldedRanges(state).between(region.from, region.to, (from, to) => {
    if (from === region.from && to === region.to) {
      folded = true;
      return false;
    }
  });
  return folded;
}

function getFoldRangeForRegion(state, region) {
  if (region.kind === 'heading') {
    const lineObj = state.doc.line(region.fromLine);
    return foldable(state, lineObj.from, lineObj.to);
  }
  return { from: region.from, to: region.to };
}

// Breite pro Spur in Pixel. Marker und Spacer setzen die Container-Breite
// per Inline-Style (width + minWidth) UND per CSS-Custom-Property
// '--scg-tracks', damit die Breite robust durch das Gutter-Layout
// propagiert. CodeMirrors Spacer-Element bekommt visibility:hidden, der
// Layout-Platz haengt allein an dieser Breite.
const FOLD_TRACK_PX = 10;

function applyTrackWidth(root, totalTracks) {
  const w = (totalTracks * FOLD_TRACK_PX) + 'px';
  root.style.width = w;
  root.style.minWidth = w;
  root.style.flex = '0 0 ' + w;
  root.style.setProperty('--scg-tracks', String(totalTracks));
}

class FoldGutterMarker extends GutterMarker {
  constructor(totalTracks, trackInfo) {
    super();
    this.totalTracks = totalTracks;
    this.trackInfo = trackInfo; // { [k]: 'inside' | {regionKind, folded, fromLine} }
  }
  eq(other) {
    if (!(other instanceof FoldGutterMarker)) return false;
    if (this.totalTracks !== other.totalTracks) return false;
    for (let k = 1; k <= this.totalTracks; k++) {
      const a = this.trackInfo[k];
      const b = other.trackInfo[k];
      if (a === b) continue;
      if (!a || !b) return false;
      if (a === 'inside' || b === 'inside') return false;
      if (a.regionKind !== b.regionKind) return false;
      if (a.folded !== b.folded) return false;
      if (a.fromLine !== b.fromLine) return false;
    }
    return true;
  }
  toDOM() {
    const root = document.createElement('div');
    root.className = 'scg-heading-gutter';
    applyTrackWidth(root, this.totalTracks);
    for (let k = 1; k <= this.totalTracks; k++) {
      const info = this.trackInfo[k];
      const span = document.createElement('span');
      span.className = 'scg-heading-track';
      if (info && info !== 'inside') {
        span.classList.add('scg-heading-marker');
        span.classList.add('scg-track-' + info.regionKind);
        span.textContent = info.folded ? '›' : '⌄';
        span.dataset.foldKind = info.regionKind;
        span.dataset.foldLine = String(info.fromLine);
      } else if (info === 'inside') {
        span.classList.add('scg-heading-line');
      }
      root.appendChild(span);
    }
    return root;
  }
}

// Spacer haelt die Gutter-Breite auf der maximal benoetigten Spurenanzahl.
class FoldGutterSpacer extends GutterMarker {
  constructor(totalTracks) {
    super();
    this.totalTracks = totalTracks;
  }
  eq(other) {
    return other instanceof FoldGutterSpacer && this.totalTracks === other.totalTracks;
  }
  toDOM() {
    const root = document.createElement('div');
    root.className = 'scg-heading-gutter';
    applyTrackWidth(root, this.totalTracks);
    for (let k = 0; k < this.totalTracks; k++) {
      const span = document.createElement('span');
      span.className = 'scg-heading-track';
      root.appendChild(span);
    }
    return root;
  }
}

const headingFoldGutter = gutter({
  class: 'cm-headingGutter',
  lineMarker(view, line) {
    const struct = view.state.field(foldStructureField, false);
    if (!struct || struct.totalTracks === 0) return null;
    const lineNumber = view.state.doc.lineAt(line.from).number;
    const trackInfo = {};
    let hasContent = false;
    for (const r of struct.allRegions) {
      if (r.fromLine === lineNumber) {
        const range = getFoldRangeForRegion(view.state, r);
        const folded = range ? isRegionFolded(view.state, range) : false;
        trackInfo[r.track] = {
          regionKind: r.kind,
          folded,
          fromLine: r.fromLine,
        };
        hasContent = true;
      } else if (r.fromLine < lineNumber && r.toLine >= lineNumber) {
        if (!trackInfo[r.track]) {
          trackInfo[r.track] = 'inside';
          hasContent = true;
        }
      }
    }
    if (!hasContent) return null;
    return new FoldGutterMarker(struct.totalTracks, trackInfo);
  },
  // Bei Folding-Aenderungen muss der Gutter neu gerendert werden, damit der
  // Pfeil von ⌄ auf › (oder umgekehrt) wechselt. CodeMirror redraws nur bei
  // docChange automatisch; foldState- oder Struktur-Aenderungen melden wir
  // explizit.
  lineMarkerChange(update) {
    if (update.startState.field(foldState, false) !== update.state.field(foldState, false)) {
      return true;
    }
    return update.startState.field(foldStructureField, false)
      !== update.state.field(foldStructureField, false);
  },
  initialSpacer(view) {
    const struct = view.state.field(foldStructureField, false);
    const tracks = (struct && struct.totalTracks) || 0;
    return new FoldGutterSpacer(tracks);
  },
  updateSpacer(spacer, update) {
    const struct = update.state.field(foldStructureField, false);
    const need = (struct && struct.totalTracks) || 0;
    if (!(spacer instanceof FoldGutterSpacer) || spacer.totalTracks !== need) {
      return new FoldGutterSpacer(need);
    }
    return spacer;
  },
  domEventHandlers: {
    click(view, _line, event) {
      const target = event.target instanceof Element
        ? event.target.closest('[data-fold-line]')
        : null;
      if (!target) return false;
      const lineNumber = parseInt(target.dataset.foldLine, 10);
      if (!Number.isFinite(lineNumber)) return false;
      const kind = target.dataset.foldKind;
      if (kind === 'heading') {
        if (isHeadingRegionFolded(view, lineNumber)) {
          unfoldHeadingRegion(view, lineNumber);
        } else {
          foldHeadingRegion(view, lineNumber);
        }
        return true;
      }
      if (kind === 'block') {
        const struct = view.state.field(foldStructureField, false);
        const region = struct
          ? struct.blocks.find((b) => b.fromLine === lineNumber)
          : null;
        if (!region) return false;
        const range = { from: region.from, to: region.to };
        if (isRegionFolded(view.state, range)) {
          view.dispatch({ effects: unfoldEffect.of(range) });
        } else {
          view.dispatch({ effects: foldEffect.of(range) });
        }
        return true;
      }
      return false;
    },
  },
});

// 4T-0013: Setzt die Gutter-Breite direkt am .cm-headingGutter-DOM, basierend
// auf der aktuellen Spurenanzahl im foldStructureField. Drittes Sicherheits-
// netz neben Inline-Style am Marker-DOM und CSS-Variable, damit der Gutter
// auch dann eine korrekte Breite hat, wenn CodeMirrors Spacer-Mechanismus die
// Marker-Breite nicht zuverlaessig hochpropagiert.
const foldGutterWidthSync = ViewPlugin.fromClass(class {
  constructor(view) { this.apply(view); }
  update(update) {
    const prev = update.startState.field(foldStructureField, false);
    const curr = update.state.field(foldStructureField, false);
    if (prev !== curr) this.apply(update.view);
  }
  apply(view) {
    const struct = view.state.field(foldStructureField, false);
    const tracks = (struct && struct.totalTracks) || 0;
    const gutterEl = view.dom.querySelector('.cm-headingGutter');
    if (gutterEl) {
      const px = (tracks * FOLD_TRACK_PX) + 'px';
      gutterEl.style.minWidth = px;
      gutterEl.style.width = px;
      gutterEl.style.setProperty('--scg-tracks', String(tracks));
    }
  }
});

// 4T-0013: Bei jeder Folding-Aenderung (Gutter, Tastenkuerzel, programmatisch)
// ein DOM-Custom-Event 'scg:foldchange' auf document feuern. Konsument ist das
// Outline-Panel aus 4T-0014, das daraufhin seine Pfeil-Indikatoren auffrischt.
// Hier nur die Quelle; im aktuellen Stand abonniert noch niemand.
const foldChangeNotifier = ViewPlugin.fromClass(class {
  update(update) {
    let changed = false;
    for (const tr of update.transactions) {
      for (const eff of tr.effects) {
        if (eff.is(foldEffect) || eff.is(unfoldEffect)) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (!changed) return;
    const paneIdx = paneEditors.indexOf(update.view);
    document.dispatchEvent(new CustomEvent('scg:foldchange', {
      detail: { paneIdx: paneIdx >= 0 ? paneIdx : null },
    }));
  }
});

const api = window.api;

// --- Mermaid (4T-0021) ------------------------------------------------------
// Mermaid wird per dynamischem import() lazy geladen (siehe scripts/
// build-mermaid.js fuer den separaten Bundle), sodass Dokumente ohne
// Mermaid-Bloecke den ~3MB-Bundle gar nicht erst holen. Das Post-Render-Hook
// applyMermaidIfPresent ersetzt jedes <pre><code class="language-mermaid">…
// </code></pre> durch ein <div class="mermaid-block"> mit dem gerenderten SVG.
// Bei Theme-Wechsel rendert rerenderAllMermaidBlocks alle Diagramme neu.
let mermaidPromise = null;
function loadMermaid() {
  if (mermaidPromise) return mermaidPromise;
  const url = new URL('./mermaid.bundle.js', import.meta.url).href;
  mermaidPromise = import(url).then((mod) => mod.default || mod);
  return mermaidPromise;
}

let mermaidConfiguredTheme = null;
function currentMermaidTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
}
function ensureMermaidConfigured(mermaid, theme) {
  if (mermaidConfiguredTheme === theme) return;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme });
  mermaidConfiguredTheme = theme;
}

// Modul-Level-Cache (svgString je Quelltext+Theme). Verhindert wiederholten
// Mermaid-Parse beim Live-Tippen im Edit-Modus.
const mermaidRenderCache = new Map();
function mermaidHash(str) {
  // FNV-1a 32-bit, kompakt und kollisionsarm fuer normale Diagramm-Groessen.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
async function applyMermaidIfPresent(container) {
  if (!container) return;
  const codeBlocks = container.querySelectorAll('pre > code.language-mermaid');
  if (codeBlocks.length === 0) return;
  let mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (err) {
    console.warn('Mermaid konnte nicht geladen werden:', err);
    return;
  }
  const theme = currentMermaidTheme();
  ensureMermaidConfigured(mermaid, theme);

  // Mermaid v11: <pre><code class="language-mermaid"> wird zunaechst durch
  // unseren Wrapper-Container ersetzt, der entweder den Cache-Treffer enthaelt
  // oder einen <div class="mermaid"> mit dem Quelltext. mermaid.run() rendert
  // dann in-place; das ist der API-empfohlene Pfad in v11 und stabiler als
  // mermaid.render(), das in v11 zum Legacy-Pfad gehoert.
  const pending = [];
  for (const codeEl of codeBlocks) {
    const source = codeEl.textContent;
    const preEl = codeEl.parentElement;
    if (!preEl) continue;
    const block = document.createElement('div');
    block.className = 'mermaid-block';
    block.dataset.source = source;
    const cacheKey = `${theme}:${mermaidHash(source)}`;
    const cached = mermaidRenderCache.get(cacheKey);
    if (cached) {
      block.innerHTML = cached;
      preEl.replaceWith(block);
      continue;
    }
    const inner = document.createElement('div');
    inner.className = 'mermaid';
    inner.textContent = source;
    block.appendChild(inner);
    preEl.replaceWith(block);
    pending.push({ block, inner, source, cacheKey });
  }
  if (pending.length === 0) return;
  try {
    await mermaid.run({ nodes: pending.map((p) => p.inner), suppressErrors: true });
  } catch (err) {
    console.warn('mermaid.run() schlug fehl:', err);
  }
  // Nachbearbeitung: Bomb-SVG durch eigene Fehlerdarstellung ersetzen, sonst
  // SVG aus dem inneren <div class="mermaid"> auf den Wrapper-Block heben und
  // den Cache fuellen.
  for (const item of pending) {
    const svgHtml = item.inner.innerHTML;
    const isError = !svgHtml || /aria-roledescription="error"/.test(svgHtml);
    if (isError) {
      renderMermaidErrorBlock(item.block, item.source, 'Mermaid: Syntax-Fehler im Diagramm.');
    } else {
      item.block.innerHTML = svgHtml;
      item.block.classList.remove('mermaid-error');
      mermaidRenderCache.set(item.cacheKey, svgHtml);
    }
  }
  cleanupMermaidLeftovers();
}

function renderMermaidErrorBlock(block, source, message) {
  block.classList.add('mermaid-error');
  block.innerHTML = '';
  const pre = document.createElement('pre');
  pre.className = 'mermaid-error-source';
  pre.textContent = source;
  const msg = document.createElement('div');
  msg.className = 'mermaid-error-msg';
  msg.textContent = message;
  block.appendChild(pre);
  block.appendChild(msg);
}

// Mermaid haengt bei (Render-)Fehlern temporaere DOM-Knoten an document.body
// an (id-Praefix "dmermaid-") und raeumt sie nicht zuverlaessig auf. Damit
// landen sichtbare "Syntax error in text"-Bomb-SVGs ausserhalb unseres
// Render-Pane. Wir saeubern den Body deshalb nach jedem Mermaid-Aufruf.
function cleanupMermaidLeftovers() {
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement)) continue;
    const id = el.id || '';
    if (id.startsWith('dmermaid-')) {
      el.remove();
    }
  }
}

async function rerenderAllMermaidBlocks() {
  const blocks = document.querySelectorAll('.mermaid-block');
  if (blocks.length === 0) return;
  let mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (err) {
    return;
  }
  const theme = currentMermaidTheme();
  // Bei Theme-Wechsel muss mermaid mit dem neuen Theme neu initialisiert
  // werden, damit nachfolgende Renderings die neue Palette nutzen.
  mermaidConfiguredTheme = null;
  ensureMermaidConfigured(mermaid, theme);

  const pending = [];
  for (const block of blocks) {
    const source = block.dataset.source || '';
    if (!source) continue;
    const cacheKey = `${theme}:${mermaidHash(source)}`;
    const cached = mermaidRenderCache.get(cacheKey);
    if (cached) {
      block.innerHTML = cached;
      block.classList.remove('mermaid-error');
      continue;
    }
    // Wrapper-Block zuruecksetzen und einen frischen <div class="mermaid">
    // mit dem Quelltext einsetzen, den mermaid.run() ersetzt.
    block.innerHTML = '';
    block.classList.remove('mermaid-error');
    const inner = document.createElement('div');
    inner.className = 'mermaid';
    inner.textContent = source;
    block.appendChild(inner);
    pending.push({ block, inner, source, cacheKey });
  }
  if (pending.length === 0) return;
  try {
    await mermaid.run({ nodes: pending.map((p) => p.inner), suppressErrors: true });
  } catch (err) {
    console.warn('mermaid.run() schlug bei Theme-Wechsel fehl:', err);
  }
  for (const item of pending) {
    const svgHtml = item.inner.innerHTML;
    const isError = !svgHtml || /aria-roledescription="error"/.test(svgHtml);
    if (isError) {
      renderMermaidErrorBlock(item.block, item.source, 'Mermaid: Syntax-Fehler im Diagramm.');
    } else {
      item.block.innerHTML = svgHtml;
      mermaidRenderCache.set(item.cacheKey, svgHtml);
    }
  }
  cleanupMermaidLeftovers();
}

// --- Konstanten -------------------------------------------------------------
const MAX_PANES = 2;
const MIME_TAB = 'application/x-mdv-tab';

// Defaults für neue Tabs (per-Tab-Einstellungen).
const DEFAULT_VIEW_MODE = 'rendered';
const DEFAULT_WRAP_LINES = false;
const DEFAULT_SHOW_LINE_NUMBERS = true;
// 4T-0013: Heading-Folding-Gutter (Gliederung) default eingeschaltet. Pro Tab
// toggelbar analog zu showLineNumbers.
const DEFAULT_SHOW_FOLD_GUTTER = true;

// --- State ------------------------------------------------------------------
// Eine Pane: { tabs: [...], activeIndex }
// Ein Tab: { path, content, scrollSrc, scrollRen, missing,
//            viewMode, wrapLines, showLineNumbers }
const state = {
  panes: [createEmptyPane()],
  activePaneIndex: 0,
  language: 'en',
  restoreSession: true,
  autoSave: false,
  // 4T-0030: Theme-Vorzug ('light' | 'dark' | 'system'). Initial 'system';
  // tatsaechlicher Wert wird beim Init aus electron-store geladen.
  themePref: 'system',
  // Hochzählender Zaehler fuer "Datei → Neu"-Tabs in diesem Fenster
  // (pro Fenster lokal, pro App-Lebenszyklus). Wird nicht persistiert.
  untitledCounter: 1,
  // 4T-0012: Anzeige-Nummer dieses Fensters und Gesamtzahl der offenen Fenster.
  // Vom Main bei jedem Open/Close gepusht; bestimmt den `(Fenster N)`-Suffix
  // im Titel und steuert Solo-vs-Multi-Modus im Tab-Kontextmenue.
  displayNumber: 1,
  totalWindowCount: 1,
  // 4T-0014: Outline-Sidebar pro Spalte. visibleByPane: sichtbar/versteckt
  // (Default versteckt). width: Sidebar-Breite in Pixel (geteilt zwischen den
  // Spalten). activeLineByPane: aktuell aktive Heading-Zeile pro Spalte,
  // wird fuer die Hervorhebung in der Outline gespeichert.
  outline: {
    visibleByPane: [false, false],
    width: 260,
    activeLineByPane: [0, 0],
  },
  // 4T-0015: Backlinks-Sidebar-Sektion pro Spalte. visibleByPane wie Outline.
  // currentFileByPane haelt die aktuell beim Main angemeldete Datei pro Pane
  // (fuer paarweises request/release beim Tab-Wechsel). lastResultsByPane
  // cached das letzte Status-Payload, damit Re-Render ohne neuen Request
  // moeglich ist (z.B. nach Sprachwechsel).
  backlinks: {
    visibleByPane: [false, false],
    currentFileByPane: [null, null],
    lastResultsByPane: [null, null],
  },
  // 4T-0019: Fokus-Modus und Typewriter-Scroll. Toggle wirkt nur auf das
  // aktive Fenster; persistierter Wert ist global (settings: focusMode /
  // typewriterScroll). Beim Start eines Fensters wird der gespeicherte
  // Wert auf das neue Fenster angewendet.
  focusMode: false,
  typewriterScroll: false,
};

// Dialog-Tracking fuer Auto-Save: solange ein modaler Dialog (Schliessen-
// Dialog, Konflikt-Dialog, Save-As-Dialog) laeuft, soll Auto-Save nicht
// triggern. withDialog kapselt asynchrone Dialog-Calls.
let dialogActive = false;
async function withDialog(fn) {
  dialogActive = true;
  try { return await fn(); }
  finally { dialogActive = false; }
}

let autoSaveTimer = null;
let hintTimer = null;

function createEmptyPane() {
  return { tabs: [], activeIndex: -1 };
}

function createTab(path, content, settings = {}) {
  return {
    path,
    content,
    // Letzter gespeicherter bzw. zuletzt von Datei gelesener Stand. Die
    // Dirty-Berechnung vergleicht content gegen originalContent.
    originalContent: content,
    scrollSrc: 0,
    scrollRen: 0,
    missing: false,
    viewMode: settings.viewMode || DEFAULT_VIEW_MODE,
    wrapLines: settings.wrapLines ?? DEFAULT_WRAP_LINES,
    showLineNumbers: settings.showLineNumbers ?? DEFAULT_SHOW_LINE_NUMBERS,
    showFoldGutter: settings.showFoldGutter ?? DEFAULT_SHOW_FOLD_GUTTER,
    // Edit-Modus pro Tab; nicht persistiert ueber Neustarts.
    editMode: false,
    // Dirty-Flag: true sobald content vom originalContent abweicht.
    dirty: false,
    // 4T-0017: Zoom-Faktor pro Tab (Multiplikator fuer Editor- und Render-
    // Pane des Tabs). Default 1.0. Wird beim Tab-Transfer in ein anderes
    // Fenster mit uebernommen, ueberlebt aber den Fenster-Schluss und die
    // Sitzungswiederherstellung nicht.
    zoom: clampZoom(settings.zoom ?? DEFAULT_ZOOM),
    // Bei "Datei → Neu" der lokale Nummern-Index (Unbenannt 1, 2, …).
    // Null fuer Tabs mit Pfad.
    untitledIndex: settings.untitledIndex || null,
  };
}

// 4T-0017: Zoom-Konstanten. Schrittweite 10 %, Limits 50 % bis 300 %.
const DEFAULT_ZOOM = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;

function clampZoom(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_ZOOM;
  if (num < ZOOM_MIN) return ZOOM_MIN;
  if (num > ZOOM_MAX) return ZOOM_MAX;
  // Auf eine Nachkommastelle runden, damit 0.1-Schritte keine Floating-
  // Point-Drift erzeugen (0.1 + 0.1 + 0.1 != 0.3).
  return Math.round(num * 10) / 10;
}

// Verhindert, dass scroll-Events während eines Tab-Wechsels die gespeicherten
// Scroll-Positionen überschreiben (DOM-Updates triggern scroll-Events).
let suppressScrollSave = false;

// --- DOM-Referenzen ---------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const panesContainer = $('#panes-container');
const paneRoots = Array.from(panesContainer.querySelectorAll('.pane-group'));
const outerSplitter = panesContainer.querySelector('.outer-splitter');
const emptyState = $('#empty-state');
const dropOverlay = $('#drop-overlay');
const langSelect = $('#lang-select');
const btnEdit = $('#btn-edit');
// 4T-0030: Theme-Toggle in der Statusbar. Icon und Tooltip werden zur Laufzeit
// passend zu state.themePref gesetzt; Klick schaltet zyklisch Hell -> Dunkel
// -> System -> Hell.
const btnTheme = $('#btn-theme');

// Inline-SVGs fuer den Theme-Button. Stil identisch zum bestehenden btn-edit
// (viewBox 0 0 24 24, stroke=currentColor, stroke-width 2, round). Sonne fuer
// 'light', Mond fuer 'dark', Monitor fuer 'system'.
const THEME_ICON_SVGS = {
  light:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>' +
    '<path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>' +
    '<path d="M2 12h2"/><path d="M20 12h2"/>' +
    '<path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  dark:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  system:
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="2" y="3" width="20" height="14" rx="2"/>' +
    '<path d="M8 21h8"/><path d="M12 17v4"/></svg>',
};

const THEME_TOOLTIP_KEYS = {
  light: 'statusbar.theme.tooltipLight',
  dark: 'statusbar.theme.tooltipDark',
  system: 'statusbar.theme.tooltipSystem',
};

const THEME_NEXT = { light: 'dark', dark: 'system', system: 'light' };

// Setzt Icon und Tooltip-i18n-Key des Statusbar-Theme-Buttons passend zum
// uebergebenen Pref. Tooltip wird sofort via t() gesetzt, damit der Wert
// nach jedem Klick direkt sichtbar ist; das data-i18n-title-Attribut wird
// aktualisiert, damit ein spaeterer Sprach-Wechsel den richtigen Key trifft.
function applyThemePrefToButton(pref) {
  if (!btnTheme) return;
  const normalized = (pref === 'light' || pref === 'dark' || pref === 'system') ? pref : 'system';
  btnTheme.innerHTML = THEME_ICON_SVGS[normalized];
  const key = THEME_TOOLTIP_KEYS[normalized];
  btnTheme.setAttribute('data-i18n-title', key);
  btnTheme.title = t(key);
}
const statusbarHint = $('#statusbar-hint');
const contextMenu = $('#context-menu');
const aboutModal = $('#about-modal');
const settingsModal = $('#settings-modal');
const aboutVersionEl = $('#about-version');
const helpModal = $('#help-modal');

function getPaneEls(paneIdx) {
  const root = paneRoots[paneIdx];
  return {
    root,
    tabbar: root.querySelector('.tabbar'),
    content: root.querySelector('.content'),
    sourceEl: root.querySelector('.pane-source'),
    sourceEditor: root.querySelector('.pane-source-editor'),
    renderedEl: root.querySelector('.pane-rendered'),
    renderedHtml: root.querySelector('.markdown-body'),
    innerSplitter: root.querySelector('.splitter.inner-splitter'),
    sidebar: root.querySelector('.pane-sidebar'),
    sidebarSplitter: root.querySelector('.splitter.sidebar-splitter'),
    outlineSection: root.querySelector('.sidebar-outline'),
    outlineTree: root.querySelector('.outline-tree'),
    outlineEmpty: root.querySelector('.outline-empty'),
    outlineTitle: root.querySelector('.sidebar-outline .sidebar-section-title'),
    backlinksSection: root.querySelector('.sidebar-backlinks'),
    backlinksStatus: root.querySelector('.backlinks-status'),
    backlinksResults: root.querySelector('.backlinks-results'),
    backlinksInfo: root.querySelector('.sidebar-backlinks .sidebar-section-info'),
  };
}

function activeTab() {
  const pane = state.panes[state.activePaneIndex];
  if (!pane || pane.activeIndex < 0) return null;
  return pane.tabs[pane.activeIndex];
}

// 4T-0017: Wendet den Zoom-Faktor des aktiven Tabs einer Pane auf deren
// Inhalts-Container an. Chromium-`zoom` skaliert sowohl Schrift als auch
// Layout-Geometrie inklusive Scrollbars; CodeMirror sieht weiterhin
// konsistente getBoundingClientRect-Werte. Bei Faktor 1.0 wird das Property
// entfernt, damit der Default-Stack greift.
function applyZoomToPane(paneIdx) {
  const pane = state.panes[paneIdx];
  const els = getPaneEls(paneIdx);
  if (!els) return;
  const tab = pane && pane.activeIndex >= 0 ? pane.tabs[pane.activeIndex] : null;
  const zoom = tab ? clampZoom(tab.zoom) : DEFAULT_ZOOM;
  const value = zoom === 1 ? '' : String(zoom);
  if (els.sourceEditor) els.sourceEditor.style.zoom = value;
  if (els.renderedHtml) els.renderedHtml.style.zoom = value;
}

// 4T-0017: Aktualisiert den Statusbar-Indikator anhand des Zooms des aktiven
// Tabs der fokussierten Pane. Bei Faktor 1.0 ist der Indikator versteckt.
function renderZoomIndicator() {
  const el = document.getElementById('zoom-indicator');
  if (!el) return;
  const tab = activeTab();
  const zoom = tab ? clampZoom(tab.zoom) : DEFAULT_ZOOM;
  if (zoom === 1) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  const percent = Math.round(zoom * 100);
  el.hidden = false;
  el.textContent = t('statusbar.zoom').replace('{percent}', String(percent));
  el.title = t('statusbar.zoomResetTitle');
}

// 4T-0017: Setzt den Zoom des aktiven Tabs der angegebenen Pane absolut oder
// relativ (delta in Anzahl Schritten). Beide Pfade clampen auf das gueltige
// Intervall und schreiben den Wert nur, wenn er sich tatsaechlich aendert
// (sonst kein DOM-Update, kein Indikator-Re-Render). Speichert den State
// nicht in den Settings (Zoom ist fluechtig).
function adjustTabZoom(paneIdx, deltaSteps) {
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return;
  const next = clampZoom((tab.zoom || DEFAULT_ZOOM) + deltaSteps * ZOOM_STEP);
  if (next === tab.zoom) return;
  tab.zoom = next;
  applyZoomToPane(paneIdx);
  renderZoomIndicator();
}

function resetTabZoom(paneIdx) {
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return;
  if (tab.zoom === DEFAULT_ZOOM) return;
  tab.zoom = DEFAULT_ZOOM;
  applyZoomToPane(paneIdx);
  renderZoomIndicator();
}

// 4T-0019: Fokus-Modus toggelt die CSS-Klasse body.focus-mode (CSS blendet
// Tabbar, Statusbar und Sidebar-Panels aus), schreibt den Wert in den Store
// und aktualisiert das Menue-Haekchen des eigenen Fensters. Kein Multi-Window-
// Broadcast — andere Fenster bleiben unberuehrt.
function setFocusMode(on) {
  const next = !!on;
  if (state.focusMode === next) return;
  state.focusMode = next;
  document.body.classList.toggle('focus-mode', next);
  api.setSetting('focusMode', next);
  reportMenuStateNow();
}

function toggleFocusMode() {
  setFocusMode(!state.focusMode);
}

// 4T-0019: Typewriter-Scroll als Compartment auf allen Pane-Editoren
// ein- oder ausschalten. Wert wird global persistiert und beim Menue-
// Haekchen gespiegelt.
function setTypewriterScroll(on) {
  const next = !!on;
  if (state.typewriterScroll === next) return;
  state.typewriterScroll = next;
  const extension = next ? typewriterScrollExtension : [];
  for (const view of paneEditors) {
    if (!view) continue;
    view.dispatch({ effects: editorCompartments.typewriter.reconfigure(extension) });
  }
  api.setSetting('typewriterScroll', next);
  reportMenuStateNow();
}

function toggleTypewriterScroll() {
  setTypewriterScroll(!state.typewriterScroll);
}

// Anzeigename eines Tabs: Dateiname bei Tabs mit Pfad, sonst lokalisierter
// Unbenannt-Stamm plus Index (z.B. "Unbenannt 1").
function tabDisplayName(tab) {
  if (!tab) return '';
  if (tab.path) return api.basename(tab.path);
  return `${t('save.untitled')}${tab.untitledIndex ? ' ' + tab.untitledIndex : ''}`;
}

// --- CodeMirror-Editor ------------------------------------------------------
// Pro Pane eine EditorView, die je nach aktivem Tab das Dokument, den
// Read-Only-Stand und die Toggle-Compartments (Zeilennummern, Umbruch)
// aktualisiert. Tab-Wechsel innerhalb derselben Pane resettet das Doc.
const paneEditors = []; // paneIdx -> EditorView
const editorCompartments = {
  readOnly: new Compartment(),
  lineNumbers: new Compartment(),
  lineWrap: new Compartment(),
  // 4T-0013: Gliederung (Folding-Gutter inkl. Struktur-Field und Width-Sync)
  // toggelbar pro Tab. codeFolding() bleibt dauerhaft aktiv, damit die
  // Tastenkuerzel Strg+Umschalt+[/] auch bei ausgeblendetem Gutter wirken.
  foldGutter: new Compartment(),
  // 4T-0019: Typewriter-Scroll als Compartment, damit der Listener zur
  // Laufzeit ein-/ausgeschaltet werden kann, ohne den Editor neu aufzubauen.
  typewriter: new Compartment(),
};

// 4T-0019: Typewriter-Scroll-Extension. Bei jeder Cursor- oder Selektions-
// Aenderung wird die Cursor-Zeile vertikal in der Editor-Viewport-Mitte
// gehalten. Nicht angewendet bei reinen Doc-Aenderungen ohne Cursor-Bewegung
// — sonst wuerde das Tippen am Zeilenende ein Stottern verursachen.
const typewriterScrollExtension = EditorView.updateListener.of((update) => {
  if (!update.selectionSet) return;
  // Nur im Edit-Modus aktiv. Im Read-Only-Modus bewegt der Nutzer den
  // Cursor nicht aktiv durch den Text, das wuerde nur stoeren.
  if (update.state.readOnly) return;
  const head = update.state.selection.main.head;
  update.view.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) });
});

// Extension-Bundle fuer die Gliederung — wird per Compartment ein-/ausgeschaltet.
// foldStructureField bleibt bewusst AUSSERHALB, weil das Outline-Panel
// (4T-0014) seine Heading-Liste daraus liest; das Feld muss auch dann
// verfuegbar sein, wenn die Gliederungs-Spalte ausgeblendet ist.
const foldGutterExtensions = [
  headingFoldGutter,
  foldGutterWidthSync,
];

let pendingPreviewUpdate = null;

// 4T-0016: Tab/Shift+Tab in Markdown-Listen rueckt Listen-Eintraege ein bzw.
// aus. Erkannt werden ungeordnete Marker (`-`, `*`, `+`, inkl. Task-Liste
// `- [ ]` / `- [x]`) und geordnete Marker (`1.`, `2.`, ...). Die Variante
// mit Klammer (`1)`) wird bewusst nicht unterstuetzt. Einrueck-Schrittweite
// ist zwei Leerzeichen. Beim Einruecken einer geordneten Liste wird die
// Nummer auf `1.` zurueckgesetzt (neue Sub-Liste), beim Ausruecken bleibt
// die Nummer unveraendert. In Code-Bloecken (FencedCode / CodeBlock) greift
// die Logik nicht, damit der Default-Tab dort erhalten bleibt.
const LIST_LINE_RE = /^(\s*)((?:[-*+]|\d+\.)\s)/;
const LIST_INDENT_STEP = 2;

function lineInsideCodeBlock(state, line) {
  const tree = syntaxTree(state);
  let node = tree.resolveInner(line.from, 1);
  while (node) {
    if (node.name === 'FencedCode' || node.name === 'CodeBlock') return true;
    node = node.parent;
  }
  return false;
}

// Liefert true, wenn mindestens eine Zeile in der aktuellen Selektion ein
// Listen-Marker traegt; sonst false (dann faellt der Tab-Handler durch und
// CodeMirror behaelt sein Default-Verhalten).
function selectionTouchesList(state) {
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let n = fromLine; n <= toLine; n++) {
      const line = state.doc.line(n);
      if (!LIST_LINE_RE.test(line.text)) continue;
      if (lineInsideCodeBlock(state, line)) continue;
      return true;
    }
  }
  return false;
}

// Erzeugt eine Transaktion, die Listen-Zeilen der aktuellen Selektion ein-
// oder ausrueckt. delta = +1 (Einruecken) oder -1 (Ausruecken). Nicht-Listen-
// Zeilen bleiben unveraendert. Alle Aenderungen laufen als ein dispatch, damit
// Strg+Z sie als atomaren Schritt rueckgaengig macht.
function applyListIndent(view, delta) {
  const state = view.state;
  if (state.readOnly) return false;
  if (!selectionTouchesList(state)) return false;
  const changes = [];
  const seenLines = new Set();
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let n = fromLine; n <= toLine; n++) {
      if (seenLines.has(n)) continue;
      seenLines.add(n);
      const line = state.doc.line(n);
      const m = LIST_LINE_RE.exec(line.text);
      if (!m) continue;
      if (lineInsideCodeBlock(state, line)) continue;
      const leading = m[1];
      const marker = m[2];
      const isOrdered = /^\d+\.\s$/.test(marker);
      if (delta > 0) {
        if (isOrdered) {
          // Marker (z.B. "2. ") inklusive Leerzeichen ersetzen durch
          // "  1. " (Sub-Liste startet wieder bei 1).
          changes.push({
            from: line.from,
            to: line.from + leading.length + marker.length,
            insert: leading + ' '.repeat(LIST_INDENT_STEP) + '1. ',
          });
        } else {
          // 2 Leerzeichen vor dem Marker einfuegen, Marker unveraendert.
          changes.push({
            from: line.from + leading.length,
            insert: ' '.repeat(LIST_INDENT_STEP),
          });
        }
      } else {
        if (leading.length === 0) continue; // Ebene 0 -> No-Op
        // Bis zu LIST_INDENT_STEP fuehrende Whitespace-Zeichen entfernen.
        const removeCount = Math.min(LIST_INDENT_STEP, leading.length);
        changes.push({
          from: line.from,
          to: line.from + removeCount,
          insert: '',
        });
      }
    }
  }
  if (!changes.length) return false;
  view.dispatch(state.update({
    changes,
    userEvent: delta > 0 ? 'input.indent.more' : 'input.indent.less',
    scrollIntoView: true,
  }));
  return true;
}

// Eigene Keymap mit hoher Praezedenz, damit Tab/Shift-Tab vor dem
// defaultKeymap greifen. Gibt false zurueck, wenn keine Listen-Zeile betroffen
// ist; CodeMirror reicht den Tastendruck dann an die naechste Bindung weiter
// (Default-Verhalten ausserhalb von Listen bleibt unveraendert).
const listIndentKeymap = Prec.high(keymap.of([
  { key: 'Tab', run: (view) => applyListIndent(view, +1) },
  { key: 'Shift-Tab', run: (view) => applyListIndent(view, -1) },
]));

// 4T-0020: Markdown-Linter-Light. Vier Regeln (bare-url, empty-link-text,
// missing-alt-text, broken-wiki-link), Erkennung per Regex auf den Dokument-
// Text mit syntaxTree-Schutz gegen Code-Bloecke und Markdown-Link-Knoten.
// Decorations werden als CodeMirror-StateField gehalten; ein UpdateListener
// triggert mit 300-ms-Debounce einen asynchronen Lint-Lauf, dessen Ergebnis
// per StateEffect ins Feld dispatcht wird. Tooltip via hoverTooltip mit
// lokalisiertem Inhalt.

const LINT_DEBOUNCE_MS = 300;

// Regel 1: bare URL (http(s):// oder mailto:). Endet nicht in typischen
// trailing-Zeichen, die in Fliesstext angrenzen koennen. Schluss-Komma/
// -Klammer werden ebenfalls nicht zur URL gezaehlt, sonst werden Saetze
// wie "Siehe https://example.com, ..." kosmetisch falsch markiert.
const LINT_BARE_URL_RE = /\b(?:https?:\/\/|mailto:)[^\s<>"`\[\]()]+/g;
// Regeln 2 + 3: leere Linktexte. Gruppe 1 unterscheidet ueber den optionalen
// '!' Bild vs. Link. Wir matchen sowohl Inline-Form `[](url)` als auch
// Referenz-Form `[][ref]`.
const LINT_EMPTY_LINK_RE = /(!?)\[\]\((\s*[^\s)]+[^)]*?)\)|(!?)\[\]\[([^\]]+)\]/g;
// Regel 4: Wiki-Link [[Ziel]] oder [[Ziel|Anzeige]].
const LINT_WIKI_RE = /\[\[([^\]\n|]+?)(?:\|[^\]\n]*)?\]\]/g;

const setLintDecorations = StateEffect.define();

const lintField = StateField.define({
  create() { return Decoration.none; },
  update(value, tr) {
    // Bei Doc-Change Decorations leeren — ein neuer Lint-Lauf laeuft nach
    // dem Debounce und dispatcht frische Decorations. So bleiben keine
    // verrutschten Marker stehen, etwa nach Tab-Wechsel.
    let next = tr.docChanged ? Decoration.none : value;
    for (const effect of tr.effects) {
      if (effect.is(setLintDecorations)) next = effect.value;
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const LINT_RULES = {
  bareUrl: { className: 'cm-linter-mark cm-linter-bare-url' },
  emptyLinkText: { className: 'cm-linter-mark cm-linter-empty-link-text' },
  missingAltText: { className: 'cm-linter-mark cm-linter-missing-alt-text' },
  brokenWikiLink: { className: 'cm-linter-mark cm-linter-broken-wiki-link' },
};

function makeLintMark(ruleId) {
  return Decoration.mark({
    class: LINT_RULES[ruleId].className,
    attributes: { 'data-lint-rule': ruleId },
  });
}

// Pruefung, ob die Position innerhalb von Code-Kontext liegt (FencedCode,
// CodeBlock, InlineCode). In diesem Fall greifen die Regeln 1-4 nicht.
function lintIsInCodeContext(state, pos) {
  const tree = syntaxTree(state);
  let node = tree.resolveInner(pos, 1);
  while (node) {
    if (node.name === 'FencedCode' || node.name === 'CodeBlock' || node.name === 'InlineCode') return true;
    node = node.parent;
  }
  return false;
}

// Pruefung, ob die Position innerhalb einer Markdown-Link-Syntax oder eines
// Autolinks liegt. Verhindert false positives fuer bare-url: eine URL in
// [text](url) oder <https://...> ist kein Verstoss.
function lintIsInLinkContext(state, pos) {
  const tree = syntaxTree(state);
  let node = tree.resolveInner(pos, 1);
  while (node) {
    if (node.name === 'Link' || node.name === 'Autolink' || node.name === 'URL') return true;
    node = node.parent;
  }
  return false;
}

// Pro EditorView ein Debounce-Timer, damit Doc-Aenderungen den Lint-Lauf
// nicht haeufiger als alle LINT_DEBOUNCE_MS triggern.
const lintTimers = new WeakMap();

function scheduleLint(view) {
  const existing = lintTimers.get(view);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    lintTimers.delete(view);
    runLint(view);
  }, LINT_DEBOUNCE_MS);
  lintTimers.set(view, timer);
}

async function runLint(view) {
  // View koennte zwischenzeitlich entfernt worden sein (Pane geschlossen).
  const paneIdx = paneEditors.indexOf(view);
  if (paneIdx < 0) return;
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return;
  const stateAtStart = view.state;
  const text = stateAtStart.doc.toString();
  // Snapshot der Doc-Laenge fuer Stale-Check beim spaeten Dispatch.
  const docLengthAtStart = stateAtStart.doc.length;

  const ranges = [];
  const pushRange = (from, to, ruleId) => {
    if (from >= 0 && to > from && to <= docLengthAtStart) {
      ranges.push({ from, to, mark: makeLintMark(ruleId) });
    }
  };

  // Regel 1: bare URLs
  for (const m of text.matchAll(LINT_BARE_URL_RE)) {
    const from = m.index;
    const to = from + m[0].length;
    if (lintIsInCodeContext(stateAtStart, from)) continue;
    if (lintIsInLinkContext(stateAtStart, from)) continue;
    pushRange(from, to, 'bareUrl');
  }

  // Regeln 2 + 3: leere Link-/Bild-Texte
  for (const m of text.matchAll(LINT_EMPTY_LINK_RE)) {
    const from = m.index;
    const to = from + m[0].length;
    if (lintIsInCodeContext(stateAtStart, from)) continue;
    const isImage = (m[1] === '!') || (m[3] === '!');
    pushRange(from, to, isImage ? 'missingAltText' : 'emptyLinkText');
  }

  // Regel 4: broken-wiki-link. Erst alle Wiki-Link-Matches im Dokument
  // sammeln, dann genau einen IPC-Roundtrip an den Main schicken, dort
  // gegen den Backlinks-Index pruefen.
  const wikiMatches = [];
  for (const m of text.matchAll(LINT_WIKI_RE)) {
    const from = m.index;
    const to = from + m[0].length;
    if (lintIsInCodeContext(stateAtStart, from)) continue;
    const target = (m[1] || '').trim();
    if (!target) continue;
    wikiMatches.push({ from, to, target });
  }
  if (wikiMatches.length > 0 && tab.path) {
    const basenames = [...new Set(wikiMatches.map((w) => w.target))];
    try {
      const result = await api.resolveWikiTargets(tab.path, basenames);
      if (result && result.status === 'ready') {
        const existingSet = new Set(result.existing || []);
        for (const w of wikiMatches) {
          if (!existingSet.has(w.target)) pushRange(w.from, w.to, 'brokenWikiLink');
        }
      }
      // Bei 'indexing' / 'unavailable': Regel 4 wird in diesem Lauf
      // unterdrueckt, die anderen drei Regeln werden trotzdem angewendet.
    } catch {
      // IPC-Fehler ignorieren; Regel 4 entfaellt fuer diesen Lauf.
    }
  }

  // Stale-Check: wenn das Dokument inzwischen veraendert wurde, sind die
  // gesammelten Positionen ggf. ungueltig. Dann verwerfen wir das Ergebnis;
  // ein neuer Lauf ist eh schon ueber den UpdateListener angestossen.
  if (paneEditors.indexOf(view) < 0) return;
  if (view.state.doc.length !== docLengthAtStart) return;

  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  const set = Decoration.set(ranges.map((r) => r.mark.range(r.from, r.to)));
  view.dispatch({ effects: setLintDecorations.of(set) });
}

// UpdateListener triggert Debounce-Lauf bei Doc-Aenderungen.
const lintUpdateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) scheduleLint(update.view);
});

// Hover-Tooltip mit lokalisiertem Inhalt. Sucht an der Hover-Position die
// erste Lint-Marker-Decoration und baut daraus einen kleinen DOM-Tooltip.
const lintHoverTooltip = hoverTooltip((view, pos) => {
  const decoSet = view.state.field(lintField, false);
  if (!decoSet) return null;
  let hit = null;
  decoSet.between(Math.max(0, pos - 1), pos + 1, (from, to, value) => {
    const ruleId = value.spec && value.spec.attributes && value.spec.attributes['data-lint-rule'];
    if (!ruleId) return;
    hit = { from, to, ruleId };
    return false;
  });
  if (!hit) return null;
  const target = view.state.doc.sliceString(hit.from, hit.to);
  return {
    pos: hit.from,
    end: hit.to,
    above: true,
    create() {
      return { dom: buildLintTooltipDom(hit.ruleId, target) };
    },
  };
});

function buildLintTooltipDom(ruleId, target) {
  const dom = document.createElement('div');
  dom.className = 'cm-linter-tooltip';
  const title = document.createElement('div');
  title.className = 'cm-linter-tooltip-title';
  title.textContent = t(`linter.${ruleId}.short`);
  dom.appendChild(title);
  const desc = document.createElement('div');
  desc.className = 'cm-linter-tooltip-desc';
  let text = t(`linter.${ruleId}.tooltip`);
  if (ruleId === 'brokenWikiLink') {
    const cleaned = target.replace(/^\[\[|\]\]$/g, '').split('|')[0].trim();
    text = text.replace('{target}', cleaned);
  }
  desc.textContent = text;
  dom.appendChild(desc);
  return dom;
}

function createEditorState(opts = {}) {
  return EditorState.create({
    doc: opts.content || '',
    extensions: [
      editorCompartments.readOnly.of(EditorState.readOnly.of(opts.readOnly !== false)),
      // 4T-0013: Heading-Folding mit Hierarchie-Spuren. Der eigene
      // headingFoldGutter ersetzt CodeMirrors foldGutter und zeichnet pro
      // Heading-Ebene eine vertikale Spur plus eine 7. Spur fuer Block-
      // Folding (ListItem, Blockquote, FencedCode, HTMLBlock, Table). Die
      // Region-Erkennung nutzt weiterhin den foldService aus
      // @codemirror/lang-markdown (ueber foldable/foldedRanges/foldEffect);
      // codeFolding() aktiviert das foldState-Field, das ohne foldGutter()
      // sonst nicht im State waere. foldKeymap bindet Strg+Umschalt+[ (Fold)
      // und Strg+Umschalt+] (Unfold) an den Cursor.
      codeFolding(),
      // foldStructureField dauerhaft aktiv, weil das Outline-Panel (4T-0014)
      // seine Heading-Liste daraus liest. Nur die visuelle Spalte
      // (headingFoldGutter + foldGutterWidthSync) wird ueber das Compartment
      // ein-/ausgeschaltet.
      foldStructureField,
      editorCompartments.foldGutter.of(
        opts.showFoldGutter !== false ? foldGutterExtensions : [],
      ),
      foldChangeNotifier,
      editorCompartments.lineNumbers.of(opts.lineNumbers ? cmLineNumbers() : []),
      editorCompartments.lineWrap.of(opts.wrapLines ? EditorView.lineWrapping : []),
      // 4T-0019: Typewriter-Scroll als Compartment, zur Laufzeit togglebar.
      editorCompartments.typewriter.of(state.typewriterScroll ? typewriterScrollExtension : []),
      markdown(),
      syntaxHighlighting(mdHighlightStyle, { fallback: true }),
      history(),
      // 4T-0016: Tab/Shift-Tab fuer Listen-Indent vor dem defaultKeymap.
      listIndentKeymap,
      keymap.of([...foldKeymap, ...defaultKeymap, ...historyKeymap]),
      // 4T-0020: Markdown-Linter-Light. lintField haelt die Decorations,
      // lintUpdateListener triggert mit Debounce einen neuen Lauf,
      // lintHoverTooltip zeigt Regel-Beschreibungen beim Hover.
      lintField,
      lintUpdateListener,
      lintHoverTooltip,
      drawSelection(),
      searchHighlightField,
      EditorView.updateListener.of((update) => {
        const pIdx = paneEditors.indexOf(update.view);
        if (pIdx < 0) return;
        const pane = state.panes[pIdx];
        if (!pane || pane.activeIndex < 0) return;
        const tab = pane.tabs[pane.activeIndex];
        if (!tab) return;
        if (update.docChanged) {
          tab.content = update.state.doc.toString();
          const wasDirty = tab.dirty;
          tab.dirty = tab.content !== tab.originalContent;
          if (wasDirty !== tab.dirty) {
            renderTabbar(pIdx);
            updateWindowTitle();
          }
          if (tab.viewMode === 'split') schedulePreviewUpdate(pIdx);
          scheduleAutoSave();
          // 4T-0014: Outline rendert bei jeder Doc-Aenderung neu (Debounce
          // 200 ms), damit die Hierarchie immer aktuell ist.
          if (state.outline.visibleByPane[pIdx]) scheduleOutlineRender(pIdx);
        }
        // 4T-0014: Cursor-Bewegung triggert Aktiv-Sektion-Update mit
        // 100 ms Debounce. Selection-Change reicht — Doc-Change-Pfad oben
        // setzt ohnehin neu auf, weil die Heading-Struktur sich aendern kann.
        if (update.selectionSet && state.outline.visibleByPane[pIdx]) {
          scheduleOutlineActiveUpdate(pIdx);
        }
      }),
    ],
  });
}

function ensureEditorForPane(paneIdx) {
  if (paneEditors[paneIdx]) return paneEditors[paneIdx];
  const els = getPaneEls(paneIdx);
  if (!els || !els.sourceEditor) return null;
  const view = new EditorView({
    state: createEditorState({ readOnly: true }),
    parent: els.sourceEditor,
  });
  paneEditors[paneIdx] = view;
  view.scrollDOM.addEventListener('scroll', () => saveScroll(paneIdx));
  return view;
}

// Setzt Doc, readOnly, Zeilennummern und Umbruch der EditorView einer Pane
// passend zum aktiven Tab. Bei reinen Modus-Wechseln (z.B. Zeilennummern an)
// wird nur das jeweilige Compartment rekonfiguriert, kein Doc-Reset.
function syncEditorForPane(paneIdx) {
  const view = ensureEditorForPane(paneIdx);
  if (!view) return;
  const pane = state.panes[paneIdx];
  const els = getPaneEls(paneIdx);
  if (!pane || pane.activeIndex < 0) {
    if (view.state.doc.length > 0) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } });
    }
    view.dispatch({
      effects: [
        editorCompartments.readOnly.reconfigure(EditorState.readOnly.of(true)),
        editorCompartments.lineNumbers.reconfigure([]),
        editorCompartments.lineWrap.reconfigure([]),
        editorCompartments.foldGutter.reconfigure([]),
      ],
    });
    if (els && els.sourceEditor) els.sourceEditor.classList.add('read-only');
    return;
  }
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return;
  const currentDoc = view.state.doc.toString();
  if (currentDoc !== (tab.content || '')) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: tab.content || '' },
    });
  }
  view.dispatch({
    effects: [
      editorCompartments.readOnly.reconfigure(EditorState.readOnly.of(!tab.editMode)),
      editorCompartments.lineNumbers.reconfigure(tab.showLineNumbers ? cmLineNumbers() : []),
      editorCompartments.lineWrap.reconfigure(tab.wrapLines ? EditorView.lineWrapping : []),
      editorCompartments.foldGutter.reconfigure(tab.showFoldGutter ? foldGutterExtensions : []),
    ],
  });
  if (els && els.sourceEditor) {
    els.sourceEditor.classList.toggle('read-only', !tab.editMode);
  }
  // 4T-0014: Bei Tab-Wechsel die Outline der Pane an die neue Heading-
  // Struktur anpassen (sofern sichtbar). renderOutline ist guenstig genug,
  // um direkt zu laufen ohne weiteres Debounce.
  if (state.outline && state.outline.visibleByPane[paneIdx]) {
    renderOutline(paneIdx);
    computeOutlineActiveLine(paneIdx);
    applyOutlineActiveHighlight(paneIdx);
  }
  // 4T-0015: Bei Tab-Wechsel die Backlinks neu anfordern, falls Sektion
  // sichtbar. Refcount-Management laeuft ueber activate-/deactivate-Pfad.
  if (state.backlinks && state.backlinks.visibleByPane[paneIdx]) {
    activateBacklinksFor(paneIdx, tab && tab.path ? tab.path : null);
  }
}

// 4T-0013: Read-/Write-API fuer Heading-Folding zur Verwendung durch das
// Outline-Panel (4T-0014). Liest den Folding-Status einer Heading-Zeile bzw.
// klappt sie programmatisch ein/aus. Region wird ueber den markdown-foldService
// (foldable) bestimmt; tatsaechlicher Folding-Zustand kommt aus foldedRanges.

// Ermittelt die foldbare Region (from..to) fuer die Zeile mit 1-basiertem Index.
// Gibt null zurueck, wenn die Zeile kein faltbares Heading ist.
function getHeadingRegion(view, line) {
  if (!view) return null;
  const doc = view.state.doc;
  if (line < 1 || line > doc.lines) return null;
  const lineObj = doc.line(line);
  return foldable(view.state, lineObj.from, lineObj.to);
}

function isHeadingRegionFolded(view, line) {
  const region = getHeadingRegion(view, line);
  if (!region) return false;
  let folded = false;
  foldedRanges(view.state).between(region.from, region.to, (from, to) => {
    if (from === region.from && to === region.to) {
      folded = true;
      return false;
    }
  });
  return folded;
}

function foldHeadingRegion(view, line) {
  const region = getHeadingRegion(view, line);
  if (!region) return false;
  if (isHeadingRegionFolded(view, line)) return false;
  view.dispatch({ effects: foldEffect.of(region) });
  return true;
}

function unfoldHeadingRegion(view, line) {
  const region = getHeadingRegion(view, line);
  if (!region) return false;
  if (!isHeadingRegionFolded(view, line)) return false;
  view.dispatch({ effects: unfoldEffect.of(region) });
  return true;
}

function schedulePreviewUpdate(paneIdx) {
  if (pendingPreviewUpdate) clearTimeout(pendingPreviewUpdate.timer);
  pendingPreviewUpdate = {
    paneIdx,
    timer: setTimeout(() => {
      pendingPreviewUpdate = null;
      renderPreviewForPane(paneIdx);
    }, 150),
  };
}

function renderPreviewForPane(paneIdx) {
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return;
  const els = getPaneEls(paneIdx);
  if (!els.renderedHtml) return;
  els.renderedHtml.innerHTML = api.renderMarkdown(tab.content, tab.path);
  // 4T-0021: Mermaid-Bloecke per Lazy-Load und Post-Processing zu SVG.
  applyMermaidIfPresent(els.renderedHtml);
  // 4T-0014: Aktive Outline-Sektion neu ermitteln, weil DOM-Heading-Knoten
  // im Render-Pane jetzt frische BoundingClientRects haben.
  if (state.outline && state.outline.visibleByPane[paneIdx]) {
    scheduleOutlineActiveUpdate(paneIdx);
  }
}

// Setzt den Fenstertitel auf "[•] <Dateiname> — SCG Markdown" passend zum
// aktiven Tab. Bei mehreren offenen Fenstern wird zusaetzlich der Suffix
// "(Fenster N)" angehaengt, lokalisiert (4T-0012). Sendet ausserdem den
// aktiven Tab-Namen und die Tab-Anzahl an den Main, damit andere Fenster die
// Info im Tab-Kontextmenue als Tooltip nutzen koennen.
function updateWindowTitle() {
  const tab = activeTab();
  const name = tab ? tabDisplayName(tab) : '';
  const base = tab ? `${tab.dirty ? '• ' : ''}${name} — SCG Markdown` : 'SCG Markdown';
  const suffix = state.totalWindowCount > 1
    ? ` (${t('window.title.suffix').replace('{n}', String(state.displayNumber))})`
    : '';
  document.title = base + suffix;

  // Aktive Tab-Anzahl ueber alle Panes hinweg.
  let tabCount = 0;
  for (const pane of state.panes) tabCount += pane.tabs.length;
  if (api && typeof api.notifyWindowMeta === 'function') {
    api.notifyWindowMeta({ activeTabName: name, tabCount });
  }
}

// --- Outline-Sidebar (4T-0014) ---------------------------------------------
// Persistente Inhaltsverzeichnis-Sicht pro Pane. Quelle ist das foldStructure-
// Field aus 4T-0013 (gleicher syntaxTree wie das Code-Folding). Klick auf den
// Heading-Text springt im Editor zur Zeile oder scrollt im Render-Pane zum
// Anker; Klick auf den Falt-Indikator toggelt nur die Editor-Region. Aktive
// Sektion folgt der Cursor-Zeile (Edit/Geteilt) bzw. der Scroll-Position
// (Render).

const OUTLINE_RENDER_DEBOUNCE_MS = 200;
const OUTLINE_ACTIVE_DEBOUNCE_MS = 100;
const OUTLINE_DEFAULT_WIDTH = 260;
const OUTLINE_MIN_WIDTH = 180;
const OUTLINE_MAX_WIDTH = 500;
const OUTLINE_INDENT_PX = 12;

const outlineRenderTimers = []; // paneIdx -> timeout id
const outlineActiveTimers = []; // paneIdx -> timeout id

function getOutlineHeadings(paneIdx) {
  const view = paneEditors[paneIdx];
  if (!view) return [];
  const struct = view.state.field(foldStructureField, false);
  return struct && Array.isArray(struct.headings) ? struct.headings : [];
}

function scheduleOutlineRender(paneIdx) {
  if (outlineRenderTimers[paneIdx]) clearTimeout(outlineRenderTimers[paneIdx]);
  outlineRenderTimers[paneIdx] = setTimeout(() => {
    outlineRenderTimers[paneIdx] = null;
    renderOutline(paneIdx);
  }, OUTLINE_RENDER_DEBOUNCE_MS);
}

function renderOutline(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.outlineTree) return;
  const headings = getOutlineHeadings(paneIdx);
  els.outlineTree.innerHTML = '';
  if (headings.length === 0) {
    if (els.outlineEmpty) els.outlineEmpty.hidden = false;
    return;
  }
  if (els.outlineEmpty) els.outlineEmpty.hidden = true;
  const view = paneEditors[paneIdx];
  const doc = view ? view.state.doc : null;
  for (const h of headings) {
    const li = document.createElement('li');
    li.className = 'outline-entry';
    li.style.paddingLeft = ((h.level - 1) * OUTLINE_INDENT_PX) + 'px';
    li.dataset.line = String(h.fromLine);
    li.dataset.level = String(h.level);

    const fold = document.createElement('span');
    fold.className = 'outline-fold';
    fold.dataset.action = 'fold';
    const folded = view ? isHeadingRegionFolded(view, h.fromLine) : false;
    fold.textContent = folded ? '›' : '⌄';
    li.appendChild(fold);

    const label = document.createElement('span');
    label.className = 'outline-label';
    label.dataset.action = 'jump';
    const text = doc ? extractHeadingText(doc, h.fromLine) : `Heading ${h.fromLine}`;
    label.textContent = text;
    label.title = text;
    li.appendChild(label);

    els.outlineTree.appendChild(li);
  }
  applyOutlineActiveHighlight(paneIdx);
}

// Extrahiert den Text einer Heading-Zeile aus dem Doc, mit ATX- bzw. Setext-
// Bereinigung. Trailing '#' bei ATX werden mit entfernt.
function extractHeadingText(doc, lineNumber) {
  if (lineNumber < 1 || lineNumber > doc.lines) return '';
  const lineObj = doc.line(lineNumber);
  let raw = lineObj.text;
  const atx = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(raw);
  if (atx) return atx[1].trim();
  return raw.trim();
}

// Setzt die is-active-Klasse auf dem Outline-Eintrag, der die aktuell aktive
// Heading-Zeile traegt. Aktive Zeile wird ueber state.outline.activeLineByPane
// gehalten; aufruf nach Cursor-/Scroll-Sync oder Outline-Rerender.
function applyOutlineActiveHighlight(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.outlineTree) return;
  const activeLine = state.outline.activeLineByPane[paneIdx] || 0;
  const entries = els.outlineTree.querySelectorAll('.outline-entry');
  let activeEntry = null;
  entries.forEach((entry) => {
    const ln = parseInt(entry.dataset.line, 10);
    entry.classList.remove('is-active');
    if (ln === activeLine) activeEntry = entry;
  });
  if (activeEntry) {
    activeEntry.classList.add('is-active');
    if (typeof activeEntry.scrollIntoView === 'function') {
      const rect = activeEntry.getBoundingClientRect();
      const body = activeEntry.closest('.sidebar-section-body');
      if (body) {
        const bodyRect = body.getBoundingClientRect();
        if (rect.top < bodyRect.top || rect.bottom > bodyRect.bottom) {
          activeEntry.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }
}

function scheduleOutlineActiveUpdate(paneIdx) {
  if (outlineActiveTimers[paneIdx]) clearTimeout(outlineActiveTimers[paneIdx]);
  outlineActiveTimers[paneIdx] = setTimeout(() => {
    outlineActiveTimers[paneIdx] = null;
    computeOutlineActiveLine(paneIdx);
    applyOutlineActiveHighlight(paneIdx);
  }, OUTLINE_ACTIVE_DEBOUNCE_MS);
}

// Ermittelt die aktive Heading-Zeile fuer eine Pane. Im Edit-/Geteilt-Modus
// das zuletzt durchschrittene Heading (fromLine <= Cursor-Zeile), im Render-
// Modus das oberste vollstaendig sichtbare Heading.
function computeOutlineActiveLine(paneIdx) {
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) {
    state.outline.activeLineByPane[paneIdx] = 0;
    return;
  }
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) {
    state.outline.activeLineByPane[paneIdx] = 0;
    return;
  }
  const headings = getOutlineHeadings(paneIdx);
  if (headings.length === 0) {
    state.outline.activeLineByPane[paneIdx] = 0;
    return;
  }
  if (tab.viewMode === 'rendered') {
    state.outline.activeLineByPane[paneIdx] = computeActiveLineFromRender(paneIdx, headings);
  } else {
    state.outline.activeLineByPane[paneIdx] = computeActiveLineFromCursor(paneIdx, headings);
  }
}

function computeActiveLineFromCursor(paneIdx, headings) {
  const view = paneEditors[paneIdx];
  if (!view) return headings[0].fromLine;
  const cursorPos = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(cursorPos).number;
  let active = headings[0].fromLine;
  for (const h of headings) {
    if (h.fromLine <= cursorLine) active = h.fromLine;
    else break;
  }
  return active;
}

function computeActiveLineFromRender(paneIdx, headings) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.renderedHtml) return headings[0].fromLine;
  const scrollEl = els.renderedEl;
  if (!scrollEl) return headings[0].fromLine;
  const scrollRect = scrollEl.getBoundingClientRect();
  const hElements = els.renderedHtml.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (hElements.length === 0) return headings[0].fromLine;
  // Mapping der DOM-Headings auf die foldStructureField-Headings in Reihenfolge.
  // Beide Listen folgen der Dokument-Reihenfolge, daher Index-basiertes Mapping.
  let activeIdx = 0;
  for (let i = 0; i < hElements.length && i < headings.length; i++) {
    const rect = hElements[i].getBoundingClientRect();
    if (rect.top < scrollRect.top + 8) activeIdx = i;
    else break;
  }
  return headings[activeIdx].fromLine;
}

function applyOutlineFoldIndicator(paneIdx, lineNumber) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.outlineTree) return;
  const entry = els.outlineTree.querySelector(`.outline-entry[data-line="${lineNumber}"]`);
  if (!entry) return;
  const fold = entry.querySelector('.outline-fold');
  if (!fold) return;
  const view = paneEditors[paneIdx];
  if (!view) return;
  fold.textContent = isHeadingRegionFolded(view, lineNumber) ? '›' : '⌄';
}

function refreshAllOutlineFoldIndicators(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.outlineTree) return;
  const view = paneEditors[paneIdx];
  if (!view) return;
  els.outlineTree.querySelectorAll('.outline-entry').forEach((entry) => {
    const ln = parseInt(entry.dataset.line, 10);
    const fold = entry.querySelector('.outline-fold');
    if (fold && Number.isFinite(ln)) {
      fold.textContent = isHeadingRegionFolded(view, ln) ? '›' : '⌄';
    }
  });
}

// Sprung-Klick: setzt Cursor auf Heading-Zeile, entfaltet Region falls noetig,
// und scrollt im Render-Pane zum entsprechenden Anker.
function jumpToHeading(paneIdx, lineNumber) {
  const view = paneEditors[paneIdx];
  if (view) {
    if (isHeadingRegionFolded(view, lineNumber)) {
      unfoldHeadingRegion(view, lineNumber);
    }
    const doc = view.state.doc;
    if (lineNumber >= 1 && lineNumber <= doc.lines) {
      const lineObj = doc.line(lineNumber);
      view.dispatch({
        selection: { anchor: lineObj.from },
        effects: EditorView.scrollIntoView(lineObj.from, { y: 'start' }),
      });
      view.focus();
    }
  }
  const pane = state.panes[paneIdx];
  const tab = pane && pane.activeIndex >= 0 ? pane.tabs[pane.activeIndex] : null;
  if (tab && tab.viewMode !== 'source') {
    const els = getPaneEls(paneIdx);
    if (els && els.renderedHtml && view) {
      const text = extractHeadingText(view.state.doc, lineNumber);
      const slug = typeof api.slugifyHeading === 'function'
        ? api.slugifyHeading(text)
        : text.toLowerCase().replace(/\s+/g, '-');
      const anchor = els.renderedHtml.querySelector(
        `[id="${CSS.escape(slug)}"]`,
      );
      if (anchor) anchor.scrollIntoView({ block: 'start' });
    }
  }
}

function toggleHeadingFoldFromOutline(paneIdx, lineNumber) {
  const view = paneEditors[paneIdx];
  if (!view) return;
  if (isHeadingRegionFolded(view, lineNumber)) {
    unfoldHeadingRegion(view, lineNumber);
  } else {
    foldHeadingRegion(view, lineNumber);
  }
}

function bindOutlineEvents(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.outlineTree) return;
  els.outlineTree.addEventListener('click', (ev) => {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;
    const entry = target.closest('.outline-entry');
    if (!entry) return;
    const action = target.dataset.action;
    const lineNumber = parseInt(entry.dataset.line, 10);
    if (!Number.isFinite(lineNumber)) return;
    if (action === 'fold') {
      toggleHeadingFoldFromOutline(paneIdx, lineNumber);
    } else {
      jumpToHeading(paneIdx, lineNumber);
    }
  });
}

function applyOutlineVisibility(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.sidebar) return;
  const outlineVisible = !!state.outline.visibleByPane[paneIdx];
  if (els.outlineSection) els.outlineSection.hidden = !outlineVisible;
  applySidebarVisibility(paneIdx);
  if (outlineVisible) {
    renderOutline(paneIdx);
    computeOutlineActiveLine(paneIdx);
    applyOutlineActiveHighlight(paneIdx);
  }
  updateOutlineToggleButton();
}

// 4T-0014/4T-0015: Gemeinsame Sidebar-Sichtbarkeit. Die Sidebar ist
// sichtbar, sobald mindestens eine Sektion (Outline oder Backlinks)
// sichtbar ist. Wenn beide aus sind, verschwindet auch der Splitter.
function applySidebarVisibility(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.sidebar) return;
  const outlineVisible = !!state.outline.visibleByPane[paneIdx];
  const backlinksVisible = !!state.backlinks.visibleByPane[paneIdx];
  const anyVisible = outlineVisible || backlinksVisible;
  els.sidebar.hidden = !anyVisible;
  if (els.sidebarSplitter) els.sidebarSplitter.hidden = !anyVisible;
  if (anyVisible) {
    els.sidebar.style.width = state.outline.width + 'px';
  }
}

function updateOutlineToggleButton() {
  const btn = document.getElementById('btn-outline');
  if (!btn) return;
  const visible = !!state.outline.visibleByPane[state.activePaneIndex];
  btn.classList.toggle('active', visible);
  btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
}

async function toggleOutlinePanel(paneIdx) {
  if (paneIdx < 0 || paneIdx >= state.panes.length) return;
  const next = !state.outline.visibleByPane[paneIdx];
  state.outline.visibleByPane[paneIdx] = next;
  applyOutlineVisibility(paneIdx);
  await persistOutlineSettings();
  // Menue-Haken synchron halten (gilt fuer aktive Spalte).
  if (paneIdx === state.activePaneIndex && typeof reportMenuStateNow === 'function') {
    reportMenuStateNow();
  }
}

async function persistOutlineSettings() {
  await api.setSetting('outline.visibleColumn0', !!state.outline.visibleByPane[0]);
  await api.setSetting('outline.visibleColumn1', !!state.outline.visibleByPane[1]);
  await api.setSetting('outline.width', state.outline.width);
}

async function loadOutlineSettings() {
  const v0 = await api.getSetting('outline.visibleColumn0');
  const v1 = await api.getSetting('outline.visibleColumn1');
  const w = await api.getSetting('outline.width');
  state.outline.visibleByPane[0] = !!v0;
  state.outline.visibleByPane[1] = !!v1;
  if (typeof w === 'number' && Number.isFinite(w)) {
    state.outline.width = Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, w));
  }
}

// Splitter-Logik fuer die Sidebar (Drag horizontal).
function bindSidebarSplitter(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.sidebarSplitter || !els.sidebar) return;
  els.sidebarSplitter.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    const startX = ev.clientX;
    const startW = els.sidebar.getBoundingClientRect().width;
    function onMove(e) {
      const dx = e.clientX - startX;
      const next = Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, startW + dx));
      state.outline.width = next;
      // Beide Sidebars an die gleiche Breite anpassen, damit die Spalten
      // konsistent bleiben (gemeinsame width-Persistenz).
      for (let i = 0; i < state.panes.length; i++) {
        const e2 = getPaneEls(i);
        if (e2 && e2.sidebar && !e2.sidebar.hidden) {
          e2.sidebar.style.width = next + 'px';
        }
      }
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      persistOutlineSettings();
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

// --- Backlinks-Sidebar (4T-0015) -------------------------------------------
// Zweite Sektion der linken Sidebar. Zeigt eingehende Referenzen auf die
// aktive Datei aus dem Suchraum (Datei-Ordner + 2 Unterordner-Ebenen).
// Indexierung laeuft im Main-Prozess; der Renderer fragt pro Pane bei
// Tab-Wechsel die Backlinks an und gibt die alte Wurzel frei (paarweises
// request/release fuer Refcounting + 60-s-Soft-Timer).

async function activateBacklinksFor(paneIdx, filePath) {
  // Vorherigen Eintrag freigeben (falls noetig).
  const prev = state.backlinks.currentFileByPane[paneIdx];
  if (prev && prev !== filePath) {
    try { await api.releaseBacklinks(prev); } catch { /* ignore */ }
  }
  state.backlinks.currentFileByPane[paneIdx] = filePath || null;
  if (!filePath) {
    state.backlinks.lastResultsByPane[paneIdx] = { status: 'unavailable' };
    renderBacklinks(paneIdx);
    return;
  }
  // Wir fragen direkt an. Status 'ready' kommt im Normalfall sync zurueck.
  let payload;
  try {
    payload = await api.requestBacklinks(filePath);
  } catch {
    payload = { status: 'unavailable' };
  }
  // Race-Sicherung: wenn die Pane in der Zwischenzeit zu einer anderen Datei
  // gewechselt hat, verwerfen wir das Ergebnis.
  if (state.backlinks.currentFileByPane[paneIdx] !== filePath) return;
  state.backlinks.lastResultsByPane[paneIdx] = payload;
  renderBacklinks(paneIdx);
}

async function deactivateBacklinksFor(paneIdx) {
  const prev = state.backlinks.currentFileByPane[paneIdx];
  if (prev) {
    try { await api.releaseBacklinks(prev); } catch { /* ignore */ }
  }
  state.backlinks.currentFileByPane[paneIdx] = null;
  state.backlinks.lastResultsByPane[paneIdx] = null;
}

function renderBacklinks(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.backlinksResults || !els.backlinksStatus) return;
  const payload = state.backlinks.lastResultsByPane[paneIdx];
  els.backlinksResults.innerHTML = '';
  els.backlinksStatus.hidden = true;
  els.backlinksStatus.textContent = '';
  if (!payload) {
    els.backlinksStatus.hidden = false;
    els.backlinksStatus.textContent = t('backlinks.indexing');
    return;
  }
  if (payload.status === 'unavailable') {
    els.backlinksStatus.hidden = false;
    els.backlinksStatus.textContent = t('backlinks.unavailable');
    return;
  }
  if (payload.status === 'oversized') {
    els.backlinksStatus.hidden = false;
    const meta = payload.meta || {};
    const files = meta.fileCount || 0;
    const mb = meta.byteSize ? Math.round(meta.byteSize / (1024 * 1024)) : 0;
    els.backlinksStatus.textContent = t('backlinks.oversized')
      .replace('{files}', String(files))
      .replace('{mb}', String(mb));
    return;
  }
  if (payload.status === 'indexing') {
    els.backlinksStatus.hidden = false;
    els.backlinksStatus.textContent = t('backlinks.indexing');
    return;
  }
  // ready
  const groups = Array.isArray(payload.results) ? payload.results : [];
  if (groups.length === 0) {
    els.backlinksStatus.hidden = false;
    els.backlinksStatus.textContent = t('backlinks.empty');
    return;
  }
  for (const group of groups) {
    const groupEl = document.createElement('div');
    groupEl.className = 'backlinks-group';

    const header = document.createElement('div');
    header.className = 'backlinks-group-header';
    const baseName = api.basename(group.quelldatei);
    header.textContent = baseName;
    header.title = group.quelldatei;
    const firstHit = group.hits[0];
    header.addEventListener('click', () => {
      openOrJumpToPath(group.quelldatei, firstHit ? firstHit.zeile : 1);
    });
    groupEl.appendChild(header);

    for (const hit of group.hits) {
      const hitEl = document.createElement('div');
      hitEl.className = 'backlinks-hit';
      const meta = document.createElement('span');
      meta.className = 'backlinks-hit-meta';
      let metaText = 'L' + hit.zeile;
      if (hit.anker) metaText += ', #' + hit.anker;
      metaText += '  ';
      meta.textContent = metaText;
      hitEl.appendChild(meta);
      const snip = document.createElement('span');
      snip.className = 'backlinks-hit-snippet';
      snip.textContent = hit.snippet || '';
      hitEl.appendChild(snip);
      hitEl.title = hit.snippet || '';
      hitEl.addEventListener('click', () => {
        openOrJumpToPath(group.quelldatei, hit.zeile);
      });
      groupEl.appendChild(hitEl);
    }
    els.backlinksResults.appendChild(groupEl);
  }
  // Tooltip im Info-Symbol auf die konkrete Wurzel setzen.
  if (els.backlinksInfo) {
    const wurzel = payload.meta && payload.meta.wurzel;
    if (wurzel) {
      els.backlinksInfo.title = t('backlinks.scopeTooltip').replace('{root}', wurzel);
    }
  }
}

function applyBacklinksVisibility(paneIdx) {
  const els = getPaneEls(paneIdx);
  if (!els || !els.backlinksSection) return;
  const visible = !!state.backlinks.visibleByPane[paneIdx];
  els.backlinksSection.hidden = !visible;
  applySidebarVisibility(paneIdx);
  if (visible) {
    // Bei Aktivierung aktuelle Datei abfragen.
    const pane = state.panes[paneIdx];
    const tab = pane && pane.activeIndex >= 0 ? pane.tabs[pane.activeIndex] : null;
    activateBacklinksFor(paneIdx, tab && tab.path ? tab.path : null);
  } else {
    deactivateBacklinksFor(paneIdx);
  }
  updateBacklinksToggleButton();
}

function updateBacklinksToggleButton() {
  const btn = document.getElementById('btn-backlinks');
  if (!btn) return;
  const visible = !!state.backlinks.visibleByPane[state.activePaneIndex];
  btn.classList.toggle('active', visible);
  btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
}

async function toggleBacklinksPanel(paneIdx) {
  if (paneIdx < 0 || paneIdx >= state.panes.length) return;
  const next = !state.backlinks.visibleByPane[paneIdx];
  state.backlinks.visibleByPane[paneIdx] = next;
  applyBacklinksVisibility(paneIdx);
  await persistBacklinksSettings();
  if (paneIdx === state.activePaneIndex && typeof reportMenuStateNow === 'function') {
    reportMenuStateNow();
  }
}

async function persistBacklinksSettings() {
  await api.setSetting('backlinks.visibleColumn0', !!state.backlinks.visibleByPane[0]);
  await api.setSetting('backlinks.visibleColumn1', !!state.backlinks.visibleByPane[1]);
}

async function loadBacklinksSettings() {
  const v0 = await api.getSetting('backlinks.visibleColumn0');
  const v1 = await api.getSetting('backlinks.visibleColumn1');
  state.backlinks.visibleByPane[0] = !!v0;
  state.backlinks.visibleByPane[1] = !!v1;
}

// 4T-0015: Tab finden und Cursor auf Zeile setzen — Helper fuer Backlinks-
// Sprung, kapselt findTabAcrossPanes plus Tab-/Pane-Aktivierung und Cursor-
// Sprung. Wenn der Tab in keiner Pane offen ist, wird er in der aktiven Spalte
// geoeffnet.
async function openOrJumpToPath(targetPath, lineNumber) {
  if (!targetPath) return;
  const found = findTabAcrossPanes(targetPath);
  if (found) {
    if (found.paneIdx !== state.activePaneIndex) {
      activatePane(found.paneIdx);
    }
    if (state.panes[found.paneIdx].activeIndex !== found.tabIdx) {
      activateTab(found.paneIdx, found.tabIdx);
    }
    placeCursorAtLine(found.paneIdx, lineNumber);
    return;
  }
  // Neuen Tab in der aktiven Spalte oeffnen, dann Cursor setzen.
  await openInPane(state.activePaneIndex, [targetPath]);
  placeCursorAtLine(state.activePaneIndex, lineNumber);
}

function placeCursorAtLine(paneIdx, lineNumber) {
  const view = paneEditors[paneIdx];
  if (!view) return;
  const ln = parseInt(lineNumber, 10);
  if (!Number.isFinite(ln) || ln < 1) return;
  const doc = view.state.doc;
  const clamped = Math.min(ln, doc.lines);
  const lineObj = doc.line(clamped);
  view.dispatch({
    selection: { anchor: lineObj.from },
    effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
  });
  view.focus();
}

// --- Initialer Main-Zustand -------------------------------------------------
// Der Main-Prozess schickt nach did-finish-load IMMER ein 'window:initialState'.
// Den Listener registrieren wir synchron beim Modul-Laden — sonst koennten wir
// das Event verpassen, falls did-finish-load feuert, bevor init() den ersten
// awaitable Punkt erreicht.
const initialStatePromise = new Promise((resolve) => {
  api.onInitialState((payload) => resolve(payload || { panes: [] }));
});

// 4T-0012: Display-Info-Push vom Main. Synchron registrieren, weil der erste
// Push direkt nach initialState feuert. Wenn der State sich aendert, Titel neu
// rendern, damit der `(Fenster N)`-Suffix sofort sichtbar wird.
api.onWindowDisplayInfo((info) => {
  if (!info) return;
  state.displayNumber = info.displayNumber || 1;
  state.totalWindowCount = info.totalCount || 1;
  updateWindowTitle();
});

// Externe Datei-Argumente (kalter Start mit "Öffnen mit" oder Doppelklick auf
// .md) werden vom Main per 'file:openExternal' geschickt — zeitlich direkt
// nach 'window:initialState'. Dieser Listener MUSS deshalb auch synchron beim
// Modul-Laden registriert werden, sonst geht die Nachricht verloren, weil
// Electron-IPC keine Nachrichten puffert. Solange init() nicht durch ist,
// sammeln wir die Files; danach werden sie geoeffnet.
let initDone = false;
const pendingExternalFiles = [];

// 4T-0012: Append-Tab-Event aus einem anderen Fenster. Synchron registrieren,
// damit kein Event verloren geht. Solange init() nicht durch ist, sammeln; im
// Anschluss abarbeiten.
const pendingAppendPayloads = [];
api.onAppendTabFromOtherWindow((payload) => {
  if (!payload) return;
  if (!initDone) {
    pendingAppendPayloads.push(payload);
    return;
  }
  handleAppendTabFromOtherWindow(payload);
});
api.onOpenExternal((files) => {
  if (!Array.isArray(files) || files.length === 0) return;
  if (!initDone) {
    pendingExternalFiles.push(...files);
  } else {
    openInPane(state.activePaneIndex, files);
  }
});

// --- Initialisierung --------------------------------------------------------
init();

async function init() {
  // Theme
  const initialTheme = await api.getTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  api.onThemeChanged((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    // 4T-0021: alle gerenderten Mermaid-Diagramme neu rendern, damit sie
    // dem neuen Theme folgen. Greift nur, wenn Mermaid bereits geladen ist.
    rerenderAllMermaidBlocks();
  });

  // 4T-0030: Theme-Pref (light/dark/system) aus dem Main laden und auf den
  // Statusbar-Button anwenden. Pref aenderungen aus dem Menue oder einem
  // anderen Fenster kommen ueber onThemePrefChanged. Menue-Klicks landen
  // ueber onMenuSetTheme im Renderer, der dann setThemePref aufruft —
  // damit greift der gleiche Broadcast-Pfad fuer beide Quellen.
  try {
    state.themePref = await api.getThemePref();
  } catch {
    state.themePref = 'system';
  }
  applyThemePrefToButton(state.themePref);
  api.onThemePrefChanged((pref) => {
    state.themePref = pref;
    applyThemePrefToButton(pref);
  });
  api.onMenuSetTheme((value) => {
    api.setThemePref(value);
  });

  // Sprache
  let lang = await api.getSetting('language');
  if (!lang) {
    const locale = await api.getLocale();
    lang = normalizeLocale(locale);
  }
  state.language = lang;
  await loadTranslations(lang);
  applyTranslations(document);
  langSelect.value = lang;

  // Restore-Setting (Quelle der Wahrheit fuer das Haekchen im Hilfe-Menue;
  // die eigentliche Restore-Entscheidung trifft der Main-Prozess vor dem
  // Fenster-Aufbau).
  state.restoreSession = await api.getSetting('restoreSession');
  state.autoSave = !!(await api.getSetting('autoSave'));

  // 4T-0014: Outline-Sichtbarkeit und -Breite aus den Settings laden.
  await loadOutlineSettings();
  // 4T-0015: Backlinks-Sichtbarkeit pro Spalte aus den Settings laden.
  await loadBacklinksSettings();
  // 4T-0018: Schriftart und -groesse fuer Editor und Render-Pane aus den
  // Settings laden und als CSS-Variablen auf :root setzen, bevor die Panes
  // gerendert werden — damit greifen die Werte direkt beim ersten Paint.
  applyAppearanceVars(await readAppearanceFromStore());
  // 4T-0019: Fokus-Modus und Typewriter-Scroll aus den Settings laden.
  // Beide werden global gehalten (nicht pro Fenster) und auf das frische
  // Fenster angewendet, bevor die Panes erzeugt werden, sodass das
  // Compartment beim ersten createEditorState bereits die richtige
  // Konfiguration hat.
  state.focusMode = !!(await api.getSetting('focusMode'));
  state.typewriterScroll = !!(await api.getSetting('typewriterScroll'));
  document.body.classList.toggle('focus-mode', state.focusMode);

  // Bindings
  bindUi();
  bindPaneEvents();
  bindSearchUi();
  await initSearchFromSettings();

  // Datei-Events. onOpenExternal wird bereits beim Modul-Laden synchron
  // registriert (siehe oben), damit das 'file:openExternal' beim kalten Start
  // mit Datei-Argument nicht verpasst wird.
  api.onFileChanged((p) => reloadFile(p));
  api.onFileRemoved((p) => markFileMissing(p));

  // Initialen Zustand vom Main-Prozess uebernehmen. Main schickt das Event
  // IMMER (auch leer), sodass wir deterministisch darauf warten koennen,
  // statt selbst aus den Settings zu lesen — das gehoert im Multi-Window-Setup
  // in den Main-Prozess, der die Pane-Zuordnung pro Fenster kennt.
  const initialState = await initialStatePromise;
  if (initialState && Array.isArray(initialState.panes) && initialState.panes.length > 0) {
    await restorePanes(initialState.panes);
  }

  applyAllLayouts();

  // Init ist durch — gepufferte Datei-Argumente vom kalten Start jetzt oeffnen,
  // und ab jetzt direkt verarbeiten statt zu puffern.
  initDone = true;
  if (pendingExternalFiles.length > 0) {
    const files = pendingExternalFiles.splice(0);
    await openInPane(state.activePaneIndex, files);
  }
  // 4T-0012: ggf. gepufferte Tab-Appends aus anderen Fenstern abarbeiten.
  if (pendingAppendPayloads.length > 0) {
    const payloads = pendingAppendPayloads.splice(0);
    for (const p of payloads) await handleAppendTabFromOtherWindow(p);
  }
}

async function restorePanes(saved) {
  // saved = [{paths, activeIndex, viewMode (legacy)?, tabSettings?}, ...]
  state.panes = [];
  for (let i = 0; i < Math.min(saved.length, MAX_PANES); i++) {
    state.panes.push(createEmptyPane());
  }
  if (state.panes.length === 0) state.panes.push(createEmptyPane());

  for (let i = 0; i < state.panes.length; i++) {
    const entry = saved[i];
    const paths = Array.isArray(entry.paths) ? entry.paths : [];
    const tabSettings = Array.isArray(entry.tabSettings) ? entry.tabSettings : [];
    // Migration: alter Pane-viewMode → für alle Tabs der Pane übernehmen.
    const legacyViewMode = entry.viewMode;

    for (let j = 0; j < paths.length; j++) {
      const p = paths[j];
      try {
        const data = await api.readFile(p);
        const settings = tabSettings[j] || {};
        if (legacyViewMode && !settings.viewMode) settings.viewMode = legacyViewMode;
        state.panes[i].tabs.push(createTab(data.path, data.content, settings));
      } catch (err) {
        // Datei nicht mehr da — Tab nicht aufnehmen.
      }
    }
    const wantedActive = Number.isInteger(entry.activeIndex) ? entry.activeIndex : 0;
    state.panes[i].activeIndex = state.panes[i].tabs.length === 0
      ? -1
      : Math.max(0, Math.min(wantedActive, state.panes[i].tabs.length - 1));
  }

  // Wenn linke Pane leer und rechte gefüllt: rechte hochziehen.
  if (state.panes.length === 2 && state.panes[0].tabs.length === 0 && state.panes[1].tabs.length > 0) {
    state.panes = [state.panes[1]];
  } else if (state.panes.length === 2 && state.panes[1].tabs.length === 0) {
    state.panes.pop();
  }
  state.activePaneIndex = 0;
}

// --- UI-Bindings ------------------------------------------------------------
function bindUi() {
  // "Öffnen", "Über", "Hilfe" und die Sitzungs-Checkbox sind seit 4T-0002 nicht
  // mehr in der UI, sondern im nativen Menue (siehe 4T-0001). Hier bleiben nur
  // noch die Bindings fuer Empty-State-Button und die Modal-Schliesser, plus
  // die Statusbar-Toggles und der Sprach-Selektor.
  $('#btn-open-empty').addEventListener('click', openDialog);
  $('#btn-about-close').addEventListener('click', hideAbout);
  aboutModal.querySelector('.about-modal-backdrop').addEventListener('click', hideAbout);

  $('#btn-help-close').addEventListener('click', hideHelp);
  helpModal.querySelector('.help-modal-backdrop').addEventListener('click', hideHelp);
  // 4T-0027: Tab-Wechsel im Hilfe-Modal per Klick auf die Tab-Buttons.
  helpModal.querySelectorAll('.help-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchHelpTab(tab.dataset.helpTab));
  });

  // 4T-0018: Settings-Modal — Buttons, Backdrop, Live-Vorschau.
  $('#btn-settings-cancel').addEventListener('click', cancelSettings);
  $('#btn-settings-apply').addEventListener('click', applySettings);
  $('#btn-settings-ok').addEventListener('click', okSettings);
  settingsModal.querySelector('.settings-modal-backdrop').addEventListener('click', cancelSettings);
  // Live-Vorschau: jede Aenderung wendet die aktuellen Eingaben sofort als
  // CSS-Variablen an, ohne den Store anzufassen. Bei Abbrechen wird wieder
  // auf den Snapshot zurueckgesetzt.
  ['settings-editor-font', 'settings-editor-size', 'settings-render-font', 'settings-render-size'].forEach((id) => {
    $('#' + id).addEventListener('input', () => applyAppearanceVars(settingsCurrentInputValues()));
  });
  // Auswahl-Trick fuer die <input list>-Felder: Chromium filtert die
  // Datalist-Optionen auf Substring-Matches des aktuellen Werts — bei
  // gefuelltem Feld bleibt damit nur ein Eintrag sichtbar. Loesung: Beim
  // ersten Maus-Klick auf ein fokussiertes-noch-nicht-Feld wird der Wert
  // zwischengespeichert und visuell auf leer gesetzt; das Dropdown zeigt
  // anschliessend alle Optionen. Geht der Fokus ohne Eingabe verloren,
  // wird der gemerkte Wert wiederhergestellt. Programmatisches value-
  // Setzen loest kein input-Event aus — die Live-Vorschau bleibt auf dem
  // letzten guten Stand.
  ['settings-editor-font', 'settings-render-font'].forEach((id) => {
    const el = $('#' + id);
    el.addEventListener('mousedown', () => {
      if (document.activeElement !== el && el.value) {
        el.dataset.savedValue = el.value;
        el.value = '';
      }
    });
    el.addEventListener('blur', () => {
      if (!el.value && el.dataset.savedValue) {
        el.value = el.dataset.savedValue;
      }
      delete el.dataset.savedValue;
    });
  });

  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  $('#btn-wrap').addEventListener('click', toggleWrapLines);
  $('#btn-numbers').addEventListener('click', toggleShowLineNumbers);
  $('#btn-fold-gutter').addEventListener('click', toggleShowFoldGutter);
  if (btnEdit) btnEdit.addEventListener('click', toggleEditMode);

  // 4T-0030: Klick auf den Statusbar-Theme-Button zykliert den Pref. Die
  // tatsaechliche Theme-Anwendung passiert ueber den Broadcast aus dem Main
  // ('theme:prefChanged' aktualisiert das Icon, 'theme:changed' das
  // data-theme-Attribut und Mermaid).
  if (btnTheme) {
    btnTheme.addEventListener('click', async () => {
      const next = THEME_NEXT[state.themePref] || 'system';
      // Optimistisches Icon-Update, damit der Klick sofort eine Rueckmeldung
      // gibt; der Broadcast aus Main bestaetigt den Wert anschliessend.
      state.themePref = next;
      applyThemePrefToButton(next);
      try {
        await api.setThemePref(next);
      } catch (err) {
        console.warn('setThemePref schlug fehl:', err);
      }
    });
  }

  // 4T-0014: Statusbar-Toggle fuer Outline-Panel der aktiven Spalte.
  const btnOutline = $('#btn-outline');
  if (btnOutline) {
    btnOutline.addEventListener('click', () => toggleOutlinePanel(state.activePaneIndex));
  }
  // 4T-0015: Statusbar-Toggle fuer Backlinks-Panel der aktiven Spalte.
  const btnBacklinks = $('#btn-backlinks');
  if (btnBacklinks) {
    btnBacklinks.addEventListener('click', () => toggleBacklinksPanel(state.activePaneIndex));
  }
  // 4T-0014 + 4T-0015: Tastenkuerzel Strg+Umschalt+O (Outline) und
  // Strg+Umschalt+B (Backlinks) toggeln das jeweilige Panel.
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && !e.altKey) {
      if (e.key === 'O' || e.key === 'o') {
        e.preventDefault();
        toggleOutlinePanel(state.activePaneIndex);
      } else if (e.key === 'B' || e.key === 'b') {
        e.preventDefault();
        toggleBacklinksPanel(state.activePaneIndex);
      } else if (e.key === 'F' || e.key === 'f') {
        // 4T-0019: Strg+Umschalt+F toggelt den Fokus-Modus des aktiven Fensters.
        e.preventDefault();
        toggleFocusMode();
      }
    }
  });
  // 4T-0014: Folding-Aenderungen aus dem Editor (Gutter, Tastenkuerzel,
  // programmatisch) in die Outline durchreichen. Pfeil-Indikator wird gezielt
  // aktualisiert, ohne den gesamten Baum neu zu rendern.
  document.addEventListener('scg:foldchange', (ev) => {
    const pIdx = ev && ev.detail && typeof ev.detail.paneIdx === 'number'
      ? ev.detail.paneIdx
      : -1;
    if (pIdx < 0) return;
    if (!state.outline.visibleByPane[pIdx]) return;
    refreshAllOutlineFoldIndicators(pIdx);
  });

  langSelect.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    state.language = newLang;
    await api.setSetting('language', newLang);
    await loadTranslations(newLang);
    applyTranslations(document);
    setLanguage(newLang);
    reportMenuStateNow();
    renderAllPanes();
    // 4T-0017: Zoom-Indikator-Text ist nicht ueber data-i18n abgedeckt
    // (enthaelt Platzhalter); explizit neu rendern.
    renderZoomIndicator();
    // Such-Labels (Scope, Counter) sind nicht ueber data-i18n abgedeckt.
    if (search.visible) {
      updateSearchScopeLabel();
      updateSearchCounter();
    }
    // Regex-Hilfe wird dynamisch befuellt; bei offener Anzeige neu rendern.
    if (isRegexHelpOpen()) renderRegexHelp();
    // Hilfe-Modal wird ebenfalls dynamisch befuellt.
    if (!helpModal.hidden) renderHelpContent();
  });

  // 4T-0017: Strg+Mausrad zoomt den Inhalt der fokussierten Pane in 10-%-
  // Schritten. preventDefault verhindert den Electron-/Browser-Default-Zoom.
  // passive:false ist Voraussetzung, damit preventDefault greift.
  panesContainer.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? +1 : -1;
    adjustTabZoom(state.activePaneIndex, delta);
  }, { passive: false });

  // 4T-0017: Zoom-Indikator in der Statusbar als Reset-Klickziel.
  const zoomIndicator = document.getElementById('zoom-indicator');
  if (zoomIndicator) {
    zoomIndicator.addEventListener('click', () => resetTabZoom(state.activePaneIndex));
  }

  // File-Drag&Drop für EXTERNE Dateien (nicht für Tab-Drag).
  let dragCounter = 0;
  function isFileDrag(e) {
    return e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  }
  window.addEventListener('dragenter', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter += 1;
    if (dragCounter === 1) dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (!e.dataTransfer) return;
    if (Array.from(e.dataTransfer.types).includes(MIME_TAB)) return;
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dropOverlay.hidden = true;
  });
  window.addEventListener('dragover', (e) => {
    if (isFileDrag(e)) e.preventDefault();
  });
  window.addEventListener('drop', async (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.hidden = true;
    const files = [];
    for (const f of e.dataTransfer.files) {
      const p = api.getPathForFile(f);
      if (p) files.push(p);
    }
    const targetPane = paneIndexAtPoint(e.clientX);
    if (files.length > 0) await openInPane(targetPane, files);
  });

  // Klicks außerhalb von Menüs schließen sie.
  document.addEventListener('mousedown', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
    // Regex-Hilfe schliessen bei Klick ausserhalb (Hilfe-Button toggelt selbst).
    if (isRegexHelpOpen()) {
      const help = getSearchEls();
      if (!help.helpPopover.contains(e.target) && !help.btnHelp.contains(e.target)) {
        closeRegexHelp();
      }
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Reihenfolge: Regex-Hilfe > Suchleiste > Modale (Hilfe, About) > Menues.
      if (isRegexHelpOpen()) {
        closeRegexHelp();
        return;
      }
      if (search.visible) {
        closeSearchBar();
        return;
      }
      // 4T-0019: Vor dem allgemeinen Hide-Block pruefen, ob etwas Sichtbares
      // mit Vorrang offen ist. Wenn ja, schliesst Esc nur dieses Element und
      // der Fokus-Modus bleibt unangetastet. Sonst verlaesst Esc den Fokus-
      // Modus (sofern aktiv).
      const hasOpenOverlay = !contextMenu.hidden
        || !helpModal.hidden
        || !aboutModal.hidden
        || !settingsModal.hidden;
      hideContextMenu();
      hideHelp();
      hideAbout();
      hideSettings();
      if (!hasOpenOverlay && state.focusMode) setFocusMode(false);
    }
    // F1 ist jetzt am Menue-Eintrag "Hilfe" als Accelerator gebunden, kein
    // manueller Handler hier mehr noetig.
  });

  // Tastenkürzel
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      moveActiveTabBetweenPanes('right');
    } else if (ctrl && e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      moveActiveTabBetweenPanes('left');
    } else if (ctrl && !e.altKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      const pane = state.panes[state.activePaneIndex];
      if (pane && pane.activeIndex >= 0) closeTab(state.activePaneIndex, pane.activeIndex);
    } else if (ctrl && e.key === 'Tab') {
      e.preventDefault();
      const pane = state.panes[state.activePaneIndex];
      if (pane && pane.tabs.length > 0) {
        const next = (pane.activeIndex + (e.shiftKey ? -1 : 1) + pane.tabs.length) % pane.tabs.length;
        activateTab(state.activePaneIndex, next);
      }
    } else if (ctrl && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openSearchBar();
    } else if (ctrl && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      // Strg+H ist nur im Edit-Modus aktiv (Source ist editierbar).
      const tab = activeTab();
      if (tab && tab.editMode) openSearchBar({ replaceMode: true });
    } else if (ctrl && !e.altKey && !e.shiftKey && e.key === ',') {
      // 4T-0018: Strg + , oeffnet den Settings-Dialog (verbreitete Konvention,
      // u.a. in VS Code und vielen Editoren).
      e.preventDefault();
      showSettings();
    } else if (ctrl && !e.altKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
      // 4T-0017: Strg + +/-/0 zoomt Inhalt der fokussierten Pane. Matcht
      // ueber e.key, deckt damit deutsche Tastatur (Shift+'+'-Taste),
      // englische Tastatur (Shift+'='-Taste) und Numpad gleichermassen ab.
      e.preventDefault();
      if (e.key === '+') adjustTabZoom(state.activePaneIndex, +1);
      else if (e.key === '-') adjustTabZoom(state.activePaneIndex, -1);
      else resetTabZoom(state.activePaneIndex);
    } else if (e.key === 'F3') {
      if (!search.visible) return;
      e.preventDefault();
      if (e.shiftKey) prevMatch();
      else nextMatch();
    }
  });

  // Menue-Aktionen vom Main-Prozess. Klicks auf Menue-Eintraege werden ueber
  // IPC an den Renderer geschickt, der dieselben Funktionen aufruft, die auch
  // an die alten Toolbar-Buttons gebunden sind. Damit funktionieren Menue und
  // Toolbar parallel; die Toolbar entfaellt erst in 4T-0002.
  api.onMenuNew(() => newUntitledTab());
  api.onMenuOpenFile(() => openDialog());
  api.onMenuViewChange((mode) => setViewMode(mode));
  api.onMenuToggleLineNumbers(() => toggleShowLineNumbers());
  api.onMenuToggleWordWrap(() => toggleWrapLines());
  if (typeof api.onMenuToggleFoldGutter === 'function') {
    api.onMenuToggleFoldGutter(() => toggleShowFoldGutter());
  }
  api.onMenuSave(() => saveCurrentTab());
  api.onMenuSaveAs(() => saveCurrentTabAs());
  // 4T-0041: Export 'Portables Markdown...'.
  if (typeof api.onMenuExportPortable === 'function') {
    api.onMenuExportPortable(() => exportCurrentTabAsPortable());
  }
  api.onMenuToggleAutoSave(async () => {
    state.autoSave = !state.autoSave;
    await api.setSetting('autoSave', state.autoSave);
    if (state.autoSave) performAutoSave();
  });
  api.onMenuOpenHelp(() => showHelp());
  api.onMenuOpenAbout(() => showAbout());
  // 4T-0018: Settings-Dialog ueber Menue oeffnen.
  if (typeof api.onMenuOpenSettings === 'function') {
    api.onMenuOpenSettings(() => showSettings());
  }
  // 4T-0019: Fokus-Modus und Typewriter-Scroll ueber Menue toggeln.
  if (typeof api.onMenuToggleFocusMode === 'function') {
    api.onMenuToggleFocusMode(() => toggleFocusMode());
  }
  if (typeof api.onMenuToggleTypewriterScroll === 'function') {
    api.onMenuToggleTypewriterScroll(() => toggleTypewriterScroll());
  }
  // 4T-0019: Bearbeiten-Toggle ueber das Ansicht-Menue (Strg+E). Loest den
  // bisherigen Renderer-only-Tastenkuerzel-Handler ab, sodass der Modus auch
  // im Fokus-Modus (ohne sichtbaren Toolbar-Button) togglebar bleibt.
  if (typeof api.onMenuToggleEdit === 'function') {
    api.onMenuToggleEdit(() => toggleEditMode());
  }
  // 4T-0018: Multi-Window-Broadcast: ein anderes Fenster hat eine appearance.*-
  // Einstellung geaendert. Lokale CSS-Variablen aktualisieren.
  if (typeof api.onAppearanceChanged === 'function') {
    api.onAppearanceChanged((values) => {
      if (values) applyAppearanceVars(values);
    });
  }
  api.onMenuToggleRestoreSession(async () => {
    state.restoreSession = !state.restoreSession;
    await api.setSetting('restoreSession', state.restoreSession);
  });
  // 4T-0014: Menue-Eintrag "Ansicht -> Inhaltsverzeichnis" toggelt die
  // Outline-Sichtbarkeit der aktiv fokussierten Spalte; der Menue-Haken
  // wird ueber reportMenuStateNow() im Anschluss an den Toggle aktualisiert.
  if (typeof api.onMenuToggleOutline === 'function') {
    api.onMenuToggleOutline(async () => {
      await toggleOutlinePanel(state.activePaneIndex);
      reportMenuStateNow();
    });
  }
  // 4T-0015: Menue-Eintrag "Ansicht -> Backlinks" und Live-Update-Listener.
  if (typeof api.onMenuToggleBacklinks === 'function') {
    api.onMenuToggleBacklinks(async () => {
      await toggleBacklinksPanel(state.activePaneIndex);
      reportMenuStateNow();
    });
  }
  if (typeof api.onBacklinksInvalidated === 'function') {
    api.onBacklinksInvalidated(() => {
      // Bei Index-Update alle sichtbaren Backlinks-Sektionen frisch anfordern.
      for (let i = 0; i < state.panes.length; i++) {
        if (state.backlinks.visibleByPane[i]) {
          const pane = state.panes[i];
          const tab = pane && pane.activeIndex >= 0 ? pane.tabs[pane.activeIndex] : null;
          activateBacklinksFor(i, tab && tab.path ? tab.path : null);
        }
      }
    });
  }

  // Window-Close-Anfrage vom Main-Prozess. Wir pruefen alle dirtigen Tabs in
  // diesem Fenster und fragen pro Tab nach (Speichern/Verwerfen/Abbrechen).
  // Wenn der Nutzer "Abbrechen" waehlt, wird das Schliessen abgebrochen,
  // sonst confirmClose() an Main melden.
  api.onWindowRequestClose(async () => {
    await withDialog(async () => {
      const dirty = [];
      for (let p = 0; p < state.panes.length; p++) {
        for (let i = 0; i < state.panes[p].tabs.length; i++) {
          const tb = state.panes[p].tabs[i];
          if (tb.dirty) dirty.push({ paneIdx: p, tabIdx: i, tab: tb });
        }
      }
      for (const d of dirty) {
        activatePane(d.paneIdx);
        activateTab(d.paneIdx, d.tabIdx);
        const detail = d.tab.path || tabDisplayName(d.tab);
        const result = await api.confirmCloseDirty({ detail });
        if (result === 'cancel') return; // Schliessen abgebrochen
        if (result === 'save') {
          const ok = await saveTab(d.paneIdx, d.tabIdx);
          if (!ok) return; // Speichern abgebrochen/gescheitert
        }
        // 'discard': fortfahren ohne Speichern
      }
      api.confirmClose();
    });
  });

  // Auto-Save bei Fenster-Fokusverlust (Wechsel in andere App oder Fenster).
  window.addEventListener('blur', () => {
    if (state.autoSave) performAutoSave();
  });

  initOuterSplitter();
}

function bindPaneEvents() {
  paneRoots.forEach((root, idx) => {
    root.addEventListener('mousedown', () => activatePane(idx));

    const renderedHtml = root.querySelector('.markdown-body');
    renderedHtml.addEventListener('click', (e) => handleRenderedClick(e, idx));

    const sourceEl = root.querySelector('.pane-source');
    const renderedEl = root.querySelector('.pane-rendered');
    sourceEl.addEventListener('scroll', () => saveScroll(idx));
    renderedEl.addEventListener('scroll', () => {
      saveScroll(idx);
      // 4T-0014: aktive Sektion folgt im Render-Modus dem Scroll-Stand.
      if (state.outline.visibleByPane[idx]) {
        scheduleOutlineActiveUpdate(idx);
      }
    });

    bindOutlineEvents(idx);
    bindSidebarSplitter(idx);

    initInnerSplitter(idx);

    const tabbar = root.querySelector('.tabbar');
    tabbar.addEventListener('dragover', (e) => {
      if (Array.from(e.dataTransfer.types).includes(MIME_TAB)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tabbar.classList.add('drag-target');
      }
    });
    tabbar.addEventListener('dragleave', () => {
      tabbar.classList.remove('drag-target');
    });
    tabbar.addEventListener('drop', (e) => {
      if (!Array.from(e.dataTransfer.types).includes(MIME_TAB)) return;
      e.preventDefault();
      tabbar.classList.remove('drag-target');
      const data = parseTabDrag(e);
      if (!data) return;
      moveTabBetweenPanes(data.fromPane, data.tabIndex, idx, state.panes[idx].tabs.length);
    });
  });
}

function paneIndexAtPoint(clientX) {
  if (state.panes.length === 1) return 0;
  const rect1 = paneRoots[1].getBoundingClientRect();
  return clientX >= rect1.left ? 1 : 0;
}

// --- Splitter ---------------------------------------------------------------
function initInnerSplitter(paneIdx) {
  const els = getPaneEls(paneIdx);
  let dragging = false;
  els.innerSplitter.addEventListener('mousedown', (e) => {
    const pane = state.panes[paneIdx];
    if (!pane || pane.activeIndex < 0) return;
    const tab = pane.tabs[pane.activeIndex];
    if (!tab || tab.viewMode !== 'split') return;
    dragging = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = els.content.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    els.sourceEl.style.flex = `${clamped} 1 0`;
    els.renderedEl.style.flex = `${1 - clamped} 1 0`;
  });
  window.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; document.body.style.cursor = ''; }
  });
}

function initOuterSplitter() {
  let dragging = false;
  outerSplitter.addEventListener('mousedown', (e) => {
    if (state.panes.length !== 2) return;
    dragging = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = panesContainer.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    paneRoots[0].style.flex = `${clamped} 1 0`;
    paneRoots[1].style.flex = `${1 - clamped} 1 0`;
  });
  window.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; document.body.style.cursor = ''; }
  });
}

// --- Datei öffnen -----------------------------------------------------------
async function openDialog() {
  const files = await api.openDialog();
  if (files.length > 0) await openInPane(state.activePaneIndex, files);
}

// Cross-Pane-Lookup (Variante B): wenn die Datei in IRGENDEINER Pane offen ist,
// dorthin springen und Tab aktivieren — kein Duplikat.
async function openInPane(targetPaneIdx, paths) {
  for (const raw of paths) {
    const p = raw;
    const found = findTabAcrossPanes(p);
    if (found) {
      activatePane(found.paneIdx);
      activateTab(found.paneIdx, found.tabIdx);
      api.pushRecent(p);
      continue;
    }
    try {
      const data = await api.readFile(p);
      state.panes[targetPaneIdx].tabs.push(createTab(data.path, data.content));
      activatePane(targetPaneIdx);
      activateTab(targetPaneIdx, state.panes[targetPaneIdx].tabs.length - 1);
      api.pushRecent(data.path);
    } catch (err) {
      console.error('Konnte Datei nicht lesen:', p, err);
    }
  }
  applyAllLayouts();
  persistState();
}

function findTabAcrossPanes(path) {
  for (let p = 0; p < state.panes.length; p++) {
    const idx = state.panes[p].tabs.findIndex((t) => t.path === path);
    if (idx >= 0) return { paneIdx: p, tabIdx: idx };
  }
  return null;
}

// --- Pane-Aktivierung -------------------------------------------------------
function activatePane(paneIdx) {
  if (paneIdx < 0 || paneIdx >= state.panes.length) return;
  if (state.activePaneIndex === paneIdx) {
    updateActivePaneClasses();
    syncToolbarToActiveTab();
    updateOutlineToggleButton();
    updateBacklinksToggleButton();
    renderZoomIndicator();
    return;
  }
  state.activePaneIndex = paneIdx;
  updateActivePaneClasses();
  syncToolbarToActiveTab();
  updateOutlineToggleButton();
  updateBacklinksToggleButton();
  // 4T-0017: Pane-Wechsel aendert den fokussierten Tab — Indikator nachziehen.
  renderZoomIndicator();
  // Bei aktiver Suche im neuen Pane neu suchen.
  refreshSearchIfVisible();
}

function updateActivePaneClasses() {
  paneRoots.forEach((r, i) => r.classList.toggle('active-pane', i === state.activePaneIndex));
}

// Setzt View-Buttons + Toggle-Buttons passend zum aktiven Tab.
// Toggles werden ausgegraut, wenn keine Quellcode-Pane sichtbar ist.
function syncToolbarToActiveTab() {
  const tab = activeTab();
  const viewMode = tab ? tab.viewMode : DEFAULT_VIEW_MODE;
  const wrap = tab ? tab.wrapLines : DEFAULT_WRAP_LINES;
  const numbers = tab ? tab.showLineNumbers : DEFAULT_SHOW_LINE_NUMBERS;
  const foldGutter = tab ? tab.showFoldGutter : DEFAULT_SHOW_FOLD_GUTTER;

  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewMode);
  });

  const sourceVisible = viewMode === 'source' || viewMode === 'split';
  const wrapBtn = $('#btn-wrap');
  const numbersBtn = $('#btn-numbers');
  const foldGutterBtn = $('#btn-fold-gutter');
  wrapBtn.classList.toggle('active', wrap);
  numbersBtn.classList.toggle('active', numbers);
  if (foldGutterBtn) {
    foldGutterBtn.classList.toggle('active', foldGutter);
    foldGutterBtn.disabled = !sourceVisible || !tab;
  }
  wrapBtn.disabled = !sourceVisible || !tab;
  numbersBtn.disabled = !sourceVisible || !tab;
  if (btnEdit) {
    btnEdit.classList.toggle('active', !!(tab && tab.editMode));
    btnEdit.disabled = !tab;
  }
  reportMenuStateNow();
  updateWindowTitle();
}

// Spiegelt den menue-relevanten Stand an den Main-Prozess, damit das
// Fenster-Menue Haekchen und Disabled-States passend zum aktiven Tab anzeigt.
function reportMenuStateNow() {
  const tab = activeTab();
  const viewMode = tab ? tab.viewMode : null;
  api.reportMenuState({
    locale: state.language,
    viewMode,
    lineNumbers: tab ? !!tab.showLineNumbers : true,
    wordWrap: tab ? !!tab.wrapLines : false,
    // 4T-0013: Haekchen-Stand fuer das Gliederungs-Toggle im Ansicht-Menue.
    foldGutter: tab ? !!tab.showFoldGutter : DEFAULT_SHOW_FOLD_GUTTER,
    togglesEnabled: viewMode === 'source' || viewMode === 'split',
    hasActiveTab: !!tab,
    // 4T-0014: Haekchen im "Ansicht -> Inhaltsverzeichnis"-Menue spiegelt
    // die Sichtbarkeit der Outline in der aktiv fokussierten Spalte.
    outlineVisible: !!state.outline.visibleByPane[state.activePaneIndex],
    // 4T-0015: Haekchen-Stand fuer das Backlinks-Toggle im Ansicht-Menue.
    backlinksVisible: !!state.backlinks.visibleByPane[state.activePaneIndex],
    // 4T-0019: Haekchen-Stand fuer Fokus-Modus und Typewriter-Scroll im
    // Ansicht-Menue (beide pro Fenster wirksam, global persistiert).
    focusMode: !!state.focusMode,
    typewriterScroll: !!state.typewriterScroll,
    // 4T-0019: Edit-Modus pro Tab. Im Menue als Checkbox "Bearbeiten" mit
    // Accelerator Strg+E. Damit ist der Modus auch im Fokus-Modus
    // erreichbar (Toolbar-Button ist dort ausgeblendet).
    editMode: tab ? !!tab.editMode : false,
  });
}

// --- Tab-Verwaltung ---------------------------------------------------------
function activateTab(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane || tabIdx < 0 || tabIdx >= pane.tabs.length) return;
  pane.activeIndex = tabIdx;
  renderTabbar(paneIdx);
  renderPaneContent(paneIdx);
  activatePane(paneIdx);
  applyAllLayouts();
  // 4T-0017: Indikator zeigt den Zoom des fokussierten Tabs; bei Tab-Wechsel
  // innerhalb der aktiven Pane mit anpassen.
  renderZoomIndicator();
  persistState();
}

async function closeTab(paneIdx, tabIdx, opts = {}) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;

  // Dirty-Check: bei ungespeicherten Aenderungen Dialog mit Speichern/
  // Verwerfen/Abbrechen. Bei intern ausgeloestem Schliessen (z.B. Tab in
  // anderes Fenster verschieben) wird der Check uebersprungen.
  if (tab.dirty && !opts.skipDirtyCheck) {
    activatePane(paneIdx);
    activateTab(paneIdx, tabIdx);
    const detail = tab.path || tabDisplayName(tab);
    const result = await withDialog(() => api.confirmCloseDirty({ detail }));
    if (result === 'cancel') return;
    if (result === 'save') {
      const ok = await saveTab(paneIdx, tabIdx);
      if (!ok) return;
    }
    // 'discard' faellt durch zum Schliessen
  }

  const stillElsewhere = tab.path
    ? state.panes.some((p, pi) => p.tabs.some((tb, ti) => tb.path === tab.path && !(pi === paneIdx && ti === tabIdx)))
    : true;
  if (tab.path && !stillElsewhere) await api.unwatchFile(tab.path);

  pane.tabs.splice(tabIdx, 1);
  if (pane.tabs.length === 0) {
    pane.activeIndex = -1;
  } else if (pane.activeIndex >= pane.tabs.length) {
    pane.activeIndex = pane.tabs.length - 1;
  } else if (tabIdx < pane.activeIndex) {
    pane.activeIndex -= 1;
  }
  collapseEmptyPanes();
  applyAllLayouts();
  persistState();
}

function collapseEmptyPanes() {
  if (state.panes.length === 2 && state.panes[1].tabs.length === 0) {
    state.panes.pop();
    if (state.activePaneIndex >= state.panes.length) state.activePaneIndex = state.panes.length - 1;
  }
  if (state.panes.length === 2 && state.panes[0].tabs.length === 0) {
    state.panes.shift();
    state.activePaneIndex = 0;
  }
}

function moveTabBetweenPanes(fromPane, fromIdx, toPane, toIdx) {
  if (fromPane === toPane) {
    return reorderTabWithinPane(fromPane, fromIdx, toIdx);
  }
  const pane = state.panes[fromPane];
  const tab = pane.tabs[fromIdx];
  if (!tab) return;

  ensurePaneExists(toPane);

  const targetExisting = state.panes[toPane].tabs.findIndex((tt) => tt.path === tab.path);
  if (targetExisting >= 0) {
    pane.tabs.splice(fromIdx, 1);
    if (pane.activeIndex >= pane.tabs.length) pane.activeIndex = pane.tabs.length - 1;
    activatePane(toPane);
    activateTab(toPane, targetExisting);
    collapseEmptyPanes();
    applyAllLayouts();
    persistState();
    return;
  }

  pane.tabs.splice(fromIdx, 1);
  if (pane.activeIndex >= pane.tabs.length) pane.activeIndex = pane.tabs.length - 1;

  const insertAt = Math.max(0, Math.min(toIdx, state.panes[toPane].tabs.length));
  state.panes[toPane].tabs.splice(insertAt, 0, tab);
  state.panes[toPane].activeIndex = insertAt;

  collapseEmptyPanes();
  const newToPane = state.panes.indexOf(state.panes[toPane] || pane);
  activatePane(newToPane >= 0 ? newToPane : 0);
  applyAllLayouts();
  persistState();
}

function reorderTabWithinPane(paneIdx, fromIdx, toIdx) {
  const pane = state.panes[paneIdx];
  if (!pane || fromIdx === toIdx) return;
  const [tab] = pane.tabs.splice(fromIdx, 1);
  let newIdx = toIdx;
  if (toIdx > fromIdx) newIdx -= 1;
  newIdx = Math.max(0, Math.min(newIdx, pane.tabs.length));
  pane.tabs.splice(newIdx, 0, tab);
  pane.activeIndex = newIdx;
  renderTabbar(paneIdx);
  persistState();
}

function ensurePaneExists(paneIdx) {
  while (state.panes.length <= paneIdx && state.panes.length < MAX_PANES) {
    state.panes.push(createEmptyPane());
  }
}

function moveActiveTabBetweenPanes(direction) {
  const paneIdx = state.activePaneIndex;
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tabIdx = pane.activeIndex;
  if (direction === 'right') {
    const targetPane = paneIdx === 0 ? 1 : null;
    if (targetPane === null) return;
    moveTabBetweenPanes(paneIdx, tabIdx, targetPane, state.panes[1] ? state.panes[1].tabs.length : 0);
  } else if (direction === 'left') {
    if (paneIdx === 0) return;
    moveTabBetweenPanes(paneIdx, tabIdx, 0, state.panes[0].tabs.length);
  }
}

// Baut aus einem einzelnen Tab einen Single-Pane-Snapshot, wie ihn der
// Main-Prozess als initialPanes fuer ein neues Fenster erwartet.
function singlePaneSnapshotFromTab(tab) {
  return [{
    paths: [tab.path],
    activeIndex: 0,
    tabSettings: [{
      viewMode: tab.viewMode,
      wrapLines: tab.wrapLines,
      showLineNumbers: tab.showLineNumbers,
      showFoldGutter: tab.showFoldGutter,
    }],
  }];
}

async function copyTabToNewWindow(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;
  await api.openNewWindow(singlePaneSnapshotFromTab(tab));
}

async function moveTabToNewWindow(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;
  // Erst Fenster oeffnen, dann Tab schliessen. So bleibt die Datei waehrend
  // des Uebergangs sicher in mindestens einem Fenster offen — der File-Watcher
  // im Main-Prozess macht das ueber Refcounting korrekt.
  // Dirty-Check ueberspringen, weil das neue Fenster die Datei ohnehin neu
  // lädt; der nicht-gespeicherte Buffer-Stand des Quell-Tabs geht dabei
  // verloren. (TODO: sauberer Transfer in 0.7.)
  await api.openNewWindow(singlePaneSnapshotFromTab(tab));
  await closeTab(paneIdx, tabIdx, { skipDirtyCheck: true });
}

// 4T-0012: Tab-Payload fuer den Transfer in ein bestehendes Fenster. Im
// Gegensatz zu singlePaneSnapshotFromTab traegt dieser Snapshot auch den
// aktuellen (ggf. dirty) Buffer-Inhalt sowie editMode mit, damit die Bearbeitung
// im Zielfenster nahtlos weitergeht.
function buildTabPayload(tab) {
  return {
    path: tab.path || null,
    content: tab.content || '',
    dirty: !!tab.dirty,
    settings: {
      viewMode: tab.viewMode,
      wrapLines: tab.wrapLines,
      showLineNumbers: tab.showLineNumbers,
      showFoldGutter: tab.showFoldGutter,
      editMode: !!tab.editMode,
      // 4T-0017: Zoom des Tabs wandert mit (analog zu View-Modus und Edit-Mode).
      zoom: tab.zoom ?? DEFAULT_ZOOM,
    },
    untitledIndex: tab.untitledIndex || null,
  };
}

// 4T-0012: Tab in ein bereits offenes Zielfenster kopieren. Der Quell-Tab
// bleibt unveraendert offen.
async function copyTabToWindow(targetWindowId, paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;
  const result = await api.appendTabToWindow(targetWindowId, buildTabPayload(tab));
  if (!result || !result.ok) {
    showStatusbarHint('statusbar.targetWindowGone', { duration: 2500, error: true });
  }
}

// 4T-0012: Tab in ein bereits offenes Zielfenster verschieben. Erst kopieren,
// und nur bei Erfolg den Quell-Tab schliessen (skipDirtyCheck, weil der Inhalt
// inkl. dirty Buffer mitwandert).
async function moveTabToWindow(targetWindowId, paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;
  const result = await api.appendTabToWindow(targetWindowId, buildTabPayload(tab));
  if (!result || !result.ok) {
    showStatusbarHint('statusbar.targetWindowGone', { duration: 2500, error: true });
    return;
  }
  await closeTab(paneIdx, tabIdx, { skipDirtyCheck: true });
}

// 4T-0012: Vom Main empfangenes Append-Event verarbeiten. Fuegt den Tab in der
// aktiven Pane an und aktiviert ihn. Wenn der Pfad in irgendeiner Pane schon
// offen ist, wird der bestehende Tab aktiviert (kein Duplikat); ein eventuell
// dirty Buffer aus dem Quell-Fenster wird in diesem Fall in den bestehenden
// Editor uebernommen, damit die Bearbeitung nicht verloren geht.
async function handleAppendTabFromOtherWindow(payload) {
  const targetPane = state.activePaneIndex;
  if (targetPane < 0 || targetPane >= state.panes.length) return;
  const settings = payload.settings || {};

  if (payload.path) {
    const existing = findTabAcrossPanes(payload.path);
    if (existing) {
      const target = state.panes[existing.paneIdx].tabs[existing.tabIdx];
      if (payload.dirty && typeof payload.content === 'string' && target.content !== payload.content) {
        target.content = payload.content;
        target.dirty = target.content !== target.originalContent;
        const view = paneEditors[existing.paneIdx];
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: payload.content },
          });
        }
      }
      activatePane(existing.paneIdx);
      activateTab(existing.paneIdx, existing.tabIdx);
      return;
    }
    try {
      const data = await api.readFile(payload.path);
      const tab = createTab(data.path, data.content, settings);
      tab.editMode = !!settings.editMode;
      if (payload.dirty && typeof payload.content === 'string') {
        tab.content = payload.content;
        tab.dirty = tab.content !== tab.originalContent;
      }
      state.panes[targetPane].tabs.push(tab);
      activateTab(targetPane, state.panes[targetPane].tabs.length - 1);
    } catch {
      showStatusbarHint('statusbar.targetFileMissing', { duration: 2500, error: true });
    }
    return;
  }

  // Unbenannt-Tab: lokalen Counter fortzaehlen, damit die Nummer im Zielfenster
  // konsistent zu dessen anderen Unbenannt-Tabs ist.
  const tab = createTab(null, payload.content || '', settings);
  tab.editMode = settings.editMode !== undefined ? !!settings.editMode : true;
  tab.untitledIndex = state.untitledCounter++;
  tab.dirty = (tab.content || '') !== '';
  state.panes[targetPane].tabs.push(tab);
  activateTab(targetPane, state.panes[targetPane].tabs.length - 1);
}

// --- Rendering --------------------------------------------------------------
function renderTabbar(paneIdx) {
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];
  if (!pane) return;
  els.tabbar.innerHTML = '';

  pane.tabs.forEach((tab, idx) => {
    const el = document.createElement('div');
    el.className = 'tab' + (idx === pane.activeIndex ? ' active' : '') + (tab.missing ? ' tab-missing' : '') + (tab.dirty ? ' dirty' : '');
    const baseName = tabDisplayName(tab);
    el.title = tab.path || baseName;
    el.draggable = true;

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = (tab.dirty ? '• ' : '') + baseName;
    el.appendChild(title);

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = t('tab.close');
    close.addEventListener('mousedown', (e) => e.stopPropagation());
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(paneIdx, idx);
    });
    el.appendChild(close);

    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(paneIdx, idx);
        return;
      }
      activatePane(paneIdx);
    });
    el.addEventListener('click', (e) => {
      if (e.target === close) return;
      activateTab(paneIdx, idx);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTabContextMenu(e, paneIdx, idx);
    });

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(MIME_TAB, JSON.stringify({ fromPane: paneIdx, tabIndex: idx }));
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer.types).includes(MIME_TAB)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const rect = el.getBoundingClientRect();
      const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
      el.classList.toggle('drag-over-left', isLeftHalf);
      el.classList.toggle('drag-over-right', !isLeftHalf);
    });
    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over-left', 'drag-over-right');
    });
    el.addEventListener('drop', (e) => {
      if (!Array.from(e.dataTransfer.types).includes(MIME_TAB)) return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('drag-over-left', 'drag-over-right');
      const data = parseTabDrag(e);
      if (!data) return;
      const rect = el.getBoundingClientRect();
      const isLeftHalf = (e.clientX - rect.left) < rect.width / 2;
      const insertIdx = isLeftHalf ? idx : idx + 1;
      moveTabBetweenPanes(data.fromPane, data.tabIndex, paneIdx, insertIdx);
    });

    els.tabbar.appendChild(el);
  });
}

function renderPaneContent(paneIdx) {
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];

  // Suppress save während wir DOM-Updates machen, die scroll-Events auslösen.
  suppressScrollSave = true;

  if (!pane || pane.activeIndex < 0) {
    syncEditorForPane(paneIdx);
    els.renderedHtml.innerHTML = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { suppressScrollSave = false; });
    });
    return;
  }

  const tab = pane.tabs[pane.activeIndex];
  syncEditorForPane(paneIdx);
  els.renderedHtml.innerHTML = api.renderMarkdown(tab.content, tab.path);
  // 4T-0021: Mermaid-Bloecke per Lazy-Load und Post-Processing zu SVG.
  applyMermaidIfPresent(els.renderedHtml);

  // View-Mode-Klassen auf dem .content-Element setzen.
  els.content.classList.remove('view-source', 'view-split', 'view-rendered');
  els.content.classList.add(`view-${tab.viewMode}`);

  // 4T-0017: Zoom des aktiven Tabs auf die Inhalts-Container der Pane
  // anwenden. Tab-Wechsel innerhalb einer Pane wechselt damit den Zoom.
  applyZoomToPane(paneIdx);

  // Scroll-Position wiederherstellen — und erst danach den Save wieder freigeben.
  requestAnimationFrame(() => {
    const view = paneEditors[paneIdx];
    if (view) view.scrollDOM.scrollTop = tab.scrollSrc || 0;
    els.renderedEl.scrollTop = tab.scrollRen || 0;
    requestAnimationFrame(() => {
      suppressScrollSave = false;
      // Suche nach DOM-Wechsel neu ausfuehren (Tab-/View-Wechsel, Reload).
      if (paneIdx === state.activePaneIndex) refreshSearchIfVisible();
    });
  });
}

function renderAllPanes() {
  for (let i = 0; i < state.panes.length; i++) {
    renderTabbar(i);
    renderPaneContent(i);
  }
}

function applyAllLayouts() {
  const split = state.panes.length === 2;
  paneRoots[1].hidden = !split;
  outerSplitter.hidden = !split;
  if (!split) {
    paneRoots[0].style.flex = '1 1 0';
    paneRoots[1].style.flex = '';
  }

  updateActivePaneClasses();
  syncToolbarToActiveTab();
  renderAllPanes();
  updateEmptyState();
  // 4T-0014: Outline-Sichtbarkeit pro Pane anwenden (versteckt -> sichtbar
  // oder umgekehrt; Inhalte werden bei sichtbarer Sidebar gerendert).
  for (let i = 0; i < state.panes.length; i++) {
    applyOutlineVisibility(i);
    applyBacklinksVisibility(i);
  }
}

function saveScroll(paneIdx) {
  if (suppressScrollSave) return;
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  const view = paneEditors[paneIdx];
  if (view) tab.scrollSrc = view.scrollDOM.scrollTop;
  tab.scrollRen = els.renderedEl.scrollTop;
}

// --- Auto-Reload ------------------------------------------------------------
async function reloadFile(filePath) {
  for (let p = 0; p < state.panes.length; p++) {
    const idx = state.panes[p].tabs.findIndex((t) => t.path === filePath);
    if (idx < 0) continue;
    const tab = state.panes[p].tabs[idx];

    // Dirty-Buffer: nicht stillschweigend ueberschreiben, sondern Nutzer fragen.
    if (tab.dirty) {
      const choice = await withDialog(() => api.confirmConflict({ detail: filePath }));
      if (choice !== 'reload') {
        // 'keepOurs': Buffer behalten. Beim naechsten Save wird der externe
        // Stand ueberschrieben — der originalContent bleibt jetzt aus
        // unserer Sicht "veraltet", aber das ist die bewusste Entscheidung.
        continue;
      }
      // 'reload' faellt durch zum normalen Reload-Pfad
    }

    try {
      const data = await api.readFile(filePath);
      tab.content = data.content;
      tab.originalContent = data.content;
      tab.dirty = false;
      tab.missing = false;
      if (idx === state.panes[p].activeIndex) renderPaneContent(p);
      renderTabbar(p);
      if (p === state.activePaneIndex && idx === state.panes[p].activeIndex) {
        updateWindowTitle();
      }
    } catch {
      markFileMissing(filePath);
    }
  }
}

function markFileMissing(filePath) {
  for (let p = 0; p < state.panes.length; p++) {
    const idx = state.panes[p].tabs.findIndex((t) => t.path === filePath);
    if (idx >= 0) {
      state.panes[p].tabs[idx].missing = true;
      renderTabbar(p);
    }
  }
}

// --- Render-Klick (Markdown-Links) ------------------------------------------
async function handleRenderedClick(e, paneIdx) {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  e.preventDefault();
  activatePane(paneIdx);

  if (/^https?:\/\//i.test(href)) {
    api.openExternal(href);
    return;
  }
  if (href.startsWith('#')) {
    const target = getPaneEls(paneIdx).renderedHtml.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (/^[a-z]+:/i.test(href)) {
    if (href.startsWith('mailto:')) api.openExternal(href);
    return;
  }
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const baseTab = pane.tabs[pane.activeIndex];
  const resolved = await api.resolveLink(baseTab.path, href);
  if (!resolved) return;
  const exists = await api.fileExists(resolved);
  if (!exists) return;
  const isMd = await api.isMarkdownPath(resolved);
  if (!isMd) return;
  await openInPane(paneIdx, [resolved]);
}

// --- Recent-Files-Menü ------------------------------------------------------
// --- View-Modus + Toggles (alle pro Tab) ------------------------------------
function setViewMode(mode) {
  if (!['source', 'split', 'rendered'].includes(mode)) return;
  const tab = activeTab();
  if (!tab) return;
  tab.viewMode = mode;
  // Edit-Modus ist nur in Source/Split sinnvoll. Beim Wechsel auf "Gerendert"
  // wird der Edit-Modus automatisch ausgeschaltet, damit der Statusbar-Toggle
  // konsistent zum sichtbaren View ist.
  if (mode === 'rendered' && tab.editMode) {
    tab.editMode = false;
  }
  const els = getPaneEls(state.activePaneIndex);
  els.content.classList.remove('view-source', 'view-split', 'view-rendered');
  els.content.classList.add(`view-${mode}`);
  syncEditorForPane(state.activePaneIndex);
  syncToolbarToActiveTab();
  persistState();
  // Modus-Wechsel kann den Such-Scope aendern (Quelltext <-> Vorschau).
  refreshSearchIfVisible();
}

function toggleWrapLines() {
  const tab = activeTab();
  if (!tab) return;
  tab.wrapLines = !tab.wrapLines;
  syncEditorForPane(state.activePaneIndex);
  syncToolbarToActiveTab();
  persistState();
}

function toggleShowLineNumbers() {
  const tab = activeTab();
  if (!tab) return;
  tab.showLineNumbers = !tab.showLineNumbers;
  syncEditorForPane(state.activePaneIndex);
  syncToolbarToActiveTab();
  persistState();
  refreshSearchIfVisible();
}

// 4T-0013: Gliederung (Heading-Folding-Gutter) pro Tab toggeln. Analog zu
// toggleShowLineNumbers; reconfiguriert das foldGutter-Compartment ueber
// syncEditorForPane und synchronisiert Statusbar-Button und Menue-Haken.
function toggleShowFoldGutter() {
  const tab = activeTab();
  if (!tab) return;
  tab.showFoldGutter = !tab.showFoldGutter;
  syncEditorForPane(state.activePaneIndex);
  syncToolbarToActiveTab();
  reportMenuStateNow();
  persistState();
}

// Erzeugt einen leeren "Unbenannt"-Tab im aktiven Pane (Datei → Neu / Strg+N).
// Edit-Modus aktiv, View "Geteilt", damit der Nutzer sofort tippen und die
// Vorschau live sehen kann. Nicht persistiert ueber App-Neustart, weil Tabs
// ohne Pfad in buildPanesSnapshot herausgefiltert werden.
function newUntitledTab() {
  const targetPane = state.activePaneIndex;
  const tab = createTab(null, '', {
    viewMode: 'split',
    untitledIndex: state.untitledCounter++,
  });
  tab.editMode = true;
  state.panes[targetPane].tabs.push(tab);
  activatePane(targetPane);
  activateTab(targetPane, state.panes[targetPane].tabs.length - 1);
  applyAllLayouts();
  persistState();
  const view = paneEditors[targetPane];
  if (view) setTimeout(() => view.focus(), 0);
}

// --- Speichern --------------------------------------------------------------
// Speichert einen bestimmten Tab. Wenn kein Pfad vorhanden, leitet in
// saveTabAs weiter. Aktualisiert originalContent + dirty + UI bei Erfolg.
// Returnt true bei Erfolg (oder kein Speichern noetig), false bei Fehler/Abbruch.
async function saveTab(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return false;
  const tab = pane.tabs[tabIdx];
  if (!tab) return false;
  if (!tab.path) return saveTabAs(paneIdx, tabIdx);
  try {
    await api.saveFile(tab.path, tab.content);
    tab.originalContent = tab.content;
    if (tab.dirty) {
      tab.dirty = false;
      renderTabbar(paneIdx);
      if (paneIdx === state.activePaneIndex && tabIdx === pane.activeIndex) {
        updateWindowTitle();
      }
    }
    return true;
  } catch (err) {
    await api.showSaveError(`${tab.path}\n${(err && err.message) || String(err)}`);
    return false;
  }
}

// Speichern unter: OS-Dialog im Main, schreibt, aktualisiert Tab und
// File-Watcher.
async function saveTabAs(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return false;
  const tab = pane.tabs[tabIdx];
  if (!tab) return false;
  try {
    const result = await api.saveFileAs(tab.path || null, tab.content);
    if (!result || !result.path) return false;
    const oldPath = tab.path;
    tab.path = result.path;
    tab.originalContent = tab.content;
    tab.dirty = false;
    if (oldPath && oldPath !== result.path) {
      api.unwatchFile(oldPath);
    }
    // Watcher fuer neuen Pfad registrieren (kleiner Round-Trip ueber file:read;
    // der zurueckgegebene Inhalt ist exakt das, was wir gerade geschrieben
    // haben, wir verwerfen ihn).
    try { await api.readFile(result.path); } catch {}
    renderTabbar(paneIdx);
    if (paneIdx === state.activePaneIndex && tabIdx === pane.activeIndex) {
      updateWindowTitle();
    }
    persistState();
    return true;
  } catch (err) {
    await api.showSaveError((err && err.message) || String(err));
    return false;
  }
}

function saveCurrentTab() {
  const pane = state.panes[state.activePaneIndex];
  if (!pane || pane.activeIndex < 0) return Promise.resolve(false);
  return saveTab(state.activePaneIndex, pane.activeIndex);
}

function saveCurrentTabAs() {
  const pane = state.panes[state.activePaneIndex];
  if (!pane || pane.activeIndex < 0) return Promise.resolve(false);
  return saveTabAs(state.activePaneIndex, pane.activeIndex);
}

// 4T-0041 (Epic 3E-0008): Export 'Portables Markdown...'. Konvertiert
// scg-table-Codebloecke im aktiven Tab durch inline HTML-Tabellen und
// speichert das Ergebnis ueber den OS-Save-As-Dialog. Vorbelegung des
// Dateinamens '<basename>-portable.md'. Der aktive Tab bleibt unveraendert.
async function exportCurrentTabAsPortable() {
  const pane = state.panes[state.activePaneIndex];
  if (!pane || pane.activeIndex < 0) return false;
  const tab = pane.tabs[pane.activeIndex];
  if (!tab) return false;
  try {
    const portableText = api.convertMarkdownPortable(tab.content);
    let suggestedPath = null;
    if (tab.path) {
      // '.md'-Suffix durch '-portable.md' ersetzen, falls vorhanden;
      // sonst '-portable.md' anhaengen.
      if (/\.md$/i.test(tab.path)) {
        suggestedPath = tab.path.replace(/\.md$/i, '-portable.md');
      } else {
        suggestedPath = tab.path + '-portable.md';
      }
    }
    await api.saveFileAs(suggestedPath, portableText);
    return true;
  } catch (err) {
    await api.showSaveError((err && err.message) || String(err));
    return false;
  }
}

// --- Auto-Save (opt-in) ----------------------------------------------------
// Aktiviert per Toggle im Datei-Menue. Speichert nach 2 s Inaktivitaet (per
// scheduleAutoSave aus dem EditorView-Update-Listener) und bei Fenster-
// Fokusverlust alle dirtigen Tabs, die einen Pfad haben. Tabs ohne Pfad
// ("Unbenannt") werden nicht automatisch gespeichert.

function showStatusbarHint(messageKey, opts = {}) {
  if (!statusbarHint) return;
  const { error = false, duration = 1000, text } = opts;
  statusbarHint.textContent = text != null ? text : t(messageKey);
  statusbarHint.classList.toggle('error', error);
  statusbarHint.classList.add('visible');
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = setTimeout(() => {
    statusbarHint.classList.remove('visible');
    hintTimer = null;
  }, duration);
}

function scheduleAutoSave() {
  if (!state.autoSave) return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    performAutoSave();
  }, 2000);
}

async function performAutoSave() {
  if (!state.autoSave) return;
  if (dialogActive) return;
  let savedAny = false;
  let failed = false;
  for (let p = 0; p < state.panes.length; p++) {
    for (let i = 0; i < state.panes[p].tabs.length; i++) {
      const tab = state.panes[p].tabs[i];
      if (!tab.dirty || !tab.path) continue;
      try {
        await api.saveFile(tab.path, tab.content);
        tab.originalContent = tab.content;
        tab.dirty = false;
        renderTabbar(p);
        savedAny = true;
      } catch (err) {
        console.error('Auto-Save fehlgeschlagen:', tab.path, err);
        failed = true;
      }
    }
  }
  if (savedAny) updateWindowTitle();
  if (failed) {
    showStatusbarHint('statusbar.saveFailed', { error: true, duration: 3000 });
  } else if (savedAny) {
    showStatusbarHint('statusbar.saved', { duration: 1000 });
  }
}

// Klick auf den Stift-Toggle in der Statusbar bzw. Strg+E. Im Render-Modus
// wechselt der Klick zuerst nach „Geteilt", weil Bearbeiten dort sichtbar
// werden muss; danach (oder im Source/Split-Modus) wird der Edit-Modus
// umgeschaltet. Nach Aktivierung bekommt der Editor den Tastatur-Fokus.
function toggleEditMode() {
  const tab = activeTab();
  if (!tab) return;
  if (tab.viewMode === 'rendered') {
    tab.viewMode = 'split';
    const els = getPaneEls(state.activePaneIndex);
    els.content.classList.remove('view-source', 'view-split', 'view-rendered');
    els.content.classList.add('view-split');
    tab.editMode = true;
  } else {
    tab.editMode = !tab.editMode;
  }
  syncEditorForPane(state.activePaneIndex);
  syncToolbarToActiveTab();
  persistState();
  refreshSearchIfVisible();
  if (tab.editMode) {
    const view = paneEditors[state.activePaneIndex];
    if (view) view.focus();
  }
}

// --- Empty-State ------------------------------------------------------------
function updateEmptyState() {
  const allEmpty = state.panes.length === 1 && state.panes[0].tabs.length === 0;
  if (allEmpty) {
    emptyState.classList.remove('hidden');
    panesContainer.style.visibility = 'hidden';
  } else {
    emptyState.classList.add('hidden');
    panesContainer.style.visibility = '';
  }
}

// --- Persistenz -------------------------------------------------------------
// Schickt den aktuellen Pane-Stand an den Main-Prozess. Main fuehrt die
// Multi-Window-Persistenz pro Fenster zusammen und schreibt sie in die Settings.
function persistState() {
  const snapshot = buildPanesSnapshot();
  api.reportPanes(snapshot);
}

function buildPanesSnapshot() {
  // Unbenannt-Tabs (ohne Pfad) gehen NICHT in die persistierte Sitzung.
  // Dirty-Unbenannt werden vorher vom Schliessen-Dialog abgefangen
  // (Speichern → Pfad bekommen oder Verwerfen). Hier herausfiltern und
  // activeIndex auf die verbleibenden Tabs umrechnen.
  return state.panes.map((p) => {
    const indices = [];
    p.tabs.forEach((tab, i) => { if (tab.path) indices.push(i); });
    let activeIndex = -1;
    if (indices.length > 0) {
      const pos = indices.indexOf(p.activeIndex);
      activeIndex = pos >= 0 ? pos : 0;
    }
    return {
      paths: indices.map((i) => p.tabs[i].path),
      activeIndex,
      tabSettings: indices.map((i) => ({
        viewMode: p.tabs[i].viewMode,
        wrapLines: p.tabs[i].wrapLines,
        showLineNumbers: p.tabs[i].showLineNumbers,
        showFoldGutter: p.tabs[i].showFoldGutter,
      })),
    };
  });
}

// --- Kontextmenü ------------------------------------------------------------
async function showTabContextMenu(event, paneIdx, tabIdx) {
  contextMenu.innerHTML = '';

  // 4T-0012: Fensterliste abrufen, um zu entscheiden, ob das Tab-Verschieben/
  // Kopieren als flache Eintraege (Solo) oder als Submenues (Multi) angezeigt
  // wird. Bei Fehler fallen wir auf Solo zurueck — kein Blocker.
  let otherWindows = [];
  try {
    const list = await api.listWindows();
    otherWindows = (Array.isArray(list) ? list : [])
      .filter((w) => w.displayNumber !== state.displayNumber);
  } catch {
    otherWindows = [];
  }

  const items = [];

  if (paneIdx === 0) {
    items.push({ key: 'tab.moveRight', action: () => moveTabBetweenPanes(0, tabIdx, 1, state.panes[1] ? state.panes[1].tabs.length : 0) });
  } else {
    items.push({ key: 'tab.moveLeft', action: () => moveTabBetweenPanes(paneIdx, tabIdx, 0, state.panes[0].tabs.length) });
  }
  items.push({ separator: true });

  if (otherWindows.length === 0) {
    // Solo-Fall: flache Eintraege wie bisher.
    items.push({ key: 'tab.moveToNewWindow', action: () => moveTabToNewWindow(paneIdx, tabIdx) });
    items.push({ key: 'tab.copyToNewWindow', action: () => copyTabToNewWindow(paneIdx, tabIdx) });
  } else {
    // Multi-Fall: Submenues mit "Neues Fenster" + einem Eintrag pro anderem Fenster.
    const moveSubmenu = [
      { key: 'tab.menu.targetNewWindow', action: () => moveTabToNewWindow(paneIdx, tabIdx) },
      { separator: true },
      ...otherWindows.map((w) => ({
        label: t('tab.menu.targetWindowLabel').replace('{n}', String(w.displayNumber)),
        tooltip: buildWindowTooltip(w),
        action: () => moveTabToWindow(w.id, paneIdx, tabIdx),
      })),
    ];
    const copySubmenu = [
      { key: 'tab.menu.targetNewWindow', action: () => copyTabToNewWindow(paneIdx, tabIdx) },
      { separator: true },
      ...otherWindows.map((w) => ({
        label: t('tab.menu.targetWindowLabel').replace('{n}', String(w.displayNumber)),
        tooltip: buildWindowTooltip(w),
        action: () => copyTabToWindow(w.id, paneIdx, tabIdx),
      })),
    ];
    items.push({ key: 'tab.menu.moveToSubmenu', submenu: moveSubmenu });
    items.push({ key: 'tab.menu.copyToSubmenu', submenu: copySubmenu });
  }

  items.push({ separator: true });
  items.push({ key: 'tab.close', action: () => closeTab(paneIdx, tabIdx) });

  for (const it of items) appendContextMenuItem(contextMenu, it);

  contextMenu.style.left = '0px';
  contextMenu.style.top = '0px';
  contextMenu.hidden = false;
  const rect = contextMenu.getBoundingClientRect();
  let x = event.clientX;
  let y = event.clientY;
  if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
}

// 4T-0012: Tooltip-Text fuer einen Fenster-Eintrag im Tab-Kontextmenue:
// Dateiname des aktiven Tabs des Zielfensters, bei mehreren Tabs zusaetzlich
// "(+N weitere)" (lokalisiert).
function buildWindowTooltip(w) {
  const name = (w && w.activeTabName) ? w.activeTabName : '';
  if (w && typeof w.tabCount === 'number' && w.tabCount > 1) {
    const suffix = t('tab.menu.tooltipMoreTabsSuffix').replace('{n}', String(w.tabCount - 1));
    return name ? `${name} ${suffix}` : suffix;
  }
  return name;
}

// 4T-0012: Baut ein Kontextmenue-Item (oder Submenu-Item). Unterstuetzt drei
// Formen: Separator (`{separator: true}`), normaler Eintrag (`{key|label, action}`),
// Submenu-Eintrag (`{key|label, submenu: [...]}`). Submenus sind DOM-Kinder
// des Wrappers, damit der globale Outside-Click-Handler sie nicht abwuergt.
function appendContextMenuItem(parent, item) {
  if (item.separator) {
    const sep = document.createElement('div');
    sep.className = 'context-menu-separator';
    parent.appendChild(sep);
    return;
  }
  const label = item.label != null ? item.label : t(item.key);
  if (Array.isArray(item.submenu) && item.submenu.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'context-menu-item context-menu-item-submenu';
    const lbl = document.createElement('span');
    lbl.className = 'context-menu-item-label';
    lbl.textContent = label;
    wrapper.appendChild(lbl);
    const arrow = document.createElement('span');
    arrow.className = 'context-menu-submenu-arrow';
    arrow.textContent = '▸';
    wrapper.appendChild(arrow);

    const sub = document.createElement('div');
    sub.className = 'context-menu context-menu-submenu';
    sub.hidden = true;
    for (const subItem of item.submenu) appendContextMenuItem(sub, subItem);
    wrapper.appendChild(sub);

    let closeTimer = null;
    const open = () => {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      sub.hidden = false;
    };
    const scheduleClose = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => { sub.hidden = true; closeTimer = null; }, 250);
    };
    wrapper.addEventListener('mouseenter', open);
    wrapper.addEventListener('mouseleave', scheduleClose);
    sub.addEventListener('mouseenter', open);
    sub.addEventListener('mouseleave', scheduleClose);
    parent.appendChild(wrapper);
    return;
  }
  const div = document.createElement('div');
  div.className = 'context-menu-item';
  div.textContent = label;
  if (item.tooltip) div.title = item.tooltip;
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    hideContextMenu();
    item.action();
  });
  parent.appendChild(div);
}

function hideContextMenu() {
  contextMenu.hidden = true;
  contextMenu.innerHTML = '';
}

// --- About-Modal ------------------------------------------------------------
async function showAbout() {
  if (!aboutVersionEl.textContent || aboutVersionEl.textContent.trim() === '—') {
    try {
      const v = await api.getVersion();
      aboutVersionEl.textContent = v;
    } catch {
      aboutVersionEl.textContent = '?';
    }
  }
  aboutModal.hidden = false;
  setTimeout(() => $('#btn-about-close').focus(), 0);
}

function hideAbout() {
  aboutModal.hidden = true;
}

// --- Hilfe-Modal ------------------------------------------------------------
// 4T-0027: Funktionen sind gruppiert nach Oberbegriffen. Reihenfolge innerhalb
// einer Gruppe bestimmt die Anzeige im Modal. Innerhalb des Funktionen-Tabs
// werden die Gruppen-Ueberschriften aus help.group.* gezogen, die Eintraege
// aus help.feature.*.
const HELP_FEATURE_GROUPS = [
  {
    groupKey: 'help.group.file',
    features: [
      'help.feature.openFiles',
      'help.feature.newTab',
      'help.feature.save',
      'help.feature.autoSave',
      'help.feature.autoReload',
      'help.feature.restoreSession',
      'help.feature.windowState',
    ],
  },
  {
    groupKey: 'help.group.editing',
    features: [
      'help.feature.editMode',
      'help.feature.tabIndent',
      'help.feature.search',
      'help.feature.searchReplace',
      'help.feature.linter',
      // 4T-0035 (Epic 3E-0006): scg-table mit Querverweis auf den eigenen Tab.
      'help.feature.scgTable',
    ],
  },
  {
    groupKey: 'help.group.view',
    features: [
      'help.feature.viewModes',
      'help.feature.sourceToggles',
      'help.feature.foldGutter',
      'help.feature.zoom',
      'help.feature.settings',
      'help.feature.focusMode',
      'help.feature.typewriterScroll',
      // 4T-0028 (Render-Lift 0.10.0): drei neue Features im Render-Pane.
      'help.feature.codeHighlight',
      'help.feature.katex',
      'help.feature.mermaid',
    ],
  },
  {
    groupKey: 'help.group.navigation',
    features: [
      'help.feature.tabs',
      'help.feature.multiWindow',
      'help.feature.outline',
      'help.feature.backlinks',
      'help.feature.anchorLinks',
      'help.feature.links',
    ],
  },
  {
    groupKey: 'help.group.general',
    features: [
      'help.feature.theme',
      'help.feature.languages',
      'help.feature.menuBar',
      'help.feature.updateCheck',
    ],
  },
];

// Shortcuts — { keys: Array von Tasten-Strings, descKey: i18n-Key }.
// Mehrere Tasten in einer Zeile werden als getrennte <kbd>-Elemente gerendert.
// 4T-0027: erweitert um die 0.9.0-Tastenkuerzel (Zoom, Einstellungen,
// Fokus-Modus, Tab-Indent in Listen).
const HELP_SHORTCUTS = [
  { keys: ['Strg+N'], descKey: 'help.shortcut.newTab' },
  { keys: ['Strg+O'], descKey: 'help.shortcut.openFile' },
  { keys: ['Strg+W'], descKey: 'help.shortcut.closeTab' },
  { keys: ['Strg+S'], descKey: 'help.shortcut.save' },
  { keys: ['Strg+Umschalt+S'], descKey: 'help.shortcut.saveAs' },
  { keys: ['Strg+,'], descKey: 'help.shortcut.openSettings' },
  { keys: ['Strg+E'], descKey: 'help.shortcut.toggleEdit' },
  { keys: ['Strg+1', 'Strg+2', 'Strg+3'], descKey: 'help.shortcut.viewModes' },
  { keys: ['Strg++', 'Strg+-', 'Strg+0'], descKey: 'help.shortcut.zoom' },
  { keys: ['Strg+Mausrad'], descKey: 'help.shortcut.zoomWheel' },
  { keys: ['Strg+Umschalt+F'], descKey: 'help.shortcut.focusMode' },
  { keys: ['Strg+Umschalt+O'], descKey: 'help.shortcut.toggleOutline' },
  { keys: ['Strg+Umschalt+B'], descKey: 'help.shortcut.toggleBacklinks' },
  { keys: ['Strg+Umschalt+['], descKey: 'help.shortcut.foldRegion' },
  { keys: ['Strg+Umschalt+]'], descKey: 'help.shortcut.unfoldRegion' },
  { keys: ['Tab', 'Umschalt+Tab'], descKey: 'help.shortcut.tabIndent' },
  { keys: ['Strg+Tab', 'Strg+Umschalt+Tab'], descKey: 'help.shortcut.switchTab' },
  { keys: ['Strg+Alt+→', 'Strg+Alt+←'], descKey: 'help.shortcut.moveTab' },
  { keys: ['Mittlere Maustaste'], descKey: 'help.shortcut.middleClickClose' },
  { keys: ['Strg+F'], descKey: 'help.shortcut.openSearch' },
  { keys: ['Strg+H'], descKey: 'help.shortcut.searchReplace' },
  { keys: ['F3', 'Umschalt+F3'], descKey: 'help.shortcut.searchNav' },
  { keys: ['Enter', 'Umschalt+Enter'], descKey: 'help.shortcut.searchNavEnter' },
  { keys: ['Esc'], descKey: 'help.shortcut.escape' },
  { keys: ['Alt'], descKey: 'help.shortcut.menuBar' },
  { keys: ['F1'], descKey: 'help.shortcut.openHelp' },
];

// Da Tastennamen je nach Sprache anders aussehen ("Strg" vs. "Ctrl",
// "Umschalt" vs. "Shift", "Mittlere Maustaste" vs. "Middle click"), liefern wir
// die Tasten auch ueber i18n-Keys, mit deutschen Defaults als Fallback.
const KEY_LABEL_KEY = {
  'Strg': 'help.key.ctrl',
  'Umschalt': 'help.key.shift',
  'Alt': 'help.key.alt',
  'Tab': 'help.key.tab',
  'Enter': 'help.key.enter',
  'Esc': 'help.key.esc',
  'Mittlere Maustaste': 'help.key.middleClick',
  // 4T-0027: Mausrad als eigene "Taste" fuer den Zoom-per-Mausrad-Shortcut.
  'Mausrad': 'help.key.mouseWheel',
};

function localizeKey(token) {
  const key = KEY_LABEL_KEY[token];
  if (!key) return token;
  const translated = t(key);
  return translated === key ? token : translated;
}

function renderHelpContent() {
  // 4T-0027: Funktionen-Tab. Gruppen-Container mit jeweils Ueberschrift
  // und Item-Liste.
  const featuresEl = $('#help-features');
  featuresEl.innerHTML = '';
  for (const group of HELP_FEATURE_GROUPS) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'help-feature-group';
    const heading = document.createElement('h3');
    heading.className = 'help-feature-group-title';
    heading.textContent = t(group.groupKey);
    groupDiv.appendChild(heading);
    const ul = document.createElement('ul');
    ul.className = 'help-features';
    for (const featureKey of group.features) {
      const li = document.createElement('li');
      li.textContent = t(featureKey);
      ul.appendChild(li);
    }
    groupDiv.appendChild(ul);
    featuresEl.appendChild(groupDiv);
  }

  // Tastenkuerzel-Tab. Tabelle wie bisher; Tasten-Tokens werden ueber
  // localizeKey in die aktive Sprache umgesetzt. Beim Split nach '+' wird
  // ein einzelnes leeres Token am Ende erlaubt: "Strg++" wird zu
  // ["Strg", "", "+"] - der Plus-Charakter selbst ist das letzte
  // Token, nicht ein Separator.
  const shortcutsEl = $('#help-shortcuts');
  shortcutsEl.innerHTML = '';
  for (const sc of HELP_SHORTCUTS) {
    const tr = document.createElement('tr');
    const tdKeys = document.createElement('td');
    sc.keys.forEach((k, i) => {
      if (i > 0) tdKeys.appendChild(document.createTextNode('  /  '));
      const parts = splitShortcutKeys(k);
      parts.forEach((part, j) => {
        if (j > 0) tdKeys.appendChild(document.createTextNode(' + '));
        const kbd = document.createElement('kbd');
        kbd.textContent = localizeKey(part);
        tdKeys.appendChild(kbd);
      });
    });
    const tdDesc = document.createElement('td');
    tdDesc.textContent = t(sc.descKey);
    tr.appendChild(tdKeys);
    tr.appendChild(tdDesc);
    shortcutsEl.appendChild(tr);
  }

  // 4T-0036: scg-table-Tab beim Sprachwechsel ggf. neu laden, wenn er
  // gerade sichtbar ist. Cache invalidieren und Reload triggern.
  const panelScgTable = helpModal.querySelector('#help-panel-scg-table');
  if (panelScgTable) {
    panelScgTable.dataset.loadedLocale = '';
    if (!panelScgTable.hidden) loadScgTableHelpContent();
  }
}

// 4T-0027: Helper fuer den '+'-Split. "Strg+E" -> ["Strg", "E"], aber
// "Strg++" muss zu ["Strg", "+"] werden (die zweite Plus-Taste ist Inhalt,
// nicht Trenner). Trick: nur EINMAL splitten und alles zwischen den Trennern
// als Tokens nehmen. Naehrungslogik: Wenn der letzte Char '+' ist, dann ist
// die "Taste" '+' selbst. Behandle das gesondert.
function splitShortcutKeys(k) {
  if (k.endsWith('+') && k.length >= 2 && k[k.length - 2] === '+') {
    const head = k.slice(0, -1); // "Strg+"
    const headTokens = head.split('+').filter((s) => s !== '');
    return [...headTokens, '+'];
  }
  return k.split('+');
}

// 4T-0036: Hilfe-Tab fuer scg-table. Markdown-Inhalt pro Sprache wird vom
// Main asynchron geliefert (via help:getScgTableContent), durch dieselbe
// markdown-it-Instanz wie der Viewer-Inhalt gerendert und in das Tab-Panel
// eingesetzt. Lazy: laedt beim ersten Klick auf den Tab und bei jedem
// Sprachwechsel neu (dataset.loadedLocale fuehrt den Cache pro Locale).
async function loadScgTableHelpContent() {
  const panel = helpModal.querySelector('#help-panel-scg-table');
  const container = $('#help-scg-table-content');
  if (!panel || !container) return;
  const locale = state.language || 'en';
  if (panel.dataset.loadedLocale === locale) return;
  try {
    const md = await api.getScgTableHelpContent(locale);
    container.innerHTML = api.renderMarkdown(md || '', null);
    panel.dataset.loadedLocale = locale;
  } catch (err) {
    console.error('scg-table-Hilfe konnte nicht geladen werden', err);
    container.textContent = '';
    panel.dataset.loadedLocale = '';
  }
}

// 4T-0027: Tab-Wechsel im Hilfe-Modal. Beim Oeffnen des Modals wird via
// showHelp() immer der Funktionen-Tab gesetzt; per Klick auf die Tab-Buttons
// kann der Nutzer auf Tastenkuerzel oder (4T-0036) SCG-Table umschalten.
function switchHelpTab(target) {
  const tabs = helpModal.querySelectorAll('.help-tab');
  tabs.forEach((tab) => {
    const isActive = tab.dataset.helpTab === target;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  const panelFeatures = helpModal.querySelector('#help-panel-features');
  const panelShortcuts = helpModal.querySelector('#help-panel-shortcuts');
  const panelScgTable = helpModal.querySelector('#help-panel-scg-table');
  if (panelFeatures) panelFeatures.hidden = target !== 'features';
  if (panelShortcuts) panelShortcuts.hidden = target !== 'shortcuts';
  if (panelScgTable) panelScgTable.hidden = target !== 'scg-table';
  if (target === 'scg-table') loadScgTableHelpContent();
}

function showHelp() {
  renderHelpContent();
  // 4T-0027: Beim Oeffnen immer den Funktionen-Tab aktivieren, unabhaengig
  // davon, was beim letzten Schliessen aktiv war.
  switchHelpTab('features');
  helpModal.hidden = false;
  // Scroll-Position des Modals zuruecksetzen — sonst landet man dort, wo der
  // Fokus den Container hinscrollt (oder beim letzten Stand).
  const content = helpModal.querySelector('.help-modal-content');
  if (content) content.scrollTop = 0;
  // preventScroll verhindert, dass der Fokus den OK-Button am Modal-Ende
  // sofort in den sichtbaren Bereich scrollt.
  setTimeout(() => $('#btn-help-close').focus({ preventScroll: true }), 0);
}

function hideHelp() {
  helpModal.hidden = true;
}

// --- Settings-Dialog (4T-0018) ----------------------------------------------
// Konfigurierbare Schriftart und -groesse fuer Editor und Render-Pane.
// Werte werden ueber electron-store unter dem Schluessel-Prefix appearance.*
// persistiert; eine Aenderung in einem Fenster wird vom Main an alle anderen
// Fenster broadcastet, sodass die neuen Werte sofort ueberall greifen.

const APPEARANCE_DEFAULTS = {
  editorFont: 'Consolas',
  editorSize: 14,
  renderFont: 'Segoe UI',
  renderSize: 15,
};
const APPEARANCE_SIZE_MIN = 8;
const APPEARANCE_SIZE_MAX = 32;

// Snapshot der Werte beim Oeffnen des Dialogs bzw. seit dem letzten Anwenden.
// Bei Abbrechen wird zurueck auf diesen Snapshot gesetzt (Live-Vorschau wird
// damit revertiert).
let appearanceSnapshot = null;

function clampAppearanceSize(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(APPEARANCE_SIZE_MIN, Math.min(APPEARANCE_SIZE_MAX, Math.round(n)));
}

// Setzt die vier appearance-CSS-Variablen auf :root. Jede Schriftart kommt mit
// einer Fallback-Kette, damit nicht installierte Familien nicht zu kaputtem
// Layout fuehren.
function applyAppearanceVars(values) {
  const root = document.documentElement;
  const editorFont = (values.editorFont || APPEARANCE_DEFAULTS.editorFont).trim();
  const renderFont = (values.renderFont || APPEARANCE_DEFAULTS.renderFont).trim();
  root.style.setProperty('--editor-font-family',
    `"${editorFont}", "Cascadia Code", "Consolas", "Courier New", monospace`);
  root.style.setProperty('--editor-font-size',
    `${clampAppearanceSize(values.editorSize, APPEARANCE_DEFAULTS.editorSize)}px`);
  root.style.setProperty('--render-font-family',
    `"${renderFont}", "Segoe UI", system-ui, sans-serif`);
  root.style.setProperty('--render-font-size',
    `${clampAppearanceSize(values.renderSize, APPEARANCE_DEFAULTS.renderSize)}px`);
}

async function readAppearanceFromStore() {
  const editorFont = await api.getSetting('appearance.editorFont');
  const editorSize = await api.getSetting('appearance.editorSize');
  const renderFont = await api.getSetting('appearance.renderFont');
  const renderSize = await api.getSetting('appearance.renderSize');
  return {
    editorFont: (editorFont || APPEARANCE_DEFAULTS.editorFont),
    editorSize: clampAppearanceSize(editorSize, APPEARANCE_DEFAULTS.editorSize),
    renderFont: (renderFont || APPEARANCE_DEFAULTS.renderFont),
    renderSize: clampAppearanceSize(renderSize, APPEARANCE_DEFAULTS.renderSize),
  };
}

function settingsCurrentInputValues() {
  return {
    editorFont: ($('#settings-editor-font').value || '').trim() || APPEARANCE_DEFAULTS.editorFont,
    editorSize: clampAppearanceSize($('#settings-editor-size').value, APPEARANCE_DEFAULTS.editorSize),
    renderFont: ($('#settings-render-font').value || '').trim() || APPEARANCE_DEFAULTS.renderFont,
    renderSize: clampAppearanceSize($('#settings-render-size').value, APPEARANCE_DEFAULTS.renderSize),
  };
}

async function showSettings() {
  // Snapshot der aktuellen Werte aus dem Store — wird bei Abbrechen restored.
  appearanceSnapshot = await readAppearanceFromStore();
  $('#settings-editor-font').value = appearanceSnapshot.editorFont;
  $('#settings-editor-size').value = String(appearanceSnapshot.editorSize);
  $('#settings-render-font').value = appearanceSnapshot.renderFont;
  $('#settings-render-size').value = String(appearanceSnapshot.renderSize);
  settingsModal.hidden = false;
  const content = settingsModal.querySelector('.settings-modal-content');
  if (content) content.scrollTop = 0;
  setTimeout(() => $('#settings-editor-font').focus({ preventScroll: true }), 0);
}

async function applySettings() {
  const values = settingsCurrentInputValues();
  // Vier separate setSetting-Aufrufe; der Main broadcastet bei jedem
  // appearance.*-Key an alle Fenster. Endzustand bleibt konsistent.
  await api.setSetting('appearance.editorFont', values.editorFont);
  await api.setSetting('appearance.editorSize', values.editorSize);
  await api.setSetting('appearance.renderFont', values.renderFont);
  await api.setSetting('appearance.renderSize', values.renderSize);
  applyAppearanceVars(values);
  // Snapshot auf den neuen Apply-Stand setzen, damit ein spaeteres Abbrechen
  // nur Aenderungen seit diesem Apply verwirft.
  appearanceSnapshot = values;
}

function cancelSettings() {
  if (appearanceSnapshot) applyAppearanceVars(appearanceSnapshot);
  appearanceSnapshot = null;
  settingsModal.hidden = true;
}

async function okSettings() {
  await applySettings();
  appearanceSnapshot = null;
  settingsModal.hidden = true;
}

function hideSettings() {
  // Pfad fuer Escape/Backdrop-Klick: identisch zu Abbrechen.
  if (!settingsModal.hidden) cancelSettings();
}

// --- Hilfs-Funktionen -------------------------------------------------------
function parseTabDrag(e) {
  try {
    const raw = e.dataTransfer.getData(MIME_TAB);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// === Suche ==================================================================
// Globale Suchleiste am unteren Fensterrand, gilt fuer den aktiven Pane.
// Sucht im jeweils sichtbaren Inhalt (Quelltext oder Vorschau). Im Split-Modus
// wird in der Vorschau gesucht. Treffer werden mit <mark>-Elementen markiert.
const MAX_MATCHES = 5000;
const SEARCH_DEBOUNCE_MS = 150;

const search = {
  visible: false,
  replaceMode: false,
  query: '',
  replacement: '',
  useRegex: false,
  caseSensitive: false,
  // Bei scope === 'rendered': Array von <mark>-Elementen (DOM-Order).
  // Bei scope === 'source': Array von { from, to } im CodeMirror-Doc.
  matches: [],
  currentIndex: -1,
  scope: 'rendered', // 'source' | 'rendered'
  debounceTimer: null,
};

let searchEls = null;

function getSearchEls() {
  if (!searchEls) {
    searchEls = {
      bar: $('#search-bar'),
      input: $('#search-input'),
      replaceInput: $('#search-replace'),
      btnReplace: $('#btn-search-replace'),
      btnReplaceAll: $('#btn-search-replace-all'),
      count: $('#search-count'),
      scope: $('#search-scope'),
      btnCase: $('#btn-search-case'),
      btnRegex: $('#btn-search-regex'),
      btnHelp: $('#btn-search-help'),
      btnPrev: $('#btn-search-prev'),
      btnNext: $('#btn-search-next'),
      btnClose: $('#btn-search-close'),
      helpPopover: $('#regex-help-popover'),
      helpList: $('#regex-help-list'),
    };
  }
  return searchEls;
}

// Regex-Cheatsheet: Pattern bleibt gleich, Erklaerung ueber i18n-Key.
const REGEX_HELP_ITEMS = [
  { pattern: '.',     key: 'search.regexHelp.any' },
  { pattern: '*',     key: 'search.regexHelp.star' },
  { pattern: '+',     key: 'search.regexHelp.plus' },
  { pattern: '?',     key: 'search.regexHelp.optional' },
  { pattern: '^',     key: 'search.regexHelp.lineStart' },
  { pattern: '$',     key: 'search.regexHelp.lineEnd' },
  { pattern: '\\d',   key: 'search.regexHelp.digit' },
  { pattern: '\\w',   key: 'search.regexHelp.word' },
  { pattern: '\\s',   key: 'search.regexHelp.space' },
  { pattern: '\\b',   key: 'search.regexHelp.wordBoundary' },
  { pattern: '[abc]', key: 'search.regexHelp.charset' },
  { pattern: '[^abc]', key: 'search.regexHelp.notCharset' },
  { pattern: 'a|b',   key: 'search.regexHelp.alternation' },
  { pattern: '\\.',   key: 'search.regexHelp.escape' },
];

function renderRegexHelp() {
  const els = getSearchEls();
  els.helpList.innerHTML = '';
  for (const item of REGEX_HELP_ITEMS) {
    const dt = document.createElement('dt');
    dt.textContent = item.pattern;
    const dd = document.createElement('dd');
    dd.textContent = t(item.key);
    els.helpList.appendChild(dt);
    els.helpList.appendChild(dd);
  }
  // Titel-Text aktualisieren (von applyTranslations gesetzt, hier nicht noetig — wird via data-i18n erfasst).
}

function positionRegexHelp() {
  const els = getSearchEls();
  const btnRect = els.btnHelp.getBoundingClientRect();
  // Erst sichtbar machen, um die echte Groesse zu kennen.
  els.helpPopover.style.left = '0px';
  els.helpPopover.style.top = '0px';
  els.helpPopover.hidden = false;
  const popRect = els.helpPopover.getBoundingClientRect();
  // Mittig ueber dem Button platzieren, 8 px Abstand.
  let left = btnRect.left + btnRect.width / 2 - popRect.width / 2;
  let top = btnRect.top - popRect.height - 8;
  // In den Viewport zwingen.
  if (left < 8) left = 8;
  if (left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
  if (top < 8) top = btnRect.bottom + 8;
  els.helpPopover.style.left = `${left}px`;
  els.helpPopover.style.top = `${top}px`;
}

function isRegexHelpOpen() {
  return !getSearchEls().helpPopover.hidden;
}

function openRegexHelp() {
  const els = getSearchEls();
  renderRegexHelp();
  positionRegexHelp();
  els.btnHelp.classList.add('active');
}

function closeRegexHelp() {
  const els = getSearchEls();
  els.helpPopover.hidden = true;
  els.btnHelp.classList.remove('active');
}

function toggleRegexHelp() {
  if (isRegexHelpOpen()) closeRegexHelp();
  else openRegexHelp();
}

function determineSearchScope() {
  const tab = activeTab();
  if (!tab) return 'rendered';
  // Im Split-Modus den Quelltext durchsuchen: dort steht die Markdown-Syntax
  // (z.B. `###`), die in der gerenderten Vorschau gar nicht mehr vorkommt.
  if (tab.viewMode === 'source' || tab.viewMode === 'split') return 'source';
  return 'rendered';
}

function getSearchContainer(scope) {
  const els = getPaneEls(state.activePaneIndex);
  // Bei scope === 'source' wird das CodeMirror-Editor-DOM zurueckgegeben. Die
  // bestehende <mark>-basierte Highlight-Logik blinkt dort kurz auf, weil
  // CodeMirror das eigene DOM laufend re-rendert. Sauber implementiert wird
  // die Source-Suche in 4T-0007 mit @codemirror/search.
  return scope === 'source' ? els.sourceEditor : els.renderedHtml;
}

function getSearchScrollContainer(scope) {
  const els = getPaneEls(state.activePaneIndex);
  return scope === 'source' ? els.sourceEl : els.renderedEl;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(query, useRegex, caseSensitive) {
  const pattern = useRegex ? query : escapeRegex(query);
  const flags = 'gm' + (caseSensitive ? '' : 'i');
  return new RegExp(pattern, flags);
}

function clearSearchHighlights() {
  // Render-Pane: alte <mark>-Elemente entfernen und Textknoten zusammenfuehren.
  const marks = document.querySelectorAll('.mdv-match');
  const parents = new Set();
  marks.forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parents.add(parent);
  });
  parents.forEach((p) => p.normalize());
  // Source-Pane: CodeMirror-Decorations in allen EditorViews loeschen.
  for (const view of paneEditors) {
    if (view) view.dispatch({ effects: clearSearchDecorations.of(null) });
  }
  search.matches = [];
  search.currentIndex = -1;
}

function highlightInContainer(container, regex) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      // Treffer in Mark-Elementen vermeiden (kommt nach clearSearchHighlights nicht vor, doppelt sicher).
      if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('mdv-match')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  const marks = [];
  let total = 0;
  for (const textNode of textNodes) {
    if (total >= MAX_MATCHES) break;
    const text = textNode.nodeValue;
    regex.lastIndex = 0;
    const ranges = [];
    let m;
    while ((m = regex.exec(text))) {
      if (m[0].length === 0) {
        // Bei Nullbreiten-Treffern (z.B. ^/$) Endlosschleife verhindern.
        regex.lastIndex += 1;
        continue;
      }
      ranges.push({ start: m.index, end: m.index + m[0].length });
      if (total + ranges.length >= MAX_MATCHES) break;
    }
    if (ranges.length === 0) continue;

    const parent = textNode.parentNode;
    if (!parent) continue;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const r of ranges) {
      if (r.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, r.start)));
      const mark = document.createElement('mark');
      mark.className = 'mdv-match';
      mark.textContent = text.slice(r.start, r.end);
      frag.appendChild(mark);
      marks.push(mark);
      cursor = r.end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    parent.replaceChild(frag, textNode);
    total += ranges.length;
  }
  return marks;
}

function findFirstVisibleMatchIndex() {
  if (search.matches.length === 0) return -1;
  const scrollContainer = getSearchScrollContainer(search.scope);
  const cRect = scrollContainer.getBoundingClientRect();
  for (let i = 0; i < search.matches.length; i++) {
    const r = search.matches[i].getBoundingClientRect();
    if (r.bottom >= cRect.top) return i;
  }
  return 0;
}

function setCurrentMatch(idx, scroll = true) {
  if (search.scope === 'source') {
    // Source-Pane: Decoration-Set aktualisieren, der aktive Treffer bekommt
    // die zusaetzliche cm-search-match-current-Klasse.
    search.currentIndex = idx;
    const view = paneEditors[state.activePaneIndex];
    if (view) {
      view.dispatch({
        effects: setSearchDecorations.of({
          matches: search.matches,
          currentIndex: idx,
        }),
      });
      if (scroll && idx >= 0 && search.matches[idx]) {
        view.dispatch({
          effects: EditorView.scrollIntoView(search.matches[idx].from, { y: 'center' }),
        });
      }
    }
    updateSearchCounter();
    return;
  }
  // Render-Pane: DOM-<mark>-Pfad wie bisher.
  if (search.currentIndex >= 0 && search.matches[search.currentIndex]) {
    search.matches[search.currentIndex].classList.remove('mdv-match-current');
  }
  search.currentIndex = idx;
  if (idx >= 0 && search.matches[idx]) {
    const m = search.matches[idx];
    m.classList.add('mdv-match-current');
    if (scroll) m.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  }
  updateSearchCounter();
}

function updateSearchCounter() {
  const els = getSearchEls();
  const total = search.matches.length;
  if (!search.query) {
    els.count.textContent = '';
    els.count.classList.remove('empty');
    return;
  }
  if (total === 0) {
    els.count.textContent = t('search.noResults');
    els.count.classList.add('empty');
    return;
  }
  els.count.classList.remove('empty');
  els.count.textContent = `${search.currentIndex + 1} / ${total}`;
}

function updateSearchScopeLabel() {
  const els = getSearchEls();
  const key = search.scope === 'source' ? 'search.scopeSource' : 'search.scopeRendered';
  els.scope.textContent = t(key);
}

function setInvalidRegex(invalid) {
  const els = getSearchEls();
  els.input.classList.toggle('invalid', !!invalid);
  if (invalid) {
    els.count.textContent = t('search.invalidRegex');
    els.count.classList.add('empty');
  }
}

function performSearch(opts = {}) {
  const { keepCurrent = false } = opts;
  const prevIdx = keepCurrent ? search.currentIndex : -1;
  clearSearchHighlights();
  search.scope = determineSearchScope();
  updateSearchScopeLabel();

  if (!search.query) {
    setInvalidRegex(false);
    updateSearchCounter();
    return;
  }

  let regex;
  try {
    regex = buildRegex(search.query, search.useRegex, search.caseSensitive);
  } catch {
    setInvalidRegex(true);
    return;
  }
  setInvalidRegex(false);

  if (search.scope === 'source') {
    performSourceSearch(regex, prevIdx);
    return;
  }

  // Render-Pane: bisheriger DOM-Pfad.
  const container = getSearchContainer(search.scope);
  if (!container) {
    updateSearchCounter();
    return;
  }
  search.matches = highlightInContainer(container, regex);

  if (search.matches.length === 0) {
    search.currentIndex = -1;
    updateSearchCounter();
    return;
  }

  const startIdx = prevIdx >= 0 && prevIdx < search.matches.length
    ? prevIdx
    : findFirstVisibleMatchIndex();
  setCurrentMatch(startIdx);
}

// Source-Pane-Suche ueber CodeMirror-State. Treffer werden als Decorations
// in der EditorView gerendert, ueberleben CM-Re-Renders. Aktiver Treffer
// bekommt eine zusaetzliche orange Klasse.
function performSourceSearch(regex, prevIdx) {
  const view = paneEditors[state.activePaneIndex];
  if (!view) {
    search.matches = [];
    search.currentIndex = -1;
    updateSearchCounter();
    return;
  }
  const doc = view.state.doc.toString();
  const matches = [];
  regex.lastIndex = 0;
  let m;
  while ((m = regex.exec(doc)) !== null) {
    if (m[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    matches.push({ from: m.index, to: m.index + m[0].length });
    if (matches.length >= MAX_MATCHES) break;
  }
  search.matches = matches;

  if (matches.length === 0) {
    search.currentIndex = -1;
    view.dispatch({ effects: clearSearchDecorations.of(null) });
    updateSearchCounter();
    return;
  }

  // Aktiven Index bestimmen: zuvor genutzter falls noch gueltig, sonst erster
  // sichtbarer Treffer (ab aktueller Scroll-Position).
  let startIdx = 0;
  if (prevIdx >= 0 && prevIdx < matches.length) {
    startIdx = prevIdx;
  } else {
    const top = view.scrollDOM.scrollTop;
    for (let i = 0; i < matches.length; i++) {
      const block = view.lineBlockAt(matches[i].from);
      if (block && block.bottom >= top) {
        startIdx = i;
        break;
      }
    }
  }
  setCurrentMatch(startIdx);
}

function debouncedSearch() {
  if (search.debounceTimer) clearTimeout(search.debounceTimer);
  search.debounceTimer = setTimeout(() => {
    search.debounceTimer = null;
    performSearch();
  }, SEARCH_DEBOUNCE_MS);
}

function nextMatch() {
  if (search.matches.length === 0) return;
  const n = (search.currentIndex + 1) % search.matches.length;
  setCurrentMatch(n);
}

function prevMatch() {
  if (search.matches.length === 0) return;
  const n = (search.currentIndex - 1 + search.matches.length) % search.matches.length;
  setCurrentMatch(n);
}

function openSearchBar(opts = {}) {
  const { replaceMode = false } = opts;
  const els = getSearchEls();
  search.visible = true;
  search.replaceMode = !!replaceMode;
  els.bar.classList.toggle('replace-mode', !!replaceMode);
  els.bar.hidden = false;
  els.input.focus();
  els.input.select();
  // Suche aktuellen Inhalt, falls Begriff schon vorhanden.
  if (search.query) performSearch();
  else updateSearchScopeLabel();
}

function closeSearchBar() {
  const els = getSearchEls();
  search.visible = false;
  search.replaceMode = false;
  els.bar.classList.remove('replace-mode');
  els.bar.hidden = true;
  closeRegexHelp();
  clearSearchHighlights();
  setInvalidRegex(false);
  updateSearchCounter();
}

// --- Ersetzen (4T-0007) -----------------------------------------------------
// Ersetzt den aktiven Treffer durch search.replacement. Bei Regex-Modus werden
// Backreferences ($1, $2 …) im Ersetzungstext ausgewertet. Voraussetzung:
// scope === 'source' und aktiver Tab im Edit-Modus (Source ist editierbar).
function replaceCurrentMatch() {
  if (search.scope !== 'source') return;
  if (search.currentIndex < 0 || search.currentIndex >= search.matches.length) return;
  const tab = activeTab();
  if (!tab || !tab.editMode) return;
  const view = paneEditors[state.activePaneIndex];
  if (!view) return;
  const m = search.matches[search.currentIndex];
  const matchText = view.state.doc.sliceString(m.from, m.to);
  const replaceText = computeReplacement(matchText);
  view.dispatch({ changes: { from: m.from, to: m.to, insert: replaceText } });
  // Doc geaendert -> Suche neu, der naechste Treffer wird automatisch aktiv
  // (matches wurde durch docChanged zurueckgesetzt; performSearch ohne
  // keepCurrent waehlt den ersten sichtbaren Treffer).
  performSearch();
}

// Alle Treffer in einer einzigen CodeMirror-Transaktion ersetzen (Strg+Z macht
// die Operation als Ganzes rueckgaengig). Iteriert in Reverse-Order, damit die
// Indizes konsistent bleiben.
function replaceAllMatches() {
  if (search.scope !== 'source') return;
  const tab = activeTab();
  if (!tab || !tab.editMode) return;
  const view = paneEditors[state.activePaneIndex];
  if (!view || search.matches.length === 0) return;
  const changes = search.matches.slice().reverse().map((m) => {
    const matchText = view.state.doc.sliceString(m.from, m.to);
    return { from: m.from, to: m.to, insert: computeReplacement(matchText) };
  });
  const count = changes.length;
  view.dispatch({ changes });
  // Counter im Statusbar-Hinweis (1.5 s)
  const text = count === 1
    ? t('search.replaceCountOne')
    : t('search.replaceCountMany').replace('{n}', String(count));
  showStatusbarHint('', { text, duration: 1500 });
  performSearch();
}

function computeReplacement(matchText) {
  if (!search.useRegex) return search.replacement;
  try {
    const regex = buildRegex(search.query, true, search.caseSensitive);
    return matchText.replace(regex, search.replacement);
  } catch {
    return search.replacement;
  }
}

function refreshSearchIfVisible() {
  if (!search.visible) return;
  // Nach DOM-Wechsel (Tab-/View-Wechsel, Reload) sind alte Mark-Refs detached.
  // currentIndex bleibt erhalten und wird in performSearch als prevIdx genutzt;
  // matches wird per clearSearchHighlights zurueckgesetzt.
  performSearch({ keepCurrent: true });
}

function bindSearchUi() {
  const els = getSearchEls();

  els.input.addEventListener('input', (e) => {
    search.query = e.target.value;
    debouncedSearch();
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prevMatch();
      else nextMatch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isRegexHelpOpen()) closeRegexHelp();
      else closeSearchBar();
    }
  });

  els.btnPrev.addEventListener('click', () => { prevMatch(); els.input.focus(); });
  els.btnNext.addEventListener('click', () => { nextMatch(); els.input.focus(); });
  els.btnClose.addEventListener('click', () => closeSearchBar());
  els.btnHelp.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRegexHelp();
  });

  els.btnCase.addEventListener('click', async () => {
    search.caseSensitive = !search.caseSensitive;
    els.btnCase.classList.toggle('active', search.caseSensitive);
    await api.setSetting('searchCaseSensitive', search.caseSensitive);
    performSearch({ keepCurrent: true });
    els.input.focus();
  });
  els.btnRegex.addEventListener('click', async () => {
    search.useRegex = !search.useRegex;
    els.btnRegex.classList.toggle('active', search.useRegex);
    await api.setSetting('searchUseRegex', search.useRegex);
    performSearch({ keepCurrent: true });
    els.input.focus();
  });

  // Ersetzen-Block: Eingabe + Enter + Buttons.
  els.replaceInput.addEventListener('input', (e) => {
    search.replacement = e.target.value;
  });
  els.replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey || e.altKey) replaceAllMatches();
      else replaceCurrentMatch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchBar();
    }
  });
  els.btnReplace.addEventListener('click', () => {
    replaceCurrentMatch();
    els.input.focus();
  });
  els.btnReplaceAll.addEventListener('click', () => {
    replaceAllMatches();
    els.input.focus();
  });
}

async function initSearchFromSettings() {
  const els = getSearchEls();
  const useRegex = await api.getSetting('searchUseRegex');
  const caseSensitive = await api.getSetting('searchCaseSensitive');
  search.useRegex = !!useRegex;
  search.caseSensitive = !!caseSensitive;
  els.btnRegex.classList.toggle('active', search.useRegex);
  els.btnCase.classList.toggle('active', search.caseSensitive);
}
