# 4T-0001 — Native Menüleiste mit Datei/Ansicht/Hilfe einführen

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Die Toolbar oben ist über fünf Versionen zu einer dichten Sammlung von Drucktasten gewachsen, die mit 0.6.0 weiter zunimmt (Edit-Toggle, Speichern, Speichern unter, Recent). Eine native Menüleiste fasst seltener genutzte Befehle übersichtlich zusammen, ist Windows-konform (ALT-Aktivierung, Mnemonics) und zeigt Shortcuts automatisch rechts neben dem Eintrag, ohne dass Renderer-Code dafür gepflegt werden muss.

## Lösungsansatz

- Menü-Definition in eine neue Datei `src/main/menu.js`, exportiert eine Factory `buildMenu(locale, state)`, die das `Menu`-Objekt aus den i18n-Strings und dem aktuellen Toggle-Stand baut.
- Pro `BrowserWindow` ein eigenes `Menu` über `win.setMenu(menu)` setzen. `Menu.setApplicationMenu(null)` für ein Fenster, das (theoretisch) ohne Menü starten würde — alle Fenster bekommen aber eines.
- Menüstruktur:
  - **Datei**
    - Neu (`Strg+N`)
    - Öffnen… (`Strg+O`)
    - Zuletzt (Submenü, dynamisch befüllt — siehe 4T-0005)
    - Trenner
    - Speichern (`Strg+S`)
    - Speichern unter… (`Strg+Umschalt+S`)
    - Trenner
    - Beenden
  - **Ansicht**
    - Gerendert (`Strg+1`)
    - Geteilt (`Strg+2`)
    - Quellcode (`Strg+3`)
    - Trenner
    - Zeilennummern (Toggle mit Häkchen)
    - Zeilenumbruch (Toggle mit Häkchen)
  - **Hilfe**
    - Hilfe (`F1`)
    - Über…
    - Trenner
    - Sitzung wiederherstellen (Toggle mit Häkchen — siehe 4T-0008)
- Bei Sprachwechsel wird das Menü pro Fenster neu erzeugt und per `win.setMenu` gesetzt.
- Bei Statusänderung (View-Modus, Zeilennummern, Umbruch, Sitzungs-Toggle, Recent-Liste) wird das Menü pro Fenster neu erzeugt, damit Häkchen und Submenü aktuell sind. Performance-unkritisch, weil Menüleisten-Rebuild in Electron schnell ist.
- Aktionen feuern entweder direkten Main-Prozess-Code (Datei öffnen, neues Fenster) oder schicken ein IPC-Event an den Renderer (`menu:viewChange`, `menu:toggleNumbers`, `menu:toggleWrap`, `menu:save`, etc.).
- Mnemonics pro Sprache: `&Datei` / `&File` / `&Fichier` / `&Archivo` / `&File` (it). Innerhalb eines Menüs eindeutig. Werden in den i18n-Strings direkt als Teil des Labels gepflegt.

## Akzeptanzkriterien

- Menüleiste ist in jedem Fenster sichtbar, mit den drei Top-Level-Menüs Datei, Ansicht, Hilfe.
- ALT öffnet das erste Menü; Mnemonics aktivieren das jeweilige Menü.
- Shortcuts (Strg+N, Strg+O, Strg+S, Strg+Umschalt+S, F1, Strg+1/2/3) funktionieren in jedem Fenster und werden im Menü rechts vom Eintrag angezeigt.
- Sprachwechsel ändert die Menü-Beschriftungen sofort, ohne Neustart.
- View-Toggle im Menü zeigt das richtige Häkchen für den aktuellen Modus (Gerendert/Geteilt/Quellcode).
- Zeilennummern- und Umbruch-Häkchen spiegeln den Statusbar-Toggle-Zustand wider und umgekehrt (bidirektional synchron).
- Menüleisten-Aktion in einem Fenster A wirkt nur dort, andere Fenster bleiben unverändert.

## Bezug zu Dateien

- neu: `src/main/menu.js`
- `src/main/main.js` — Menü-Factory beim Fenster-Erzeugen aufrufen, beim Sprach- und Statuswechsel neu setzen
- `src/main/preload.js` — neue IPC-Kanäle vom Main an Renderer
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys `menu.file.*`, `menu.view.*`, `menu.help.*` inkl. Mnemonics
- `src/renderer/renderer.js` — IPC-Listener für Menü-Aktionen, Status-Reports an Main beim Toggle

## Lösung

Native Electron-Menüleiste pro Fenster mit Datei / Ansicht / Hilfe umgesetzt. Bestehende Toolbar bleibt parallel funktionsfähig; die Auflösung der Toolbar erfolgt in 4T-0002.

**Neue Datei** `src/main/menu.js`: Factory `buildMenu(win, state)` baut das `Menu` aus den i18n-Strings (geladen direkt aus den JSON-Dateien) und dem aktuellen Stand (Sprache, View-Modus, Toggles, Sitzungs-Toggle). Click-Handler schicken IPC-Events an genau das Fenster, dem das Menü gehört. Dict-Cache pro Sprache, leerbar bei Sprachwechsel (für künftige Erweiterungen).

**`src/main/main.js`**: Map `menuStates` (ownerId → State), Helper `getMenuState`, `applyMenuToWindow`, `applyMenuToAllWindows`. In `createWindow` ersetzt `applyMenuToWindow(win)` das bisherige `Menu.setApplicationMenu(null)`. Cleanup im `closed`-Handler. Neuer IPC-Handler `window:reportMenuState` empfängt Renderer-Stand und re-buildt das Menü. Setting `restoreSession` triggert über `settings:set` einen Broadcast an alle Fenster-Menüs, damit der Häkchen-Stand multi-window-synchron ist.

**`src/main/preload.js`**: `reportMenuState(state)` als API; sieben Listener `onMenuOpenFile`, `onMenuViewChange`, `onMenuToggleLineNumbers`, `onMenuToggleWordWrap`, `onMenuOpenHelp`, `onMenuOpenAbout`, `onMenuToggleRestoreSession`.

**`src/renderer/renderer.js`**: Helper `reportMenuStateNow()` schickt Locale, View-Modus, Zeilennummern, Umbruch, `togglesEnabled` an Main. Aufrufstellen: am Ende von `syncToolbarToActiveTab` (deckt View-Wechsel, Toggle-Wechsel und Tab-Wechsel ab) sowie im langSelect-Handler. Sieben `onMenu*`-Listener in `bindUi` rufen dieselben Funktionen wie die Toolbar-Buttons. Manuelle Renderer-Handler für `F1` und `Strg+O` entfernt — Menü-Akzeleratoren übernehmen. F1 öffnet damit jetzt das Hilfe-Modal statt das Über-Modal (gewollte Verhaltensänderung).

**i18n** (`src/i18n/{de,en,fr,es,it}.json`): 19 neue Keys pro Sprache (`menu.file.*`, `menu.view.*`, `menu.help.*`), Top-Level-Menüs mit Mnemonics (`&Datei` / `&File` / `&Fichier` / `&Archivo` / `&File`, etc.). Mnemonics pro Sprache kollisionsfrei.

**Bewusst nicht umgesetzt in 4T-0001** (kommen in Folge-Tasks):
- Datei → Neu (`disabled`, kommt in 4T-0006)
- Datei → Speichern und Speichern unter (`disabled`, 4T-0004)
- Datei → Zuletzt mit echter Recent-Liste (`disabled`-Submenü „Keine zuletzt geöffneten Dateien", 4T-0005)
- Hilfe-Modal-Inhalt um neue Shortcuts erweitern (4T-0009)
