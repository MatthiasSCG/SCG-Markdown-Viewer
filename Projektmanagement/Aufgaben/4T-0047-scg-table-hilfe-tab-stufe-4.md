# 4T-0047 — Hilfe-Tab um Sortierung, Status-Hervorhebung und Spalten-Default erweitern

**Status**: Erledigt — 2026-05-19, gepushed (Commit `d049529`)
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

Umgesetzt am 2026-05-19, Test bestanden.

### Hilfe-Tab-Inhalt (5 Sprachen)

In den fünf Hilfe-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) eingefügt **zwischen** „Verschachtelte Tabellen und HTML-Export" und „Tipps":

- **Neue Sektion „Sortierung, Status-Hervorhebung und Spalten-Default"** mit drei Unterabschnitten:
  1. Status-Hervorhebung: Tabelle der fünf Klassen, Beispiel mit Zeilen- und Zell-Status; Override-Hinweis.
  2. Spalten-Default-Ausrichtung: `{|+cols="…"`-Syntax, Hinweis auf Zell-Override und colspan-Verhalten.
  3. Sortierbare Tabellen: `{|+sortable`-Syntax, Klick-Zyklus, Sort-Heuristik, Datum-Hinweis, Hinweis zur automatischen Deaktivierung bei Spans, Hinweis zum portablen Export ohne Sortierung.
- **Ausblick-Block** durch „Stand der Funktionen" ersetzt (lokales Äquivalent in jeder Sprache). Kurzer Abschluss-Hinweis, dass der geplante Funktionsumfang erreicht ist; keine offenen Erweiterungen mehr.

### Funktions-Eintrag im Hilfe-Dialog

- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**: neuer Eintrag `help.feature.scgTableExtended` in `HELP_FEATURE_GROUPS` Gruppe „Bearbeitung", direkt nach `scgTable`. Beschreibt die drei neuen Funktionen kompakt und verweist auf den SCG-Table-Tab.
- **5 i18n-Dateien** (`src/i18n/{de,en,fr,es,it}.json`): neuer Key `help.feature.scgTableExtended` mit Beschreibung der drei Funktionen plus Querverweis auf den Tab.

### Smoke-Test (2026-05-19)

- Hilfe-Tab „SCG Table" zeigt neue Sektion an der richtigen Stelle, drei Unterabschnitte sichtbar.
- Status-Hervorhebung: Beispiel-Tabelle rendert mit echten Farben.
- Spalten-Default: Beispiel-Tabelle zeigt die rechtsbündige Wirkung.
- Sortierbare Tabelle im Hilfe-Tab ist anklickbar; Sortierung funktioniert direkt in der Hilfe.
- Stand-der-Funktionen-Abschluss am Ende statt Ausblick-Block.
- Sprachwechsel: alle fünf Sprachen zeigen die neue Sektion.
- Funktions-Tab → Gruppe „Bearbeitung" → neuer `scgTableExtended`-Eintrag nach `scgTable`.

Alle Punkte bestanden.
