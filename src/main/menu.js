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

// state: {
//   locale: 'de'|'en'|'fr'|'es'|'it',
//   viewMode: 'source'|'split'|'rendered'|null,
//   lineNumbers: boolean,
//   wordWrap: boolean,
//   togglesEnabled: boolean,   // true wenn aktiver Tab eine sichtbare Quellcode-Pane hat
//   restoreSession: boolean,
// }
function buildMenu(win, state) {
  const locale = state && state.locale ? state.locale : FALLBACK_LOCALE;
  const dict = loadDict(locale);
  const t = (k) => (dict[k] != null ? dict[k] : k);

  const send = (channel, ...args) => () => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, ...args);
  };

  const viewMode = state && state.viewMode ? state.viewMode : 'rendered';
  const togglesEnabled = !!(state && state.togglesEnabled);

  const template = [
    {
      label: t('menu.file.title'),
      submenu: [
        {
          label: t('menu.file.new'),
          accelerator: 'CmdOrCtrl+N',
          // Aktivierung in 4T-0006.
          enabled: false,
        },
        {
          label: t('menu.file.open'),
          accelerator: 'CmdOrCtrl+O',
          click: send('menu:openFile'),
        },
        {
          label: t('menu.file.recent'),
          // Befuellung in 4T-0005; vorerst nur Platzhalter.
          submenu: [
            { label: t('menu.file.recentEmpty'), enabled: false },
          ],
        },
        { type: 'separator' },
        {
          label: t('menu.file.save'),
          accelerator: 'CmdOrCtrl+S',
          // Aktivierung in 4T-0004.
          enabled: false,
        },
        {
          label: t('menu.file.saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          // Aktivierung in 4T-0004.
          enabled: false,
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

module.exports = { buildMenu, clearDictCache };
