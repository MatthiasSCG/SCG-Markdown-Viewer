# 4T-0005 — Recent Files (10 Einträge, persistent, Menü-Integration)

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Aktuell gibt es einen „Zuletzt"-Button in der Toolbar, der ein Custom-Dropdown öffnet. Mit der Migration auf die native Menüleiste (4T-0001) wandert die Liste in ein Submenü `Datei → Zuletzt`. Gleichzeitig wird die Liste explizit auf **10 Einträge** begrenzt und Persistenz und Verwaltung formalisiert.

## Lösungsansatz

- **Persistenz**: Liste in `electron-store` unter dem Key `recentFiles`. Format: Array von Objekten `{ path, lastOpenedAt }`, sortiert nach `lastOpenedAt` absteigend. Maximal 10 Einträge.
- **Schreibtrigger**: Beim erfolgreichen Öffnen einer Datei (über Datei-Menü, Drag&Drop, Datei-Argument, Recent-Klick, Speichern-unter mit neuem Pfad) wird der Pfad in die Liste eingefügt. Wenn er schon existiert, wird der Eintrag nach oben verschoben (bzw. `lastOpenedAt` aktualisiert). Bei 11 Einträgen fällt der älteste hinten heraus.
- **Lesetrigger**: Beim Aufbau des Menüs (siehe 4T-0001) werden die Einträge ins Submenü `Datei → Zuletzt` eingehängt. Submenü wird bei jeder Listenänderung pro Fenster neu erzeugt.
- **Eintrag-Format im Menü**: Nur Dateiname als Label, voller Pfad als Tooltip. Kein Verzeichnispfad im Label (Menübreite). Bei mehreren Dateien mit gleichem Namen wird der übergeordnete Ordner-Name als Disambiguator angehängt: `README.md (0012_Markdown-Viewer)` vs. `README.md (other-project)`.
- **Klick-Verhalten**: Klick auf einen Recent-Eintrag öffnet die Datei als **neuen Tab im aktiven Fenster** (oder aktiviert den bestehenden Tab, wenn die Datei dort schon offen ist). Die Recent-Liste rutscht entsprechend nach vorne. Damit verhält sich Recent-Klick analog zu „Öffnen mit" im Explorer und unterscheidet sich bewusst von `Datei → Neu/Öffnen` (4T-0006), die ein neues Fenster aufmachen.
- **Aufräumen**: Wenn beim Öffnen eines Recent-Eintrags die Datei nicht mehr existiert, wird der Eintrag aus der Liste entfernt und der Nutzer per Fehlerdialog informiert.
- **Submenü-Ende**: Nach den 10 Einträgen ein Trenner und ein Eintrag „Liste löschen" (lokalisiert), der die Liste komplett leert (mit Bestätigung).
- **Leere Liste**: Wenn die Liste leer ist, wird im Submenü ein deaktivierter Eintrag „Keine zuletzt geöffneten Dateien" angezeigt.

## Akzeptanzkriterien

- Beim Öffnen einer Datei landet sie an oberster Stelle in Datei → Zuletzt.
- Maximal 10 Einträge in der Liste; älteste fallen heraus.
- Mehrfaches Öffnen derselben Datei erzeugt keine Duplikate, sondern aktualisiert die Position.
- Klick auf einen Recent-Eintrag öffnet die Datei als neuen Tab im aktiven Fenster (bzw. aktiviert den bestehenden Tab, falls die Datei dort offen ist).
- Pfad-Tooltip zeigt den vollständigen Pfad beim Hover.
- Bei gleichem Dateinamen aus verschiedenen Ordnern wird der Ordnername angehängt (Disambiguator).
- Recent-Eintrag mit nicht mehr existierender Datei: Eintrag wird entfernt, Fehlerdialog erscheint.
- Leere Liste: deaktivierter Eintrag „Keine zuletzt geöffneten Dateien".
- „Liste löschen" am Ende des Submenüs leert die Liste nach Bestätigung.
- Persistenz: Recent-Liste überlebt App-Neustart.

## Bezug zu Dateien

- `src/main/main.js` — Recent-Liste-Verwaltung (Lesen/Schreiben in `electron-store`), Submenü-Aufbau
- `src/main/menu.js` — Submenü-Generator aus Recent-Liste
- `src/main/preload.js` — IPC-Kanal Recent-Klick
- `src/renderer/renderer.js` — Recent-Eintrag-Open-Trigger, alte Recent-Dropdown-Logik entfernen
- `src/renderer/index.html` — alten Recent-Dropdown entfernen (war Teil der Toolbar, fällt mit 4T-0002 ohnehin weg)
- `src/i18n/{de,en,fr,es,it}.json` — `menu.file.recent`, `menu.file.recentEmpty`, `menu.file.recentClear`, `menu.file.recentClearConfirm`, `recent.missingFile`

