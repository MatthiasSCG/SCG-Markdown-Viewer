// Renderer-Logik: zwei Tab-Gruppen (Spalten), Tabs, Ansichten,
// Drag&Drop, i18n, Theme, Splitter, Kontextmenü.
'use strict';

import { loadTranslations, applyTranslations, setLanguage, t, normalizeLocale } from './i18n.js';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  lineNumbers as cmLineNumbers,
  keymap,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
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

const api = window.api;

// --- Konstanten -------------------------------------------------------------
const MAX_PANES = 2;
const MIME_TAB = 'application/x-mdv-tab';

// Defaults für neue Tabs (per-Tab-Einstellungen).
const DEFAULT_VIEW_MODE = 'rendered';
const DEFAULT_WRAP_LINES = false;
const DEFAULT_SHOW_LINE_NUMBERS = true;

// --- State ------------------------------------------------------------------
// Eine Pane: { tabs: [...], activeIndex }
// Ein Tab: { path, content, scrollSrc, scrollRen, missing,
//            viewMode, wrapLines, showLineNumbers }
const state = {
  panes: [createEmptyPane()],
  activePaneIndex: 0,
  language: 'en',
  restoreSession: true,
};

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
    // Edit-Modus pro Tab; nicht persistiert ueber Neustarts.
    editMode: false,
    // Dirty-Flag: true sobald content vom originalContent abweicht.
    dirty: false,
  };
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
const contextMenu = $('#context-menu');
const aboutModal = $('#about-modal');
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
  };
}

function activeTab() {
  const pane = state.panes[state.activePaneIndex];
  if (!pane || pane.activeIndex < 0) return null;
  return pane.tabs[pane.activeIndex];
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
};

let pendingPreviewUpdate = null;

function createEditorState(opts = {}) {
  return EditorState.create({
    doc: opts.content || '',
    extensions: [
      editorCompartments.readOnly.of(EditorState.readOnly.of(opts.readOnly !== false)),
      editorCompartments.lineNumbers.of(opts.lineNumbers ? cmLineNumbers() : []),
      editorCompartments.lineWrap.of(opts.wrapLines ? EditorView.lineWrapping : []),
      markdown(),
      syntaxHighlighting(mdHighlightStyle, { fallback: true }),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      drawSelection(),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const pIdx = paneEditors.indexOf(update.view);
        if (pIdx < 0) return;
        const pane = state.panes[pIdx];
        if (!pane || pane.activeIndex < 0) return;
        const tab = pane.tabs[pane.activeIndex];
        if (!tab) return;
        tab.content = update.state.doc.toString();
        const wasDirty = tab.dirty;
        tab.dirty = tab.content !== tab.originalContent;
        if (wasDirty !== tab.dirty) {
          renderTabbar(pIdx);
          updateWindowTitle();
        }
        if (tab.viewMode === 'split') schedulePreviewUpdate(pIdx);
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
    ],
  });
  if (els && els.sourceEditor) {
    els.sourceEditor.classList.toggle('read-only', !tab.editMode);
  }
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
}

// Setzt den Fenstertitel auf "[•] <Dateiname> — Markdown Viewer" passend zum
// aktiven Tab. Wird bei Tab-Wechsel und Dirty-Wechsel aufgerufen.
function updateWindowTitle() {
  const tab = activeTab();
  if (!tab) {
    document.title = 'Markdown Viewer';
    return;
  }
  const name = tab.path ? api.basename(tab.path) : t('save.untitled');
  document.title = `${tab.dirty ? '• ' : ''}${name} — Markdown Viewer`;
}

// --- Initialer Main-Zustand -------------------------------------------------
// Der Main-Prozess schickt nach did-finish-load IMMER ein 'window:initialState'.
// Den Listener registrieren wir synchron beim Modul-Laden — sonst koennten wir
// das Event verpassen, falls did-finish-load feuert, bevor init() den ersten
// awaitable Punkt erreicht.
const initialStatePromise = new Promise((resolve) => {
  api.onInitialState((payload) => resolve(payload || { panes: [] }));
});

