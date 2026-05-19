# 4T-0047 — Hilfe-Tab um Sortierung, Status-Hervorhebung und Spalten-Default erweitern

**Status**: Offen
**Epic**: [3E-0009 — SCG Table Stufe 4](3E-0009-scg-table-sortierung-status.md)
**Zielversion**: 0.15.0

## Warum

Mit [4T-0044](4T-0044-scg-table-status-hervorhebung.md) (Status-Hervorhebung), [4T-0045](4T-0045-scg-table-spalten-default.md) (Spalten-Default-Ausrichtung) und [4T-0046](4T-0046-scg-table-sortierbar.md) (Sortierbare Tabellen) kommen drei neue User-sichtbare Funktionen. Im Hilfe-Tab „SCG Table" müssen sie dokumentiert sein, sonst sind sie schwer entdeckbar.

Analog zur Konvention seit [4T-0038](4T-0038-scg-table-hilfe-tab-stufe-2.md): kein Stufen-Begriff im Heading.

## Lösungsansatz

### Neue Sektion „Sortierung, Status-Hervorhebung und Spalten-Default"

Position: in allen fünf Hilfe-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) **zwischen** „Verschachtelte Tabellen und HTML-Export" und „Tipps".

Inhaltsgliederung:

1. **Einleitung** — drei Sätze, was die neuen Funktionen leisten.
2. **Status-Hervorhebung**: Punkt-Notation `|.error`, Whitelist (`error`/`warn`/`ok`/`info`/`neutral`), Beispiel mit gerendeter Tabelle. Hinweis: Zeilen-Status mit `|-.error`.
3. **Spalten-Default-Ausrichtung**: `{|+cols="left right right"`-Syntax, Beispiel mit gerendeter Tabelle. Hinweis: Zell-Override gewinnt.
4. **Sortierbare Tabellen**: `{|+sortable` aktiviert; Klick-Verhalten (auf/ab/reset), Sort-Heuristik (numerisch zuerst, dann Locale-basiert), Datum-Hinweis (ISO sortiert korrekt). Hinweis: nicht kombinierbar mit `colspan`/`rowspan`.

### Funktions-Eintrag im Hilfe-Dialog

Ein neuer Funktions-Eintrag in `HELP_FEATURE_GROUPS` ([src/renderer/renderer.js](../../src/renderer/renderer.js)):

- **Key**: `help.feature.scgTableExtended`
- **Gruppe**: „Bearbeitung" (wo auch `scgTable` steht; semantisch passt es zur Inhaltsbearbeitung)
- **Text** (in fünf Sprachen): kurze Beschreibung der drei Funktionen und Verweis auf den SCG-Table-Tab.

### Ausblick-Sektion anpassen

Der Ausblick-Block am Ende der Datei enthält in 0.14.0 noch eine offene Erweiterung („Sortierung, Status-Hervorhebung, Spalten-Default"). Mit 0.15.0 ist diese umgesetzt. **Vorschlag**: den Ausblick-Block ganz entfernen oder durch einen einzeiligen Hinweis ersetzen wie „Damit ist der aktuell geplante Funktionsumfang erreicht."

### Pflege in fünf Sprachen

DE (Master), EN, FR, ES, IT mit identischer Struktur, Texte übersetzt, Beispiele inhaltsneutral (z.B. Variante/Preis/Status statt fachspezifischer Begriffe).

### Akzeptanz-Smoke-Tests

1. Hilfe-Tab „SCG Table" zeigt neue Sektion an der richtigen Stelle (zwischen Verschachtelung-HTML-Export und Tipps).
2. Status-Hervorhebungs-Beispiel rendert mit echten Farben.
3. Spalten-Default-Beispiel zeigt die Wirkung visuell.
4. Sortierbare-Tabelle-Beispiel ist anklickbar; Sortierung funktioniert.
5. Sprachwechsel funktioniert; neue Sektion erscheint in allen fünf Sprachen.
6. Funktions-Tab → Gruppe „Bearbeitung" zeigt den neuen `scgTableExtended`-Eintrag.
7. Ausblick-Sektion ist reduziert oder entfernt.

## Akzeptanzkriterien

- Alle fünf Hilfe-Markdown-Dateien haben neue Sektion „Sortierung, Status-Hervorhebung und Spalten-Default" zwischen Verschachtelung-Sektion und Tipps.
- Drei Unterabschnitte (Status, Spalten-Default, Sortierung) mit jeweils Syntax-Erklärung und gerendetem Beispiel.
- Funktions-Eintrag `help.feature.scgTableExtended` in der Gruppe „Bearbeitung" mit Querverweis auf den Tab.
- Ausblick-Sektion entfernt oder durch Abschluss-Hinweis ersetzt.

## Bezug zu Dateien

- `src/i18n/help/scg-table.{de,en,fr,es,it}.md` — alle fünf Sprachdateien erweitern.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — `HELP_FEATURE_GROUPS` um `scgTableExtended` erweitern.
- [src/i18n/{de,en,fr,es,it}.json](../../src/i18n) — neuer Key `help.feature.scgTableExtended` in fünf Sprachen.

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
