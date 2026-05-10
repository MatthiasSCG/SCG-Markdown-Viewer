// Renderer-Logik: zwei Tab-Gruppen (Spalten), Tabs, Ansichten,
// Drag&Drop, i18n, Theme, Splitter, Kontextmenue.
'use strict';

import { loadTranslations, applyTranslations, setLanguage, t, normalizeLocale } from './i18n.js';

const api = window.api;

// --- Konstanten -------------------------------------------------------------
const MAX_PANES = 2;
const MIME_TAB = 'application/x-mdv-tab';

// --- State ------------------------------------------------------------------
// Eine Pane: { tabs: [{path, content, scrollSrc, scrollRen, missing}], activeIndex, viewMode }
const state = {
  panes: [createEmptyPane()],
  activePaneIndex: 0,
  language: 'en',
  restoreSession: true,
};

function createEmptyPane(viewMode = 'split') {
  return { tabs: [], activeIndex: -1, viewMode };
}

// --- DOM-Referenzen ---------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const panesContainer = $('#panes-container');
const paneRoots = Array.from(panesContainer.querySelectorAll('.pane-group'));
const outerSplitter = panesContainer.querySelector('.outer-splitter');
const emptyState = $('#empty-state');
const dropOverlay = $('#drop-overlay');
const recentMenu = $('#recent-menu');
const langSelect = $('#lang-select');
const restoreCheckbox = $('#chk-restore-session');
const contextMenu = $('#context-menu');

function getPaneEls(paneIdx) {
  const root = paneRoots[paneIdx];
  return {
    root,
    tabbar: root.querySelector('.tabbar'),
    content: root.querySelector('.content'),
    sourceEl: root.querySelector('.pane-source'),
    sourceCode: root.querySelector('.pane-source-code'),
    renderedEl: root.querySelector('.pane-rendered'),
    renderedHtml: root.querySelector('.markdown-body'),
    innerSplitter: root.querySelector('.splitter.inner-splitter'),
  };
}

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

  // Restore-Setting
  state.restoreSession = await api.getSetting('restoreSession');
  restoreCheckbox.checked = !!state.restoreSession;

  // Bindings
  bindUi();
  bindPaneEvents();

  // Datei-Events
  api.onOpenExternal((files) => openInPane(state.activePaneIndex, files));
  api.onFileChanged((p) => reloadFile(p));
  api.onFileRemoved((p) => markFileMissing(p));

  // Sitzung wiederherstellen
  if (state.restoreSession) {
    const saved = await api.getSetting('panes');
    if (Array.isArray(saved) && saved.length > 0) {
      await restorePanes(saved);
    } else {
      // Backwards-Compat: alter "openTabs"-Schluessel
      const legacy = await api.getSetting('openTabs');
      if (Array.isArray(legacy) && legacy.length > 0) {
        await openInPane(0, legacy);
      }
    }
  }

  applyAllLayouts();
}

async function restorePanes(saved) {
  // saved = [{paths: [...], activeIndex, viewMode}, ...]
  state.panes = [];
  for (let i = 0; i < Math.min(saved.length, MAX_PANES); i++) {
    state.panes.push(createEmptyPane(saved[i].viewMode || 'split'));
  }
  if (state.panes.length === 0) state.panes.push(createEmptyPane());

  for (let i = 0; i < state.panes.length; i++) {
    const paths = Array.isArray(saved[i].paths) ? saved[i].paths : [];
    for (const p of paths) {
      try {
        const data = await api.readFile(p);
        state.panes[i].tabs.push({ path: data.path, content: data.content, scrollSrc: 0, scrollRen: 0, missing: false });
      } catch (err) {
        // Datei nicht mehr da — Tab nicht aufnehmen.
      }
    }
    const wantedActive = Number.isInteger(saved[i].activeIndex) ? saved[i].activeIndex : 0;
    state.panes[i].activeIndex = state.panes[i].tabs.length === 0
      ? -1
      : Math.max(0, Math.min(wantedActive, state.panes[i].tabs.length - 1));
  }

  // Wenn linke Pane leer und rechte gefuellt: rechte hochziehen.
  if (state.panes.length === 2 && state.panes[0].tabs.length === 0 && state.panes[1].tabs.length > 0) {
    state.panes = [state.panes[1]];
  } else if (state.panes.length === 2 && state.panes[1].tabs.length === 0) {
    state.panes.pop();
  }
  state.activePaneIndex = 0;
}

