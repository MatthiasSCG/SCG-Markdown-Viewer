# 3E-0009 — SCG Table Stufe 4: Sortierung, Status-Hervorhebung und Spalten-Default

**Status**: Erledigt — 2026-05-19, in v0.15.0 ausgeliefert
**Zielversion**: 0.15.0
**Vorgängerversion**: 0.14.0
**Aufsetzend auf**: [3E-0006 — SCG Table Stufe 1](3E-0006-scg-table.md), [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md), [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)
**Release**: [v0.15.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.15.0)

## Ziel

Drei tabellenweit wirkende MediaWiki-/Komfort-Funktionen, die in den Stufen 1–3 noch nicht enthalten sind und besonders im Doku-Kontext (Anforderungslisten, Vergleichstabellen, RACI-Matrizen, Test-Status) spürbar Wert stiften:

1. **Sortierbare Tabellen**: Klick auf den Spaltenkopf sortiert die Tabelle nach dieser Spalte (aufsteigend, absteigend, Reset). Indikator-Icon im Header zeigt die aktive Sortierung.
2. **Status-Hervorhebung über semantische Klassen für Zellen und Zeilen**: Hintergrundfarben für typische Status-Werte (Fehler, Warnung, OK, Hinweis), über eine eigene Kurzform, die intern auf vordefinierte CSS-Klassen abbildet.
3. **Spalten-Default-Ausrichtung**: globale Ausrichtungs-Steuerung pro Spalte über eine Tabellen-Header-Syntax (Vorschlag: `{|+cols="left center right"`). Wirkt automatisch auf alle Zellen der jeweiligen Spalte, sofern die Zelle nicht selbst eine explizite Ausrichtung aus Stufe 2 (`align="..."`) gesetzt hat (Zell-Override gewinnt).

## Warum

**Sortierbare Tabellen:**

- Daten-Tabellen mit mehreren Spalten und vielen Zeilen werden nur durch Sortierbarkeit wirklich nutzbar. In MediaWiki Standard über `class="sortable"`, in den meisten Wiki- und CMS-Plattformen ebenfalls.
- Für deinen Doku-Use-Case sind das z.B. Anforderungslisten (sortiert nach Priorität), Vergleichstabellen (sortiert nach Preis oder Bewertung), Aufwandsschätzungen (sortiert nach Aufwand).
- Reine Markdown-Tabellen können das nicht; HTML-Tabellen mit JavaScript-Hook schon, aber nicht plattformübergreifend lesbar. SCG-Tabellen mit Sortierung wären ein deutlicher Vorteil im Viewer.

**Status-Hervorhebung:**

- Status-Spalten in Tabellen (Test-Status grün/rot, Risiko-Level rot/gelb/grün, Verfügbarkeit OK/Wartung/Ausfall) profitieren stark von Farbcodierung. Reine Text-Spalten lesen sich langsam, bunte Status-Zellen werden auf einen Blick erfasst.
- In MediaWiki über freie Inline-Styles (`| style="background:#ffeeee" | Inhalt`). Das ist mächtig, aber sicherheitskritisch und nicht standardisiert.
- Bei uns über eine **semantische Kurzform** mit einer kleinen Whitelist an Klassen (z.B. `error`, `warn`, `ok`, `info`, `neutral`), die zentral im CSS gestaltet werden. Damit bleibt der Quelltext kurz, das App-Theme kann die Status-Palette mit Light/Dark vereinheitlichen, und es gibt kein XSS-Risiko durch beliebige Style-Werte.

**Spalten-Default-Ausrichtung:**

- Bei Tabellen mit durchgängig nach Konvention ausgerichteten Spalten (z.B. „Preis" rechtsbündig, „Status" zentriert) ist es nervig, in jeder Zelle wieder `align="..."` zu schreiben.
- Stufe 2 erlaubt die Ausrichtung pro Zelle; das deckt den Bedarf funktional, ist aber repetitiv. Eine Spalten-Default-Ausrichtung ist die natürliche Komfort-Stufe darüber.
- Klassische Markdown-Pipe-Tabellen lösen das über die Trennlinie `:---`, `---:`, `:---:`. SCG-Tabellen sollten in Stufe 4 einen vergleichbaren Komfort bieten.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Sortierbare Tabelle** über eine Tabellen-Klasse oder ein Tabellen-Attribut, z.B. `{| sortable` oder `{| class="sortable"`. Renderer setzt `class="scg-table sortable"` auf das `<table>`. JS-Hook im Renderer registriert Click-Handler auf Header-Zellen.
- **Sort-Indikator-Icon** im Header (auf/ab/inactive), als Inline-SVG oder CSS-Pseudo-Element. Dritter Klick auf dieselbe Spalte setzt zurück (kein Sort).
- **Sort-Heuristik**: numerisch erkennen, sonst lexikographisch. Datum-Erkennung (ISO, DD.MM.YYYY) optional. Bei mehrzeiligem Inhalt: nach der ersten Zeile sortieren.
- **Status-Klassen** als feste Kurzform, z.B. `|.error Inhalt`, `|.warn Inhalt`, `|.ok Inhalt`, `|.info Inhalt`, `|.neutral Inhalt` für Zellen, analog `|-.error`, `|-.warn`, ... für ganze Zeilen.
- **CSS für die Status-Klassen** in [src/renderer/styles.css](../../src/renderer/styles.css), abgestimmt auf Light- und Dark-Theme. Farbpalette mit ausreichendem Kontrast.
- **Spalten-Default-Ausrichtung** über eine Tabellen-Header-Syntax. Konkrete Syntax wird beim Task-Start finalisiert; Vorschlag: `{|+cols="left center right"` direkt nach `{|`. Zell-Override aus Stufe 2 (`align="..."`) gewinnt. HTML-Generierung entweder über `<colgroup><col>` plus CSS oder über einen Renderer-Pass, der die Default-Ausrichtung in Zellen ohne eigene Ausrichtung setzt.
- **Hilfe-Tab-Inhalt** um Stufe-4-Doku erweitern: Beispiel-Tabelle mit sortierbarer Spalte, Status-Zellen und Spalten-Default-Ausrichtung.
- CHANGELOG-Eintrag, Release-Notes, Version-Bump, Tag, GitHub-Release.

