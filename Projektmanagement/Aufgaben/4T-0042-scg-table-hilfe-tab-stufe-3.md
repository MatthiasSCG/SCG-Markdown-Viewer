# 4T-0042 — Hilfe-Tab um Verschachtelung und HTML-Export erweitern

**Status**: Offen
**Epic**: [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)
**Zielversion**: 0.14.0

## Warum

Mit [4T-0040](4T-0040-scg-table-verschachtelung.md) (verschachtelte SCG-Tabellen) und [4T-0041](4T-0041-scg-table-html-konverter.md) (HTML-Konverter) kommen zwei neue User-sichtbare Funktionen, die im Hilfe-Tab „SCG Table" dokumentiert werden müssen. Sonst sind sie schwer entdeckbar.

Analog zur Konvention seit [4T-0038](4T-0038-scg-table-hilfe-tab-stufe-2.md): kein Stufen-Begriff im Heading. Die neue Sektion heißt „Verschachtelte Tabellen und HTML-Export".

## Lösungsansatz

### Strukturelle Einordnung

In den fünf bestehenden Hilfe-Inhaltsdateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`) wird eine neue Sektion **„Verschachtelte Tabellen und HTML-Export"** eingefügt, **vor** „Tipps" und **nach** „Spans und Ausrichtung".

Im **Ausblick-Block** am Ende der Datei: Bullet „HTML-Konverter und verschachtelte Tabellen" entfernen (jetzt umgesetzt). Bullet „Sortierung, Status-Hervorhebung und Spalten-Default" bleibt als verbleibender Ausblick.

### Inhaltsgliederung der neuen Sektion

1. **Einleitung**: ein bis zwei Sätze, was die zwei neuen Funktionen leisten.
2. **Verschachtelte Tabellen**:
   - Erklärung der Fence-Längen-Regel (jede äußere Fence mindestens eine Backtick mehr als die nächste innere; CommonMark-Standard).
   - Tiefen-Limit: max. 3 Ebenen, darüber wird der Block als Code-Block angezeigt.
   - Konkretes Beispiel mit zwei Ebenen (äußere Fence 4 Backticks, innere 3 Backticks). Quelltext-Block plus gerenderte Tabelle, in der die innere Tabelle echt verschachtelt rendert.
3. **HTML-Export**:
   - Menü-Pfad: „Datei → Exportieren → Portables Markdown…".
   - Save-As-Dialog mit Vorbelegung `<basename>-portable.md`.
   - Was passiert: `scg-table`-Codeblocks in der Datei werden durch HTML-Tabellen ersetzt, sodass die exportierte Datei in fremden Markdown-Renderern (GitHub, VS Code) als echte Tabelle erscheint.
   - Hinweis: die Original-Datei bleibt unverändert.

### Pflege in allen fünf Sprachen

- DE (Master), EN, FR, ES, IT mit identischer Struktur.
- Stufen-Begriffe weglassen (User-Sicht, etablierte Konvention).
- Verschachtelungs-Beispiel im Quelltext-Block (mit `markdown`-Fence-Tag) und als echte gerenderte Tabelle direkt darunter.

### Tab-Inhalt-Struktur nach 0.14.0

In der Reihenfolge:

1. Einleitung (was ist SCG Table)
2. Grundsyntax (Tabelle der Sonderzeichen)
3. Minimales Beispiel
4. Erweitertes Beispiel mit Listen und Code-Block
5. Spans und Ausrichtung (aus 0.13.0)
6. **Verschachtelte Tabellen und HTML-Export** (neu in 0.14.0)
7. Tipps
8. Portabilität
9. Ausblick (nur noch eine offene Erweiterung)

### Akzeptanz-Smoke-Tests

1. Hilfe-Tab „SCG Table" zeigt neue Sektion an richtiger Stelle (zwischen „Spans und Ausrichtung" und „Tipps").
2. Verschachtelungs-Beispiel rendert tatsächlich rekursiv (äußere und innere Tabelle als HTML).
3. HTML-Export-Erklärung ist lesbar; Menü-Pfad und Save-Verhalten beschrieben.
4. Sprachwechsel im laufenden Betrieb aktualisiert den Tab-Inhalt.
5. Ausblick zeigt nur noch eine offene Erweiterung (Sortierung, Status-Hervorhebung, Spalten-Default).
6. Bestehender Inhalt (Stufe 1 + Spans und Ausrichtung) unverändert.

## Akzeptanzkriterien

- Alle fünf Hilfe-Markdown-Dateien haben neue Sektion „Verschachtelte Tabellen und HTML-Export" in der korrekten Position.
- Verschachtelungs-Beispiel rendert exemplarisch (echte verschachtelte Tabelle, nicht nur Quelltext).
- HTML-Export-Bedienung ist beschrieben (Menü-Pfad, Save-As-Verhalten).
- Ausblick auf eine verbleibende Erweiterung reduziert.
- Sprachwechsel funktioniert.
- Bestehender Inhalt unverändert.

## Bezug zu Dateien

- `src/i18n/help/scg-table.de.md` — Master.
- `src/i18n/help/scg-table.en.md`
- `src/i18n/help/scg-table.fr.md`
- `src/i18n/help/scg-table.es.md`
- `src/i18n/help/scg-table.it.md`

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