// --- UI-Bindings ------------------------------------------------------------
function bindUi() {
  $('#btn-open').addEventListener('click', openDialog);
  $('#btn-open-empty').addEventListener('click', openDialog);
  $('#btn-recent').addEventListener('click', toggleRecentMenu);

  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.view, true));
  });

  langSelect.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    state.language = newLang;
    await api.setSetting('language', newLang);
    await loadTranslations(newLang);
    applyTranslations(document);
    setLanguage(newLang);
    renderAllPanes();
  });

  restoreCheckbox.addEventListener('change', async (e) => {
    state.restoreSession = e.target.checked;
    await api.setSetting('restoreSession', state.restoreSession);
  });

  // File-Drag&Drop fuer EXTERNE Dateien (nicht fuer Tab-Drag).
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
    // In welche Pane droppen? Anhand der Mausposition entscheiden.
    const targetPane = paneIndexAtPoint(e.clientX);
    if (files.length > 0) await openInPane(targetPane, files);
  });

  // Klicks ausserhalb von Menues schliessen sie.
  document.addEventListener('mousedown', (e) => {
    if (!recentMenu.contains(e.target) && !$('#btn-recent').contains(e.target)) {
      recentMenu.hidden = true;
    }
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      recentMenu.hidden = true;
    }
  });

  // Tastenkuerzel
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
    } else if (ctrl && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      openDialog();
    }
  });

  // Outer-Splitter (zwischen Panes)
  initOuterSplitter();
}

function bindPaneEvents() {
  paneRoots.forEach((root, idx) => {
    // Klick irgendwo in der Pane → diese Pane aktivieren.
    root.addEventListener('mousedown', () => activatePane(idx));

    // Klick auf Render-Markdown-Links.
    const renderedHtml = root.querySelector('.markdown-body');
    renderedHtml.addEventListener('click', (e) => handleRenderedClick(e, idx));

    // Scroll-Persistenz.
    const sourceEl = root.querySelector('.pane-source');
    const renderedEl = root.querySelector('.pane-rendered');
    sourceEl.addEventListener('scroll', () => saveScroll(idx));
    renderedEl.addEventListener('scroll', () => saveScroll(idx));

    // Inner-Splitter (Quellcode/Render).
    initInnerSplitter(idx);

    // Tabbar-Drop-Targets fuer Tab-Drag.
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
      // Insertion-Index: wenn ueber einem konkreten Tab gedropped wurde,
      // wird das im tab-spezifischen drop-handler erledigt.
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
    if (!pane || pane.viewMode !== 'split') return;
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

// --- Datei oeffnen ----------------------------------------------------------
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
      continue;
    }
    try {
      const data = await api.readFile(p);
      state.panes[targetPaneIdx].tabs.push({
        path: data.path, content: data.content, scrollSrc: 0, scrollRen: 0, missing: false,
      });
      activatePane(targetPaneIdx);
      activateTab(targetPaneIdx, state.panes[targetPaneIdx].tabs.length - 1);
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
    syncToolbarToPane(paneIdx);
    return;
  }
  state.activePaneIndex = paneIdx;
  updateActivePaneClasses();
  syncToolbarToPane(paneIdx);
}

function updateActivePaneClasses() {
  paneRoots.forEach((r, i) => r.classList.toggle('active-pane', i === state.activePaneIndex));
}

function syncToolbarToPane(paneIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === pane.viewMode);
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
  persistState();
}

async function closeTab(paneIdx, tabIdx) {
  const pane = state.panes[paneIdx];
  if (!pane) return;
  const tab = pane.tabs[tabIdx];
  if (!tab) return;

  // Nur unwatchen, wenn diese Datei in keinem anderen Tab mehr offen ist.
  const stillElsewhere = state.panes.some((p, pi) => p.tabs.some((tb, ti) => tb.path === tab.path && !(pi === paneIdx && ti === tabIdx)));
  if (!stillElsewhere) await api.unwatchFile(tab.path);

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
    // Reihenfolge innerhalb derselben Tabbar.
    return reorderTabWithinPane(fromPane, fromIdx, toIdx);
  }
  const pane = state.panes[fromPane];
  const tab = pane.tabs[fromIdx];
  if (!tab) return;

  // Falls Ziel-Pane noch nicht existiert, anlegen.
  ensurePaneExists(toPane);

  // Pruefen, ob Datei im Ziel-Pane bereits offen ist (Variante B):
  const targetExisting = state.panes[toPane].tabs.findIndex((tt) => tt.path === tab.path);
  if (targetExisting >= 0) {
    // Datei dort schon offen → einfach den Quell-Tab schliessen, Ziel aktivieren.
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
  // toPane könnte sich verschoben haben, wenn fromPane kollabiert ist.
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
    state.panes.push(createEmptyPane(state.panes[0].viewMode));
  }
}

function moveActiveTabBetweenPanes(direction) {
  const paneIdx = state.activePaneIndex;
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tabIdx = pane.activeIndex;
  if (direction === 'right') {
    const targetPane = paneIdx === 0 ? 1 : null;
    if (targetPane === null) return; // schon ganz rechts
    moveTabBetweenPanes(paneIdx, tabIdx, targetPane, state.panes[1] ? state.panes[1].tabs.length : 0);
  } else if (direction === 'left') {
    if (paneIdx === 0) return; // schon ganz links
    moveTabBetweenPanes(paneIdx, tabIdx, 0, state.panes[0].tabs.length);
  }
}

