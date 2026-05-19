# 3E-0006 — SCG Table: Mehrzeilige Block-Zellen via Fenced-Code-Block

**Status**: Offen
**Zielversion**: 0.12.0
**Vorgängerversion**: 0.11.0

## Ziel

Markdown-Pipe-Tabellen sind zeilenbasiert. Eine Tabellenzeile entspricht zwingend einer Quellcodezeile, mehrzeilige Zelleninhalte mit geschachtelten Listen, Nummerierungen und Absätzen sind in der Standard-Syntax nicht abbildbar. Für Doku- und Arbeitstabellen mit komplexen Strukturen ist das eine harte Begrenzung.

Stufe 1 dieses Epics führt eine MediaWiki-ähnliche Tabellen-Syntax ein, eingebettet als Fenced-Code-Block mit Sprach-Tag `scg-table`. Inhalt zwischen `{|` und `|}` wird vom Viewer als HTML-Tabelle gerendert. In fremden Markdown-Renderern (GitHub-Vorschau, VS Code, andere Editoren) bleibt der Block als lesbarer Code-Block sichtbar — Graceful Degradation statt zerschossener Quelltext.

Stufe 2 und Stufe 3 sind als Folge-Epics geplant und nicht Bestandteil von 3E-0006.

## Warum

- **Realer Bedarf:** Der Nutzer arbeitet intensiv mit Tabellen, die geschachtelte Listen und Nummerierungen enthalten. Pipe-Tabellen reichen dafür nicht.
- **Pandoc Grid Tables sind keine echte Alternative.** ASCII-Rahmen-Wartung beim Editieren ist aufwendig, geschachtelte Listen konkurrieren visuell mit den Rahmen, die Tabellen sind „write once, edit painful".
- **MediaWiki-Syntax ist linear und ohne Rahmenwartung editierbar.** `{| … |- … |}` mit Zellen auf jeweils eigenen Quellzeilen, beliebige Folgezeilen gehören weiter zur selben Zelle bis zum nächsten `|-`/`|`/`!`/`|}`. Das passt zum Use-Case, ist aber nicht Markdown-Standard.
- **Eigener Top-Level-Dialekt würde Portabilität zerstören.** Eine direkt eingestreute `{| … |}`-Syntax wäre in anderen Markdown-Renderern syntaktisch korrumpiert. Die Lösung „Fenced-Code-Block mit Sprach-Tag" ist CommonMark-konform, in fremden Renderern als Code-Block lesbar, und folgt dem etablierten Muster von Mermaid (` ```mermaid `), PlantUML, KaTeX-Math-Blöcken.

## Umfang und Abgrenzung

**Im Umfang (Stufe 1):**

- Fenced-Code-Block mit Sprach-Tag `scg-table` als Container für die Tabelle
- Tabellen-Eröffnung `{|` und -Ende `|}` (jeweils auf eigener Zeile)
- Zeilen-Trenner `|-` (am Zeilenanfang)
- Datenzellen mit `|` (eine Zelle pro Quellzeile-Start, Folgeszeilen ohne führendes Sonderzeichen gehören zur laufenden Zelle)
- Header-Zellen mit `!`
- Tabellen-Caption mit `|+`
- Zelleninhalt: rekursives Markdown-Parsing über `md.render()`. Damit funktionieren Listen (auch geschachtelt), nummerierte Listen, Absätze, Inline-Formatierung, Bilder, Wiki-Links, Code-Blocks innerhalb der Zelle.
- CSS-Klasse `scg-table` auf der erzeugten `<table>`
- Vier-Backtick-Konvention für eingeschachtelte Code-Blocks: äußere Fence vier Backticks, innerer Code-Block reguläre drei. CommonMark-konform.
- Hilfe-Dialog-Eintrag mit Syntax-Beispiel in allen fünf Sprachen
- CHANGELOG, Release-Notes, Version-Bump 0.11.0 → 0.12.0, Tag und GitHub-Release

**Bewusst nicht im Umfang (Stufe 1):**

