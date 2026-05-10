// Renderer-Logik: Tabs, Ansichten, Drag&Drop, i18n, Theme, Splitter.
'use strict';

import { loadTranslations, applyTranslations, setLanguage, t, normalizeLocale } from './i18n.js';

const api = window.api;

// --- State -------------------------------------------------------------------
const state = {
  tabs: [], // { path, content, scrollSrc, scrollRen }
  activeIndex: -1,
  viewMode: 'split', // 'source' | 'split' | 'rendered'
  language: 'en',
  restoreSession: true,
};

// --- DOM-Referenzen ----------------------------------------------------------
const $ = (sel) => document.querySelector(sel);
const tabbar = $('#tabbar');
const paneSourceCode = $('#pane-source-code');
const paneRendered = $('#pane-rendered-html');
const paneSourceEl = document.querySelector('.pane-source');
const paneRenderedEl = document.querySelector('.pane-rendered');
const contentEl = $('#content');
const emptyState = $('#empty-state');
const dropOverlay = $('#drop-overlay');
const recentMenu = $('#recent-menu');
const langSelect = $('#lang-select');
const restoreCheckbox = $('#chk-restore-session');

// --- Initialisierung ---------------------------------------------------------
init();

async function init() {
  // Theme
  const initialTheme = await api.getTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  api.onThemeChanged((theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  // Sprache laden: gespeicherte Setting oder System-Locale.
  let lang = await api.getSetting('language');
  if (!lang) {
    const locale = await api.getLocale();
    lang = normalizeLocale(locale);
  }
  state.language = lang;
  await loadTranslations(lang);
  applyTranslations(document);
  langSelect.value = lang;

  // Settings: Session-Wiederherstellung
  state.restoreSession = await api.getSetting('restoreSession');
  restoreCheckbox.checked = !!state.restoreSession;

  // View-Mode
  const savedView = await api.getSetting('viewMode');
  if (savedView) setViewMode(savedView, false);

  // Event-Bindings
  bindUi();

  // Datei-Events vom Main-Prozess (Datei-Assoziation, externe zweite Instanz)
  api.onOpenExternal((files) => openFiles(files));
  api.onFileChanged((p) => reloadTab(p));
  api.onFileRemoved((p) => markTabMissing(p));

  // Session-Wiederherstellung
  if (state.restoreSession) {
    const saved = await api.getSetting('openTabs');
    if (Array.isArray(saved) && saved.length > 0) {
      await openFiles(saved);
    }
  }

  updateEmptyState();
}

// --- UI-Bindings -------------------------------------------------------------
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
    rerenderActive(); // falls Renderer-spezifische Strings betroffen sind
  });

  restoreCheckbox.addEventListener('change', async (e) => {
    state.restoreSession = e.target.checked;
    await api.setSetting('restoreSession', state.restoreSession);
  });

  // Drag & Drop — Counter-Pattern, da dragenter/dragleave auch beim Wechsel
  // zwischen Kindelementen feuert.
  let dragCounter = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    dragCounter += 1;
    if (dragCounter === 1) dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (!e.dataTransfer) return;
    dragCounter = Math.max(0, dragCounter - 1);
    if (dragCounter === 0) dropOverlay.hidden = true;
  });
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
    }
  });
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.hidden = true;
    const files = [];
    for (const f of e.dataTransfer.files) {
      const p = api.getPathForFile(f);
      if (p) files.push(p);
    }
    if (files.length > 0) await openFiles(files);
  });

  // Klicks innerhalb des gerenderten Markdowns abfangen (Links).
  paneRendered.addEventListener('click', handleRenderedClick);

  // Klick ausserhalb des Recent-Menues schliesst es.
  document.addEventListener('click', (e) => {
    if (!recentMenu.contains(e.target) && e.target.id !== 'btn-recent' && !$('#btn-recent').contains(e.target)) {
      recentMenu.hidden = true;
    }
  });

  // Splitter
  initSplitter();

  // Scroll-Position pro Tab persistieren
  paneSourceEl.addEventListener('scroll', saveScroll);
  paneRenderedEl.addEventListener('scroll', saveScroll);

  // Tastatur: Strg+W schliesst aktiven Tab, Strg+Tab wechselt.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (state.activeIndex >= 0) closeTab(state.activeIndex);
    } else if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      if (state.tabs.length > 0) {
        const next = (state.activeIndex + (e.shiftKey ? -1 : 1) + state.tabs.length) % state.tabs.length;
        activateTab(next);
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      openDialog();
    }
  });
}

// --- Splitter (Drag zum Verschieben) -----------------------------------------
function initSplitter() {
  const splitter = document.querySelector('.splitter');
  let dragging = false;
  splitter.addEventListener('mousedown', (e) => {
    if (state.viewMode !== 'split') return;
    dragging = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = contentEl.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    paneSourceEl.style.flex = `${clamped} 1 0`;
    paneRenderedEl.style.flex = `${1 - clamped} 1 0`;
  });
  window.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = '';
    }
  });
}

// --- Datei oeffnen -----------------------------------------------------------
async function openDialog() {
  const files = await api.openDialog();
  if (files.length > 0) await openFiles(files);
}

async function openFiles(paths) {
  for (const p of paths) {
    const existingIdx = state.tabs.findIndex((t) => t.path === p);
    if (existingIdx >= 0) {
      activateTab(existingIdx);
      continue;
    }
    try {
      const data = await api.readFile(p);
      state.tabs.push({ path: data.path, content: data.content, scrollSrc: 0, scrollRen: 0, missing: false });
      renderTabbar();
      activateTab(state.tabs.length - 1);
    } catch (err) {
      console.error('Konnte Datei nicht lesen:', p, err);
    }
  }
  persistOpenTabs();
}

