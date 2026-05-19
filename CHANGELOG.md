# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung an [Semantic Versioning](https://semver.org/lang/de/).

## [0.13.0] - 2026-05-19 — SCG Table: Spans, Ausrichtung und Accessibility

Feature-Release. Erweitert SCG-Tabellen (eingeführt in [3E-0006](Projektmanagement/Aufgaben/3E-0006-scg-table.md)) um Zell-Attribute für Layout-Steuerung. Umgesetzt als Epic [3E-0007](Projektmanagement/Aufgaben/3E-0007-scg-table-spans-ausrichtung.md) in den Tasks [4T-0037](Projektmanagement/Aufgaben/4T-0037-scg-table-spans-ausrichtung-parser.md) (Parser- und Renderer-Erweiterung), [4T-0038](Projektmanagement/Aufgaben/4T-0038-scg-table-hilfe-tab-stufe-2.md) (Hilfe-Tab erweitert) und Abschluss-Sammeltask [4T-0039](Projektmanagement/Aufgaben/4T-0039-changelog-release-0130.md).

### Neu

- **Zell-Attribute in SCG-Tabellen** ([4T-0037](Projektmanagement/Aufgaben/4T-0037-scg-table-spans-ausrichtung-parser.md)): `colspan`, `rowspan`, `align` (`left`/`center`/`right`) und `valign` (`top`/`middle`/`bottom`) als Whitelist-Attribute am Zellenanfang (`| attr="val" attr="val" | Inhalt`). Strikte Wert-Validierung; freie `style="…"`-, `class="…"`- oder `onclick="…"`-Attribute werden stillschweigend ignoriert (kein XSS-Risiko aus dem Quelltext). `align`/`valign` werden auf CSS-Klassen (`.align-*`/`.valign-*`) gemappt, nicht auf das deprecated HTML4-`align`-Attribut, damit die CSS-Hoheit beim App-Stylesheet bleibt.
- **Accessibility-Verbesserung für Header-Zellen** ([4T-0037](Projektmanagement/Aufgaben/4T-0037-scg-table-spans-ausrichtung-parser.md)): `<th>` in der Header-Zeile bekommt automatisch `scope="col"`, `<th>` als Zeilen-Header (`!` am Anfang einer Datenzeile) bekommt `scope="row"`. Damit verbinden Screen-Reader Datenzellen mit ihren Headern.
- **Hilfe-Tab um Spans-und-Ausrichtung-Sektion erweitert** ([4T-0038](Projektmanagement/Aufgaben/4T-0038-scg-table-hilfe-tab-stufe-2.md)): Neue Sektion „Spans und Ausrichtung" im Tab „SCG Table" mit Übersichts-Tabelle der vier Attribute, Beispiel „Aufwandsschätzung" mit gerenderter Tabelle, Tipps-Subblock und Accessibility-Hinweis. In allen fünf Sprachen.

### Geändert

- **Versions-Bump** 0.12.0 → 0.13.0 ([package.json](package.json)).
- **CSS-Klassen** `.scg-table .align-{left|center|right}` und `.valign-{top|middle|bottom}` in [src/renderer/styles.css](src/renderer/styles.css).

### i18n

