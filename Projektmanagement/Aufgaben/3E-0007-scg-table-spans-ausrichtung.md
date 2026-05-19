# 3E-0007 — SCG Table Stufe 2: colspan, rowspan, Spaltenausrichtung

**Status**: Offen
**Zielversion**: 0.13.0 (vorläufig — Versions-Zuordnung wird beim Epic-Start fixiert)
**Vorgängerversion**: 0.12.0
**Aufsetzend auf**: [3E-0006 — SCG Table Stufe 1](3E-0006-scg-table.md)

## Ziel

Erweiterung der scg-table-Syntax (Basis aus Stufe 1, [3E-0006](3E-0006-scg-table.md)) um Zell-Attribute für Zellüberspannung (`colspan`, `rowspan`) und Spaltenausrichtung (links / zentriert / rechts). Mit diesen Erweiterungen werden Vergleichstabellen, Matrizen und komplexere Layouts möglich, die mit reinen Block-Zellen aus Stufe 1 nicht abbildbar waren.

## Warum

- **Vergleichstabellen** brauchen typischerweise Header über mehrere Spalten oder gemeinsame Zellen über mehrere Zeilen. Ohne `colspan`/`rowspan` muss man die Inhalte stumpf wiederholen oder die Tabelle künstlich aufbrechen.
- **Spaltenausrichtung** ist Standard in Pipe-Tabellen (`---`, `:---:`, `---:`) und in MediaWiki über Style-Attribute. In Stufe 1 ist sie noch nicht enthalten; numerische Werte oder Status-Spalten lesen sich linksbündig schwer.
- **Block-Zellen** aus Stufe 1 kennen aktuell nur `vertical-align: top`. Für Zellen, in denen kurzer Inhalt neben mehrzeiligem Inhalt steht, könnte mittlere oder untere vertikale Ausrichtung sinnvoll sein.

Ohne Stufe 2 bleibt die scg-table-Funktion auf einfache rechteckige Strukturen mit linksbündigem Inhalt beschränkt — gut für viele Fälle, aber nicht für die komplexeren Doku-Tabellen, die im Praxis-Use-Case (Anforderungsmatrizen, RACI, Vergleichsmatrizen) typisch sind.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **`colspan`-Attribut**: Zelle erstreckt sich über mehrere Spalten.
- **`rowspan`-Attribut**: Zelle erstreckt sich über mehrere Zeilen.
- **Spaltenausrichtung** horizontal (links / zentriert / rechts), pro Zelle und/oder pro Spalte über eine Standard-Anweisung.
- **Vertikale Ausrichtung** in Block-Zellen (top / middle / bottom), pro Zelle oder Tabellen-Standard.
- **Accessibility: `scope`-Attribute auf Header-Zellen** — `<th>` in der ersten Tabellenzeile bekommt automatisch `scope="col"`, `<th>` in einer Datenzeile (Header am Zeilenanfang) `scope="row"`. Damit können Screen-Reader Datenzellen mit ihren Headern verbinden. Kommt mit Stufe 2 mit, weil die Span-Logik die `<th>`-Generierung ohnehin anfasst und der Aufwand minimal ist.
- **Hilfe-Tab-Inhalt** um Stufe-2-Doku erweitern (eigener Abschnitt mit Beispielen).
- CHANGELOG-Eintrag, Release-Notes, Version-Bump, Tag, GitHub-Release.

**Bewusst nicht im Umfang:**

- **Verschachtelte `scg-table`** in einer Zelle — Stufe 3 ([3E-0008](3E-0008-scg-table-konverter-verschachtelung.md)).
- **HTML-Konverter** für Portabilität in fremden Renderern — Stufe 3.
- **Beliebige HTML-/CSS-Attribute** in Zellen. Strikte Whitelist auf die in Stufe 2 explizit unterstützten Attribute (XSS-Risiko-Vermeidung).
- **Beliebige Inline-Styles** aus dem Quelltext. User-Input wird nicht 1:1 in `style="…"` weitergereicht; statt dessen Übersetzung auf vordefinierte Klassen oder Eigenschaften.
- **Background-Farben**, **Border-Stile**, **Schriftarten** etc. in Zellen — bleibt Aufgabe der App-CSS oder späterer Erweiterungen.

## Untergeordnete Tasks

(werden beim Epic-Start angelegt)

## Architekturentscheidungen

(werden beim Epic-Start finalisiert; offene Fragen siehe „Offene Punkte" weiter unten)

Erste Richtungsvorgaben:

- **Erweiterung der `renderScgTable`-Parser-Logik** in [src/main/preload.js](../../src/main/preload.js). Pro Zelle wird ggf. ein optionaler Attribut-Block am Anfang erkannt und ausgewertet.
- **Attribut-Whitelist**: nur ausgewählte Attribute werden honoriert, alles andere stillschweigend ignoriert. Damit besteht keine Möglichkeit, beliebigen Style-Code in die generierte HTML-Tabelle zu schmuggeln.
- **CSS-Regeln** in [src/renderer/styles.css](../../src/renderer/styles.css) für die Ausrichtungs-Klassen oder Attribute, die der Parser an die HTML-Zellen anhängt.

## Reihenfolge der Umsetzung

(wird beim Epic-Start mit den Tasks festgelegt; üblicherweise Parser-Erweiterung zuerst, dann Hilfe-Tab und CHANGELOG/Release)

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — `renderScgTable` und `renderScgTableRow` um Attribut-Parsing erweitern.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS-Regeln für Zellausrichtung und Span-Visualisierung.
- [src/i18n/help/scg-table.{de,en,fr,es,it}.md](../../src/i18n/help) — Hilfe-Tab-Inhalt um Stufe-2-Doku.
- `package.json` — Version-Bump 0.12.0 → 0.13.0.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.13.0.md` — Release-Doku.

## Offene Punkte / Risiken

- **Syntax-Wahl**: MediaWiki-Standard (`| style="text-align: center" | Inhalt`) ist kompatibler, aber komplex und sicherheits-kritisch. Eine viewer-eigene Kurzform (z.B. `|< Inhalt` für linksbündig, `|^` zentriert, `|>` rechtsbündig, `| colspan=2 | Inhalt`) wäre kürzer und weniger fehleranfällig, weicht aber von MediaWiki ab. Entscheidung beim Epic-Start.
- **Sicherheit**: Wenn Style-Attribute aus dem Quelltext akzeptiert werden, besteht XSS-Risiko über CSS-Properties wie `background: url(javascript:…)`. Lösung: strikte Whitelist (z.B. nur `text-align`, `vertical-align`, `colspan`, `rowspan`).
- **Vertikale Ausrichtung** in Block-Zellen mit mehrzeiligem Inhalt: macht das Sinn, oder ist es bei dynamischer Zellhöhe ohnehin selten relevant? Klärung beim Epic-Start.
- **Spalten-Default-Ausrichtung**: Soll es eine Möglichkeit geben, die Ausrichtung pro Spalte im Tabellen-Header zu definieren (analog zu Pipe-Tabellen-Trennlinie), oder muss sie zwingend pro Zelle gesetzt werden?