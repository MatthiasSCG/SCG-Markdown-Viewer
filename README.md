# SCG Markdown

Ein schlanker, lokaler Markdown-Editor für Windows 11 mit Tab-Bedienung,
umschaltbarer Quellcode-/Render-Ansicht, Edit-Modus mit Live-Vorschau,
Speichern und Auto-Reload.

## Konzept

Diese Datei dokumentiert den aktuellen Funktionsumfang. Änderungen am Code
sind in der [CHANGELOG.md](./CHANGELOG.md) festgehalten. Aufgaben werden
seit 0.6.0 lokal im Ordner [`Projektmanagement/Aufgaben/`](./Projektmanagement/)
geführt.

## Funktionsumfang

### Ansichten und Edit-Modus

- **Quellcode-Ansicht**: zeigt das rohe Markdown im CodeMirror-Editor mit
  Syntax-Highlighting (Light- und Dark-Theme).
- **Render-Ansicht**: zeigt die formatierte Darstellung.
- **Geteilte Ansicht (Split)**: beide nebeneinander, per Maus-Splitter
  verschiebbar.
- Umschaltbar über die Statusbar unten oder per Tastatur (`Strg+1`,
  `Strg+2`, `Strg+3`); der gewählte Modus wird pro Tab gespeichert.
- **Edit-Modus**: aktivierbar über das Stift-Symbol in der Statusbar oder
  `Strg+E`. Funktioniert nur in Quellcode- oder geteilter Ansicht; ein
  Klick auf den Stift im Render-Modus wechselt automatisch zu „Geteilt"
  und aktiviert den Editor. Im Edit-Modus aktualisiert sich die Render-
  Vorschau live mit 150 ms Debounce.
- **Optionale Anzeigeoptionen pro Tab**: Zeilennummern und Wortumbruch,
  beide in der Statusbar umschaltbar.

### Speichern und Dirty-State

- **Speichern (Strg+S)** schreibt den aktuellen Tab nach UTF-8/LF, kein
  BOM.
- **Speichern unter (Strg+Umschalt+S)** zeigt den OS-Speichern-Dialog;
  bei „Unbenannt"-Tabs ohne Pfad ist das automatisch der nächste Schritt
  beim ersten Strg+S.
- **Ungespeicherte Änderungen** sind mit einem `•` im Tab- und
  Fenstertitel markiert.
- **Schließen-Dialog**: Beim Schließen eines Tabs oder Fensters mit
  ungespeicherten Änderungen erscheint ein Bestätigungsdialog mit
  Speichern / Verwerfen / Abbrechen.
- **Konflikt-Dialog** bei externer Änderung mit Dirty-Buffer: Reload vs.
  eigene Version behalten.
- **Auto-Save** (Opt-in im Datei-Menü): speichert 2 Sekunden nach der
  letzten Eingabe oder bei Fenster-Fokusverlust. „Unbenannt"-Tabs werden
  nicht automatisch gespeichert. 1-Sekunden-Hinweis in der Statusbar bei
  Erfolg, 3-Sekunden-Hinweis in Rot bei Schreibfehler.

### Tabs und Spalten

- Beliebig viele Markdown-Dateien parallel in Tabs.
- Tabs lassen sich **per Drag & Drop** umsortieren oder zwischen zwei
  Spalten verschieben.
- **Rechtsklick** auf einen Tab öffnet ein Kontextmenü mit „Nach
  links/rechts verschieben", „In neues Fenster verschieben/kopieren"
  und „Schließen".
- Klick auf einen `[Text](datei.md)`-Link öffnet die Zieldatei in einem
  neuen Tab. Ist die Zieldatei in irgendeiner Spalte bereits offen, wird
  dorthin gesprungen (kein Duplikat).
