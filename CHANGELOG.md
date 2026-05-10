# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung an [Semantic Versioning](https://semver.org/lang/de/).

## [Unveröffentlicht] - 2026-05-10

### Geändert

- **Konsequente deutsche Rechtschreibung** in allen UI-Strings, Doku-Dateien (README, CHANGELOG), Kommentaren und User-sichtbaren Installer-Texten: `ae/oe/ue/ss` durch `ä/ö/ü/ß` ersetzt
- Sprachauswahl-Dropdown zeigt die Sprachnamen jetzt in ihrer eigenen Schreibweise: "Français" und "Español" statt "Francais" / "Espanol"

### Neu

- **Über-Dialog**: Toolbar-Button "Über" (ganz rechts) oder `F1` öffnet ein zentrales Modal mit App-Name, Versionsnummer (dynamisch via `app.getVersion()`), Autor-Hinweis und Icon-Credit. Schließbar via Esc, Klick auf den Hintergrund oder OK-Button. In allen 5 Sprachen lokalisiert
- **Optionale Datei-Assoziation im Installer**: Eine zusätzliche Setup-Seite bietet eine Checkbox (Default: aktiviert), die bei Aktivierung `.md`, `.markdown`, `.mdown`, `.mkd` mit dem Viewer verknüpft. Einträge werden unter `HKCU\Software\Classes\` angelegt (pro Benutzer, kein Admin nötig) und beim Deinstallieren automatisch entfernt — aber nur, wenn sie noch auf unsere ProgID zeigen, damit eine inzwischen anders gesetzte Assoziation eines anderen Programms nicht versehentlich mit ausgehebelt wird
- **NSIS Custom-Skript** (`build/installer.nsh`) per `nsis.include` eingebunden: enthält `customHeader`, `preInit`, `customInstall`, `customUnInstall` und die Custom-Page mit `nsDialogs`-Checkbox
- **Zwei-Spalten-Layout**: Tabs können in eine zweite Spalte rechts daneben verschoben werden, jede Spalte mit eigener Tab-Leiste und unabhängigem Inhalt
  - Tab-Drag-&-Drop: Tabs lassen sich innerhalb einer Tabbar umsortieren oder per Drag in die andere Tabbar verschieben (mit Insert-Indikator: linke/rechte Hälfte des Ziel-Tabs)
  - Rechtsklick-Kontextmenü auf Tabs: "Nach rechts verschieben" / "Nach links verschieben" / "Schließen"
  - Tastenkürzel `Strg + Alt + →` und `Strg + Alt + ←` zum Verschieben
  - Mittlere Maustaste auf einen Tab schließt ihn
  - Drag von externen Dateien in eine bestimmte Spalte öffnet sie dort (per Mauspositions-Erkennung)
  - **Cross-Pane-Lookup** beim Klick auf einen Markdown-Link: ist die Zieldatei in einer **anderen** Spalte bereits offen, springt der Viewer dorthin und aktiviert den existierenden Tab (statt ein Duplikat anzulegen)
  - Jede Spalte hat ihren eigenen View-Modus (Quellcode/Geteilt/Gerendert); Toolbar wirkt auf die aktive Spalte
  - Verschiebbarer Outer-Splitter zwischen den Spalten
  - Spalte kollabiert automatisch zurück, sobald ihr letzter Tab geschlossen wird
  - Sitzungs-Wiederherstellung speichert beide Spalten inklusive ihrer Tabs, des aktiven Tabs und des View-Modus (alter `openTabs`-Schlüssel wird als Fallback weiter gelesen)
  - i18n: neue Keys `tab.moveRight` und `tab.moveLeft` in allen 5 Sprachen
- **Wiki-Links unterstützt** (`[[Ziel]]` und `[[Ziel|Anzeigetext]]`): markdown-it-Plugin im Preload, das die Wiki-Syntax in normale Links umwandelt. `.md`-Endung wird automatisch angehängt, wenn das Ziel keine Endung hat. Klick-Verhalten identisch zu Standard-Markdown-Links

### Behoben

- **Drag-&-Drop-Overlay war beim Start permanent sichtbar** (gestrichelter blauer Rahmen über der ganzen App). Ursache: `.drop-overlay { display: flex; }` überschrieb das HTML5-`hidden`-Attribut. Behoben mit zusätzlicher Regel `.drop-overlay[hidden] { display: none; }`
- **Drag-&-Drop-Handling robuster**: Counter-Pattern für dragenter/dragleave (vermeidet Flackern, wenn der Cursor zwischen Kindelementen wechselt) und Filter auf `dataTransfer.types.includes('Files')`, damit Text-Selektion oder andere Drag-Quellen das Overlay nicht auslösen

### Build & Tooling

- **Windows-Build via electron-builder** mit zwei Targets:
  - **NSIS-Installer** (`Markdown Viewer-0.1.0-Setup.exe`): Setup-Assistent mit wählbarem Installationsverzeichnis, Start-Menü- und Desktop-Verknüpfung, sauberer Uninstaller (Pro-Benutzer-Installation)
  - **Portable** (`Markdown Viewer-0.1.0-Portable.exe`): einzelne EXE ohne Installation
- **App-Icon** basierend auf [Markdown Mark](https://github.com/dcurtis/markdown-mark) (CC0)
  - `scripts/build-icon.js`: rendert das SVG zentriert in einen quadratischen Rahmen und erzeugt `icon.ico` (Multi-Size: 16/24/32/48/64/128/256 px) sowie `icon.png` (256 px)
  - Build-Tools: `sharp` (SVG-zu-PNG-Rendering) und `to-ico` (PNG-Bündelung zu ICO)
- BrowserWindow nutzt das Icon im Entwicklungsmodus
- npm-Scripts: `build`, `build:installer`, `build:portable`, `build:icon`
- `asarUnpack` für `src/i18n/**` — i18n-JSON-Dateien bleiben im Build entpackt, damit `fetch()` aus dem Renderer zuverlässig auf sie zugreifen kann

## [0.1.0] - 2026-05-10

### Neu

- Erste lauffähige Version des Markdown-Viewers
- Electron-Projektstruktur (Main-Prozess, Preload, Renderer)
- **Tab-System**: mehrere Markdown-Dateien gleichzeitig geöffnet
- **Drei Ansichten**: Quellcode, Geteilt (mit verschiebbarem Splitter), Gerendert
- **GitHub Flavored Markdown** via `markdown-it` (Tabellen, Strikethrough, Auto-Links, Task-Listen)
- **Bilder mit relativen Pfaden** werden gegen das Basisdokument aufgelöst und als Data-URI eingebettet
- **Drag & Drop** mehrerer Dateien gleichzeitig (mit `webUtils.getPathForFile` für Electron 32+)
- **Datei-Dialog** über Toolbar oder `Strg + O`
- **"Öffnen mit"** aus dem Windows-Explorer (via `process.argv`)
- **Single-Instance**: zweite Instanz reicht ihre Datei an die laufende weiter
- **Liste zuletzt geöffneter Dateien** (max. 15)
- **Auto-Reload** bei externen Datei-Änderungen via `chokidar`
- Tab-Markierung als "fehlend" (durchgestrichen), wenn Datei gelöscht wird
- **Mehrsprachigkeit**: Deutsch, English, Français, Español, Italiano
  - Initiale Sprache aus Windows-Locale, Fallback Englisch
  - Manueller Wechsel über Toolbar
- **Light/Dark-Theme** gekoppelt an Windows-System-Theme (live umgeschaltet)
- **Klickbare Markdown-Links**:
  - `.md`-Links öffnen die Zieldatei in neuem Tab
  - Bereits offene Datei: zum bestehenden Tab springen statt Duplikat
  - `http(s)://`- und `mailto:`-Links im System-Standardprogramm
  - Anker-Links (`#heading`) scrollen innerhalb des Dokuments
- **Sitzungs-Wiederherstellung** als optionale Einstellung (Default an)
- Persistierung der **gewählten Ansicht**, **Sprache** und **Sitzungs-Setting**
- Tastenkürzel: `Strg + O`, `Strg + W`, `Strg + Tab`, `Strg + Shift + Tab`
- Content-Security-Policy aktiv (kein rohes HTML aus Markdown)
- Read-only: keine Bearbeitungsfunktion (gemäß Konzept)

### Projekt-Setup

- Lokales Git-Repository mit `main`-Branch initialisiert
- `.gitignore`, `.gitattributes` (LF-Zeilenenden), `.editorconfig`
- README.md mit vollständigem Konzept
- package.json mit Dependencies und npm-Scripts (`start`, `dev`)
