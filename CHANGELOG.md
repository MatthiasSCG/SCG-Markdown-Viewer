# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung an [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Geändert

- **Lizenz**: Repository auf [MIT-Lizenz](./LICENSE) umgestellt (vorher „All rights reserved" mit `UNLICENSED`-Marker in `package.json`). `LICENSE`-Datei im Repo-Root ergänzt, `package.json` (`license: "MIT"`) und der Lizenz-Abschnitt im README entsprechend angepasst. Der Code darf damit modifiziert, verbreitet und kommerziell weiterverwendet werden, sofern die ursprüngliche Lizenz- und Copyright-Notice erhalten bleibt. Das App-Icon (Markdown Mark) bleibt unverändert unter CC0 1.0.

## [0.4.0] - 2026-05-12

### Neu

- **Fenster-Position und -Größe werden gespeichert**: Beim Beenden merkt sich die App x/y/Breite/Höhe sowie den Maximiert-Status; beim nächsten Start öffnet das Fenster wieder an der gleichen Stelle auf dem gleichen Monitor. Für Setups mit mehreren Bildschirmen praktisch, weil die App vorher immer auf dem Hauptmonitor startete. Gespeichert wird live während des Verschiebens und Größenänderns (debounced, 500 ms) sowie beim Maximieren/Wiederherstellen und beim Schließen — so geht die Position auch nach einem unsauberen Beenden nicht verloren.
- **Sicherheitsnetz für abgesteckte Monitore**: Wenn der gespeicherte Fensterbereich beim nächsten Start auf keinem aktiven Display mehr sichtbar ist (z.B. weil ein Monitor abgesteckt oder die Auflösung geändert wurde), fällt die App auf die Standard-Position auf dem Hauptmonitor zurück, statt offscreen zu öffnen.
- **Vollbild-Status wird bewusst nicht persistiert**: damit die App nie überraschend im Vollbild startet.
- **Hilfe-Dialog** (`?`-Button rechts neben „Über“): Modal mit zwei Sektionen — _Funktionen_ als Bullet-Liste (11 Einträge: Dateien öffnen, Tabs/Spalten, Ansichten, Quellcode-Toggles, Suche, Auto-Reload, Sitzungs-Wiederherstellung, Links/Wiki-Links, Theme, Sprachen, Fenster-Status) und _Tastenkürzel_ als zweispaltige Tabelle mit `<kbd>`-Tasten und Beschreibung. Schließbar per `Esc`, OK-Button oder Klick auf den Hintergrund. Tastenbezeichnungen sind ebenfalls lokalisiert (z.B. „Strg“ / „Ctrl“ / „Maj“ / „Mayús“ / „Maiusc“). Bei Sprachwechsel mit offenem Dialog wird der Inhalt automatisch neu gerendert.
- **i18n**: 30 neue Keys für die Hilfe (`help.button`, `help.title`, `help.featuresTitle`, `help.shortcutsTitle`, 11 `help.feature.*`, 10 `help.shortcut.*`, 7 `help.key.*`) in allen 5 Sprachen.

## [0.3.0] - 2026-05-12

### Neu

- **Suchfunktion** in der Vorschau und im Quelltext (`Strg + F` öffnet die Suchleiste am unteren Fensterrand):
  - **Live-Suche** während des Tippens (mit 150 ms Debounce), keine Eingabebestätigung nötig
  - **Regex-Modus** umschaltbar (`.*`-Button): wenn aus, werden Sonderzeichen wörtlich gesucht; wenn an, gelten reguläre Ausdrücke (Flags `gm`, plus `i` ohne Case-Sensitivity)
  - **Groß-/Kleinschreibung** umschaltbar (`Aa`-Button)
  - Beide Optionen werden über Sitzungen hinweg gespeichert (Settings `searchUseRegex` und `searchCaseSensitive`)
  - **Treffer-Zähler** ("3 / 17") sowie roter "Keine Treffer"-Text bei Leertreffer und "Ungültiger regulärer Ausdruck"-Text mit rotem Eingaberahmen bei invalidem Regex
  - **Such-Bereich-Anzeige** links in der Suchleiste ("Suche im Quelltext" / "Suche in der Vorschau"): die Suche arbeitet im sichtbaren Inhalt — im Modus _Gerendert_ in der Vorschau, in den Modi _Quellcode_ und _Geteilt_ im Quelltext (im Split-Modus ist der Quelltext sichtbar und enthält die Markdown-Syntax wie `###`, die in der gerenderten Vorschau gar nicht mehr vorkommt). Modus-Wechsel aktualisiert die Suche automatisch.
  - **Hilfe-Knopf** (`?`) in der Suchleiste öffnet eine kompakte Regex-Kurzreferenz als Popover über dem Knopf: 14 Einträge (`.`, `*`, `+`, `?`, `^`, `$`, `\d`, `\w`, `\s`, `\b`, `[abc]`, `[^abc]`, `a|b`, `\.`) mit Pattern und Erklärung. Schließbar per erneutem Klick, `Esc` oder Klick außerhalb. Die Erklärungstexte werden in allen 5 Sprachen geliefert.
  - **Treffer-Hervorhebung**: alle Treffer gelb (im Dark-Theme dunkelgelb), aktueller Treffer orange — gerendert via `<mark class="mdv-match">`. Treffer-Limit 5000 pro Suche, um den DOM nicht zu sprengen.
  - **Navigation** zum nächsten/vorherigen Treffer per `F3` / `Umschalt+F3`, `Enter` / `Umschalt+Enter` im Eingabefeld oder den Pfeil-Buttons. Aktueller Treffer wird automatisch zentriert in den Viewport gescrollt.
  - **Startposition** beim Öffnen oder neuer Suche: erster Treffer ab aktueller Scroll-Position (nicht Dokumentanfang).
  - **Schließen** der Suche per `Esc` oder Schließen-Button — entfernt alle Hervorhebungen.
  - **Robust gegen DOM-Wechsel**: bei Tab-Wechsel, View-Modus-Wechsel, Auto-Reload geänderter Dateien und Spalten-Wechsel wird die Suche automatisch im neuen Inhalt wiederholt, der bisherige Treffer-Index wird wenn möglich beibehalten.
- **i18n**: 28 neue Keys in allen 5 Sprachen — Suchleisten-Texte (`search.placeholder`, `search.regexTitle`, `search.caseSensitiveTitle`, `search.prevTitle`, `search.nextTitle`, `search.closeTitle`, `search.noResults`, `search.invalidRegex`, `search.scopeSource`, `search.scopeRendered`, `search.scopeTitle`, `search.helpTitle`) und Regex-Kurzreferenz (`search.regexHelpTitle` plus 14 `search.regexHelp.*`-Einträge).
- **i18n-Erweiterung**: `applyTranslations` unterstützt jetzt zusätzlich `data-i18n-placeholder` für Input-Platzhalter.

### Geändert

- **Toolbar-Reihenfolge**: Die Toggle-Buttons "Umbruch" und "Nummern" stehen jetzt links vom View-Modus-Block (Quellcode/Geteilt/Gerendert) statt rechts daneben. Logisch passender, weil die beiden Toggles sich auf die Quellcode-Ansicht beziehen.

### Behoben

- **`.gitignore` schloss `build/` aus**: Dadurch war `build/installer.nsh` (das Custom-NSIS-Skript für die Datei-Assoziations-Page) nie eingechecked, obwohl es in `package.json` referenziert wurde. Lokale Builds funktionierten zufällig, weil die Datei im Working Directory existierte; ein frischer Klone des Repos hätte aber keinen Installer-Build mehr produziert. `build/` ist jetzt nicht mehr in `.gitignore` und `installer.nsh` ist eingechecked.

### Bekannte Einschränkungen

- Treffer-Hervorhebung bleibt innerhalb eines einzelnen Textknotens — Treffer, die HTML-Knoten überspannen (z.B. eine Phrase, die durch ein `<strong>` mittendrin zerschnitten ist), werden in der Vorschau nicht gefunden. Empfehlung: in diesem Fall in den Quelltext-Modus wechseln.
- Im Quelltext mit aktivierten Zeilennummern wird zeilenweise gesucht (jede Zeile ist ein eigener Span). Multiline-Regex mit `\n` oder zeilenübergreifende Muster funktionieren nur ohne Zeilennummern oder im Vorschau-Modus zuverlässig.

## [0.2.0] - 2026-05-10

### Neu

- **Ansichts-Modus pro Tab**: Quellcode/Geteilt/Gerendert wird ab sofort pro geöffneter Datei gespeichert (vorher: pro Spalte). Beim Wechsel zwischen Tabs bleibt der gewählte Modus jeder Datei erhalten. Default für neu geöffnete Tabs ist "Gerendert".
- **Wortumbruch im Quellcode** (Toolbar-Toggle "Umbruch"): pro Tab umschaltbar. Bei aktiviertem Umbruch werden lange Zeilen automatisch umgebrochen, bei deaktiviertem erscheint ein horizontaler Scrollbalken. Default: aus.
- **Zeilennummern im Quellcode** (Toolbar-Toggle "Nummern"): pro Tab umschaltbar. Default: an.
- Toggle-Buttons werden im Modus "Gerendert" automatisch ausgegraut, da sie dort keinen sichtbaren Effekt haben.
- i18n: vier neue Keys (`source.wrap`, `source.wrapTitle`, `source.numbers`, `source.numbersTitle`) in allen 5 Sprachen.

### Behoben

- **Scroll-Position wurde beim Tab-Wechsel überschrieben**: Wenn du in Tab A gescrollt hattest und zu Tab B wechseltest, sprang Tab B's gespeicherte Position auf 0 zurück. Ursache: das DOM-Update beim Tab-Wechsel löste ein scroll-Event aus, dessen Handler den aktuellen scrollTop (gerade auf 0 zurückgesetzt vom Browser) in den **neuen** aktiven Tab schrieb. Behoben durch eine Suppress-Flag, die das Speichern während des Wechsels und der anschließenden Scroll-Wiederherstellung blockiert (zwei `requestAnimationFrame`-Ticks).

### Geändert

- **Persistenz**: pro Tab werden jetzt zusätzlich `viewMode`, `wrapLines` und `showLineNumbers` gespeichert. Migration aus dem alten Format (Pane-`viewMode`) ist eingebaut: der alte Spalten-Modus wird beim ersten Start auf alle Tabs der Spalte übertragen.

### Geändert

- **App-Icon mit heller Plate** statt transparentem Hintergrund: Auf dunklen System-Themes (Taskleiste, Titelleiste) verschwand das ursprüngliche schwarze Logo mit transparentem M↓-Loch fast vollständig. Das neue Icon hat eine weiße abgerundete Plate mit dezentem grauem Border (`#cccccc`), darauf das original Markdown-Mark in schwarz mit weißem M↓ — auf hellen wie auf dunklen Themes klar erkennbar
- `scripts/build-icon.js` umgebaut: extrahiert den Pfad aus dem Original-SVG und packt ihn in ein dynamisch generiertes Wrapper-SVG mit Plate

### Dokumentation

- **Lizenz-Abschnitt im README** ergänzt: persönliches Projekt unter "Alle Rechte vorbehalten" (kein Open Source); Hinweis darauf, dass das Markdown-Mark-Icon (CC0) nicht unter diese Einschränkung fällt

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
