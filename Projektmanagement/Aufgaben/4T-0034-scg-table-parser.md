# 4T-0034 — Parser und Renderer für scg-table (Stufe 1: Basis-Tabelle)

**Status**: Wartet auf Test
**Epic**: [3E-0006 — SCG Table](3E-0006-scg-table.md)
**Zielversion**: 0.12.0

## Warum

Pipe-Tabellen erlauben nur einzeilige Zelleninhalte. Geschachtelte Listen, Nummerierungen und Absätze in Tabellenzellen sind nicht abbildbar. Pandoc Grid Tables wären eine Standard-Alternative, sind aber im Editieren mühsam (ASCII-Rahmen-Wartung). MediaWiki-Tabellen-Syntax (`{| … |- … |}`) ist linear und ohne Rahmenwartung editierbar.

Dieser Task implementiert die Basis-Tabelle (Stufe 1 des Epics 3E-0006): Tabellen-Container, Zeilen, Datenzellen, Header-Zellen, Caption. Eingebettet als Fenced-Code-Block mit Sprach-Tag `scg-table`, damit `.md`-Dateien in fremden Markdown-Renderern als Code-Block lesbar bleiben.

## Lösungsansatz

### Syntax (Stufe 1)

Beispiel einer minimalen scg-table:

````````
````scg-table
{|
|+ Optionale Tabellen-Caption
|-
! Header A
! Header B
|-
| Zelle A1 mit geschachteltem Inhalt:

- Listenpunkt 1
- Listenpunkt 2
  - Unterpunkt 2.1
| Zelle B1
|-
| Zelle A2 mit
mehrzeiligem Text und einem Code-Block:

```bash
ls -la
```
| Zelle B2
|}
````
````````

**Regeln:**

- Äußere Fence: vier Backticks (oder mehr), damit innen Code-Blöcke mit drei Backticks zulässig sind.
- `{|` öffnet die Tabelle. Inhalt nach `{|` auf derselben Zeile wird in Stufe 1 ignoriert.
- `|+` (direkt nach `{|`, vor dem ersten `|-`) ist die Caption. Rest der Zeile bis Zeilenende ist Caption-Inhalt.
- `|-` trennt Zeilen. Jede neue Tabellenzeile beginnt mit `|-` am Zeilenanfang.
- `|` startet eine Datenzelle, `!` eine Header-Zelle. Inhalt ist alles bis zum nächsten `|`, `!`, `|-` oder `|}` am Zeilenanfang.
- `|}` schließt die Tabelle.
- Eine Zelle pro Quellzeile-Start. Mehrzeilige Zellen entstehen durch Folgezeilen ohne führendes `|`/`!`/`|-`/`|}` — diese gehören zur laufenden Zelle.

**Nicht in Stufe 1 (siehe Epic 3E-0006):** `||`/`!!`-Shorthand, Tabellen- und Zell-Level-Attribute, `colspan`/`rowspan`, Ausrichtung, verschachtelte scg-table.

### Integration in markdown-it

In [src/main/preload.js](../../src/main/preload.js):

1. **Vor** dem `md.use(...)`-Block, **nach** der `md`-Instanziierung, den fence-Renderer wrappen:

   ```javascript
   const defaultFenceRenderer = md.renderer.rules.fence;
   md.renderer.rules.fence = function (tokens, idx, options, env, self) {
     const token = tokens[idx];
     const info = (token.info || '').trim();
     const lang = info.split(/\s+/g)[0];
     if (lang === 'scg-table') {
       const html = renderScgTable(token.content, md);
       if (html) return html;
       // Fallback: scg-table-Syntax nicht erkennbar, als regulaerer Code-Block
       // rendern, damit der Block sichtbar bleibt und kein Fehler entsteht.
     }
     return defaultFenceRenderer
       ? defaultFenceRenderer.call(this, tokens, idx, options, env, self)
       : self.renderToken(tokens, idx, options);
   };
   ```

