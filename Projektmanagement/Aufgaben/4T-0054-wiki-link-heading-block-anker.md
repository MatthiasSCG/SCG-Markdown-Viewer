# 4T-0054 — Wiki-Link-Parser für Heading- und Block-Anker (inkl. Linter)

**Status**: Erledigt — 2026-05-20, Test bestanden
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0

## Warum

Die aktuelle Wiki-Link-Implementierung in [src/main/preload.js](../../src/main/preload.js) kennt nur `[[Datei]]` und `[[Datei|Label]]`. Heading- und Block-Anker werden nicht unterstützt:

- `[[Datei#Heading]]` führt zu einem Pfad `Datei#Heading.md` (Anker wird Teil des Datei-Pfads).
- `[[Datei#^block-id]]` ist gar nicht definiert.
- Block-IDs (`^block-id` am Zeilenende) existieren als Markdown-Konstrukt im Repo nicht.

Diese Anker sind in Obsidian und Logseq Standard. Sie erlauben präzise Sprungziele in langen Dokumenten („siehe [[Konzept#Datenmodell]]") und auf einzelne Absätze (Block-Referenz `[[Notiz#^abc123]]`). Ohne sie bleibt der Wiki-Link-Mechanismus auf Datei-Ebene grob.

Linter-Erweiterung kommt in diesem Task mit dazu, weil sie direkt vom Parser-Stand abhängt: Sobald der Parser Anker erkennt, muss der Linter sie gegen die Ziel-Datei prüfen (Heading-Slug existiert? Block-ID existiert?).

## Lösungsansatz

### Wiki-Link-Plugin umbauen

In [src/main/preload.js](../../src/main/preload.js), `wikiLinksPlugin`:

- Parse-Logik trennt Pfad, optionalen Heading-Anker (`#Text`) und optionalen Block-Anker (`#^id`).
- `hasExtension`-Check nur auf den Pfad-Teil, nicht auf den Anker.
- Output-HTML: `<a href="Datei.md#heading-slug" class="wikilink">Label</a>` bzw. `<a href="Datei.md#block-id" class="wikilink">Label</a>`.
- Heading-Slug: dieselbe `githubLikeSlug`-Funktion wie für Heading-IDs verwenden.
- Block-Anker (`#^id`) wird direkt als HTML-`id` verwendet (Slug-Validierung: `^[a-zA-Z0-9_-]+$`).

### Block-ID-Syntax `^id` am Zeilenende

Neue Inline-/Block-Erkennung in `md`:

- Am Ende einer Zeile (Absatz, Listenelement, Blockquote, Tabellenzeile) erkennt eine Regex `\s+\^([a-zA-Z0-9_-]+)\s*$` einen Block-Anker.
- Renderer hängt ein `id="<block-id>"`-Attribut an das umschließende HTML-Element.
- `^id` selbst wird aus dem sichtbaren Output entfernt.
- Implementation am sinnvollsten als markdown-it-Rule (postprocess oder Inline-Rule plus Token-Manipulation).

### Renderer-Klick-Verhalten

In [src/renderer/renderer.js](../../src/renderer/renderer.js), `handleRenderedClick`:

- Wiki-Link mit Anker → öffne Ziel-Datei und scrolle zum Anker-Element nach dem ersten Render.
- Im selben Dokument (`[[#Heading]]` oder reines `#anker`): scrolle direkt zum Element, ohne neuen Tab.

### Linter-Erweiterung

In `runLint` / `lintIsInLinkContext`-Pfad:

- Wiki-Link-Linter aus 4T-0020 ruft `api.resolveWikiTargets` mit allen Basenames. Ergänzung: zusätzlich werden Anker-Annotationen mitgeschickt.
- Backend ([src/main/backlinks.js](../../src/main/backlinks.js)): `existingWikiTargets` prüft zusätzlich, ob der Heading-Slug bzw. Block-Anker im Ziel existiert. Setzt voraus, dass `parseFile` zusätzlich Heading-Slugs und Block-IDs pro Datei extrahiert.
- Bei „Datei existiert, Anker nicht": neuer Linter-Marker `brokenWikiAnchor` (eigener i18n-Key, sonst gleiche Decoration-Stilfamilie).

### Backlinks-Index erweitern

`parseFile` liefert jetzt zusätzlich:

- `headings`: Liste von Slug-Strings pro Datei (per `githubLikeSlug` aus dem Heading-Text).
- `blockIds`: Liste von Block-IDs pro Datei (per `^id`-Regex).

Aliases-Auswertung aus 4T-0050 bleibt unverändert.

### Sonderfälle

- Wiki-Link mit beiden Trennzeichen (`[[Datei#Heading|Label]]`): Label nach `|`, Anker nach `#`. Parser muss die Reihenfolge korrekt erkennen.
- Block-Anker in einer Tabellenzeile: Zelle vs. ganze Zeile als Sprungziel. Wir hängen `id` an die `<tr>`.
- Mehrere Block-Anker pro Zeile: nur der erste zählt.
- Block-Anker in Code-Blöcken: ignoriert (Markdown-Konvention).

### Akzeptanz-Smoke-Tests

1. `[[Datei#Heading]]` öffnet Ziel-Datei und scrollt zum Heading.
2. `[[Datei#^abc]]` öffnet Ziel-Datei und scrollt zum Block mit `^abc` am Zeilenende.
3. `[[#Heading]]` im selben Dokument scrollt direkt zum Heading.
4. Block-Anker `^abc` am Ende eines Absatzes/Listen-Items/Blockquote: `id="abc"` am umschließenden Element, `^abc` nicht im sichtbaren Text.
5. Linter markiert `[[Datei#NichtExistierendesHeading]]` mit dezenter Wellen-Unterstreichung.
6. Hover-Tooltip zeigt lokalisierte Erklärung.
7. Bestehende `[[Datei]]`- und `[[Datei|Label]]`-Wiki-Links funktionieren unverändert.

## Akzeptanzkriterien

- Wiki-Link-Parser unterstützt `[[Datei#Heading]]`, `[[Datei#^id]]`, `[[Datei#Heading|Label]]`, `[[#Heading]]` (im Doc), `[[#^id]]` (im Doc).
- Block-ID-Syntax `^id` am Zeilenende setzt `id`-Attribut am umschließenden Element; `^id` ist im Render-Output nicht mehr sichtbar.
- Klick auf Wiki-Link mit Anker öffnet die Datei und scrollt zum Anker.
- Linter markiert Wiki-Links mit nicht existierendem Heading-/Block-Anker; neuer Regel-Eintrag `brokenWikiAnchor`.
- Backlinks-Index pflegt `headings`- und `blockIds`-Listen pro Datei.
- Sonderfälle (Anker plus Label, mehrere Block-Anker, Code-Block-Inhalt) verhalten sich wie spezifiziert.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `wikiLinksPlugin` (Anker-Parsing), neue Block-ID-Rule.
- [src/main/backlinks.js](../../src/main/backlinks.js) — `parseFile` um `headings` und `blockIds` erweitert, `existingWikiTargets` prüft auch Anker.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Klick-Handler scrollt zum Anker, Linter um `brokenWikiAnchor`-Regel erweitert.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Decoration für `brokenWikiAnchor` (kann die Stilfamilie von `brokenWikiLink` wiederverwenden).
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Linter-Strings (`linter.brokenWikiAnchor.short`, `linter.brokenWikiAnchor.tooltip`).

## Lösung

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - `wikiLinksPlugin` umgebaut: Anker-Teil hinter `#` wird vom Pfad getrennt. Block-Anker (Prefix `^`) bekommt eine eigene Slug-Validierung (`\p{L}\p{N}_-` inkl. Umlaute); Heading-Anker läuft durch `githubLikeSlug`. Reine Anker im selben Dokument (`[[#Heading]]`, `[[#^id]]`) werden zu reinen `href="#..."`-Links. Sonderfall: weder Pfad noch Anker → kein gültiger Wiki-Link.
  - Neue core rule `blockAnchorsPlugin`: erkennt `\s+\^([\p{L}\p{N}_-]+)\s*$` am Zeilenende eines Inline-Tokens, sucht das vorangegangene Block-Open-Token (paragraph_open, list_item_open, blockquote_open, td_open etc.) und setzt dort `id="<block-id>"`. Das `^id`-Snippet wird aus dem sichtbaren Text-Token entfernt.
  - Beide Plugins werden auch für `mdPortable` (HTML-Export) registriert.
- **[src/main/backlinks.js](../../src/main/backlinks.js)**:
  - `parseFile` liefert jetzt `{ hits, aliases, headings, blockIds }`. Fenced-Code-Blöcke werden über einen `inFence`-Flag übersprungen, damit Markdown-Beispiele im Code nicht als echte Headings/Block-IDs zählen.
  - Wiki-Link-Erkennung im Body: `[[#Anker]]` wird nicht mehr als ausgehender Backlink-Treffer aufgenommen (reiner Anker ist kein File-Bezug).
  - Neue Map `anchorsPerFile: Map<absPath, { headings: Set, blockIds: Set }>` im Index; `ensureIndex` und `onWatcherChange` pflegen sie.
  - `existingWikiTargets`-Signatur umgestellt: nimmt jetzt `targets`-Array von vollständigen Wiki-Link-Targets (mit Anker) entgegen und liefert `{ existing, brokenAnchor }`. Anker-Prüfung: Heading-Slug via `githubLikeSlug`-Lookup in der Heading-Set; Block-ID direkt in der BlockId-Set.
  - Dupliziertes `githubLikeSlug` lokal (Main-Modul kann nicht aus preload importieren).
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**:
  - `LINT_RULES` um `brokenWikiAnchor` erweitert (selbe CSS-Klasse wie `brokenWikiLink`, eigener Regel-Identifier für den Tooltip).
  - `runLint` schickt vollständige Targets (mit Anker) an `resolveWikiTargets`. Im Ergebnis wird zwischen `existing`, `brokenAnchor` und „weder noch" (= broken Datei) unterschieden.
  - `buildLintTooltipDom` ersetzt den `{target}`-Platzhalter auch für `brokenWikiAnchor`.
  - `handleRenderedClick` trennt Pfad und Anker. Bei `[[#...]]`-Links scrollt es direkt im aktiven Pane via neuer Helper-Funktion `scrollToAnchorInPane`. Bei `[[Datei#...]]` öffnet es die Datei und scrollt mit `setTimeout(100ms)` zum Anker.
  - `scrollToAnchorInPane` und `scrollToAnchorAfterOpen` nutzen `CSS.escape` für robuste Selektor-Erzeugung (Umlaute und andere Sonderzeichen im Slug).
- **i18n (DE/EN/FR/ES/IT)**: zwei neue Keys je Sprache (`linter.brokenWikiAnchor.short`, `linter.brokenWikiAnchor.tooltip`).
- **[package.json](../../package.json)**: Version-Bump 0.16.0 → 0.17.0.

### Implementierungsdetails

- **Block-Anker-Position bei Listen**: das Plugin setzt den Anker am direkt vorangegangenen Block-Open-Token (das wäre bei Listen-Items typischerweise das `paragraph_open` innerhalb des `<li>`). Damit landet das `id`-Attribut auf dem `<p>`, was beim Scroll-Verhalten identisch zur `<li>`-Variante wirkt.
- **Heading-Slug-Konsistenz**: derselbe `githubLikeSlug` wird in drei Stellen verwendet (preload Wiki-Link-Plugin, preload markdown-it-anchor für `<h*>`-IDs, backlinks für Index-Lookup). Mit dieser Konsistenz funktioniert der Click-to-Scroll-Pfad zuverlässig.
- **Fenced-Code-Tracking in `parseFile`**: einfacher Linien-Modus mit Marker-Typ (`` ` `` vs. `~`), Verschachtelung wird nicht unterstützt (markdown-it-Pattern). Pragmatisch ausreichend; pathologische Fälle (verschachtelte Fenced-Codes mit unterschiedlichen Marker-Längen) bleiben theoretisch möglich, sind im Praxis-Workflow aber selten.
- **Race-Vermeidung beim Scroll**: das `setTimeout(100ms)` nach `openInPane` ist ein pragmatischer Trade-off. Bei sehr großen Dokumenten könnte das Rendern länger dauern; bei zu schnellem Klick ist das Element noch nicht im DOM. Falls das im echten Workflow als Problem auftaucht, kann ein `MutationObserver` oder ein Render-Complete-Event eingeführt werden.
- **Reine Anker `[[#x]]` werden nicht als Backlinks indexiert**: das ist eine bewusste Entscheidung — ein interner Anker ist kein Verweis auf eine andere Datei und sollte nicht in der Backlinks-Sidebar erscheinen.

### Smoke-Test (2026-05-20)

Zehn Test-Punkte vom Nutzer verifiziert: Heading-Anker (auch mit Umlaut), Block-Anker (`^id`-Marker im Render-Pane unsichtbar), Anker plus Label, Anker im selben Dokument, Linter-Unterscheidung zwischen broken-anchor und broken-link, gültige Anker ohne Marker, bestehende Wiki-Link- und Aliases-Funktionalität, Sprachwechsel. Alle Punkte bestanden.

Zusätzlich behandelt: lokale `releases/SCG Markdown-0.16.0-*` wurden vor dem Versions-Bump versehentlich überschrieben und per `gh release download v0.16.0` aus dem GitHub-Asset wiederhergestellt (analog zum 4T-0049-Vorfall mit 0.15.0).