**Bewusst nicht im Umfang:**

- **Freie Inline-Styles** (`style="background: #ffeeee"`). Strikte Whitelist über die Status-Klassen, keine Möglichkeit für beliebige CSS-Werte. Damit kein XSS-Risiko.
- **Beliebige CSS-Klassen** an Zellen oder Zeilen. Nur die in Stufe 4 definierten Status-Klassen sind unterstützt.
- **Spalten-Filter** (Spaltenkopf zeigt nur passende Zeilen). Wäre ein eigenes Feature mit deutlich höherem Aufwand, hier nicht im Umfang.
- **Custom-Sort-Werte** über `data-sort-value`. Die Sort-Heuristik arbeitet auf dem sichtbaren Zelltext.
- **Multi-Column-Sortierung** (mehrere Spalten gleichzeitig als Sortier-Schlüssel). Eine Spalte zur Zeit.
- **Persistenz** der aktiven Sortierung über Tab-Wechsel oder App-Neustart. Sortierung ist Session-lokal und Tab-lokal.

## Untergeordnete Tasks

- [x] [4T-0044 — Status-Hervorhebung in SCG-Tabellen](4T-0044-scg-table-status-hervorhebung.md) — erledigt, Commit `ae35e45`, gepushed
- [x] [4T-0045 — Spalten-Default-Ausrichtung](4T-0045-scg-table-spalten-default.md) — erledigt, Commit `143c970`, gepushed
- [x] [4T-0046 — Sortierbare SCG-Tabellen](4T-0046-scg-table-sortierbar.md) — erledigt, Commit `fca069a`, gepushed
- [x] [4T-0047 — Hilfe-Tab um Sortierung, Status-Hervorhebung und Spalten-Default erweitern](4T-0047-scg-table-hilfe-tab-stufe-4.md) — erledigt, Commit `d049529`, gepushed
- [x] [4T-0048 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.15.0](4T-0048-changelog-release-0150.md) — erledigt, gepushed, v0.15.0 veröffentlicht

## Architekturentscheidungen

Am 2026-05-19 finalisiert (die ursprünglich offenen Detail-Fragen wurden im Zuge der Task-Anlage entschieden):

