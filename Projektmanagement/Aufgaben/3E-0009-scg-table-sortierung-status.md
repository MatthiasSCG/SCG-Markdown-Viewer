# 3E-0009 — SCG Table Stufe 4: Sortierung und Status-Hervorhebung

**Status**: Offen
**Zielversion**: 0.15.0 (vorläufig — Versions-Zuordnung wird beim Epic-Start fixiert)
**Vorgängerversion**: 0.14.0 (oder die Version, in der Stufe 3 ausgeliefert wird)
**Aufsetzend auf**: [3E-0006 — SCG Table Stufe 1](3E-0006-scg-table.md), [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md), [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)

## Ziel

Zwei häufig genutzte MediaWiki-Tabellen-Funktionen, die in den Stufen 1–3 noch nicht enthalten sind und besonders im Doku-Kontext (Anforderungslisten, Vergleichstabellen, RACI-Matrizen, Test-Status) spürbar Wert stiften:

1. **Sortierbare Tabellen**: Klick auf den Spaltenkopf sortiert die Tabelle nach dieser Spalte (aufsteigend, absteigend, Reset). Indikator-Icon im Header zeigt die aktive Sortierung.
2. **Status-Hervorhebung über semantische Klassen für Zellen und Zeilen**: Hintergrundfarben für typische Status-Werte (Fehler, Warnung, OK, Hinweis), über eine eigene Kurzform, die intern auf vordefinierte CSS-Klassen abbildet.

## Warum

**Sortierbare Tabellen:**

- Daten-Tabellen mit mehreren Spalten und vielen Zeilen werden nur durch Sortierbarkeit wirklich nutzbar. In MediaWiki Standard über `class="sortable"`, in den meisten Wiki- und CMS-Plattformen ebenfalls.
- Für deinen Doku-Use-Case sind das z.B. Anforderungslisten (sortiert nach Priorität), Vergleichstabellen (sortiert nach Preis oder Bewertung), Aufwandsschätzungen (sortiert nach Aufwand).
- Reine Markdown-Tabellen können das nicht; HTML-Tabellen mit JavaScript-Hook schon, aber nicht plattformübergreifend lesbar. SCG-Tabellen mit Sortierung wären ein deutlicher Vorteil im Viewer.

**Status-Hervorhebung:**

- Status-Spalten in Tabellen (Test-Status grün/rot, Risiko-Level rot/gelb/grün, Verfügbarkeit OK/Wartung/Ausfall) profitieren stark von Farbcodierung. Reine Text-Spalten lesen sich langsam, bunte Status-Zellen werden auf einen Blick erfasst.
- In MediaWiki über freie Inline-Styles (`| style="background:#ffeeee" | Inhalt`). Das ist mächtig, aber sicherheitskritisch und nicht standardisiert.
- Bei uns über eine **semantische Kurzform** mit einer kleinen Whitelist an Klassen (z.B. `error`, `warn`, `ok`, `info`, `neutral`), die zentral im CSS gestaltet werden. Damit bleibt der Quelltext kurz, das App-Theme kann die Status-Palette mit Light/Dark vereinheitlichen, und es gibt kein XSS-Risiko durch beliebige Style-Werte.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Sortierbare Tabelle** über eine Tabellen-Klasse oder ein Tabellen-Attribut, z.B. `{| sortable` oder `{| class="sortable"`. Renderer setzt `class="scg-table sortable"` auf das `<table>`. JS-Hook im Renderer registriert Click-Handler auf Header-Zellen.
- **Sort-Indikator-Icon** im Header (auf/ab/inactive), als Inline-SVG oder CSS-Pseudo-Element. Dritter Klick auf dieselbe Spalte setzt zurück (kein Sort).
- **Sort-Heuristik**: numerisch erkennen, sonst lexikographisch. Datum-Erkennung (ISO, DD.MM.YYYY) optional. Bei mehrzeiligem Inhalt: nach der ersten Zeile sortieren.
- **Status-Klassen** als feste Kurzform, z.B. `|.error Inhalt`, `|.warn Inhalt`, `|.ok Inhalt`, `|.info Inhalt`, `|.neutral Inhalt` für Zellen, analog `|-.error`, `|-.warn`, ... für ganze Zeilen.
- **CSS für die Status-Klassen** in [src/renderer/styles.css](../../src/renderer/styles.css), abgestimmt auf Light- und Dark-Theme. Farbpalette mit ausreichendem Kontrast.
- **Hilfe-Tab-Inhalt** um Stufe-4-Doku erweitern: Beispiel-Tabelle mit sortierbarer Spalte und Status-Zellen.
- CHANGELOG-Eintrag, Release-Notes, Version-Bump, Tag, GitHub-Release.

**Bewusst nicht im Umfang:**

