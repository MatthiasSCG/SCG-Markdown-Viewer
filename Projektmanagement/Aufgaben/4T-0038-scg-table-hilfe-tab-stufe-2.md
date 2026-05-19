# 4T-0038 — Hilfe-Tab um Stufe-2-Doku erweitern

**Status**: Offen
**Epic**: [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md)
**Zielversion**: 0.13.0

## Warum

Der Hilfe-Tab „SCG Table" aus [4T-0036](4T-0036-scg-table-hilfe-tab.md) deckt aktuell nur die Basis-Syntax aus Stufe 1 ab. Mit den neuen Attributen aus [4T-0037](4T-0037-scg-table-spans-ausrichtung-parser.md) (`colspan`, `rowspan`, `align`, `valign`) braucht der Tab eine eigene Sektion für Stufe 2, sonst sind die neuen Features nicht entdeckbar.

Konsistenz mit der Stufe-1-Doku: die Erklärung erfolgt im selben Format (Syntax-Übersichts-Tabelle, Quelltext-Beispiel mit gerenderter Tabelle direkt darunter, plus Tipps).

## Lösungsansatz

### Strukturelle Einordnung

In den fünf bestehenden Hilfe-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) wird eine neue Sektion **„Stufe 2: Spans und Ausrichtung"** eingefügt, **vor** dem bestehenden Abschnitt „Tipps" und **nach** dem „Erweiterten Beispiel mit Listen und Code-Block". Begründung: thematisch passt sie zwischen die syntaktische Vertiefung (erweitertes Beispiel) und die allgemeinen Tipps; Tipps sollen am Ende stehen, weil sie sektionsübergreifend sind.

Im bestehenden Abschnitt „Ausblick" wird Stufe 2 entfernt (sie ist jetzt umgesetzt). Stufe 3 und Stufe 4 bleiben als Ausblick stehen.

### Inhaltsgliederung der neuen Sektion „Stufe 2: Spans und Ausrichtung"

1. **Kurzer Einleitungssatz**: „Ab Version 0.13.0 lassen sich Zellen mit Attributen versehen, um über mehrere Spalten oder Zeilen zu greifen und den Zellinhalt auszurichten."
2. **Syntax-Übersichts-Tabelle** der vier Attribute mit erlaubten Werten:

   | Attribut  | Erlaubte Werte               | Wirkung                                            |
   |-----------|------------------------------|----------------------------------------------------|
   | `colspan` | positive Ganzzahl            | Zelle erstreckt sich über mehrere Spalten          |
   | `rowspan` | positive Ganzzahl            | Zelle erstreckt sich über mehrere Zeilen           |
   | `align`   | `left` / `center` / `right`  | horizontale Ausrichtung des Zellinhalts            |
   | `valign`  | `top` / `middle` / `bottom`  | vertikale Ausrichtung in mehrzeiligen Block-Zellen |

3. **Syntax-Regel**: „Attribute stehen zwischen zwei Pipes am Zellenanfang: `| attr="val" attr="val" | Inhalt`."
4. **Konkretes Beispiel** mit Quelltext-Block (vier-Backtick-Außenfence wie in der Stufe-1-Doku) und gerenderter Tabelle direkt darunter. Beispiel zeigt mindestens `colspan`, `rowspan` und `align="right"` in einer Tabelle.
5. **Tipps speziell zu Stufe 2** (drei kurze Punkte):
   - Attribute können in beliebiger Reihenfolge stehen: `| colspan="2" align="center" | Inhalt` und `| align="center" colspan="2" | Inhalt` sind gleichwertig.
   - Ungültige Werte werden stillschweigend ignoriert (z.B. `colspan="abc"`).
   - Stufe 1 ohne Attribute bleibt unverändert; der Attribut-Block ist optional.
6. **Accessibility-Hinweis** (kurz): „Header-Zellen (`!`) bekommen automatisch das passende `scope`-Attribut, damit Screen-Reader Datenzellen mit ihren Headern verbinden."

### Pflege in allen fünf Sprachen

- `src/i18n/help/scg-table.de.md` (Master)
- `src/i18n/help/scg-table.en.md`
- `src/i18n/help/scg-table.fr.md`
- `src/i18n/help/scg-table.es.md`
- `src/i18n/help/scg-table.it.md`

Inhaltliche Struktur in allen fünf Sprachen identisch, nur Texte übersetzt. Beispiel-Tabelle nutzt projektneutrale Begriffe (Aufwandsschätzung, Stunden, Bereich, Zwischensumme), damit die Übersetzung einfach bleibt.

### Ausblick-Sektion anpassen

Aus dem bestehenden Ausblick-Block:

```
- **Stufe 2**: `colspan` und `rowspan`, Spaltenausrichtung ...
- **Stufe 3**: Konverter ...
```

wird in der 0.13.0-Version:

```
- **Stufe 3**: Konverter `scg-table` → HTML-Tabelle inline für maximale Portabilität in fremden Markdown-Renderern.
- **Stufe 4**: Sortierbare Tabellen, Status-Hervorhebung über semantische Klassen, Spalten-Default-Ausrichtung.
```

### Akzeptanz-Smoke-Tests

1. Hilfe-Dialog → Tab „SCG Table". Neue Sektion „Stufe 2: Spans und Ausrichtung" ist sichtbar, an der richtigen Stelle (zwischen erweitertem Beispiel und Tipps).
2. Syntax-Übersichts-Tabelle der vier Attribute rendert korrekt als Pipe-Tabelle.
3. Stufe-2-Beispiel rendert mit echtem `colspan`/`rowspan`/`align`.
4. Sprachwechsel funktioniert; alle fünf Sprachen zeigen die neue Sektion.
5. Ausblick-Sektion zeigt nur noch Stufe 3 und 4.
6. Bestehender Stufe-1-Inhalt (Einleitung, Grundsyntax, Minimal-Beispiel etc.) unverändert.

## Akzeptanzkriterien

- Alle fünf Hilfe-Markdown-Dateien haben eine neue Sektion „Stufe 2: Spans und Ausrichtung" zwischen erweitertem Beispiel und Tipps.
- Sektion enthält Syntax-Übersichts-Tabelle, ein konkretes Beispiel mit Quelltext und gerenderter Tabelle, Tipps speziell zu Stufe 2 und einen Accessibility-Hinweis.
- Ausblick-Sektion zeigt nur noch Stufe 3 und 4.
- Sprachwechsel im laufenden Betrieb aktualisiert den Tab-Inhalt entsprechend.
- Stufe-1-Inhalt (vor dem Stufe-2-Block) unverändert.

## Bezug zu Dateien

- `src/i18n/help/scg-table.de.md`
- `src/i18n/help/scg-table.en.md`
- `src/i18n/help/scg-table.fr.md`
- `src/i18n/help/scg-table.es.md`
- `src/i18n/help/scg-table.it.md`

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