- **Status-Klassen-Palette**: semantisch — `error`, `warn`, `ok`, `info`, `neutral`. Bedeutung statt Farbe, App-CSS bestimmt die konkrete Darstellung im Light- und Dark-Theme.
- **Status-Klassen-Syntax**: Punkt-Notation am Zell-/Zeilen-Marker (`|.error Inhalt`, `|-.warn` etc.). Parser-Erweiterung mappt den Wert auf eine `status-*`-CSS-Klasse.
- **Sort-Aktivierung**: `{|+sortable` als Tabellen-Header-Attribut. Setzt auf der gerenderten `<table>` die Klasse `scg-table sortable`.
- **Sort-Logik im Renderer** (nicht im Main): nach jedem `renderMarkdown`-Aufruf prüft der Renderer das Render-DOM auf `<table class="scg-table sortable">` und hängt Click-Handler an die Header-Zellen. Sort wird via DOM-Manipulation umgesetzt (Re-Ordering der `<tr>`-Knoten im `<tbody>`).
- **Sort-Heuristik**: zuerst Versuche `Number(trim(text))` für numerische Werte, bei `NaN` Fallback auf `localeCompare` mit `numeric: true`. Bei mehrzeiligen Zellen wird nach der ersten Zeile sortiert. Für Datum: keine spezielle Behandlung; ISO-Format sortiert lexikographisch korrekt.
- **Sortierung mit `colspan`/`rowspan`**: bei Spans wird die Sortierung **automatisch deaktiviert** (kein Klick-Handler, kein Indikator-Icon). Layout-Risiko zu hoch; Doku-Hinweis im Hilfe-Tab.
- **Sort-Indikator-Icons**: Inline-SVG im Lucide-Stil analog zur Statusbar-Lösung aus 4T-0031. Drei Zustände: neutral (`chevrons-up-down`), aufsteigend (`chevron-up`), absteigend (`chevron-down`).
- **Spalten-Default-Ausrichtung**: `{|+cols="left center right"` als Tabellen-Header-Attribut. Whitelist auf `left`/`center`/`right`. Zell-Override aus Stufe 2 gewinnt; bei `colspan` wird kein Spalten-Default angewendet.
- **CSS-Klassen** unter dem Präfix `.markdown-body .scg-table .status-*` und `.markdown-body .scg-table .align-*` (Stufe-2-Klassen werden wiederverwendet), damit sie nur in scg-tables greifen.
- **Portable Export**: Status-Klassen werden als Inline-Styles mit-übersetzt. Spalten-Default-Ausrichtung wirkt auch im Export. **Sortierung ist nicht portabel** (kein JavaScript im Output, keine `sortable`-Klasse im exportierten HTML).
- **Hilfe-Dialog Funktions-Eintrag**: ein gemeinsamer Eintrag `help.feature.scgTableExtended` in der Gruppe „Bearbeitung" für alle drei neuen Funktionen, mit Querverweis auf den SCG-Table-Tab. Vermeidet drei einzelne Einträge, die den scg-table-Cluster dominieren würden.
- **Stufen-Begriffe** in der User-Sicht weiterhin nicht verwendet (Konvention seit 4T-0038). Neue Hilfe-Tab-Sektion heißt „Sortierung, Status-Hervorhebung und Spalten-Default".

## Reihenfolge der Umsetzung

1. **4T-0044 Status-Hervorhebung.** Kleinste, isolierte Änderung. Parser-Erweiterung für Punkt-Notation, CSS-Klassen, Konverter-Output mit Inline-Styles.
2. **4T-0045 Spalten-Default-Ausrichtung.** Header-Parser-Erweiterung, Default-Anwendung beim Zell-Render. Re-Use der Stufe-2-`align-*`-CSS-Klassen.
3. **4T-0046 Sortierbare Tabellen.** Eigene Komponente mit JS-Hook im Renderer, Sort-Heuristik, Indikator-Icons. Komplexester der drei Code-Tasks.
4. **4T-0047 Hilfe-Tab.** Erweiterung der fünf Sprachdateien um Sektion „Sortierung, Status-Hervorhebung und Spalten-Default"; ein gemeinsamer Funktions-Eintrag im Hilfe-Dialog. Setzt 4T-0044 bis 4T-0046 voraus, damit die Beispiele im Tab funktional rendern.
5. **4T-0048 Abschluss-Sammeltask.** CHANGELOG, Release-Notes, README, Test-Iteration, Tag und GitHub-Release für 0.15.0.

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — `renderScgTable` und `renderScgTableRow` um Status-Klassen-Erkennung erweitern, Tabellen-Klasse `sortable` durchreichen.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Post-Render-Hook, der `.scg-table.sortable`-Tabellen mit Click-Handlern versieht.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS für `.status-error/warn/ok/info/neutral` und Sort-Indikator-Icons.
- [src/i18n/help/scg-table.{de,en,fr,es,it}.md](../../src/i18n/help) — Hilfe-Tab-Inhalt um Stufe 4 erweitern.
- `package.json` — Version-Bump.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-X.Y.Z.md` — Release-Doku.

## Offene Punkte / Risiken

Die ursprünglich offenen Detail-Fragen wurden am 2026-05-19 entschieden (siehe Architekturentscheidungen). Verbleibende Risiken für die Umsetzung:

- **CSS-Farbpalette für Status-Klassen**: in Light- und Dark-Theme mit ausreichendem Kontrast (WCAG-AA). Konkrete Farbwerte werden beim Implementieren von 4T-0044 mit kurzem Visual-Check festgelegt.
- **Spalten-Index-Tracking bei rowspan**: `rowspan`-Zellen belegen Spalten in mehreren Zeilen. Bei der Spalten-Default-Anwendung (4T-0045) wird das Tracking pro Quellzeile gemacht, nicht pro tatsächliche Spalten-Position. Pathologische Konstrukte (rowspan + cols-Default) können in seltenen Fällen zu falschen Defaults führen. Wird beim Implementieren entschieden, ob das relevant genug für Sonderbehandlung ist.
- **Sort-Stabilität bei Reset**: nach Sortierung ist die Original-Reihenfolge nur über einen gesicherten Reference-Array wiederherstellbar. Implementierung muss diesen Array beim ersten Klick auf eine Sort-Spalte erfassen und bei jedem Reset darauf zurückfallen.
- **`+sortable` und `+cols`-Kombination**: beide sind Tabellen-Header-Attribute. Syntax-Vorschlag `{|+sortable cols="left right"`. Parser muss beide nebeneinander erkennen.