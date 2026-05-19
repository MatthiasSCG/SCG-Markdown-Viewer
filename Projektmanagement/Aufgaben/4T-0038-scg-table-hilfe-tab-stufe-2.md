# 4T-0038 — Hilfe-Tab um Stufe-2-Doku erweitern

**Status**: Erledigt — 2026-05-19, gepushed (Commit `e893b1c`)
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

Umgesetzt am 2026-05-19, Test bestanden.

### Inhaltliche Änderungen pro Sprachdatei

In allen fünf Hilfe-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) wurde eine neue Sektion eingefügt zwischen „Erweitertes Beispiel mit Listen und Code-Block" und „Tipps". Inhalt:

- **Einleitungssatz** mit Versionshinweis 0.13.0.
- **Übersichts-Tabelle** der vier Attribute (`colspan`, `rowspan`, `align`, `valign`) mit erlaubten Werten und Wirkung — als Pipe-Tabelle.
- **Beispiel** „Aufwandsschätzung" mit `rowspan="2"`, `align="right"` und `colspan="2" align="center"`. Erst der Quelltext-Block (Vier-Backtick-Außenfence), darunter die echte gerenderte Tabelle.
- **Tipps-Sub-Block** mit drei Bullets: beliebige Reihenfolge der Attribute, stillschweigend ignorierte ungültige Werte, Verhalten ohne Attribut-Block.
- **Accessibility-Sub-Block** mit Erklärung der automatischen `scope`-Setzung auf `<th>`.

Ausblick-Sektion am Dateiende: Stufe-2-Bullet entfernt (jetzt umgesetzt), Stufe-3-Bullet um „verschachtelte SCG-Tabellen" ergänzt, neue Stufe-4-Beschreibung hinzugefügt.

### Iteration auf User-Wunsch

Im ersten Wurf trug die neue Sektion noch einen „Stufe 2"-Präfix im Heading (analog zu den Folge-Stufen-Begriffen aus dem PM). Der Nutzer hat das im Test-Schritt zurückgewiesen: aus User-Sicht sind die Stufen-Begriffe verwirrend, weil sie sich auf projekt-interne Entwicklungs-Phasen beziehen, die für die Bedienung irrelevant sind. Anpassung in einer zweiten Iteration:

- **Heading** „Stufe 2: Spans und Ausrichtung" → „Spans und Ausrichtung" (analog in allen fünf Sprachen).
- **Sub-Heading** „Tipps zu Stufe 2" → „Tipps zu Spans und Ausrichtung".
- **Bullet** „Stufe 1 bleibt unverändert: …" → „Zellen ohne Attribut-Block rendern unverändert wie bisher."
- **Ausblick-Bullets**: Stufen-Nummern durch beschreibende Namen ersetzt — „HTML-Konverter und verschachtelte Tabellen" und „Sortierung, Status-Hervorhebung und Spalten-Default".

Aus der User-Hilfe ist damit kein Stufen-Begriff mehr sichtbar. Aus PM-Sicht bleibt die Stufen-Logik in den Epic- und Task-Dokumenten erhalten — das ist eine andere Ebene und passt so.

### Smoke-Test (2026-05-19)

- Hilfe-Dialog → Tab „SCG Table" → neue Sektion sichtbar an der richtigen Stelle (zwischen Erweitertem Beispiel und Tipps).
- Übersichts-Tabelle rendert korrekt als Pipe-Tabelle.
- Stufe-2-Beispiel rendert mit echtem `colspan`, `rowspan` und `align`.
- Sprachwechsel im laufenden Betrieb aktualisiert den Tab-Inhalt; alle fünf Sprachen zeigen die neue Sektion mit korrekten Übersetzungen.
- Ausblick zeigt nur noch zwei beschreibende Bullets, keine Stufen-Nummern.
- Bestehender Stufe-1-Inhalt unverändert.