// Externe Datei-Argumente (kalter Start mit "Öffnen mit" oder Doppelklick auf
// .md) werden vom Main per 'file:openExternal' geschickt — zeitlich direkt
// nach 'window:initialState'. Dieser Listener MUSS deshalb auch synchron beim
// Modul-Laden registriert werden, sonst geht die Nachricht verloren, weil
// Electron-IPC keine Nachrichten puffert. Solange init() nicht durch ist,
// sammeln wir die Files; danach werden sie geoeffnet.
let initDone = false;
const pendingExternalFiles = [];
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

  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view));
  });

  $('#btn-wrap').addEventListener('click', toggleWrapLines);
  $('#btn-numbers').addEventListener('click', toggleShowLineNumbers);
  if (btnEdit) btnEdit.addEventListener('click', toggleEditMode);

  langSelect.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    state.language = newLang;
    await api.setSetting('language', newLang);
    await loadTranslations(newLang);
    applyTranslations(document);
    setLanguage(newLang);
    reportMenuStateNow();
    renderAllPanes();
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
      hideContextMenu();
      hideHelp();
      hideAbout();
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
    } else if (ctrl && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      toggleEditMode();
    } else if (ctrl && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openSearchBar();
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
  api.onMenuOpenFile(() => openDialog());
  api.onMenuViewChange((mode) => setViewMode(mode));
  api.onMenuToggleLineNumbers(() => toggleShowLineNumbers());
  api.onMenuToggleWordWrap(() => toggleWrapLines());
  api.onMenuSave(() => saveCurrentTab());
  api.onMenuSaveAs(() => saveCurrentTabAs());
  api.onMenuOpenHelp(() => showHelp());
  api.onMenuOpenAbout(() => showAbout());
  api.onMenuToggleRestoreSession(async () => {
    state.restoreSession = !state.restoreSession;
    await api.setSetting('restoreSession', state.restoreSession);
  });

  // Window-Close-Anfrage vom Main-Prozess. Wir pruefen alle dirtigen Tabs in
  // diesem Fenster und fragen pro Tab nach (Speichern/Verwerfen/Abbrechen).
  // Wenn der Nutzer "Abbrechen" waehlt, wird das Schliessen abgebrochen,
  // sonst confirmClose() an Main melden.
  api.onWindowRequestClose(async () => {
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
      const detail = d.tab.path || t('save.untitled');
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
    renderedEl.addEventListener('scroll', () => saveScroll(idx));

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
    return;
  }
  state.activePaneIndex = paneIdx;
  updateActivePaneClasses();
  syncToolbarToActiveTab();
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

  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === viewMode);
  });

  const sourceVisible = viewMode === 'source' || viewMode === 'split';
  const wrapBtn = $('#btn-wrap');
  const numbersBtn = $('#btn-numbers');
  wrapBtn.classList.toggle('active', wrap);
  numbersBtn.classList.toggle('active', numbers);
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
    togglesEnabled: viewMode === 'source' || viewMode === 'split',
    hasActiveTab: !!tab,
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
    const detail = tab.path || t('save.untitled');
    const result = await api.confirmCloseDirty({ detail });
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

