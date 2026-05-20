# 4T-0054 — Wiki-Link-Parser für Heading- und Block-Anker (inkl. Linter)

**Status**: Offen
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

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