- **Zwei-Spalten-Layout**: Tabs können in eine zweite Spalte rechts
  daneben verschoben werden; beide Spalten haben eigene Tab-Leisten und
  unabhängige Inhalte. Aktivierung per Drag, Kontextmenü oder
  `Strg + Alt + →`. Wenn die letzte Datei einer Spalte geschlossen wird,
  klappt das Layout automatisch auf eine Spalte zusammen. Die Splitter-
  Position zwischen den Spalten ist mit der Maus verschiebbar.

### Suchen und Ersetzen

- **Suchen (Strg+F)** mit Live-Treffern, regulären Ausdrücken (`.*`-
  Schalter) und Groß-/Kleinschreibung (`Aa`-Schalter). Das Fragezeichen
  in der Suchleiste zeigt eine Regex-Kurzreferenz.
- Treffer-Hervorhebung im Render-Pane als `<mark>`-Markierung, im
  Quellcode über CodeMirror-Decorations. Aktiver Treffer in Orange, alle
  anderen Treffer in Gelb.
- **Suchen und Ersetzen (Strg+H)** im Edit-Modus: zweiter Eingabebereich
  unter der Suchleiste mit zwei Buttons (Treffer ersetzen / alle
  Treffer ersetzen). Regex-Backreferences `$1`, `$2`, … im
  Ersetzungstext. „Alle ersetzen" als einzelne Transaktion (Strg+Z
  macht es als Ganzes rückgängig).
- Navigation per `F3` / `Umschalt+F3` oder `Enter` / `Umschalt+Enter`
  im Suchfeld.

### Native Menüleiste

Pro Fenster eine eigene Menüleiste mit drei Menüs:

- **Datei**: Neu, Öffnen…, Zuletzt (10 Einträge), Automatisch
  speichern (Toggle), Speichern, Speichern unter…, Beenden
- **Ansicht**: Gerendert, Geteilt, Quellcode, Zeilennummern (Toggle),
  Zeilenumbruch (Toggle)
- **Hilfe**: Hilfe (F1), Über…, Sitzung wiederherstellen (Toggle)

`Alt` aktiviert die Tastatursteuerung; Mnemonics (z.B. `Alt+D` für
Datei) springen direkt in das jeweilige Menü.

### Statusbar

Am unteren Fensterrand:

- Links: Toggle-Buttons für Zeilennummern, Wortumbruch, View-Modus
  (Quellcode/Geteilt/Gerendert).
- Mitte: Auto-Save-Hinweis (1 Sekunde nach erfolgreichem Auto-Save).
- Rechts: Edit-Toggle (Stift) und Sprach-Selektor.

Die Suchleiste blendet sich beim Aufruf über die Statusbar ein
(mit Replace-Zeile im Edit-Modus).

### Datei öffnen

Vier Wege:

1. **Datei → Öffnen…** (Strg+O) im Menü
2. **Drag & Drop** einer oder mehrerer Dateien ins Fenster
3. **„Öffnen mit"** im Datei-Explorer (Datei-Assoziation, beim Setup
   aktivierbar)
4. **Datei → Zuletzt** im Menü (10 zuletzt geöffnete Dateien)

### Auto-Reload

Geöffnete Dateien werden überwacht. Ändert sich eine Datei extern (z.B.
durch einen anderen Editor), wird der Tab-Inhalt automatisch aktualisiert.
Bei aktivem Edit-Modus mit ungespeicherten Bearbeitungen erscheint
stattdessen ein Konflikt-Dialog. Wird die Datei gelöscht, wird der Tab-
Titel durchgestrichen markiert.

### Bilder

Relative Bildpfade in Markdown (`![Alt](bilder/foo.png)`) werden gegen den
Pfad des aktuellen Dokuments aufgelöst und als Base64-Data-URI eingebettet.

### Links

| Link-Art                    | Verhalten                              |
|-----------------------------|----------------------------------------|
| `https://...`, `http://...` | im Standard-Browser öffnen             |
| `mailto:...`                | im Standard-Mail-Programm öffnen       |
| `#anker`                    | im Dokument scrollen                   |
| `relative/datei.md`         | in neuem Tab öffnen                    |
| `[[Datei]]` (Wiki-Link)     | `Datei.md` in neuem Tab öffnen         |
| Andere relative Dateien     | werden ignoriert                       |