2. Die Funktion `renderScgTable(content, md)` als eigenes Modul-Level-Function im Preload anlegen. Aufgaben:
   1. Inhalt in Zeilen splitten (`split(/\r?\n/)`).
   2. Erste signifikante Zeile suchen: muss `{|` sein. Sonst `null` zurückgeben (Fallback auf Standard-Fence).
   3. Iteration ab der `{|`-Zeile:
      - Caption-Zeile (`|+ …`) sammelt Caption-Inhalt bis zum Zeilenende.
      - `|-` schließt die aktuelle Zeile ab und startet eine neue.
      - `|` startet eine Datenzelle, `!` eine Header-Zelle.
      - Jede andere Zeile gehört zur zuletzt gestarteten Zelle (mehrzeiliger Inhalt).
      - `|}` beendet die Tabelle.
   4. Pro Zelle wird der gesammelte Inhalt durch `md.render(cellContent)` rekursiv geparst und als HTML eingebettet.
   5. Whitespace-Trimming: Anfangs-/End-Leerzeilen pro Zelle entfernen.
   6. HTML-Struktur erzeugen:
      - `<table class="scg-table">`
      - Optional `<caption>…</caption>` (Caption-Inhalt auch durch `md.renderInline` für Inline-Formatierung).
      - Erste Tabellenzeile in `<thead>`, wenn sie nur Header-Zellen (`!`) enthält. Sonst direkt in `<tbody>`.
      - `<th>` für Header-Zellen, `<td>` für Datenzellen.
      - Schließendes `</table>`.

3. Hilfs-Funktion `escapeHtml` kann aus dem bestehenden Code (Zeile 71 ff. in preload.js) wiederverwendet werden, ist bereits dort definiert. Caption- und Klassennamen-Strings durch `escapeHtml` schützen.

### Edge-Case-Verhalten

- **Fehlende `{|`-Zeile:** `renderScgTable` gibt `null` zurück, der Override fällt auf den Default-Fence-Renderer zurück. Der Block wird als Code-Block angezeigt.
- **Fehlende `|}`-Zeile:** Tabelle wird bis zum Ende des Block-Inhalts gerendert. Nach der letzten Zelle wird sauber `</tr></tbody></table>` geschlossen.
- **Leere Zelle (`|` ohne Inhalt):** rendert als `<td></td>` bzw. `<th></th>`.
- **Leere Tabelle (`{| |}` ohne Zeilen):** rendert als leere `<table class="scg-table"></table>`.
- **Whitespace:** Anfangs-/End-Whitespace pro Zelle wird gestrippt, damit der Markdown-Parser den Inhalt korrekt als Block-Inhalt interpretiert (sonst können führende Spaces als Codeblock-Einrückung missinterpretiert werden).

### CSS

In [src/renderer/styles.css](../../src/renderer/styles.css) ergänzen:

```css
.scg-table {
  /* erbt vom bestehenden table-Stil */
}
.scg-table caption {
  font-style: italic;
  padding: 0.4em 0;
  caption-side: top;
}
```

Falls die bestehenden `table`-Regeln in der Datei sehr spezifisch sind, ggf. die `.scg-table`-Klasse an die passenden Selektoren mit ankoppeln. Wird beim Implementieren konkret entschieden.

### Akzeptanz-Smoke-Tests

1. **Minimale Tabelle:** 2 Spalten, 2 Datenzeilen, ein Header. Rendert mit `<thead>` und `<tbody>` und allen Zellen sichtbar.
2. **Caption:** `|+ Test` rendert als `<caption>Test</caption>` über der Tabelle.
3. **Mehrzeilige Zelle mit geschachtelter Liste:** Eine Zelle enthält eine ungeordnete Liste mit zwei Ebenen. Die Liste wird in der Zelle korrekt eingerückt gerendert.
4. **Mehrzeilige Zelle mit nummerierter Liste:** Eine Zelle enthält eine geordnete Liste mit zwei Ebenen. Nummerierung erscheint korrekt.
5. **Zelle mit Code-Block:** Äußere Fence vier Backticks, innen ein Code-Block mit drei Backticks und Sprach-Tag (z.B. `bash`). Code-Block wird mit Syntax-Highlighting in der Zelle gerendert.
6. **Mehrere Absätze in einer Zelle:** zwei durch Leerzeile getrennte Absätze. Beide werden als `<p>` gerendert.
7. **Inline-Formatierung in Zelle:** `**fett**`, `*kursiv*`, `` `code` ``, `[Link](Ziel.md)`, `[[Wiki]]` funktionieren in Zellen.
8. **Fehlertoleranz:** Block mit `scg-table`-Tag aber ohne `{|` rendert als regulärer Code-Block, kein Crash.
9. **Andere Sprach-Tags unbeeinflusst:** ` ```bash `, ` ```python ` etc. werden weiterhin mit Highlight gerendert, nicht als Tabelle.
10. **Theme-Wechsel:** Tabelle bleibt im Light- und Dark-Theme lesbar (Rahmen, Caption-Farbe).

## Akzeptanzkriterien

