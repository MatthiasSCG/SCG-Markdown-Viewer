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
- **Spalten-Default-Ausrichtung im Tabellen-Header** — Stufe 4 ([3E-0009](3E-0009-scg-table-sortierung-status.md)). Pro Zelle setzen ist in Stufe 2 funktional ausreichend; der Komfort der spaltenweiten Steuerung kommt in Stufe 4.
- **Beliebige HTML-/CSS-Attribute** in Zellen. Strikte Whitelist auf die in Stufe 2 explizit unterstützten Attribute (XSS-Risiko-Vermeidung).
- **Beliebige Inline-Styles** aus dem Quelltext. User-Input wird nicht 1:1 in `style="…"` weitergereicht; statt dessen Übersetzung auf vordefinierte Klassen oder Eigenschaften.
- **Background-Farben**, **Border-Stile**, **Schriftarten** etc. in Zellen — bleibt Aufgabe der App-CSS oder späterer Erweiterungen.

## Untergeordnete Tasks

- [x] [4T-0037 — Parser- und Renderer-Erweiterung (Spans, Ausrichtung, Accessibility-scope)](4T-0037-scg-table-spans-ausrichtung-parser.md) — erledigt, Commit `5e374cd`, gepushed
- [ ] [4T-0038 — Hilfe-Tab um Stufe-2-Doku erweitern](4T-0038-scg-table-hilfe-tab-stufe-2.md)
- [ ] [4T-0039 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.13.0](4T-0039-changelog-release-0130.md)

## Architekturentscheidungen

Am 2026-05-19 finalisiert (siehe „Offene Punkte" — die ursprünglich offenen Detail-Fragen wurden im Zuge der Task-Anlage entschieden):

- **MediaWiki-kompatible Attribut-Syntax mit strikter Whitelist.** Eine Zelle bekommt einen optionalen Attribut-Block am Anfang: `| attr="val" attr="val" | Inhalt`. Ist kein zweites `|` in der Zellenzeile, gibt es keinen Attribut-Block (Stufe-1-Verhalten bleibt unverändert).
- **Whitelist auf vier Attribute**: `colspan`, `rowspan`, `align` (`left`/`center`/`right`), `valign` (`top`/`middle`/`bottom`). Alles andere wird stillschweigend ignoriert. Insbesondere keine `style="…"`-, `class="…"`-, `id="…"`- oder `data-*`-Attribute (XSS-Risiko-Vermeidung).
- **Strikte Wert-Validierung**: `colspan`/`rowspan` nur positive Ganzzahlen; `align`/`valign` nur die genannten Werte. Ungültige Werte werden ignoriert.
- **CSS-Klassen statt HTML4-`align`-Attribut**: `align="center"` mappt auf `<td class="align-center">`, `valign="top"` auf `<td class="valign-top">`. Damit bleibt die CSS-Hoheit beim App-Stylesheet, und die App kann Ausrichtung mit Light-/Dark-Theme abstimmen.
- **Accessibility-`scope`** automatisch: `<th>` in der Header-Zeile (alle Zellen `!`) bekommt `scope="col"`, `<th>` als Zeilen-Header bekommt `scope="row"`.
- **Erweiterung der `renderScgTable`-Parser-Logik** in [src/main/preload.js](../../src/main/preload.js): zusätzlicher Attribut-Block am Anfang einer Zelle wird erkannt; `currentCell` bekommt ein `attrs`-Feld zusätzlich zu `type` und `content`.
- **CSS-Regeln** in [src/renderer/styles.css](../../src/renderer/styles.css) für `align-*` und `valign-*`.

## Reihenfolge der Umsetzung

1. **4T-0037 Parser- und Renderer-Erweiterung.** Implementierung in preload.js und styles.css. Setzt die technische Basis für Stufe 2.
2. **4T-0038 Hilfe-Tab.** Erweiterung der bestehenden Hilfe-Inhaltsdateien um eine Sektion „Stufe 2: Spans und Ausrichtung" in allen fünf Sprachen. Setzt 4T-0037 voraus, damit die Beispiele im Tab funktional rendern.
3. **4T-0039 Abschluss-Sammeltask.** CHANGELOG, Release-Notes, README-Status-Sektion, Test-Iteration, Tag und GitHub-Release für 0.13.0.

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — `renderScgTable` und `renderScgTableRow` um Attribut-Parsing erweitern.
- [src/renderer/styles.css](../../src/renderer/styles.css) — CSS-Regeln für Zellausrichtung und Span-Visualisierung.
- [src/i18n/help/scg-table.{de,en,fr,es,it}.md](../../src/i18n/help) — Hilfe-Tab-Inhalt um Stufe-2-Doku.
- `package.json` — Version-Bump 0.12.0 → 0.13.0.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.13.0.md` — Release-Doku.

## Offene Punkte / Risiken

Die ursprünglich offenen Detail-Fragen (Syntax-Wahl, Sicherheits-Mechanismus, vertikale Ausrichtung, Spalten-Default) wurden am 2026-05-19 entschieden:

- **Syntax**: MediaWiki-kompatible Attribute mit strikter Whitelist (`colspan`, `rowspan`, `align`, `valign`). Keine freien `style="…"`-Attribute (kein XSS-Risiko).
- **`valign`**: in Stufe 2 mit drin (`top`/`middle`/`bottom`), Whitelist-Aufwand minimal.
- **Spalten-Default-Ausrichtung**: in Stufe 4 ([3E-0009](3E-0009-scg-table-sortierung-status.md)), nicht hier.

Verbleibende Punkte für die Umsetzung:

- **Sortier-Reihenfolge der Attribute** in einer Zelle (`| colspan="2" align="center" | …` vs. `| align="center" colspan="2" | …`): Parser sollte beide Reihenfolgen akzeptieren.
- **Werte-Validierung**: `align`-Werte nur `left`/`center`/`right`, `valign`-Werte nur `top`/`middle`/`bottom`, alle anderen Werte ignoriert. `colspan`/`rowspan` nur positive Ganzzahlen, sonst ignoriert.
- **`scope`-Setzung**: alle `<th>` in der Header-Zeile bekommen `scope="col"`, `<th>` in Datenzeilen (z.B. Zeilen-Header durch `!` am Zeilenanfang) bekommen `scope="row"`. Klärung im Smoke-Test, wann beide Konstellationen vorkommen.