### Sprachen

Die Oberfläche ist in fünf Sprachen verfügbar:

- Deutsch
- English
- Français
- Español
- Italiano

Beim ersten Start wird die Sprache aus der Windows-Locale erkannt
(Fallback: Englisch). Sie kann jederzeit über den Sprach-Selektor in der
Statusbar gewechselt werden.

### Theme

Light/Dark folgt dem Windows-System-Theme automatisch und wechselt mit,
wenn das System-Theme zur Laufzeit umgestellt wird.

### Multi-Window und Sitzung

- Tab per Rechtsklick → **„In neues Fenster verschieben"** oder
  **„In neues Fenster kopieren"** öffnet ein eigenes Fenster.
- Fensterposition, -größe und Maximiert-Status werden gemerkt und beim
  nächsten Start wiederhergestellt.
- **Sitzung wiederherstellen** (Toggle im Hilfe-Menü, persistent):
  Beim Beenden gespeicherte Sitzung (alle offenen Fenster mit Tabs,
  Spalten und Ansichten) wird beim nächsten Start wiederhergestellt.
- „Unbenannt"-Tabs ohne Pfad werden nicht persistiert; bei Quit greift
  der Schließen-Dialog.

### Hilfe-Dialog

Über `Hilfe → Hilfe` oder `F1`: Modal mit zwei Sektionen — Funktionen
(18 Bullets) und Tastenkürzel (17 Zeilen). Schließbar per `Esc`,
OK-Button oder Klick auf den Hintergrund.

### Markdown-Umfang

GitHub Flavored Markdown (GFM):

- Tabellen
- Task-Listen (`- [ ]` / `- [x]`)
- Strikethrough (`~~Text~~`)
- Auto-Links
- Code-Blöcke mit Sprachangabe und **Syntax-Highlighting** im Render-Pane
  (highlight.js, GitHub-Palette, kuratierte Sprachliste, folgt dem Theme)

Zusätzlich:

- **Wiki-Links** im Stil von Obsidian/Logseq:
  - `[[Datei]]` — Link zu `Datei.md` im selben Verzeichnis
  - `[[Datei|Anzeigetext]]` — Link mit eigenem Text
  - Hat das Ziel bereits eine Endung (z.B. `[[bild.png]]`), wird sie
    nicht durch `.md` ersetzt
- **Mermaid-Diagramme** in Fenced-Code-Blöcken mit Sprach-Tag `mermaid`
  (Flowchart, Sequence, Gantt, Class und weitere Typen). Werden im
  Render-Pane als SVG dargestellt, folgen dem Theme, lazy geladen.
- **KaTeX-Mathematik**: Inline `$…$` und Block `$$…$$`. Dollar-Beträge im
  Fließtext bleiben durch eine Whitespace-Heuristik unverändert.

Ein PDF-Export ist für ein späteres Release vorgesehen (in 0.10.0 begonnen
und zurückgestellt, siehe [4T-0024](Projektmanagement/Aufgaben/4T-0024-pdf-export.md)).

## Technik-Stack

- **Electron** als Anwendungsrahmen
- **CodeMirror 6** als Editor-Engine (Markdown-Sprachpaket, eigenes
  Highlighting-Style, Such-Decorations)
- **markdown-it** + **markdown-it-task-lists** für GFM-Rendering
- **chokidar** für File-Watching
- **electron-store** für persistente Einstellungen
- **esbuild** als Renderer-Bundler

## Projektstruktur