- Ein Fenced-Code-Block mit Sprach-Tag `scg-table` und gültiger `{| … |}`-Syntax wird als HTML-Tabelle mit Klasse `scg-table` gerendert.
- Mehrzeilige Zellen mit geschachtelten Listen, Absätzen und Code-Blocks werden korrekt innerhalb der Tabellenzellen dargestellt.
- Header-Zellen (`!`) erscheinen als `<th>` in `<thead>`, Datenzellen (`|`) als `<td>` in `<tbody>`.
- Caption (`|+ Text`) erscheint als `<caption>Text</caption>` über der Tabelle.
- Code-Blöcke ohne `scg-table`-Tag bleiben unverändert (Standard-Highlighting wie bisher).
- Tabelle mit fehlerhafter Syntax (kein `{|`) wird als regulärer Code-Block ohne Crash angezeigt.
- Inline-Formatierung, Wiki-Links und Bilder in Zellen funktionieren.
- Theme-Wechsel verändert die Tabellen-Darstellung nicht negativ.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `md.renderer.rules.fence`-Override, `renderScgTable`-Funktion, Hilfs-Funktionen für Zeilenparsing und HTML-Generierung.
- [src/renderer/styles.css](../../src/renderer/styles.css) — minimale Ergänzung für `.scg-table caption`.

## Lösung

Umgesetzt am 2026-05-19, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**: drei neue Modul-Level-Funktionen `renderScgTable(content)`, `buildScgTableHtml(caption, rows)`, `renderScgTableRow(row)` plus `md.renderer.rules.fence`-Override. Eingehängt nach `md.use(wikiLinksPlugin)` und vor `resolveImagesForBase()`. Der Override speichert den default-fence-Renderer in `defaultFenceRenderer` und delegiert bei `lang !== 'scg-table'` an diesen, sodass Code-Highlighting via highlight.js unangetastet bleibt.
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: neuer Block direkt nach den bestehenden `table`-Regeln. `.markdown-body .scg-table caption` setzt `caption-side: top`, `font-style: italic`, gedämpfte Farbe und linke Ausrichtung. `.markdown-body .scg-table td, th` erhalten `vertical-align: top` für mehrzeilige Zellen. `td > p:first-child` und `:last-child` bekommen `margin: 0`, damit das von `md.render()` erzeugte umschließende `<p>` keine sichtbaren Margins erzeugt.
- **[package.json](../../package.json)**: Version 0.11.0 → 0.12.0 (Entwicklungsstand).

### Implementierungsdetails

- **Parser-Logik:** zeilenbasiert mit Zustandsmaschine. Erste signifikante Zeile muss `{|` sein, sonst gibt `renderScgTable` `null` zurück und der Override fällt auf den Default-Fence-Renderer (Code-Block) zurück. Innerhalb der Tabelle: `|+` setzt Caption (einzeilig in Stufe 1), `|-` startet eine neue Zeile, `!` und `|` starten Header- bzw. Datenzelle, `|}` schließt die Tabelle. Zeilen ohne Sonderzeichen am Zeilenanfang gehören zum laufenden Zellinhalt — Original-Zeile (nicht getrimmt) wird angehängt, damit Listen-Einrückung erhalten bleibt.
- **Render-Heuristik in Zellen:** einzeilige Zelle (kein `\n` im getrimmten Inhalt) → `md.renderInline()`, kein `<p>`-Wrapper, kompakte Optik. Mehrzeilige Zelle → `md.render()`, volle Block-Welt für Listen, Codeblöcke, mehrere Absätze.
- **`<thead>`-Detektion:** wenn die erste Zeile ausschließlich Header-Zellen (`!`) enthält, kommt sie in `<thead>`, der Rest in `<tbody>`. Gemischte erste Zeile bleibt komplett in `<tbody>`.
- **`vertical-align: top`** in Block-Zellen: Default `middle` wirkt bei mehrzeiligen Zellen unruhig, wenn benachbarte Zellen kurz sind.

### Smoke-Test (2026-05-19)

Sieben Test-Abschnitte im Render-Pane geprüft (minimale Tabelle mit Caption, geschachtelte Listen, Code-Block in Zelle mit Vier-Backtick-Außenfence, mehrere Absätze mit Inline-Formatierung, Tabelle ohne Header, Fehlertoleranz ohne `{|`, andere Sprach-Tags unbeeinflusst). Alle Punkte bestanden.

**Anmerkung zum Test-Lauf**: Im initialen Test-Dokument fehlten in zwei Abschnitten Zeilen-Trenner (`|-`), wodurch Zellen versehentlich auf einer Zeile statt in zwei Zeilen landeten. Das war ein Fehler im Test-Dokument, nicht in der Implementierung — der Parser hat MediaWiki-Semantik korrekt umgesetzt. Hinweis für die spätere Hilfe-Tab-Doku in [4T-0036](4T-0036-scg-table-hilfe-tab.md): die Pflicht zur `|-`-Trennzeile zwischen Tabellenzeilen explizit hervorheben.
