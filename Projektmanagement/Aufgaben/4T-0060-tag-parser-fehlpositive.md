# 4T-0060 — Tag-Parser-Fehlpositive bei Hex-Farbcodes, Zahlen und Markdown-Anker-Links

**Status**: Erledigt — 2026-05-20, in v0.17.1 ausgeliefert
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.1 (Hotfix)
**Vorgängerversion**: 0.17.0
**Setzt voraus**: [4T-0056](4T-0056-tag-system.md)

## Warum

In 0.17.0 wurden im Praxis-Einsatz mehrere Klassen von **Fehlpositiven** in der Tag-Sidebar sichtbar:

1. **Hex-Farbcodes** wie `#ffffff`, `#c0392b`, `#ff7b72`, `#fff`, `#ffeeee` aus CSS-Snippets oder Farb-Notationen im Fließtext werden als Tag indexiert.
2. **Reine Zahlen** wie `#16444`, `#2`, `#31999` (Issue-Referenzen, Fußnoten, Zeilennummern) werden als Tag indexiert.
3. **Markdown-Anker-Links** der Form `[Text](#anker)` werden als Tag indexiert. Ursache: der Tag-Parser in [src/main/backlinks.js](../../src/main/backlinks.js) läuft zeilenweise auf dem Rohtext (ohne markdown-it). Der negative Look-behind `(?<![\p{L}\p{N}_#])` schließt `(` nicht aus, weil `(` ein nicht-Wort-Zeichen ist. Damit landen alle `(#…)`-Vorkommen im Tag-Index.
4. **Inline-Code-Tags** wie `` `#btn-about` ``, `` `#help-modal` ``, `` `#settings-modal` `` (CSS-/HTML-Selektor-Beispiele in PM-Doku) werden als Tag indexiert. Ursache: der Tag-Parser kennt im Backlinks-Index nur Fenced-Code-Blöcke, nicht Inline-Code-Spans. Im Render-Pane filtert markdown-it diese Treffer korrekt aus; im Index fehlt der Schutz.

Im **Render-Pane** ist das Bild deutlich besser, weil markdown-it den `link`-Token vor dem `tag`-Token konsumiert. Aber der **Index** (und damit Tag-Sidebar plus Autocomplete) läuft am Render-Pfad vorbei.

Obsidian-Verhalten zum Vergleich:
- Tags müssen mindestens ein nicht-numerisches Zeichen enthalten.
- Hex-Farbcodes (`#fff`, `#ffffff` etc.) werden ausgefiltert.
- Markdown-Link-Ziele werden nicht als Tag erkannt.

## Lösungsansatz

Vier Filter zusätzlich zum bestehenden Pattern, jeweils in `backlinks.js` (Index) und `preload.js` (Render-Pane):

1. **Mindestens ein Buchstabe** im Tag-Text. Schließt reine Zahlen aus. Test: `/[\p{L}]/u.test(tag)`.
2. **Hex-Code-Ausschluss**: Tag-Text matched `^[0-9a-f]{3,8}$` (case-insensitive). Schließt 3-, 4-, 6- und 8-stellige Hex-Codes aus. Andere Längen sind keine valide CSS-Hex-Notation.
3. **Markdown-Link-Ziel-Ausschluss**: negativer Look-behind `(?<!\]\()` zusätzlich zum bestehenden. Schließt `[Text](#anker)` aus.
4. **Inline-Code-Maskierung** (nur Index in `backlinks.js`): Vor dem Tag-Match werden Inline-Code-Spans `` `…` `` aus der Zeile mit Leerzeichen maskiert. So fallen Tags innerhalb von Inline-Code aus dem Match-Bereich. Im Render-Pane (`preload.js`) ist das nicht nötig, weil markdown-it Inline-Code vor dem Tag-Ruler tokenisiert.

### Akzeptanz-Smoke-Tests

1. `#projekt`, `#projekt/x`, `#a/b`, `#mein-heading`, `#x` werden weiterhin als Tag erkannt (echte Tags mit Buchstaben).
2. `#16444`, `#2`, `#31999` werden NICHT als Tag erkannt (reine Zahlen).
3. `#ffffff`, `#fff`, `#c0392b`, `#ff7b72`, `#ffeeee` werden NICHT als Tag erkannt (Hex-Codes).
4. `[Btn About](#btn-about)` führt nicht zu `#btn-about` im Tag-Index.
5. `` `#btn-open` `` in Inline-Code wird NICHT mehr indexiert (vorher Karteileiche in der Sidebar).
6. Fenced-Code-Blöcke bleiben weiterhin ausgeschlossen.
7. „Die Sektion #section beschreibt das" (echter Inline-Tag im Fließtext, nicht in Backticks) wird weiterhin als Tag erkannt — Konvention konsistent mit Obsidian.