// --- Tabs --------------------------------------------------------------------
function renderTabbar() {
  tabbar.innerHTML = '';
  state.tabs.forEach((tab, idx) => {
    const el = document.createElement('div');
    el.className = 'tab' + (idx === state.activeIndex ? ' active' : '') + (tab.missing ? ' tab-missing' : '');
    el.title = tab.path;

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = api.basename(tab.path);
    el.appendChild(title);

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = t('tab.close');
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(idx);
    });
    el.appendChild(close);

    el.addEventListener('click', () => activateTab(idx));
    tabbar.appendChild(el);
  });
}

function activateTab(idx) {
  if (idx < 0 || idx >= state.tabs.length) return;
  if (state.activeIndex === idx) {
    renderActive();
    return;
  }
  state.activeIndex = idx;
  renderTabbar();
  renderActive();
  updateEmptyState();
}

async function closeTab(idx) {
  const tab = state.tabs[idx];
  if (!tab) return;
  await api.unwatchFile(tab.path);
  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) {
    state.activeIndex = -1;
  } else if (state.activeIndex >= state.tabs.length) {
    state.activeIndex = state.tabs.length - 1;
  } else if (idx < state.activeIndex) {
    state.activeIndex -= 1;
  }
  renderTabbar();
  renderActive();
  updateEmptyState();
  persistOpenTabs();
}

// --- Render des aktiven Tabs -------------------------------------------------
function renderActive() {
  if (state.activeIndex < 0) {
    paneSourceCode.textContent = '';
    paneRendered.innerHTML = '';
    return;
  }
  const tab = state.tabs[state.activeIndex];
  paneSourceCode.textContent = tab.content;
  paneRendered.innerHTML = api.renderMarkdown(tab.content, tab.path);

  // Scroll-Position wiederherstellen (im naechsten Frame, nach Layout).
  requestAnimationFrame(() => {
    paneSourceEl.scrollTop = tab.scrollSrc || 0;
    paneRenderedEl.scrollTop = tab.scrollRen || 0;
  });
}

function rerenderActive() { renderActive(); }

function saveScroll() {
  if (state.activeIndex < 0) return;
  const tab = state.tabs[state.activeIndex];
  tab.scrollSrc = paneSourceEl.scrollTop;
  tab.scrollRen = paneRenderedEl.scrollTop;
}

// --- Auto-Reload -------------------------------------------------------------
async function reloadTab(filePath) {
  const idx = state.tabs.findIndex((t) => t.path === filePath);
  if (idx < 0) return;
  try {
    const data = await api.readFile(filePath);
    state.tabs[idx].content = data.content;
    state.tabs[idx].missing = false;
    if (idx === state.activeIndex) renderActive();
    renderTabbar();
  } catch (err) {
    markTabMissing(filePath);
  }
}

function markTabMissing(filePath) {
  const idx = state.tabs.findIndex((t) => t.path === filePath);
  if (idx < 0) return;
  state.tabs[idx].missing = true;
  renderTabbar();
}

// --- Klicks im gerenderten Markdown ------------------------------------------
async function handleRenderedClick(e) {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  e.preventDefault();

  // Externer Link
  if (/^https?:\/\//i.test(href)) {
    api.openExternal(href);
    return;
  }
  // Anker innerhalb des Dokuments
  if (href.startsWith('#')) {
    const target = paneRendered.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  // Andere Protokolle (mailto:, file:): ignorieren bzw. delegieren.
  if (/^[a-z]+:/i.test(href)) {
    if (href.startsWith('mailto:')) api.openExternal(href);
    return;
  }
  // Relativer Link: gegen Basisdokument aufloesen.
  const tab = state.tabs[state.activeIndex];
  if (!tab) return;
  const resolved = await api.resolveLink(tab.path, href);
  if (!resolved) return;
  const exists = await api.fileExists(resolved);
  if (!exists) return;
  const isMd = await api.isMarkdownPath(resolved);
  if (isMd) {
    await openFiles([resolved]);
  }
  // Nicht-Markdown-Dateien: laut Konzept ignorieren (vorerst).
}

// --- Recent-Files-Menue ------------------------------------------------------
async function toggleRecentMenu(e) {
  e.stopPropagation();
  if (!recentMenu.hidden) {
    recentMenu.hidden = true;
    return;
  }
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
        await openFiles([p]);
      });
      recentMenu.appendChild(item);
    }
  }
  recentMenu.hidden = false;
}

// --- View-Modus --------------------------------------------------------------
function setViewMode(mode, persist = true) {
  if (!['source', 'split', 'rendered'].includes(mode)) return;
  state.viewMode = mode;
  contentEl.classList.remove('view-source', 'view-split', 'view-rendered');
  contentEl.classList.add(`view-${mode}`);
  document.querySelectorAll('.view-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === mode);
  });
  if (persist) api.setSetting('viewMode', mode);
}

// --- Empty-State -------------------------------------------------------------
function updateEmptyState() {
  if (state.tabs.length === 0) {
    emptyState.classList.remove('hidden');
    contentEl.style.visibility = 'hidden';
  } else {
    emptyState.classList.add('hidden');
    contentEl.style.visibility = '';
  }
}

// --- Persistenz --------------------------------------------------------------
function persistOpenTabs() {
  const paths = state.tabs.map((t) => t.path);
  api.setSetting('openTabs', paths);
}