- **Freie Inline-Styles** (`style="background: #ffeeee"`). Strikte Whitelist über die Status-Klassen, keine Möglichkeit für beliebige CSS-Werte. Damit kein XSS-Risiko.
- **Beliebige CSS-Klassen** an Zellen oder Zeilen. Nur die in Stufe 4 definierten Status-Klassen sind unterstützt.
- **Spalten-Filter** (Spaltenkopf zeigt nur passende Zeilen). Wäre ein eigenes Feature mit deutlich höherem Aufwand, hier nicht im Umfang.
- **Custom-Sort-Werte** über `data-sort-value`. Die Sort-Heuristik arbeitet auf dem sichtbaren Zelltext.
- **Multi-Column-Sortierung** (mehrere Spalten gleichzeitig als Sortier-Schlüssel). Eine Spalte zur Zeit.
- **Persistenz** der aktiven Sortierung über Tab-Wechsel oder App-Neustart. Sortierung ist Session-lokal und Tab-lokal.

## Untergeordnete Tasks

(werden beim Epic-Start angelegt)

## Architekturentscheidungen

(werden beim Epic-Start finalisiert; offene Fragen siehe „Offene Punkte" weiter unten)

Erste Richtungsvorgaben:

- **Sortier-Logik im Renderer** (nicht im Main): nach jedem `renderMarkdown`-Aufruf prüft der Renderer das Render-DOM auf `<table class="scg-table sortable">` und hängt Click-Handler an die Header-Zellen. Sort wird via DOM-Manipulation umgesetzt (Re-Ordering der `<tr>`-Knoten im `<tbody>`).
- **Sort-Heuristik**: zuerst Versuche `Number(trim(text))` für numerische Werte (Whitespace-Toleranz), bei `NaN` Fallback auf lexikographisches `localeCompare` mit aktiver UI-Locale.
- **Status-Klassen-Syntax** über eine punktierte Notation am Zell-/Zeilen-Marker (`|.error Inhalt`). Parser-Erweiterung in `renderScgTable` erkennt den Punkt und mappt ihn auf eine `<td class="status-error">`-Klasse.
- **CSS-Klassen** unter dem Präfix `.scg-table .status-error` etc., damit sie nur in scg-tables greifen und nicht versehentlich auf andere Markdown-Tabellen wirken.

## Reihenfolge der Umsetzung

(wird beim Epic-Start mit den Tasks festgelegt)

Vorschlag für die Aufteilung:

1. Status-Klassen-Syntax und CSS (kleinere, isolierte Änderung).
2. Sortierbare Tabellen mit Click-Handler und Sort-Heuristik (eigene Komponente).
3. Hilfe-Tab-Erweiterung + Abschluss-Sammeltask (CHANGELOG, Release-Notes, Tag, Release).

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — `renderScgTable` und `renderScgTableRow` um Status-Klassen-Erkennung erweitern, Tabellen-Klasse `sortable` durchreichen.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Post-Render-Hook, der `.scg-table.sortable`-Tabellen mit Click-Handlern versieht.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS für `.status-error/warn/ok/info/neutral` und Sort-Indikator-Icons.
- [src/i18n/help/scg-table.{de,en,fr,es,it}.md](../../src/i18n/help) — Hilfe-Tab-Inhalt um Stufe 4 erweitern.
- `package.json` — Version-Bump.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-X.Y.Z.md` — Release-Doku.

## Offene Punkte / Risiken

- **Status-Klassen-Palette**: welche Klassen genau? `error`, `warn`, `ok`, `info`, `neutral` sind ein Vorschlag. Andere übliche: `success`, `danger` (Bootstrap-Stil) oder `red`, `yellow`, `green` (farbbasiert). Klärung beim Epic-Start mit Blick auf konsistente Benennung.
- **Sort-Heuristik bei mehrzeiligen Zellen**: nach der ersten Zeile sortieren, oder den gesamten Zell-Text? Erstere ist intuitiver, zweitere robuster bei mehrteiligen Werten.
- **Sort-Heuristik bei Datum**: ISO-Format direkt unterstützen, oder eine konfigurierbare Datums-Erkennung? Im Doku-Kontext kommen 2026-05-19 und 19.05.2026 vor.
- **Tabelle mit Span-Zellen + Sortierung**: Was passiert, wenn eine Tabelle `colspan`/`rowspan` aus Stufe 2 und gleichzeitig `sortable` aus Stufe 4 nutzt? Sortierung bricht Spans tendenziell. Mögliche Lösung: sortierbare Tabellen ohne Span-Support, oder Sortierung deaktiviert sich automatisch bei Span-Vorhandensein.
- **CSS-Farbkontrast in Dark-Theme**: Status-Hintergründe müssen in beiden Themes ausreichend lesbar bleiben. Palette pro Theme prüfen.
- **Sort-Indikator-Icon**: Inline-SVG (kein Library-Dependency) analog zur Statusbar-Lösung aus 4T-0031 (Lucide-Icons), oder Unicode-Pfeil-Zeichen? Inline-SVG ist sauberer.