- Keine neuen i18n-JSON-Keys. Die Hilfe-Inhalte sind als Markdown-Dateien organisiert (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`); diese wurden um die Spans-und-Ausrichtung-Sektion erweitert.

## [0.12.0] - 2026-05-19 — SCG Table: mehrzeilige Block-Zellen in Tabellen

Feature-Release, der eine Markdown-Erweiterung für Tabellen mit mehrzeiligen Block-Zellen einführt. Umgesetzt als Epic [3E-0006](Projektmanagement/Aufgaben/3E-0006-scg-table.md) in den Tasks [4T-0034](Projektmanagement/Aufgaben/4T-0034-scg-table-parser.md) (Parser und Renderer), [4T-0036](Projektmanagement/Aufgaben/4T-0036-scg-table-hilfe-tab.md) (Hilfe-Tab mit ausführlicher Doku) und Abschluss-Sammeltask [4T-0035](Projektmanagement/Aufgaben/4T-0035-changelog-release-0120.md). Stufe 1 des Epics; `colspan`/`rowspan`/Ausrichtung und ein HTML-Konverter für externe Renderer folgen in späteren Folge-Epics.

### Neu

- **SCG-Tabellen mit mehrzeiligen Block-Zellen** ([4T-0034](Projektmanagement/Aufgaben/4T-0034-scg-table-parser.md)): Markdown-Pipe-Tabellen sind zeilenbasiert und können keine geschachtelten Listen, mehrere Absätze oder Code-Blöcke in einer Zelle abbilden. SCG-Tabellen schließen diese Lücke über einen Fenced-Code-Block mit Sprach-Tag `scg-table`. Inhalt zwischen `{|` und `|}` wird als HTML-Tabelle gerendert; in fremden Markdown-Renderern bleibt der Block als lesbarer Code-Block sichtbar (Graceful Degradation). Syntax orientiert sich an MediaWiki: `{|` öffnet, `|}` schließt, `|-` trennt Zeilen, `|` startet eine Datenzelle, `!` eine Header-Zelle, `|+` setzt eine Caption. Zelleninhalt wird rekursiv durch markdown-it gerendert, sodass Listen (auch geschachtelt), nummerierte Listen, Codeblöcke (mit Vier-Backtick-Außenfence), Inline-Formatierung, Wiki-Links und Bilder in Zellen funktionieren. Integration über Override von `md.renderer.rules.fence` in `preload.js` mit Delegation an den Default-Renderer für alle anderen Sprach-Tags, sodass Code-Highlighting unangetastet bleibt.
- **Hilfe-Tab „SCG Table"** ([4T-0036](Projektmanagement/Aufgaben/4T-0036-scg-table-hilfe-tab.md)): Dritter Tab im Hilfe-Dialog neben „Funktionen" und „Tastenkürzel". Inhalt pro Sprache als Markdown-Datei in `src/i18n/help/scg-table.<locale>.md`, asynchron vom Main geladen und durch dieselbe markdown-it-Instanz wie der Viewer-Inhalt gerendert. Die Hilfe demonstriert sich selbst, weil die Beispiele echte scg-table-Blöcke enthalten, die der scg-table-Renderer verarbeitet. Inhalt: Einleitung, Syntax-Übersicht, Minimal- und erweitertes Beispiel mit Code-Block in der Zelle, fünf Tipps (`|-`-Pflicht zwischen Zeilen prominent als erster Punkt), Portabilitäts-Hinweis, Stufen-Ausblick. Lazy-Loading mit Locale-Cache; Sprachwechsel triggert Reload, wenn der Tab sichtbar ist.
- **Hilfe-Dialog um den scg-table-Eintrag erweitert** ([4T-0035](Projektmanagement/Aufgaben/4T-0035-changelog-release-0120.md)): `help.feature.scgTable` in der Gruppe „Bearbeitung" mit Querverweis auf den ausführlichen Hilfe-Tab.

### Geändert

- **Versions-Bump** 0.11.0 → 0.12.0 ([package.json](package.json)).
- **CSS-Anpassungen für `.scg-table`** ([src/renderer/styles.css](src/renderer/styles.css)): Caption-Styling mit kursivem Text und gedämpfter Farbe, `vertical-align: top` für Block-Zellen, Margin-Reset für umschließendes `<p>` aus dem Block-Render (damit einzelne Absätze in Zellen keine sichtbaren Abstände an Zellrändern verursachen).

### i18n

- 2 neue Keys über die fünf unterstützten Sprachen (DE, EN, FR, ES, IT):
  - `help.tabScgTable` (Tab-Label, Eigenname „SCG Table" in allen Sprachen) je Sprache.
  - `help.feature.scgTable` (kurzer Funktions-Eintrag in der Gruppe „Bearbeitung") je Sprache.
- 5 neue Markdown-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) mit dem ausführlichen Hilfe-Tab-Inhalt.

## [0.11.0] - 2026-05-19 — Theme-Wahl, Statusbar-Icons und Update-Erkennung

Feature-Release, das die App um drei eigenständige Komfort-Verbesserungen erweitert. Umgesetzt als Epic [3E-0005](Projektmanagement/Aufgaben/3E-0005-update-theme-statusbar-icons.md) in den Tasks [4T-0030](Projektmanagement/Aufgaben/4T-0030-theme-toggle.md) (Theme-Umschalter), [4T-0031](Projektmanagement/Aufgaben/4T-0031-statusbar-icons.md) (Statusbar-Icons) und [4T-0029](Projektmanagement/Aufgaben/4T-0029-auto-update.md) (Update-Erkennung), inklusive Abschluss-Sammeltask [4T-0033](Projektmanagement/Aufgaben/4T-0033-changelog-release-0110.md). Der Auto-Install-Pfad ([4T-0032](Projektmanagement/Aufgaben/4T-0032-auto-install.md)) wurde wegen SmartScreen-Risiken bei unsigniertem Installer zurückgestellt, bis ein Code-Signing-Zertifikat vorliegt.

### Neu

- **Theme-Umschalter Hell / Dunkel / System** ([4T-0030](Projektmanagement/Aufgaben/4T-0030-theme-toggle.md)): Drei-Wege-Wahl statt der bisherigen rein systemgesteuerten Theme-Logik. Auswahl an zwei Stellen: Menü `Ansicht → Theme` mit drei Radio-Items und ein Statusbar-Icon (Sonne / Mond / Monitor) zwischen Edit-Stift und Sprach-Wahl, das per Klick zyklisch Hell → Dunkel → System → Hell durchschaltet. Persistenz in `electron-store` (Schlüssel `themePref`, Default `system`), sodass die Wahl App-Neustarts überlebt. Multi-Window-Sync über zwei Broadcast-Kanäle: Statusbar-Icon und Menü-Radio bleiben in allen Fenstern synchron. Mermaid-Diagramme und Syntax-Highlighting passen sich beim Theme-Wechsel ohne Reload an. Native System-Dialoge folgen über `nativeTheme.themeSource` ebenfalls dem gewählten Theme.
- **Statusbar-Buttons als Icons** ([4T-0031](Projektmanagement/Aufgaben/4T-0031-statusbar-icons.md)): Die acht Wort-Buttons unten links (Inhalt, Backlinks, Gliederung, Nummern, Umbruch, Quellcode, Geteilt, Gerendert) werden durch Inline-SVG-Icons aus [Lucide](https://lucide.dev) (ISC-Lizenz) ersetzt. Konzept-Phase mit visuellem Mockup für die Icon-Auswahl unter [Projektmanagement/Mockups/4T-0031-icon-mockup.html](Projektmanagement/Mockups/4T-0031-icon-mockup.html). Finale Auswahl: `list-tree`, `link-2`, `chevrons-down-up`, `list-ordered`, `wrap-text`, `code`, `columns-2`, `eye`. Keine NPM-Dependency, kein Runtime-CDN, kein Netzwerk-Zugriff. Tooltips bei Hover und `aria-label`-Beschriftungen für Screen-Reader sind in allen fünf Sprachen lokalisiert (`data-i18n-aria-label`-Erweiterung in `i18n.js`). Statusbar-Reihe links unten ist dadurch deutlich schmaler, rechte Statusbar-Sektion bekommt entsprechend mehr Platz.
- **Update-Erkennung mit Link zur GitHub-Release-Seite** ([4T-0029](Projektmanagement/Aufgaben/4T-0029-auto-update.md)): Die App prüft im Hintergrund auf neue Versionen, **erstmaliger Check 45 Sekunden nach App-Start**, danach alle 24 Stunden. Manueller Trigger über Menü `Hilfe → Auf Updates prüfen…`. Bei verfügbarem Update öffnet sich ein Dialog mit drei Optionen: „Zum Download öffnen" (öffnet die GitHub-Release-Seite im Standard-Browser), „Später erinnern" und „Diese Version überspringen" (persistiert in `electron-store` unter `update.skippedVersion`; manueller Check ignoriert die Skip-Liste). Setup- und Portable-EXE werden einheitlich behandelt — kein automatischer Download, keine automatische Installation. Beim Hintergrund-Check stille Fehler-Behandlung; beim manuellen Check Fehler-Dialog mit Heuristik für Netzwerk-Fehler. Diagnose-Logger schreibt nach `%APPDATA%/SCG Markdown/logs/update.log`.
- **Hilfe-Dialog um den Update-Eintrag erweitert** ([4T-0033](Projektmanagement/Aufgaben/4T-0033-changelog-release-0110.md)): `help.feature.updateCheck` in der Gruppe „Allgemein". Der bestehende `help.feature.theme`-Eintrag wurde inhaltlich auf die Drei-Wege-Wahl angepasst.

### Geändert

- **Versions-Bump** 0.10.0 → 0.11.0 ([package.json](package.json)).
- **Build-Pipeline um electron-updater-Assets erweitert** ([scripts/archive-build.js](scripts/archive-build.js)): `latest.yml` und die Setup-Blockmap landen nach jedem Build neben den EXEs in `releases/`, damit der Release-Prozess sie als GitHub-Asset hochladen kann. Die SemVer-Regex im Archive-Script unterstützt jetzt Pre-Release-Suffixe (`-rc1`, `-dev.0`, `-alpha.5` etc.).
- **`publish`-Block in `package.json.build`** mit Provider `github` aktiviert die `latest.yml`-Erzeugung von `electron-builder`.
- **`electron-updater@6.8.3`** als neue Production-Dependency.

### Behoben

- **Sidebar-Sektionen lassen sich wieder unabhängig ein-/ausblenden** (Pre-existing-Bugfix aus 4T-0014/4T-0015, Commit `8f7da17`): Die CSS-Regel `.sidebar-section { display: flex; }` überschrieb seit der Einführung von Outline und Backlinks die User-Agent-Default `[hidden] { display: none; }` (gleiche Spezifität, spätere Quellreihenfolge gewinnt). Eine spezifischere Regel `.sidebar-section[hidden] { display: none; }` stellt das erwartete Verhalten wieder her. Aufgefallen während des Tests von 4T-0031.

### Zurückgestellt

- **Auto-Download und Auto-Installation des Updates** ([4T-0032](Projektmanagement/Aufgaben/4T-0032-auto-install.md)): Ursprünglich Teil des Update-Tasks; wegen SmartScreen-Risiken bei unsigniertem Setup-Installer (Auto-Install kann je nach Windows-Version, Sicherheitsstufe und Hash-Reputation stillschweigend zulassen, mit Warnung zulassen oder vollständig blockieren) in einen eigenen, zurückgestellten Task ausgelagert. Voraussetzung für den Wiederanlauf: Code-Signing-Zertifikat (OV oder EV) für die Setup-EXE. Die in 4T-0029 etablierte Infrastruktur (electron-updater, GitHub-Provider, `latest.yml`, Dialog-Struktur) wird dort nahtlos weiterverwendet.

### i18n

- 24 neue Keys über die fünf unterstützten Sprachen (DE, EN, FR, ES, IT):
  - Theme-Umschalter: 7 Keys (`menu.view.theme/Light/Dark/System`, `statusbar.theme.tooltipLight/Dark/System`) je Sprache.
  - Update-Erkennung: 11 Keys (`menu.help.checkForUpdates`, `update.dialogTitle/Text`, `update.btnOpenRelease/RemindLater/SkipVersion`, `update.statusUpToDateTitle/Message`, `update.errorTitle/Offline/Generic`) je Sprache.
  - Sammeltask: 2 Keys (`help.feature.updateCheck`, `about.lucide`) je Sprache.
  - Plus inhaltliche Anpassung von `help.feature.theme` (Drei-Wege-Wahl statt automatische Kopplung).

## [0.10.0] - 2026-05-19 — Render-Lift: Syntax-Highlighting, KaTeX-Mathematik und Mermaid-Diagramme

Feature-Release, das den Render-Pane auf das Niveau hebt, das Nutzer von GitHub und ähnlichen Tools kennen. Umgesetzt als Epic [3E-0004](Projektmanagement/Aufgaben/3E-0004-render-lift-und-export.md) in den Tasks [4T-0023](Projektmanagement/Aufgaben/4T-0023-code-syntax-highlighting.md) (Syntax-Highlighting), [4T-0022](Projektmanagement/Aufgaben/4T-0022-katex.md) (KaTeX) und [4T-0021](Projektmanagement/Aufgaben/4T-0021-mermaid.md) (Mermaid), inklusive Abschluss-Sammeltask [4T-0028](Projektmanagement/Aufgaben/4T-0028-changelog-release-0100.md).

### Neu

- **Syntax-Highlighting für Code-Blöcke im Render-Pane** ([4T-0023](Projektmanagement/Aufgaben/4T-0023-code-syntax-highlighting.md)): Fenced-Code-Blöcke mit Sprach-Tag werden im Render-Pane farbig dargestellt. `highlight.js` in der Core-Variante mit kuratierter Sprachliste (JavaScript, TypeScript, Python, Java, C#, C++, Go, Rust, Bash, SQL, JSON, YAML, XML, CSS, Markdown, Plaintext, plus die üblichen Alias-Tags). GitHub-Light- und Dark-Theme werden über ein generiertes Stylesheet (`scripts/build-hljs-themes.js` → `src/renderer/hljs-themes.css`) parallel geladen und über das `data-theme`-Attribut am `<html>` ohne Re-Render umgeschaltet. Unbekannte Sprach-Tags fallen still auf einen Plain-Block zurück, ohne Fehlermeldung. Inline-Code bleibt unangetastet.
- **KaTeX-Mathematik im Render-Pane** ([4T-0022](Projektmanagement/Aufgaben/4T-0022-katex.md)): Mathematische Formeln werden mit KaTeX gesetzt — Inline `$…$` und Block `$$…$$`. `@vscode/markdown-it-katex` als markdown-it-Plugin sorgt dafür, dass Dollar-Beträge im Fließtext (`Das kostet $5 bis $10`) durch die Whitespace-Heuristik unverändert bleiben. Backslash-Escape `\$` ebenfalls. Syntaxfehler in Formeln erscheinen rot inline, ohne den Render-Pane abzuschießen. KaTeX-CSS und 20 woff2-Schnitte werden per `scripts/build-katex-assets.js` aus `node_modules/katex` nach `src/renderer/katex/` kopiert, mit Filter auf woff2 (Chromium unterstützt das nativ; woff und ttf wären nur unnötiger Ballast im Bundle).
- **Mermaid-Diagramme im Render-Pane** ([4T-0021](Projektmanagement/Aufgaben/4T-0021-mermaid.md)): Fenced-Code-Blöcke mit Sprach-Tag `mermaid` werden als SVG-Diagramme gerendert (Flowchart, Sequence, Gantt, Class und weitere Mermaid-Typen). Mermaid sitzt in einem separaten esbuild-Bundle (`scripts/build-mermaid.js` → `src/renderer/mermaid.bundle.js`, ~3 MB minified) und wird per dynamischem `import()` lazy geladen — Dokumente ohne Mermaid-Blöcke holen den Bundle gar nicht erst. Theme-Wechsel zur Laufzeit rendert alle vorhandenen Diagramme in der neuen Palette neu. Cache-Schicht (FNV-1a-Hash pro Quelltext+Theme) verhindert teure Re-Renders beim Live-Tippen. Syntax-Fehler werden in einem dezenten eigenen Fehler-Block mit Quelltext und Meldung dargestellt, ohne dass Mermaid-DOM-Leftovers am `<body>` hängen bleiben.
- **Hilfe-Dialog um drei neue Feature-Einträge erweitert** ([4T-0028](Projektmanagement/Aufgaben/4T-0028-changelog-release-0100.md)): `help.feature.codeHighlight`, `help.feature.katex`, `help.feature.mermaid` in der Gruppe „Ansicht". Keine neuen Tastenkürzel im Release.

### Geändert

- **Versions-Bump** 0.9.0 → 0.10.0 ([package.json](package.json)).
- **markdown-it-Pipeline im Preload erweitert** (4T-0021/22/23): `highlight.js/lib/core` mit selektiver Sprach-Registrierung als `highlight`-Callback in markdown-it, `@vscode/markdown-it-katex` als zusätzliches Plugin. Bei unbekannten Sprach-Tags schreibt der Highlight-Callback weiterhin die `language-<tag>`-Klasse mit, damit das Renderer-seitige Post-Processing (Mermaid) den Block zuverlässig per Klassennamen findet.
- **Renderer-Build-Pipeline um drei Pre-Steps erweitert** ([scripts/build-renderer.js](scripts/build-renderer.js)): vor dem Haupt-Bundle baut esbuild jetzt die hljs-Themes, KaTeX-Assets und den Mermaid-Bundle.

### Zurückgestellt

- **PDF-Export** ([4T-0024](Projektmanagement/Aufgaben/4T-0024-pdf-export.md)): Der ursprünglich für 0.10.0 vorgesehene PDF-Export per `webContents.printToPDF` wurde während der Umsetzung zurückgestellt. Theme- und Container-Konflikte im Print-Modus konnten innerhalb des Releases nicht zufriedenstellend gelöst werden. Der Code-Stand wurde vollständig zurückgebaut; der Versuch ist im Task mit Problemen, Teil-Lösungen und drei Wiederanlauf-Varianten (A, B, B+) ausführlich dokumentiert. Das Feature kommt in einem späteren Release zurück.

### i18n

- 15 neue Keys über die fünf unterstützten Sprachen (DE, EN, FR, ES, IT): drei neue Feature-Einträge für den Hilfe-Dialog (`help.feature.codeHighlight`, `help.feature.katex`, `help.feature.mermaid`) je Sprache.

## [0.9.0] - 2026-05-18 — Editor-UX und -Komfort: Listen-Indent, Zoom, Schriftart, Fokus-Modus und Markdown-Linter

Feature-Release, das im Alltag spürbare Verbesserungen am Schreib- und Leseerlebnis bündelt. Umgesetzt als Epic [3E-0003](Projektmanagement/Aufgaben/3E-0003-editor-ux-und-komfort.md) in den Tasks [4T-0016](Projektmanagement/Aufgaben/4T-0016-tab-indent-listen.md) bis [4T-0020](Projektmanagement/Aufgaben/4T-0020-linter-light.md), inklusive Abschluss-Sammeltask [4T-0027](Projektmanagement/Aufgaben/4T-0027-changelog-release-090.md). Der Hilfe-Dialog ist in diesem Release strukturell überarbeitet, weil die kumulierte Funktions- und Tastenkürzel-Liste über die Releases hinweg unübersichtlich geworden war.

### Neu

- **Tab und Umschalt+Tab in Markdown-Listen** ([4T-0016](Projektmanagement/Aufgaben/4T-0016-tab-indent-listen.md)): Rückt Listenelemente eine Ebene ein bzw. aus, in zwei Leerzeichen pro Stufe. Erkannt werden ungeordnete (`-`, `*`, `+`), geordnete (`1.`) und Task-Listen (`- [ ]` / `- [x]`); geordnete Listen werden beim Einrücken auf `1.` zurückgesetzt, ungeordnete und Task-Listen behalten ihren Marker. Mehrzeilen-Selektion wird in einer Transaktion ausgeführt (`Strg+Z` macht die Operation als Ganzes rückgängig). In Code-Blöcken und außerhalb von Listen bleibt das CodeMirror-Default-Tab-Verhalten erhalten.
- **Zoom pro Tab** ([4T-0017](Projektmanagement/Aufgaben/4T-0017-zoom-editor-render.md)): `Strg + +`, `Strg + -`, `Strg + 0` und `Strg + Mausrad` zoomen den Inhalt des aktiven Tabs in 10-%-Schritten zwischen 50 % und 300 %. Der Faktor wirkt nur auf Editor- und Render-Pane (UI bleibt unverändert) und wird pro Tab gehalten, sodass mehrere Tabs unterschiedliche Zooms zeigen können. Indikator rechts in der Statusbar bei Abweichung von 100 %, Klick darauf setzt zurück. Beim Tab-Transfer in ein anderes Fenster wandert der Zoom mit. Sitzungswiederherstellung startet bewusst bei 100 %.
- **Einstellungen-Dialog mit konfigurierbarer Schriftart und -größe** ([4T-0018](Projektmanagement/Aufgaben/4T-0018-schriftart-konfigurierbar.md)): Neuer modaler Dialog `Datei → Einstellungen` (auch `Strg + ,`) mit Sektion „Darstellung". Editor- und Render-Schriftart sowie -größe sind getrennt einstellbar. Schriftart als kombiniertes Auswahl- und Freitext-Feld mit kuratierten Windows-Vorschlägen (Editor monospace: Consolas, Cascadia Code, Cascadia Mono, JetBrains Mono, Fira Code, Source Code Pro, Courier New; Render proportional: Segoe UI, Calibri, Arial, Helvetica, Georgia, Times New Roman, Verdana). Schriftgröße 8 bis 32, Default 14 (Editor) / 15 (Render). Live-Vorschau im Dialog, OK / Anwenden / Abbrechen. Werte persistent und über Multi-Window-Broadcast in allen offenen Fenstern aktiv. Code-Blöcke im Render-Pane nutzen die Editor-Schriftart für konsistente Darstellung.
- **Fokus-Modus** ([4T-0019](Projektmanagement/Aufgaben/4T-0019-fokus-modus.md)): `Strg + Umschalt + F` oder `Ansicht → Fokus-Modus` blendet Tab-Leisten, Statusbar und Sidebar-Panels aus für ablenkungsfreies Schreiben. Editor- und Render-Pane bleiben sichtbar, die native Menüleiste ist über Alt erreichbar. Esc verlässt den Modus, sofern kein Overlay mit Vorrang offen ist (Regex-Hilfe, Suchbar, Modale, Kontextmenü). Persistent, wirkt pro Fenster.
- **Typewriter-Scroll** (4T-0019): `Ansicht → Typewriter-Scroll` hält die Cursor-Zeile im Editor vertikal zentriert, sobald der Cursor bewegt wird. Wirkt nur im Edit-Modus, nur im Editor-Pane. Persistent, global.
- **Markdown-Linter-Light** ([4T-0020](Projektmanagement/Aufgaben/4T-0020-linter-light.md)): Vier feste Regeln markieren typische Mängel im Editor als dezente Wellen-Unterstreichung — bare URLs (ohne Markdown-Link-Syntax), leere Link-Texte (`[](url)`), fehlende Alt-Texte (`![](pfad)`) und Wiki-Links, deren Ziel im Suchraum aus 0.8.0 nicht gefunden wird. Hover zeigt lokalisierte Erklärung. Code-Blöcke, Inline-Code, Markdown-Links und Autolinks sind korrekt ausgenommen. Regel 4 (Wiki-Link-Ziel) greift nur, wenn der Backlinks-Index der Pane aktiv ist (Backlinks-Panel mindestens einmal geöffnet).
- **Bearbeiten-Toggle im Ansicht-Menü** (4T-0019, Test-Feedback): `Ansicht → Bearbeiten` mit Häkchen und Accelerator `Strg + E`. Notwendig, weil der bisherige Toolbar-Button im Fokus-Modus ausgeblendet ist; Modus bleibt damit auch dort jederzeit erreichbar.
- **Hilfe-Dialog mit zwei Reitern und gruppierten Funktionen** ([4T-0027](Projektmanagement/Aufgaben/4T-0027-changelog-release-090.md)): Funktionen und Tastenkürzel sind in zwei Tabs getrennt; Funktionen gliedern sich in fünf Gruppen (Datei und Sitzung, Bearbeitung, Ansicht, Navigation, Allgemein). Beim Öffnen ist der Funktionen-Tab aktiv.

### Geändert

- **Editor- und Render-Pane nutzen CSS-Variablen für Schrift** (4T-0018): Neue `:root`-Variablen `--editor-font-family`, `--editor-font-size`, `--render-font-family`, `--render-font-size` ersetzen die vorher fix gesetzten Werte. UI-Elemente (Tabbar, Statusbar, Sidebar, Menü, Dialoge) bleiben auf `--font-ui` und reagieren nicht auf die Schriftart-Einstellung.
- **`Strg + E` ist jetzt Menü-Accelerator** (4T-0019): Der bisherige Renderer-only-Tastenkürzel-Handler entfällt; das Routing läuft über den neuen Menü-Eintrag „Bearbeiten". Funktionsverhalten unverändert.
- **CodeMirror-Tooltips theme-konform** (4T-0020): `.cm-tooltip` erhält explizit theme-konformen Hintergrund, Border und Schatten (vorher war der Default-Hintergrund im Dark-Theme zu hell und der Tooltip-Text schwer lesbar).

### Behoben

- (keine separaten Bug-Fixes in 0.9.0)

### i18n

- Insgesamt rund 65 neue Keys über die fünf unterstützten Sprachen (DE, EN, FR, ES, IT): Statusbar-Zoom-Indikator, Settings-Dialog-Inhalte und Buttons, Menü-Einträge für Bearbeiten / Fokus-Modus / Typewriter-Scroll / Einstellungen, Linter-Regel-Beschreibungen (Kurzform und Tooltip mit Platzhalter `{target}` für Regel 4), Hilfe-Dialog-Tabs (`help.tabFeatures`, `help.tabShortcuts`), Hilfe-Funktionsgruppen (`help.group.*`), neue Feature- und Shortcut-Einträge für die 0.9.0-Funktionen sowie ein neues Tastenlabel `help.key.mouseWheel`.

## [0.8.0] - 2026-05-18 — Strukturnavigation: Folding, Inhaltsverzeichnis und Backlinks

Großes Feature-Release rund um die Strukturnavigation langer Markdown-Dokumente und ihre Vernetzung untereinander. Umgesetzt als Epic [3E-0002](Projektmanagement/Aufgaben/3E-0002-strukturnavigation.md) in den Tasks [4T-0013](Projektmanagement/Aufgaben/4T-0013-code-folding-headings.md), [4T-0014](Projektmanagement/Aufgaben/4T-0014-outline-panel.md) und [4T-0015](Projektmanagement/Aufgaben/4T-0015-backlinks-panel.md), inklusive Abschluss-Sammeltask [4T-0026](Projektmanagement/Aufgaben/4T-0026-changelog-release-080.md).

### Neu

- **Heading- und Block-Folding mit Hierarchie-Spuren im Quellcode** ([4T-0013](Projektmanagement/Aufgaben/4T-0013-code-folding-headings.md)): Eigener Gutter am linken Rand des Quellcode-Pane mit einer 10-px-Spur pro tatsächlich vorkommender Heading-Ebene und Block-Verschachtelungstiefe. Auf der Start-Zeile sitzt ein klickbarer Pfeil (`⌄` offen, `›` zugeklappt); darunter zeigt eine senkrechte Linie die Reichweite der Region. Faltbar sind ATX- und Setext-Überschriften sowie mehrzeilige Listen, Blockquotes, Fenced-Code-Blöcke, HTML-Blöcke und Tabellen. Tastenkürzel `Strg+Umschalt+[` (Einklappen) und `Strg+Umschalt+]` (Entfalten) wirken am Cursor und funktionieren auch bei ausgeblendeter Spalte. Die Spurenanzahl wächst dynamisch mit der Datei mit; die Folding-Region selbst kommt aus dem CodeMirror-Markdown-Sprachpaket.
- **Statusbar-Button und Menüpunkt „Gliederung"** (4T-0013): pro Tab umschaltbar, persistent. Default ist eingeblendet.
- **Inhaltsverzeichnis-Sidebar pro Spalte** ([4T-0014](Projektmanagement/Aufgaben/4T-0014-outline-panel.md)): linke Sidebar mit klickbarem Heading-Baum, der die Heading-Stufen 1 bis 6 als Einrückung abbildet. Klick auf den Heading-Text setzt den Cursor in die zugehörige Zeile und entfaltet die Region falls nötig; im Render-Modus scrollt der Render-Pane zum Anker. Klick auf den Falt-Indikator links davon toggelt nur das Folding, ohne den Cursor zu bewegen. Die aktuell sichtbare Sektion wird optisch hervorgehoben — im Edit/Geteilt-Modus folgt sie der Cursor-Zeile, im Render-Modus dem obersten vollständig sichtbaren Heading. Toggle per Statusbar-Button „Inhalt", Menüpunkt `Ansicht → Inhaltsverzeichnis` oder `Strg+Umschalt+O`. Default versteckt; einmal eingeblendet bleibt der Status pro Spalte persistent.
- **Backlinks-Sidebar pro Spalte** ([4T-0015](Projektmanagement/Aufgaben/4T-0015-backlinks-panel.md)): zweite Sektion in der linken Sidebar, zeigt eingehende `[[Wiki-Links]]` und relative Markdown-Links auf die aktive Datei, gruppiert pro Quelldatei mit Zeile, optionalem Anker und Text-Snippet. Suchraum ist der Ordner der aktiven Datei plus zwei zusätzliche Unterordner-Ebenen; Watcher per `chokidar` hält den Index live, neue Links erscheinen innerhalb weniger Sekunden ohne Zutun. Klick auf einen Treffer öffnet die Quelldatei (oder aktiviert den existierenden Tab, wenn schon offen) und setzt den Cursor auf die Trefferzeile. Hard-Cap bei mehr als 2000 Markdown-Dateien oder 50 MB Gesamtgröße im Suchraum, mit lokalisiertem Hinweis. Toggle per Statusbar-Button „Backlinks", Menüpunkt `Ansicht → Backlinks` oder `Strg+Umschalt+B`. Default versteckt, Status pro Spalte persistent.
- **Hilfe-Dialog** ([4T-0026](Projektmanagement/Aufgaben/4T-0026-changelog-release-080.md)): vier neue Funktions-Einträge (Heading-/Block-Folding, Inhaltsverzeichnis, Backlinks, dokument-interne Anker-Links) und vier neue Tastenkürzel (Strg+Umschalt+`[`/`]`/`O`/`B`).

### Geändert

- **Ansicht-Menü neu sortiert** (4T-0014, 4T-0026): Im Block unter den View-Modi steht nun in dieser Reihenfolge Inhaltsverzeichnis, Backlinks, Gliederung, Zeilennummern, Zeilenumbruch. Statusbar-Toggles links der View-Modi folgen derselben Reihenfolge: Inhalt, Backlinks, Gliederung, Nummern, Umbruch.
- **Sidebar-Sichtbarkeit ist gemeinsame Logik** (4T-0014, 4T-0015): Sobald mindestens eine der beiden Sektionen (Inhaltsverzeichnis oder Backlinks) eingeblendet ist, erscheint die Sidebar inklusive Splitter. Sind beide aus, verschwindet die Spalte komplett und der Editor-/Render-Bereich nutzt die volle Spaltenbreite.

### Behoben

- **Anker-Links innerhalb eines Dokuments im Render-Pane** (4T-0014, Seiteneffekt der Einbindung von `markdown-it-anchor`): Links der Form `[Text](#abschnitt)` haben seit Release 0.1 nicht gescrollt, weil markdown-it ohne entsprechendes Plugin keine IDs auf `<h1>..<h6>` setzte. Mit der neuen Plugin-Einbindung bekommen Headings ab 0.8.0 GitHub-kompatible Slug-IDs, und Dokument-interne Anker-Links funktionieren erstmals erwartungsgemäß.

### i18n

- Insgesamt rund 35 neue Keys über die fünf unterstützten Sprachen (DE, EN, FR, ES, IT) — Outline- und Backlinks-Panel-Inhalte, Statusbar-Toggle-Labels, Empty-States, Suchpfad-Tooltips, Hilfe-Dialog-Texte.

## [0.7.1] - 2026-05-18 — Fenster-Position und -Größe beim Schließen des letzten Fensters

Bugfix-Release. Die seit 0.4.0 vorgesehene und in 0.6.0 dokumentierte Funktion „Fenster-Position und -Größe merken" hat seit dem Multi-Window-Umbau in 0.5.0 für den Sonderfall „letztes Fenster" nicht mehr funktioniert: SCG Markdown startete immer auf dem Hauptmonitor mit Default-Größe, unabhängig davon, wo das einzige offene Fenster zuletzt geschlossen wurde. Zusätzlich wurde während des Testens ein zweiter Bug aufgedeckt, der die wiederhergestellte Größe auf Multi-Monitor-Setups mit unterschiedlicher DPI-Skalierung um den Skalierungsfaktor verzerrt hat. Beide behoben als Task [4T-0025](Projektmanagement/Aufgaben/4T-0025-fenster-position-beim-letzten-fenster.md).

### Behoben

- **Fenster-Position und -Größe des letzten Fensters gehen nicht mehr verloren** ([4T-0025](Projektmanagement/Aufgaben/4T-0025-fenster-position-beim-letzten-fenster.md)): Das Schließen des letzten offenen Fensters überschrieb den persistierten Sitzungsstand mit einer leeren Liste, weil `persistAllWindows()` im `closed`-Handler über die bereits geleerte `windows`-Map iterierte. Beim nächsten Start hatte die App damit keine Bounds mehr und fiel auf die Default-Position (Hauptmonitor, 1200×800) zurück. Fix: die Bounds werden jetzt bereits im `close`-Handler persistiert, solange das Fenster noch in der Map steht und nicht destroyed ist. Der `closed`-Handler überschreibt nur noch dann, wenn nach dem Entfernen noch andere Fenster übrig sind. `before-quit` persistiert ebenfalls nur, wenn beim Quit noch Fenster offen sind. Multi-Window-Verhalten und Quit-via-Menü-Pfad bleiben unverändert.
- **Korrekte Fenstergröße bei Multi-Monitor mit unterschiedlicher DPI-Skalierung** (4T-0025): Im Test der ersten Fix-Iteration zeigte sich, dass die Position zwar korrekt wiederhergestellt wurde, die Größe aber um den DPI-Skalierungsfaktor des Primärmonitors verzerrt erschien (z.B. um Faktor 0,8 bei einem Primärmonitor auf 125% und einem Sekundärmonitor auf 100%). Ursache: ein bekannter Electron-Bug ([electron/electron #10862](https://github.com/electron/electron/issues/10862), [#16444](https://github.com/electron/electron/issues/16444), [#31999](https://github.com/electron/electron/issues/31999)). Werden `x, y, width, height` direkt im `BrowserWindow`-Konstruktor gesetzt oder beim ersten `setBounds()`-Aufruf vor dem Monitor-Wechsel angewendet, interpretiert Electron sie in DIPs des Primär- bzw. Quellmonitors. Beim Restore auf einen Monitor mit abweichender Skalierung erscheint die Größe entsprechend verzerrt. Fix: Fenster mit Default-Optionen erstellen (landet auf Primärmonitor) und danach `win.setBounds()` **zweimal** hintereinander mit den Ziel-Bounds aufrufen. Der erste Aufruf verschiebt das Fenster auf den Zielmonitor und triggert die DPI-Erkennung, der zweite setzt dann mit der korrekten Ziel-DPI. Verifiziert auf einem Setup mit Primärmonitor 125% und Sekundärmonitor 100%.

## [0.7.0] - 2026-05-17 — Tab in bestehendes Fenster verschieben oder kopieren

Punkt-Release mit einer Verbesserung an der Multi-Window-Bedienung: Tabs lassen sich per Rechtsklick nicht mehr nur in ein neues, sondern auch in ein bestehendes anderes Fenster verschieben oder kopieren. Damit Quell- und Zielfenster eindeutig benennbar bleiben, tragen alle Fenster bei mehr als einem offenen Fenster den Suffix `(Fenster N)` im Titel. Umgesetzt als Task [4T-0012](Projektmanagement/Aufgaben/4T-0012-tab-in-bestehendes-fenster.md).

### Neu

- **Tab in bestehendes Fenster verschieben oder kopieren** ([4T-0012](Projektmanagement/Aufgaben/4T-0012-tab-in-bestehendes-fenster.md)): Rechtsklick auf einen Tab bietet bei mehreren offenen Fenstern jetzt die Untermenüs „Verschieben in" und „Kopieren in" mit den Einträgen „Neues Fenster" und jeweils einem Eintrag pro anderem offenen Fenster (Label `Fenster N`, Tooltip mit Dateinamen des dortigen aktiven Tabs, bei mehreren Tabs zusätzlich `(+N weitere)`). Bei nur einem Fenster bleibt die heutige flache Bedienung mit „In neues Fenster verschieben/kopieren" erhalten. Verschieben übergibt den Tab inklusive ungespeichertem Buffer ans Zielfenster und schließt ihn im Quellfenster ohne weiteren Speichern-Dialog; Kopieren lässt den Quell-Tab unverändert.
- **Keine Duplikate beim Transfer** (4T-0012): Wenn die zu verschiebende Datei im Zielfenster bereits in einer beliebigen Pane geöffnet ist, wird dort der bestehende Tab aktiviert statt ein zweiter angelegt. Beim Verschieben wird der Quell-Tab dennoch geschlossen.
- **Fenstertitel mit `(Fenster N)`-Suffix im Mehr-Fenster-Fall** (4T-0012): Sobald mehr als ein Fenster offen ist, hängt jedes Fenster den Suffix `(Fenster N)` an seinen Titel (auch in der Windows-Taskleiste sichtbar). Die Nummerierung 1..N folgt der Erzeugungsreihenfolge, rückt beim Schließen lückenlos nach und entfällt komplett, sobald nur noch ein Fenster offen ist. Damit sind Quell- und Zielfenster im Tab-Kontextmenü und in der Windows-Taskleiste eindeutig benennbar.

### Geändert

- **Hilfe-Dialog** (4T-0012): Beschreibung der Multi-Window-Funktion in allen fünf Sprachen aktualisiert; erwähnt jetzt das Verschieben/Kopieren in bestehende Fenster und die Bedeutung des Titel-Suffixes.

### i18n

- **9 neue Keys** in allen fünf Sprachen (Deutsch, Englisch, Französisch, Spanisch, Italienisch): `window.title.suffix`, `tab.menu.moveToSubmenu`, `tab.menu.copyToSubmenu`, `tab.menu.targetNewWindow`, `tab.menu.targetWindowLabel`, `tab.menu.tooltipMoreTabsSuffix`, `statusbar.targetWindowGone`, `statusbar.targetFileMissing`. Plus aktualisierter Wert für `help.feature.multiWindow`.

### Hinweise zur Migration

- Keine Migration nötig. Sitzung, Recent Files, Sprache und Auto-Save-Toggle aus 0.6.0 werden unverändert übernommen.

## [0.6.0] - 2026-05-16 — Edit-Modus, Statusbar-Layout und SCG-Markdown-Branding

Das größte Update seit dem ersten Release: Der bisherige reine Reader bekommt einen vollwertigen Editor, eine native Menüleiste, eine Statusbar-Bedienung am unteren Rand und einen neuen Namen. Umgesetzt als Epic [3E-0001](Projektmanagement/Aufgaben/3E-0001-edit-modus-und-menue.md) mit 11 Tasks im neuen lokalen PM-System.

### Neu

- **Native Menüleiste mit Datei / Ansicht / Hilfe** ([4T-0001](Projektmanagement/Aufgaben/4T-0001-native-menueleiste.md)): Pro Fenster eine eigene Menüleiste, ALT-Mnemonics, Akzeleratoren rechts neben den Einträgen. Strg+N, Strg+O, Strg+S, Strg+Umschalt+S, Strg+1/2/3, F1. Multi-Window-Synchronisation für Toggle-Einträge.
- **CodeMirror-Editor mit Markdown-Syntax-Highlighting** ([4T-0003](Projektmanagement/Aufgaben/4T-0003-editor-codemirror.md)): CodeMirror 6 ersetzt die bisherige `<pre><code>`-Anzeige. Themes für Light und Dark (GitHub-Palette), Zeilennummern und Umbruch als CodeMirror-Compartments. Edit-Modus pro Tab über den Stift in der Statusbar (Strg+E); Klick im Render-Modus wechselt automatisch in Geteilt und aktiviert den Editor.
- **Speichern und Speichern unter** ([4T-0004](Projektmanagement/Aufgaben/4T-0004-dirty-state-speichern.md) Phase 1): Strg+S und Strg+Umschalt+S schreiben den Editor-Inhalt nach UTF-8/LF ohne BOM. Ungespeicherte Änderungen markiert ein `•` im Tab- und Fenstertitel. Schließen-Dialog mit Speichern / Verwerfen / Abbrechen pro Tab und beim Fenster-Schluss. Konflikt-Dialog bei externer Änderung mit Dirty-Buffer (Reload vs. eigene Version behalten). File-Watcher wird beim Eigen-Schreiben kurz stummgeschaltet, um Reload-Loops zu vermeiden.
- **Auto-Save** (4T-0004 Phase 2): Opt-in im Datei-Menü. Speichert 2 Sekunden nach der letzten Eingabe oder bei Fenster-Fokusverlust. Tabs ohne Pfad („Unbenannt") werden nicht automatisch gespeichert. 1-Sekunden-Statusbar-Hinweis „Gespeichert" rechts neben dem Edit-Toggle, Schreibfehler werden 3 Sekunden in Rot angezeigt.
- **Recent Files** ([4T-0005](Projektmanagement/Aufgaben/4T-0005-recent-files.md)): Submenü `Datei → Zuletzt` mit 10 Einträgen (vorher Toolbar-Dropdown). Dateiname als Label, voller Pfad als Tooltip, Disambiguator `(Ordner)` bei gleichnamigen Dateien. Klick öffnet die Datei als neuer Tab im aktiven Fenster (analog zu „Öffnen mit" im Explorer). Verwaiste Pfade werden beim Klick aus der Liste entfernt. Eintrag „Liste löschen" mit Bestätigungsdialog.
- **Datei → Neu** ([4T-0006](Projektmanagement/Aufgaben/4T-0006-neu-oeffnen-neues-fenster.md)): Strg+N öffnet einen leeren „Unbenannt N"-Tab im aktiven Fenster (View „Geteilt", Edit-Modus aktiv). Counter zählt pro Fenster hoch. Beim ersten Speichern öffnet sich Speichern unter.
- **Suchen und Ersetzen im Edit-Modus** ([4T-0007](Projektmanagement/Aufgaben/4T-0007-suchen-und-ersetzen.md)): Strg+H im Edit-Modus öffnet einen zweiten Eingabebereich „Ersetzen durch…" mit zwei Buttons (einzelner Treffer / alle Treffer). Backreferences `$1`, `$2`, … im Regex-Modus. „Alle ersetzen" als einzelne CodeMirror-Transaktion, sodass Strg+Z die Aktion als Ganzes rückgängig macht.
- **Stabile Source-Suche** (4T-0007): Die Suche im Quellcode-Pane nutzt jetzt CodeMirror-Decorations via StateField; Treffer-Highlights überleben CM-Re-Renders. Vorher flackerten sie kurz, weil die `<mark>`-DOM-Manipulation vom CM-Editor überschrieben wurde.

### Geändert

- **Statusbar statt Toolbar** ([4T-0002](Projektmanagement/Aufgaben/4T-0002-statusbar-layout.md)): Die Toolbar oben ist komplett entfernt. Quick-Toggles (Nummern, Umbruch, Quellcode, Geteilt, Gerendert) sitzen jetzt in einer Statusbar am unteren Rand. Rechts in der Statusbar: Edit-Toggle (Stift) und Sprach-Selektor. Die Suchleiste blendet sich weiter über die Statusbar ein, mit zusätzlicher Replace-Zeile im Edit-Modus.
- **Sitzungswiederherstellung als Menü-Toggle** ([4T-0008](Projektmanagement/Aufgaben/4T-0008-sitzungswiederherstellung-menue.md)): Die Toolbar-Checkbox „Sitzung wiederherstellen" wandert in das Hilfe-Menü als Toggle-Eintrag mit Häkchen. Multi-Window-synchron via `applyMenuToAllWindows` bei jedem `settings:set` mit Key `restoreSession`.
- **Rebranding auf „SCG Markdown"** ([4T-0011](Projektmanagement/Aufgaben/4T-0011-rebranding-scg-markdown.md)): App-Name, `productName`, `appId`, NSIS-Display-Strings, Fenster-Titel, Über-Dialog, Empty-State und Dokumentation überall einheitlich auf „SCG Markdown" / `scg-markdown` / `net.stumm.scg-markdown`. Settings-Migration aus `%APPDATA%/Markdown Viewer/config.json` ins neue `%APPDATA%/SCG Markdown/config.json` läuft einmalig beim ersten Start unter neuem Namen. EXE-Dateinamen sind jetzt `SCG Markdown-<version>-Setup.exe` und `-Portable.exe`. Registry-ProgIDs (`MarkdownViewer.md`) bleiben absichtlich gleich, damit Updates aus 0.5.x-Installationen die Datei-Assoziation sauber überschreiben statt eine zweite ProgID anzulegen.
- **Datei → Neu, Öffnen und Recent-Klick** öffnen jetzt einheitlich einen Tab im aktiven Fenster. Die ursprüngliche Konzept-Idee „Neu/Öffnen erzeugen ein neues Fenster" wurde während der Klärung mit dem Nutzer verworfen, weil sie zu Buffer-Verlust und inkonsistentem Verhalten zu „Öffnen mit" im Explorer geführt hätte.
- **Hilfe-Dialog erweitert** ([4T-0009](Projektmanagement/Aufgaben/4T-0009-hilfe-dialog-erweitern.md)): 6 neue Features (Datei-Neu, Edit-Modus, Speichern, Auto-Save, Suchen-Ersetzen, Menüleiste) und 7 neue Tastenkürzel (Strg+N, Strg+S, Strg+Umschalt+S, Strg+E, Strg+1/2/3, Strg+H, Alt). F1 öffnet jetzt das Hilfe-Modal statt den Über-Dialog. Veraltete Wording-Stellen („in der Toolbar") korrigiert auf den neuen Stand.

### Build & Tooling

- **`releases/`-Ordner als Versions-Archiv** (vorher `dist/`): `dist/` ist reiner Build-Output von electron-builder und enthält nur das aktuelle Build samt Zwischenprodukten (`win-unpacked/`, `builder-debug.yml`, `latest.yml`, aktuelle `*.blockmap`). Die fertigen EXEs werden per `postbuild`-Hook (`scripts/archive-build.js`) automatisch nach `releases/` verschoben, wo sich das Versions-Archiv über die Releases hinweg sammelt. Beide Ordner sind weiter gitignored. Ältere EXEs (v0.1.0 bis v0.5.1) wurden migriert.
- **Alte `.blockmap`-Dateien werden automatisch aufgeräumt**: Das `postbuild`-Script entfernt `.blockmap`-Dateien aus früheren Builds, die nicht mehr zur aktuellen Version gehören.
- **esbuild als Renderer-Bundler** (4T-0003): CodeMirror 6 verlangt einen Bundler, weil bare-imports (`@codemirror/state` etc.) nicht direkt im Renderer auflösbar sind. `scripts/build-renderer.js` bundelt `renderer.js` plus alle Imports zu `renderer.bundle.js`. npm-Scripts `start`, `dev`, `build` und die Build-Targets rufen den Bundler vorab.
- **Lokales PM-System**: Epics und Tasks für 0.6.0 wurden in `Projektmanagement/Aufgaben/` als Markdown-Dateien geführt statt als GitHub-Issues. Begründung und Konventionen in der projekt-lokalen `CLAUDE.md` und `Projektmanagement/README.md`. Die bisherigen GitHub-Issues #1 und #2 bleiben als historische Spur erhalten.

### i18n

- **Insgesamt rund 90 neue i18n-Keys** über alle fünf Sprachen (Deutsch, Englisch, Französisch, Spanisch, Italienisch): Menüleisten-Beschriftungen (`menu.*`), Save-Dialog-Texte (`save.*`), Konflikt-Dialog, Recent-Files-Dialoge (`recent.missingFile*`), Hilfe-Modal-Erweiterungen, Replace-Block in der Suchleiste, Statusbar-Hinweise.
- **Tote Keys entfernt**: `toolbar.recent`, `settings.restoreSession`, `recent.empty`, `about.button`, `help.button`, `help.shortcut.about`.
- **Wert-Korrekturen** für `help.feature.restoreSession` und `help.feature.languages`: Wording angepasst auf den neuen Menü- bzw. Statusbar-Stand.

### Hinweise zur Migration

- **Sitzungswiederherstellung, Recent Files, Sprache und Auto-Save-Toggle** aus einer bestehenden 0.5.x-Installation werden beim ersten Start unter dem neuen Namen automatisch übernommen (Settings-Migration in `migrateSettingsFromPreviousName`). Falls die Migration scheitert (z.B. korrupte JSON-Datei), startet die App mit Default-Settings, der alte Pfad bleibt unangetastet.
- **Datei-Assoziation** aus einer 0.5.x-Setup-Installation muss beim Update der Setup-EXE nicht neu konfiguriert werden, weil die Registry-ProgID gleich bleibt.
- **Ungespeicherte „Unbenannt"-Tabs** werden nicht in der Sitzung persistiert. Beim Quit greift der Schließen-Dialog (Speichern / Verwerfen / Abbrechen).
- **GitHub-Repo umbenannt** von `SCG-Markdown-Viewer` zu `SCG-Markdown`. Bestehende Klone und Issue-Links funktionieren über GitHub-Redirects weiter; eine Neusetzung der Origin-URL über `git remote set-url` ist optional, aber sauberer.

## [0.5.1] - 2026-05-14

### Behoben

- **Datei-Argument beim kalten Start ging verloren** (Issue [#2](https://github.com/MatthiasSCG/SCG-Markdown-Viewer/issues/2)): Ein Doppelklick auf eine `.md`-Datei oder „Öffnen mit" im Explorer öffnete bei geschlossener App zwar das Fenster, zeigte aber die angeklickte Datei nicht an. Ursache: der `file:openExternal`-Listener wurde im Renderer erst in `init()` nach mehreren `await`-Punkten registriert. Wenn der Main-Prozess die Nachricht direkt nach `did-finish-load` schickte, kam sie an, bevor der Listener da war, und Electron-IPC puffert nicht. Bei laufender App (warmer Start) trat das Problem nicht auf, weil `app.on('second-instance', ...)` zu einem Zeitpunkt feuert, an dem der Listener längst registriert ist. Fix: Listener jetzt synchron beim Modul-Laden registrieren, gepufferte Dateien nach Abschluss von `init()` öffnen, analog zum bestehenden `window:initialState`-Pattern aus 0.5.0.

## [0.5.0] - 2026-05-14

### Neu

- **Mehrere Fenster gleichzeitig** (Issue [#1](https://github.com/MatthiasSCG/SCG-Markdown-Viewer/issues/1)): Ein Tab lässt sich per Rechtsklick aus dem laufenden Fenster in ein **neues Fenster auslagern** und auf einen anderen Monitor verschieben. Zwei neue Einträge im Tab-Kontextmenü:
  - **„In neues Fenster verschieben"**: Tab schließt im Ursprung, öffnet sich im neuen Fenster.
  - **„In neues Fenster kopieren"**: Tab bleibt im Ursprung, eine Kopie öffnet sich im neuen Fenster. Beide Tabs sind danach unabhängig, werden aber durch den Datei-Watcher synchron neu geladen, wenn die Datei auf der Platte geändert wird.
  Das neue Fenster startet immer als Single-Pane mit dem ausgelagerten Tab und positioniert sich leicht versetzt (+30 px x/y) zum Ursprungsfenster, damit es nicht direkt überdeckt.
- **Sitzungs-Wiederherstellung für alle Fenster**: Bei aktivierter „Sitzung wiederherstellen"-Option werden beim nächsten Start nicht mehr nur die Tabs des einen Fensters, sondern alle beim Beenden offenen Fenster wieder geöffnet — jeweils an ihrer alten Position, mit ihren Tabs, View-Modi und Zeilennummer-/Umbruch-Einstellungen.
- **Single-Instance-Lock bleibt erhalten**: Neue Fenster entstehen ausschließlich aus der App heraus über das Kontextmenü, nicht durch externes Starten der EXE. Eine zweite Instanz mit Datei-Argument (z.B. „Öffnen mit" im Explorer) reicht ihre Datei jetzt an das **zuletzt fokussierte** Fenster der laufenden App weiter.
- **i18n**: drei neue Keys (`tab.moveToNewWindow`, `tab.copyToNewWindow`, `help.feature.multiWindow`) in allen 5 Sprachen.

### Geändert

- **Settings-Struktur**: Der alte Schlüssel `panes` (Tabs eines einzelnen Fensters) wird durch `windows` ersetzt (Liste pro Fenster: Bounds, Maximiert-Status und Panes). Migration aus dem alten Format läuft beim ersten Start automatisch — der alte `panes`-Stand wird zum ersten Fenster, die alten `windowBounds`/`windowMaximized` werden dessen Bounds. Danach gilt nur noch das neue Format.
- **File-Watcher mit Refcounting**: Wenn dieselbe Datei in mehreren Fenstern offen ist, hält der Watcher sie so lange aktiv, bis sie im letzten Fenster geschlossen wird. Vorher hätte das Schließen in einem Fenster die anderen Fenster vom Auto-Reload abgeschnitten.
- **Theme-Broadcast** an alle Fenster, damit ein Wechsel des Windows-System-Themes in allen offenen Fenstern gleichzeitig ankommt.
- **Persistenz-Logik in den Main-Prozess verlagert**: Der Renderer meldet seinen Pane-Stand per IPC; der Main-Prozess führt alle Fenster-Stände zusammen und schreibt sie atomar in die Settings. So überschreiben sich Fenster nicht gegenseitig.
- **Hilfe-Dialog**: Neuer Funktions-Eintrag „Tabs in ein neues Fenster auslagern" zwischen „Tabs/Spalten" und „Ansichten" eingefügt.
- **Lizenz**: Repository auf [MIT-Lizenz](./LICENSE) umgestellt (vorher „All rights reserved" mit `UNLICENSED`-Marker in `package.json`). `LICENSE`-Datei im Repo-Root ergänzt, `package.json` (`license: "MIT"`) und der Lizenz-Abschnitt im README entsprechend angepasst. Der Code darf damit modifiziert, verbreitet und kommerziell weiterverwendet werden, sofern die ursprüngliche Lizenz- und Copyright-Notice erhalten bleibt. Das App-Icon (Markdown Mark) bleibt unverändert unter CC0 1.0.

### Hinweis zur Wiederherstellung

- Beim **Schließen eines einzelnen Fensters** in einer Multi-Fenster-Sitzung verschwindet dieses Fenster aus dem persistierten Sitzungsstand. Beim nächsten Start kommen nur die Fenster wieder, die beim **Quit** der App noch offen waren. Wenn alle Fenster bis auf eines geschlossen werden und dann die App beendet wird, kommt beim Neustart auch nur ein Fenster.

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