- **Shorthand `||` und `!!`** für mehrere Zellen auf einer Quellzeile (MediaWiki-Standard, vom Nutzer am 2026-05-19 bewusst weggelassen — klarere Semantik beim Haupt-Use-Case mehrzeilige Zellen).
- **Tabellen-Level-Attribute** wie `{| class="wikitable" border="1"`. Was nach `{|` auf der Eröffnungszeile steht, wird ignoriert.
- **Zell-Level-Attribute** wie `| style="text-align: center" | Inhalt`. In Stufe 1 nicht unterstützt.
- **`colspan` und `rowspan`** — Stufe 2.
- **Spaltenausrichtung** (links / zentriert / rechts) — Stufe 2.
- **Verschachtelte `scg-table` in einer Zelle** — Stufe 2 oder 3 (rekursives scg-table-Rendering wird in Stufe 1 nicht implementiert; rekursives Markdown in Zellen funktioniert, aber kein verschachteltes scg-table).
- **Konverter „scg-table → HTML-Tabelle inline"** für maximale Portabilität — Stufe 3, eigenes Folge-Epic.

## Untergeordnete Tasks

- [ ] [4T-0034 — Parser und Renderer für scg-table (Stufe 1: Basis-Tabelle)](4T-0034-scg-table-parser.md)
- [ ] [4T-0036 — Hilfe-Tab „SCG Table" mit ausführlicher Doku](4T-0036-scg-table-hilfe-tab.md)
- [ ] [4T-0035 — Kurzeintrag im Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.12.0](4T-0035-changelog-release-0120.md)

## Architekturentscheidungen

- **Fenced-Code-Block mit Sprach-Tag `scg-table` als Container.** Begründung: CommonMark-konform, graceful degradation in fremden Renderern (Code-Block sichtbar statt zerschossener Tabellen-Quelltext), keine eigene Block-Tokenisierung im Markdown-Parser nötig, folgt dem etablierten Muster von Mermaid und KaTeX-Block.
- **Integration über `md.renderer.rules.fence`-Override.** Bei `lang === 'scg-table'` ruft der Override den eigenen scg-table-Renderer auf, sonst delegiert er an den originalen Renderer (Code-Highlighting via `highlight.js` bleibt unangetastet). Kanonische markdown-it-Methode.
- **Rekursives Markdown in Zellen über `md.render(content)`.** Damit funktionieren Listen, Inline-Formatierung, Wiki-Links, Code-Blocks etc. innerhalb der Zelle genau wie im normalen Markdown-Fluss. Verschachtelte `scg-table` werden in Stufe 1 nicht erkannt (rekursiver Aufruf des scg-table-Renderers wird nicht implementiert).
- **Vier-Backtick-Außenfence für eingeschachtelte Code-Blöcke.** Wenn eine Zelle einen Code-Block enthält, verwendet die äußere `scg-table`-Fence vier oder mehr Backticks, der innere Code-Block die regulären drei. CommonMark-konform, identische Konvention wie an anderen Stellen im Ökosystem.
- **CSS-Klasse `scg-table` auf der erzeugten `<table>`.** Erlaubt späteres CSS-Styling, ohne dass Hooks angefasst werden müssen. Stufe 1 erbt den Look der Pipe-Tabellen via gemeinsame `table`-Regeln; eine minimale Ergänzung für `.scg-table caption` (Padding, Kursivschrift) kommt hinzu.
- **Tabellen-Level-Attribute werden stillschweigend ignoriert.** Was nach `{|` auf der Eröffnungszeile steht, wird verworfen. Erst Stufe 2 könnte selektiv Attribute honorieren.
- **Stufenkonzept als Folge-Epics**:
  - Stufe 2 (`colspan`/`rowspan`, Zellausrichtung, Zell-Level-Attribute) → eigenes Folge-Epic 3E-0007, voraussichtlich Zielversion 0.13.0.
  - Stufe 3 (Konverter `scg-table` → HTML-Tabelle für Portabilität) → eigenes Folge-Epic 3E-0008, eigenständig planbar.
  - Diese Aufteilung wahrt die Projekt-Konvention „1 Epic = 1 Versionssprung".

## Reihenfolge der Umsetzung

1. **4T-0034 Parser und Renderer.** Implementierung des scg-table-Parsers und Integration in den markdown-it-Render-Hook.
2. **4T-0036 Hilfe-Tab.** Neuer dritter Tab im Hilfe-Dialog mit ausführlicher Doku in fünf Sprachen. Setzt 4T-0034 voraus, weil der Tab-Inhalt eingebettete scg-table-Beispiele rendert.
3. **4T-0035 Abschluss-Sammeltask.** Kurzeintrag in Hilfe-Funktions-Gruppe „Bearbeitung", CHANGELOG, Release-Notes, README-Status-Sektion, Test-Iteration, Tag und GitHub-Release für 0.12.0.

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Übergreifend betroffen:

- [src/main/preload.js](../../src/main/preload.js) — `md.renderer.rules.fence`-Override, `renderScgTable`-Funktion, Hilfs-Funktionen für Tokenisierung und HTML-Generierung (4T-0034); neue API `getScgTableHelpContent` über contextBridge (4T-0036).
- [src/main/main.js](../../src/main/main.js) — neuer IPC-Handler `help:getScgTableContent` (4T-0036).
- [src/renderer/styles.css](../../src/renderer/styles.css) — minimale Ergänzung für `.scg-table caption` (4T-0034); ggf. Layout-Anpassung für den Hilfe-Tab-Container (4T-0036).
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — dritten Tab im Hilfe-Dialog rendern mit Lazy-Loading (4T-0036); neuer Eintrag in `HELP_FEATURE_GROUPS` für „SCG-Tabellen" mit Querverweis auf den Tab (4T-0035).
- `src/i18n/help/scg-table.{de,en,fr,es,it}.md` (neu) — Hilfe-Tab-Inhalte pro Sprache (4T-0036).
- [src/i18n/de.json](../../src/i18n/de.json), `en.json`, `fr.json`, `es.json`, `it.json` — neuer Tab-Key `help.tab.scgTable` (4T-0036); neuer Feature-Key `help.feature.scgTable` (4T-0035).
- `package.json` — Version 0.11.0 → 0.12.0 (4T-0035).
- [CHANGELOG.md](../../CHANGELOG.md) — Block für 0.12.0 (4T-0035).
- [README.md](../../README.md) — Status-Sektion auf 0.12.0 (4T-0035).
- `dist/release-notes-0.12.0.md` (gitignored) — Release-Notes für GitHub-Release (4T-0035).

## Offene Punkte / Risiken

- **Komplexe Listen-Verschachtelung in Zellen.** markdown-it parst Listen über Block-Tokens und benötigt Leerzeilen oder konsistente Einrückung. Innerhalb einer Zelle ist die Block-Welt durch den umgebenden Code-Block-Fence bereits separiert, das sollte funktionieren, ist aber im Smoke-Test gezielt zu validieren (geschachtelte und nummerierte Listen, gemischte Listen, mehrere Absätze).
- **Whitespace-Handling im Zellinhalt.** MediaWiki strippt führendes und nachfolgendes Whitespace pro Zelle. Wir verhalten uns identisch, damit Zellinhalte nicht abhängig von der Einrückung im Quellcode rendern.
- **HTML-Sicherheit.** Der scg-table-Renderer erzeugt HTML, das den `html: false`-Schutz von markdown-it bewusst umgeht (Sinn der Sache). Sicherheitskritisch ist das nicht, weil der Renderer keinen User-HTML weiterleitet, sondern Tabellen-Struktur aufbaut und Zelleninhalte rekursiv durch markdown-it schickt. Caption- und Klassennamen-Strings werden über eine eigene `escapeHtml`-Funktion abgesichert.
- **Fehlertoleranz bei kaputter Syntax.** Wenn `{|` oder `|}` fehlen, fällt der Renderer auf den Standard-fence-Pfad zurück und zeigt den Block als regulären Code-Block (kein Crash, kein verstümmeltes HTML).
- **Portabilität:** `.md`-Dateien mit `scg-table`-Blöcken rendern nur im Viewer als Tabelle. In GitHub-Vorschau, VS Code etc. erscheinen sie als Code-Block. Das ist akzeptiert und Bestandteil der Entscheidung. Stufe 3 (Folge-Epic 3E-0008) bringt später einen Konverter, der `scg-table`-Blöcke optional in HTML-Tabellen umschreiben kann, falls externes Teilen relevant wird.