```
0012_Markdown-Viewer/
├── README.md            (diese Datei)
├── CHANGELOG.md         (Änderungs-Historie)
├── CLAUDE.md            (Projekt-Konventionen für Claude Code)
├── package.json
├── Projektmanagement/
│   ├── README.md        (PM-Konventionen)
│   └── Aufgaben/        (Epic- und Task-Markdowns)
├── build/
│   └── installer.nsh    (NSIS-Custom-Hooks: Datei-Assoziations-Seite)
├── scripts/
│   ├── build-icon.js    (SVG → ICO/PNG-Konverter)
│   ├── build-renderer.js (esbuild-Bundle des Renderers)
│   └── archive-build.js (Verschiebt fertige EXEs nach releases/)
├── docs/
│   └── release-notes-template.md
└── src/
    ├── main/
    │   ├── main.js      (Electron Main-Prozess, Fenster, IPC, Watcher, Menü)
    │   ├── menu.js      (Menü-Factory für die native Menüleiste)
    │   └── preload.js   (Brücke + Markdown-Rendering)
    ├── renderer/
    │   ├── index.html
    │   ├── styles.css
    │   ├── renderer.js  (UI-Logik, Tabs, Drag&Drop, CodeMirror, Suche)
    │   ├── renderer.bundle.js (Build-Output, gitignored)
    │   └── i18n.js
    ├── i18n/
    │   ├── de.json
    │   ├── en.json
    │   ├── fr.json
    │   ├── es.json
    │   └── it.json
    └── assets/
        ├── markdown-mark.svg  (Quell-Logo, CC0)
        ├── icon.ico           (generiert)
        └── icon.png           (generiert)
```

## Entwicklung

### Voraussetzungen

- Node.js >= 20
- npm

### Setup

```bash
npm install
```

### Start (Entwicklungsmodus)

```bash
npm start
```

Bundelt zuerst den Renderer via esbuild und startet dann Electron.

### Build (Windows)

```bash
# Beide Targets bauen (Installer + Portable)
npm run build

# Nur NSIS-Installer
npm run build:installer

# Nur Portable
npm run build:portable

# Icon aus SVG neu erzeugen (selten nötig)
npm run build:icon

# Nur Renderer-Bundle erzeugen (für Bundler-Debug)
npm run build:renderer
```

Die EXEs landen zunächst unter `dist/`, der `postbuild`-Hook verschiebt
sie in den Versions-Archiv-Ordner `releases/`:

- `SCG Markdown-<version>-Setup.exe` — Setup-Assistent (NSIS), Installation
  pro Benutzer (`%LOCALAPPDATA%\Programs\SCG Markdown`), Start-Menü- und
  Desktop-Verknüpfung, sauberer Uninstaller. Eine Setup-Seite bietet die
  optionale Datei-Assoziation für `.md`, `.markdown`, `.mdown`, `.mkd`
  (Default: aktiviert, abwählbar).
- `SCG Markdown-<version>-Portable.exe` — läuft ohne Installation, kein
  Eintrag im System; Datei-Assoziation ist hier technisch nicht möglich.

> **Datei-Assoziation deaktivieren oder später ändern:**
> Windows-Einstellungen → Apps → Standard-Apps → SCG Markdown (oder
> Endung `.md` suchen). Beim Deinstallieren werden eigene Registry-
> Einträge automatisch entfernt.

### Tastenkürzel