// --- Rendering --------------------------------------------------------------
function renderTabbar(paneIdx) {
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];
  if (!pane) return;
  els.tabbar.innerHTML = '';

  pane.tabs.forEach((tab, idx) => {
    const el = document.createElement('div');
    el.className = 'tab' + (idx === pane.activeIndex ? ' active' : '') + (tab.missing ? ' tab-missing' : '') + (tab.dirty ? ' dirty' : '');
    const baseName = tab.path ? api.basename(tab.path) : t('save.untitled');
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

  // View-Mode-Klassen auf dem .content-Element setzen.
  els.content.classList.remove('view-source', 'view-split', 'view-rendered');
  els.content.classList.add(`view-${tab.viewMode}`);

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
      const choice = await api.confirmConflict({ detail: filePath });
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
  return state.panes.map((p) => ({
    paths: p.tabs.map((t) => t.path),
    activeIndex: p.activeIndex,
    tabSettings: p.tabs.map((t) => ({
      viewMode: t.viewMode,
      wrapLines: t.wrapLines,
      showLineNumbers: t.showLineNumbers,
    })),
  }));
}

// --- Kontextmenü ------------------------------------------------------------
function showTabContextMenu(event, paneIdx, tabIdx) {
  contextMenu.innerHTML = '';
  const items = [];

  if (paneIdx === 0) {
    items.push({ key: 'tab.moveRight', action: () => moveTabBetweenPanes(0, tabIdx, 1, state.panes[1] ? state.panes[1].tabs.length : 0) });
  } else {
    items.push({ key: 'tab.moveLeft', action: () => moveTabBetweenPanes(paneIdx, tabIdx, 0, state.panes[0].tabs.length) });
  }
  items.push({ separator: true });
  items.push({ key: 'tab.moveToNewWindow', action: () => moveTabToNewWindow(paneIdx, tabIdx) });
  items.push({ key: 'tab.copyToNewWindow', action: () => copyTabToNewWindow(paneIdx, tabIdx) });
  items.push({ separator: true });
  items.push({ key: 'tab.close', action: () => closeTab(paneIdx, tabIdx) });

  for (const it of items) {
    if (it.separator) {
      const sep = document.createElement('div');
      sep.className = 'context-menu-separator';
      contextMenu.appendChild(sep);
      continue;
    }
    const div = document.createElement('div');
    div.className = 'context-menu-item';
    div.textContent = t(it.key);
    div.addEventListener('click', () => {
      hideContextMenu();
      it.action();
    });
    contextMenu.appendChild(div);
  }

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
// Liste der Hauptfunktionen — Reihenfolge bestimmt Anzeige im Modal.
const HELP_FEATURES = [
  'help.feature.openFiles',
  'help.feature.tabs',
  'help.feature.multiWindow',
  'help.feature.viewModes',
  'help.feature.sourceToggles',
  'help.feature.search',
  'help.feature.autoReload',
  'help.feature.restoreSession',
  'help.feature.links',
  'help.feature.theme',
  'help.feature.languages',
  'help.feature.windowState',
];

// Shortcuts — { keys: Array von Tasten-Strings, descKey: i18n-Key }.
// Mehrere Tasten in einer Zeile werden als getrennte <kbd>-Elemente gerendert.
const HELP_SHORTCUTS = [
  { keys: ['Strg+O'], descKey: 'help.shortcut.openFile' },
  { keys: ['Strg+W'], descKey: 'help.shortcut.closeTab' },
  { keys: ['Strg+Tab', 'Strg+Umschalt+Tab'], descKey: 'help.shortcut.switchTab' },
  { keys: ['Strg+Alt+→', 'Strg+Alt+←'], descKey: 'help.shortcut.moveTab' },
  { keys: ['Mittlere Maustaste'], descKey: 'help.shortcut.middleClickClose' },
  { keys: ['Strg+F'], descKey: 'help.shortcut.openSearch' },
  { keys: ['F3', 'Umschalt+F3'], descKey: 'help.shortcut.searchNav' },
  { keys: ['Enter', 'Umschalt+Enter'], descKey: 'help.shortcut.searchNavEnter' },
  { keys: ['Esc'], descKey: 'help.shortcut.escape' },
  { keys: ['F1'], descKey: 'help.shortcut.about' },
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
};

function localizeKey(token) {
  const key = KEY_LABEL_KEY[token];
  if (!key) return token;
  const translated = t(key);
  return translated === key ? token : translated;
}

function renderHelpContent() {
  const featuresEl = $('#help-features');
  featuresEl.innerHTML = '';
  for (const key of HELP_FEATURES) {
    const li = document.createElement('li');
    li.textContent = t(key);
    featuresEl.appendChild(li);
  }

  const shortcutsEl = $('#help-shortcuts');
  shortcutsEl.innerHTML = '';
  for (const sc of HELP_SHORTCUTS) {
    const tr = document.createElement('tr');
    const tdKeys = document.createElement('td');
    sc.keys.forEach((k, i) => {
      if (i > 0) tdKeys.appendChild(document.createTextNode('  /  '));
      // Einzelne Tasten innerhalb eines Strings sind durch '+' getrennt.
      const parts = k.split('+');
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
}

function showHelp() {
  renderHelpContent();
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
  query: '',
  useRegex: false,
  caseSensitive: false,
  matches: [],      // Array von <mark>-Elementen, in DOM-Order
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
  // Suchen unter beiden Panes; alte <mark>-Elemente entfernen und Textknoten zusammenfuehren.
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

  const startIdx = keepCurrent && search.currentIndex >= 0 && search.currentIndex < search.matches.length
    ? search.currentIndex
    : findFirstVisibleMatchIndex();
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

function openSearchBar() {
  const els = getSearchEls();
  search.visible = true;
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
  els.bar.hidden = true;
  closeRegexHelp();
  clearSearchHighlights();
  setInvalidRegex(false);
  updateSearchCounter();
}

function refreshSearchIfVisible() {
  if (!search.visible) return;
  // Nach DOM-Wechsel (Tab-/View-Wechsel, Reload) sind alte Mark-Refs detached.
  // Versuche, den aktuellen Treffer-Index zu erhalten.
  const prevIdx = search.currentIndex;
  search.matches = [];
  search.currentIndex = -1;
  performSearch({ keepCurrent: prevIdx >= 0 });
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
