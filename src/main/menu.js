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
          // 4T-0018: Settings-Dialog (Schriftart, -groesse). Renderer-Hook.
          label: t('menu.file.settings'),
          accelerator: 'CmdOrCtrl+,',
          click: send('menu:openSettings'),
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
          // 4T-0019: Edit-Modus auch im Menue erreichbar (im Fokus-Modus ist
          // der Toolbar-Button rechts unten ausgeblendet). Pro aktivem Tab.
          label: t('menu.view.edit'),
          type: 'checkbox',
          checked: !!(state && state.editMode),
          enabled: !!(state && state.hasActiveTab),
          accelerator: 'CmdOrCtrl+E',
          click: send('menu:toggleEdit'),
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
        { type: 'separator' },
        {
          // 4T-0019: Fokus-Modus toggelt UI-Chrome (Tabbar, Statusbar, Sidebar)
          // im aktiven Fenster. Wirkt nur auf dieses Fenster, persistierter
          // Wert ist global.
          label: t('menu.view.focusMode'),
          type: 'checkbox',
          checked: !!(state && state.focusMode),
          accelerator: 'CmdOrCtrl+Shift+F',
          click: send('menu:toggleFocusMode'),
        },
        {
          // 4T-0019: Typewriter-Scroll haelt die Cursor-Zeile im Editor-Pane
          // vertikal zentriert.
          label: t('menu.view.typewriterScroll'),
          type: 'checkbox',
          checked: !!(state && state.typewriterScroll),
          click: send('menu:toggleTypewriterScroll'),
        },
        { type: 'separator' },
        {
          // 4T-0030: Theme-Untermenue mit drei Radio-Items.
          // 'System' folgt dem Windows-Theme (bisheriges Verhalten),
          // 'Hell'/'Dunkel' erzwingen das jeweilige Theme app-weit.
          label: t('menu.view.theme'),
          submenu: [
            {
              label: t('menu.view.themeLight'),
              type: 'radio',
              checked: (state && state.themePref) === 'light',
              click: send('menu:setTheme', 'light'),
            },
            {
              label: t('menu.view.themeDark'),
              type: 'radio',
              checked: (state && state.themePref) === 'dark',
              click: send('menu:setTheme', 'dark'),
            },
            {
              label: t('menu.view.themeSystem'),
              type: 'radio',
              checked: !(state && state.themePref) || (state && state.themePref) === 'system',
              click: send('menu:setTheme', 'system'),
            },
          ],
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
          // 4T-0029: Manueller Update-Check. Aufruf laeuft direkt im Main
          // ueber actions.checkForUpdates, kein Renderer-Hop noetig.
          label: t('menu.help.checkForUpdates'),
          click: () => { if (actions && actions.checkForUpdates) actions.checkForUpdates(); },
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