| Tastenkombination              | Aktion                                          |
|--------------------------------|-------------------------------------------------|
| `Strg + N`                     | Neuer „Unbenannt"-Tab                           |
| `Strg + O`                     | Datei öffnen                                    |
| `Strg + S`                     | Aktiven Tab speichern                           |
| `Strg + Umschalt + S`          | Speichern unter…                                |
| `Strg + W`                     | Aktiven Tab schließen                           |
| `Strg + Tab`                   | Nächster Tab in aktiver Spalte                  |
| `Strg + Umschalt + Tab`        | Vorheriger Tab in aktiver Spalte                |
| `Strg + Alt + →` / `Strg + Alt + ←` | Aktiven Tab in andere Spalte verschieben   |
| Mittlere Maustaste             | Tab schließen                                   |
| `Strg + 1` / `Strg + 2` / `Strg + 3` | Ansicht umschalten (Gerendert/Geteilt/Quellcode) |
| `Strg + E`                     | Edit-Modus umschalten                           |
| `Strg + ,`                     | Einstellungen öffnen                            |
| `Strg + +` / `Strg + -` / `Strg + 0` | Inhalt vergrößern / verkleinern / auf 100 % zurücksetzen |
| `Strg + Mausrad`               | Inhalt per Mausrad vergrößern oder verkleinern  |
| `Strg + Umschalt + F`          | Fokus-Modus umschalten                          |
| `Strg + Umschalt + O`          | Inhaltsverzeichnis-Sidebar umschalten           |
| `Strg + Umschalt + B`          | Backlinks-Sidebar umschalten                    |
| `Strg + Umschalt + [` / `Strg + Umschalt + ]` | Region am Cursor ein- / ausklappen |
| `Tab` / `Umschalt + Tab`       | Listenelement eine Ebene ein- / ausrücken       |
| `Strg + F`                     | Suche öffnen                                    |
| `Strg + H`                     | Suchen und Ersetzen (im Edit-Modus)             |
| `F3` / `Umschalt + F3`         | Nächster / vorheriger Treffer                   |
| `Enter` / `Umschalt + Enter`   | Nächster / vorheriger Treffer (in der Suchleiste) |
| `Alt`                          | Menüleiste aktivieren                           |
| `F1`                           | Hilfe-Dialog öffnen                             |
| `Esc`                          | Offene Menüs / Dialoge schließen                |

## Icon

Das App-Icon basiert auf dem **Markdown Mark** von Dustin Curtis
([dcurtis/markdown-mark](https://github.com/dcurtis/markdown-mark)),
freigegeben unter **CC0** (Public Domain). Das Quell-SVG liegt unter
`src/assets/markdown-mark.svg`; aus ihm werden via `npm run build:icon`
die Multi-Resolution-`icon.ico` (16/24/32/48/64/128/256 px) und
`icon.png` (256 px) erzeugt.

## Status

Version `0.10.0` — Render-Lift: Syntax-Highlighting für Code-Blöcke,
KaTeX-Mathematik (Inline und Block) und Mermaid-Diagramme im Render-Pane.
Der Render-Pane folgt damit dem Niveau, das von GitHub und ähnlichen Tools
gewohnt ist. Mermaid sitzt in einem separat geladenen Bundle und wird nur
geholt, wenn das Dokument auch Diagramme enthält. KaTeX, Highlight-Themes
und Mermaid-Bundle werden im neuen Build-Step der Renderer-Pipeline aus
`node_modules` aufbereitet. Der ursprünglich für dieses Release geplante
PDF-Export wurde während der Umsetzung zurückgestellt
([4T-0024](Projektmanagement/Aufgaben/4T-0024-pdf-export.md)) und kommt in
einem späteren Release zurück.

Aufsetzend auf Editor-UX und -Komfort aus 0.9.0 (Listen-Indent, Zoom,
Schriftart, Fokus-Modus, Markdown-Linter), Strukturnavigation aus 0.8.0
(Folding, Inhaltsverzeichnis, Backlinks) und Multi-Window-Bedienung aus
0.7.0. Funktional vollständig für den aktuellen Funktionsumfang,
inklusive Windows-Build (Installer + Portable).

## Lizenz

Dieser Code steht unter der [MIT-Lizenz](./LICENSE).

Copyright © 2026 Matthias Stumm. Nutzung, Modifikation, Verbreitung und
kommerzielle Weiterverwendung sind erlaubt, sofern die ursprüngliche
Lizenz- und Copyright-Notice in abgeleiteten Werken erhalten bleibt.

Das verwendete App-Icon basiert auf dem
[Markdown Mark](https://github.com/dcurtis/markdown-mark) von Dustin Curtis,
welches separat unter **CC0 1.0 (Public Domain)** veröffentlicht ist.
