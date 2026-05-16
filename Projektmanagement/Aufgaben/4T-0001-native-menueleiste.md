# 4T-0001 — Native Menüleiste mit Datei/Ansicht/Hilfe einführen

**Status**: Offen
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

(Wird nach Umsetzung ausgefüllt.)