## Lösung

Recent-Files-Liste auf 10 Einträge limitiert, dynamisches Submenu unter `Datei → Zuletzt`, Klick öffnet als neuer Tab im aktiven Fenster, „Liste löschen" mit Bestätigung, Multi-Window-Synchronisation.

**`src/main/main.js`**:
- `pushRecent` umgestellt auf max 10 Einträge (vorher 15); ruft nach jeder Änderung `applyMenuToAllWindows()` auf, damit das Submenü in allen offenen Fenstern aktualisiert wird.
- `pushRecent`-Aufruf aus dem `file:read`-IPC-Handler entfernt — der lief vorher auch beim Sitzungs-Restore und Auto-Reload, was die Recent-Liste unerwünscht mit gerade nur passiv geladenen Dateien füllte. Stattdessen meldet der Renderer aktives Öffnen explizit über den neuen IPC-Kanal `recent:push`.
- `getMenuState` um `recentFiles` (aus `electron-store`) erweitert.
- `applyMenuToWindow` reicht jetzt `actions = { openRecent, clearRecent }` an die Menü-Factory weiter.
- Neue Helper:
  - `tForWindow(win, key)`: holt die Sprache aus dem `menuStates`-Eintrag des Fensters und übersetzt via `tForLocale` (aus `menu.js`)
  - `openRecentFile(filePath, sourceWindow)`: prüft `fs.access`. Datei weg → aus Liste entfernen, Warn-Dialog mit Pfad als Detail. Datei da → `webContents.send('file:openExternal', [filePath])` an das aktuelle Fenster; der Renderer öffnet die Datei dann als neuen Tab in seiner aktiven Pane über die bestehende `openInPane`-Logik. Recent-Liste rutscht automatisch nach vorne, weil der Renderer `api.pushRecent` aufruft.
  - `clearRecentList(sourceWindow)`: `dialog.showMessageBox` mit Bestätigungs-Buttons („Löschen" / „Abbrechen"), bei Bestätigung Liste leeren und alle Menüs aktualisieren.

**`src/main/menu.js`**:
- Signatur erweitert: `buildMenu(win, state, actions)`.
- Submenu `Datei → Zuletzt` dynamisch via `buildRecentSubmenu()` befüllt. Disambiguator: bei mehreren Dateien mit gleichem Basename wird der übergeordnete Ordnername in Klammern angehängt (z.B. `README.md (0012_Markdown-Viewer)` vs. `README.md (other-project)`). `toolTip` ist der volle Pfad. Bei leerer Liste ein disabled „Keine zuletzt geöffneten Dateien". Am Ende ein Trenner und „Liste löschen", beide via `actions`-Callbacks.
- Neuer Export `tForLocale(locale, key)` für Dialog-Übersetzungen außerhalb der Menü-Factory.

**`src/main/preload.js`**: Neuer API-Eintrag `pushRecent(p)` → `ipcRenderer.invoke('recent:push', p)`.

**`src/renderer/renderer.js`**: In `openInPane` wird nach erfolgreicher Tab-Aktivierung (bei bereits offener Datei) bzw. nach erfolgreichem `readFile` (bei neu geöffneter Datei) `api.pushRecent(p)` bzw. `api.pushRecent(data.path)` aufgerufen. Damit wandern aktiv geöffnete Dateien in die Recent-Liste; Auto-Reload und Sitzungs-Restore tun das nicht.

**i18n in fünf Sprachen**: sechs neue Keys — `menu.file.recentClear`, `menu.file.recentClearConfirm`, `menu.file.recentClearBtnYes`, `menu.file.recentClearBtnNo`, `recent.missingFileTitle`, `recent.missingFile`.

**Verhaltens-Korrektur gegenüber Ursprungsplan**: Klick auf einen Recent-Eintrag öffnet die Datei als **neuen Tab im aktuellen Fenster**, nicht als neues Fenster. So verhält sich Recent analog zu „Öffnen mit" im Explorer. Der Unterschied zu `Datei → Neu/Öffnen` (4T-0006), die jeweils ein neues Fenster aufmachen, ist bewusst — Recent ist die schnelle Rückkehr in eine kürzlich genutzte Datei, nicht das Eröffnen einer separaten Arbeitsumgebung.