## Akzeptanzkriterien

- Filter in [src/main/backlinks.js](../../src/main/backlinks.js) (`TAG_RE` plus Post-Match-Filter) und [src/main/preload.js](../../src/main/preload.js) (`tagsPlugin`-Tokenizer).
- Tag-Sidebar zeigt nach Refresh keine Hex-Codes, keine reinen Zahlen, keine Markdown-Anker-Link-Ziele mehr.
- Bestehende echte Tags bleiben erkannt.
- Bestehende Tests/Smoke-Pfade bleiben grün.

## Bezug zu Dateien

- [src/main/backlinks.js](../../src/main/backlinks.js) — `TAG_RE` und Filter in der Tag-Sammelschleife.
- [src/main/preload.js](../../src/main/preload.js) — `tagsPlugin`-Tokenizer.
- [package.json](../../package.json) — Version 0.17.0 → 0.17.1.
- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block `## [0.17.1] - JJJJ-MM-TT — Tag-Parser-Hotfix`.
- `dist/release-notes-0.17.1.md` — Hotfix-Release-Notes.

## Lösung

Umgesetzt am 2026-05-20 als Hotfix-Release v0.17.1.

### Code-Änderungen

- **[src/main/backlinks.js](../../src/main/backlinks.js)**:
  - `TAG_RE` um den negativen Look-behind `(?<!\]\()` erweitert — schließt Markdown-Anker-Link-Ziele aus.
  - Neue Konstanten `HEX_COLOR_RE` und `TAG_LETTER_RE` plus Helfer-Funktion `isValidTag(tag)`, die Slash-Randlagen, reine Zahlen und Hex-Farbcodes ausfiltert.
  - In der Tag-Sammel-Schleife in `parseFile`: Inline-Code-Spans werden vor dem Tag-Match maskiert. Zwei Pässe: zuerst Doppel-Backticks mit innerem Single-Backtick-Schutz (`/`` (?:[^`\n]|`(?!`))+?`` /g`), dann Single-Backticks (`/`[^`\n]+`/g`). Die Reihenfolge ist wichtig, weil der Single-Pass allein die inneren Backticks eines Doppel-Backtick-Spans fehlinterpretieren würde.
- **[src/main/preload.js](../../src/main/preload.js)**: `tagsPlugin`-Tokenizer um drei Filter erweitert:
  - Markdown-Anker-Link-Position prüfen (`](` vor `#`).
  - Mindestens-ein-Buchstabe-Prüfung (`HAS_LETTER`-Regex).
  - Hex-Code-Ausschluss (`HEX_COLOR`-Regex, 3 bis 8 Hex-Zeichen).
  - Inline-Code-Schutz übernimmt markdown-it bereits durch die Token-Reihenfolge (Code wird vor Inline-Rulern parsed).

### Test-Iterationen

Drei Build-Iterationen mit Nutzer-Test:

1. **Erste Iteration**: Hex-Codes, reine Zahlen und Markdown-Anker-Link-Ziele wurden gefiltert. CSS-Selektor-Beispiele in Inline-Code blieben sichtbar (z.B. `#btn-about`).
2. **Zweite Iteration**: Inline-Code-Maskierung für Single-Backticks ergänzt. Doppel-Backtick-Spans aus der eigenen Hotfix-Doku-Datei (`` `` `#btn-open` `` ``) blieben weiter im Index, weil das Doppel-Backtick-Pattern keine inneren Single-Backticks zuließ.
3. **Dritte Iteration**: Doppel-Backtick-Regex auf `/`` (?:[^`\n]|`(?!`))+?`` /g` korrigiert, sodass innere Single-Backticks erlaubt sind. Tag-Sidebar zeigt jetzt nur noch echte Tags plus Fließtext-`#section`-Vorkommen (Obsidian-konforme Erkennung außerhalb von Code-Spans).

### Smoke-Test (2026-05-20)

Vom Nutzer mit der Portable-EXE verifiziert. Sidebar nach Hotfix:

- **Verschwunden**: Hex-Codes (`#ffffff`, `#c0392b`, `#ff7b72` etc.), reine Zahlen (`#16444`, `#2`, `#31999`), Markdown-Anker-Link-Ziele (`#btn-*`, `#help-modal`, `#settings-modal` etc. aus `[Text](#anker)`-Notationen), Inline-Code-Tags (Single- und Doppel-Backticks).
- **Erhalten**: Echte Tags im Fließtext und in der Frontmatter (`#projekt`, `#projekt/x`, `#a/b`, `#section` aus Fließtext-Beispielen).
