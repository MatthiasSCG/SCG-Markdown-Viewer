// Menü-Factory pro Fenster. Baut das native Electron-Menu (Datei, Ansicht,
// Hilfe) aus den i18n-Strings und dem zuletzt vom Renderer gemeldeten Stand
// (Sprache, View-Modus, Toggles, Sitzungs-Setting).
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { Menu } = require('electron');

const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'es', 'it'];
const FALLBACK_LOCALE = 'en';

const dictCache = new Map();

function loadDict(locale) {
  const target = SUPPORTED_LOCALES.includes(locale) ? locale : FALLBACK_LOCALE;
  if (dictCache.has(target)) return dictCache.get(target);
  try {
    const file = path.join(__dirname, '..', 'i18n', `${target}.json`);
    const dict = JSON.parse(fs.readFileSync(file, 'utf8'));
    dictCache.set(target, dict);
    return dict;
  } catch (err) {
    if (target !== FALLBACK_LOCALE) return loadDict(FALLBACK_LOCALE);
    return {};
  }
}

function clearDictCache() {
  dictCache.clear();
}

// Liefert einen lokalisierten String aus dem Dictionary einer Sprache. Wird
// von main.js fuer Dialog-Texte (Recent-Liste loeschen, Datei nicht gefunden)
// genutzt, die unabhaengig vom Fenster-Menue gerendert werden.
function tForLocale(locale, key) {
  const dict = loadDict(locale);
  return dict[key] != null ? dict[key] : key;
}

// state: {
//   locale: 'de'|'en'|'fr'|'es'|'it',
//   viewMode: 'source'|'split'|'rendered'|null,
//   lineNumbers: boolean,
//   wordWrap: boolean,
//   togglesEnabled: boolean,   // true wenn aktiver Tab eine sichtbare Quellcode-Pane hat
//   restoreSession: boolean,
// }
function buildMenu(win, state, actions) {
  const locale = state && state.locale ? state.locale : FALLBACK_LOCALE;
  const dict = loadDict(locale);
  const t = (k) => (dict[k] != null ? dict[k] : k);

  const send = (channel, ...args) => () => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
  };

  const viewMode = state && state.viewMode ? state.viewMode : 'rendered';
  const togglesEnabled = !!(state && state.togglesEnabled);
  const recentFiles = Array.isArray(state && state.recentFiles) ? state.recentFiles : [];

  // Recent-Files-Submenue dynamisch befuellen. Bei leerer Liste ein disabled
  // Platzhalter, sonst je Eintrag ein MenuItem (Dateiname mit Disambiguator
  // bei gleichnamigen Dateien, voller Pfad als Tooltip), gefolgt von Trenner
  // und „Liste loeschen"-Eintrag.
  const buildRecentSubmenu = () => {
    if (recentFiles.length === 0) {
      return [{ label: t('menu.file.recentEmpty'), enabled: false }];
    }
    const basenameCount = new Map();
    for (const p of recentFiles) {
      const b = path.basename(p);
      basenameCount.set(b, (basenameCount.get(b) || 0) + 1);
    }
    const items = recentFiles.map((fullPath) => {
      const base = path.basename(fullPath);
      const label = basenameCount.get(base) > 1
        ? `${base} (${path.basename(path.dirname(fullPath))})`
        : base;
      return {
        label,
        toolTip: fullPath,
        click: () => { if (actions && actions.openRecent) actions.openRecent(fullPath); },
      };
    });
    items.push({ type: 'separator' });
    items.push({
      label: t('menu.file.recentClear'),
      click: () => { if (actions && actions.clearRecent) actions.clearRecent(); },
    });
    return items;
  };

  const template = [
    {
      label: t('menu.file.title'),
      submenu: [
        {
          label: t('menu.file.new'),
          accelerator: 'CmdOrCtrl+N',
          click: () => { if (actions && actions.newTab) actions.newTab(); },
        },
        {
          label: t('menu.file.open'),
          accelerator: 'CmdOrCtrl+O',
          click: send('menu:openFile'),
        },
        {
          label: t('menu.file.recent'),
          submenu: buildRecentSubmenu(),
        },
        { type: 'separator' },
        {
          label: t('menu.file.autoSave'),
          type: 'checkbox',
          checked: !!(state && state.autoSave),
          click: () => { if (actions && actions.toggleAutoSave) actions.toggleAutoSave(); },
        },
        {
          label: t('menu.file.save'),
          accelerator: 'CmdOrCtrl+S',
          enabled: !!(state && state.hasActiveTab),
          click: () => { if (actions && actions.save) actions.save(); },
        },
        {
          label: t('menu.file.saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          enabled: !!(state && state.hasActiveTab),
          click: () => { if (actions && actions.saveAs) actions.saveAs(); },
        },
        { type: 'separator' },
        {
          label: t('menu.file.quit'),
          role: 'quit',
        },
      ],
    },
    {
      label: t('menu.view.title'),
      submenu: [
        {
          label: t('menu.view.rendered'),
          type: 'radio',
          checked: viewMode === 'rendered',
          accelerator: 'CmdOrCtrl+1',
          click: send('menu:viewChange', 'rendered'),
        },
        {
          label: t('menu.view.split'),
          type: 'radio',
          checked: viewMode === 'split',
          accelerator: 'CmdOrCtrl+2',
          click: send('menu:viewChange', 'split'),
        },
        {
          label: t('menu.view.source'),
          type: 'radio',
          checked: viewMode === 'source',
          accelerator: 'CmdOrCtrl+3',
          click: send('menu:viewChange', 'source'),
        },
        { type: 'separator' },
        {
          label: t('menu.view.outline'),
          type: 'checkbox',
          checked: !!(state && state.outlineVisible),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: send('menu:toggleOutline'),
        },
        {
          label: t('menu.view.backlinks'),
          type: 'checkbox',
          checked: !!(state && state.backlinksVisible),
          accelerator: 'CmdOrCtrl+Shift+B',
          click: send('menu:toggleBacklinks'),
        },
        {
          label: t('menu.view.foldGutter'),
          type: 'checkbox',
          checked: !!(state && state.foldGutter),
          enabled: togglesEnabled,
          click: send('menu:toggleFoldGutter'),
        },
        {
          label: t('menu.view.lineNumbers'),
          type: 'checkbox',
          checked: !!(state && state.lineNumbers),
          enabled: togglesEnabled,
          click: send('menu:toggleLineNumbers'),
        },
        {
          label: t('menu.view.wordWrap'),
          type: 'checkbox',
          checked: !!(state && state.wordWrap),
          enabled: togglesEnabled,
          click: send('menu:toggleWordWrap'),
        },
      ],
    },
    {
      label: t('menu.help.title'),
      submenu: [
        {
          label: t('menu.help.help'),
          accelerator: 'F1',
          click: send('menu:openHelp'),
        },
        {
          label: t('menu.help.about'),
          click: send('menu:openAbout'),
        },
        { type: 'separator' },
        {
          label: t('menu.help.restoreSession'),
          type: 'checkbox',
          checked: !!(state && state.restoreSession),
          click: send('menu:toggleRestoreSession'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

module.exports = { buildMenu, clearDictCache, tForLocale };