// --- Rendering --------------------------------------------------------------
function renderTabbar(paneIdx) {
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];
  if (!pane) return;
  els.tabbar.innerHTML = '';

  pane.tabs.forEach((tab, idx) => {
    const el = document.createElement('div');
    el.className = 'tab' + (idx === pane.activeIndex ? ' active' : '') + (tab.missing ? ' tab-missing' : '');
    el.title = tab.path;
    el.draggable = true;

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = api.basename(tab.path);
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
        // Mittlere Maustaste = schliessen
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

    // Tab-Drag
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(MIME_TAB, JSON.stringify({ fromPane: paneIdx, tabIndex: idx }));
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    el.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer.types).includes(MIME_TAB)) return;
      e.preventDefault();
      e.stopPropagation(); // sonst feuert auch der tabbar-Handler
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
  if (!pane || pane.activeIndex < 0) {
    els.sourceCode.textContent = '';
    els.renderedHtml.innerHTML = '';
    return;
  }
  const tab = pane.tabs[pane.activeIndex];
  els.sourceCode.textContent = tab.content;
  els.renderedHtml.innerHTML = api.renderMarkdown(tab.content, tab.path);
  // Scroll-Position.
  requestAnimationFrame(() => {
    els.sourceEl.scrollTop = tab.scrollSrc || 0;
    els.renderedEl.scrollTop = tab.scrollRen || 0;
  });
}

function renderAllPanes() {
  for (let i = 0; i < state.panes.length; i++) {
    renderTabbar(i);
    renderPaneContent(i);
  }
}

function applyAllLayouts() {
  // Sichtbarkeit der zweiten Pane + Outer-Splitter
  const split = state.panes.length === 2;
  paneRoots[1].hidden = !split;
  outerSplitter.hidden = !split;
  if (!split) {
    // Flex zuruecksetzen, damit pane 0 wieder volle Breite bekommt
    paneRoots[0].style.flex = '1 1 0';
    paneRoots[1].style.flex = '';
  }

  // View-Mode-Klassen je Pane setzen
  for (let i = 0; i < paneRoots.length; i++) {
    const els = getPaneEls(i);
    els.content.classList.remove('view-source', 'view-split', 'view-rendered');
    const pane = state.panes[i];
    if (pane) {
      els.content.classList.add(`view-${pane.viewMode}`);
    }
  }

  updateActivePaneClasses();
  syncToolbarToPane(state.activePaneIndex);
  renderAllPanes();
  updateEmptyState();
}

function saveScroll(paneIdx) {
  const els = getPaneEls(paneIdx);
  const pane = state.panes[paneIdx];
  if (!pane || pane.activeIndex < 0) return;
  const tab = pane.tabs[pane.activeIndex];
  tab.scrollSrc = els.sourceEl.scrollTop;
  tab.scrollRen = els.renderedEl.scrollTop;
}

// --- Auto-Reload ------------------------------------------------------------
async function reloadFile(filePath) {
  for (let p = 0; p < state.panes.length; p++) {
    const idx = state.panes[p].tabs.findIndex((t) => t.path === filePath);
    if (idx < 0) continue;
    try {
      const data = await api.readFile(filePath);
      state.panes[p].tabs[idx].content = data.content;
      state.panes[p].tabs[idx].missing = false;
      if (idx === state.panes[p].activeIndex) renderPaneContent(p);
      renderTabbar(p);
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

// --- Recent-Files-Menue -----------------------------------------------------
async function toggleRecentMenu(e) {
  e.stopPropagation();
  if (!recentMenu.hidden) { recentMenu.hidden = true; return; }
  const recents = (await api.getSetting('recentFiles')) || [];
  recentMenu.innerHTML = '';
  if (recents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dropdown-empty';
    empty.textContent = t('recent.empty');
    recentMenu.appendChild(empty);
  } else {
    for (const p of recents) {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = p;
      item.title = p;
      item.addEventListener('click', async () => {
        recentMenu.hidden = true;
        await openInPane(state.activePaneIndex, [p]);
      });
      recentMenu.appendChild(item);
    }
  }
  recentMenu.hidden = false;
}

// --- View-Modus -------------------------------------------------------------
function setViewMode(mode, persist = true) {
  if (!['source', 'split', 'rendered'].includes(mode)) return;
  const pane = state.panes[state.activePaneIndex];
  if (!pane) return;
  pane.viewMode = mode;
  const els = getPaneEls(state.activePaneIndex);
  els.content.classList.remove('view-source', 'view-split', 'view-rendered');
  els.content.classList.add(`view-${mode}`);
  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === mode);
  });
  if (persist) persistState();
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
function persistState() {
  const snapshot = state.panes.map((p) => ({
    paths: p.tabs.map((t) => t.path),
    activeIndex: p.activeIndex,
    viewMode: p.viewMode,
  }));
  api.setSetting('panes', snapshot);
}

// --- Kontextmenue -----------------------------------------------------------
function showTabContextMenu(event, paneIdx, tabIdx) {
  contextMenu.innerHTML = '';
  const items = [];

  if (paneIdx === 0) {
    items.push({ key: 'tab.moveRight', action: () => moveTabBetweenPanes(0, tabIdx, 1, state.panes[1] ? state.panes[1].tabs.length : 0) });
  } else {
    items.push({ key: 'tab.moveLeft', action: () => moveTabBetweenPanes(paneIdx, tabIdx, 0, state.panes[0].tabs.length) });
  }
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

  // Position: erst an Klickposition setzen, dann ins Viewport hineinziehen.
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
