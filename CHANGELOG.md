# Changelog

Alle nennenswerten Aenderungen an diesem Projekt werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung an [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.0] - 2026-05-10

### Neu

- Erste lauffaehige Version des Markdown-Viewers
- Electron-Projektstruktur (Main-Prozess, Preload, Renderer)
- **Tab-System**: mehrere Markdown-Dateien gleichzeitig geoeffnet
- **Drei Ansichten**: Quellcode, Geteilt (mit verschiebbarem Splitter), Gerendert
- **GitHub Flavored Markdown** via `markdown-it` (Tabellen, Strikethrough, Auto-Links, Task-Listen)
- **Bilder mit relativen Pfaden** werden gegen das Basisdokument aufgeloest und als Data-URI eingebettet
- **Drag & Drop** mehrerer Dateien gleichzeitig (mit `webUtils.getPathForFile` fuer Electron 32+)
- **Datei-Dialog** ueber Toolbar oder `Strg + O`
- **"Oeffnen mit"** aus dem Windows-Explorer (via `process.argv`)
- **Single-Instance**: zweite Instanz reicht ihre Datei an die laufende weiter
- **Liste zuletzt geoeffneter Dateien** (max. 15)
- **Auto-Reload** bei externen Datei-Aenderungen via `chokidar`
- Tab-Markierung als "fehlend" (durchgestrichen), wenn Datei geloescht wird
- **Mehrsprachigkeit**: Deutsch, English, Francais, Espanol, Italiano
  - Initiale Sprache aus Windows-Locale, Fallback Englisch
  - Manueller Wechsel ueber Toolbar
- **Light/Dark-Theme** gekoppelt an Windows-System-Theme (live umgeschaltet)
- **Klickbare Markdown-Links**:
  - `.md`-Links oeffnen die Zieldatei in neuem Tab
  - Bereits offene Datei: zum bestehenden Tab springen statt Duplikat
  - `http(s)://`- und `mailto:`-Links im System-Standardprogramm
  - Anker-Links (`#heading`) scrollen innerhalb des Dokuments
- **Sitzungs-Wiederherstellung** als optionale Einstellung (Default an)
- Persistierung der **gewaehlten Ansicht**, **Sprache** und **Sitzungs-Setting**
- Tastenkuerzel: `Strg + O`, `Strg + W`, `Strg + Tab`, `Strg + Shift + Tab`
- Content-Security-Policy aktiv (kein rohes HTML aus Markdown)
- Read-only: keine Bearbeitungsfunktion (gemaess Konzept)

### Projekt-Setup

- Lokales Git-Repository mit `main`-Branch initialisiert
- `.gitignore`, `.gitattributes` (LF-Zeilenenden), `.editorconfig`
- README.md mit vollstaendigem Konzept
- package.json mit Dependencies und npm-Scripts (`start`, `dev`)
