# 4T-0049 — Frontmatter-Erkennung und Render-Ausschluss

**Status**: Erledigt — 2026-05-20, Test bestanden
**Epic**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md)
**Zielversion**: 0.16.0

## Warum

YAML-Frontmatter ist in Obsidian, Jekyll, Hugo, GitHub und anderen Markdown-Welten der De-facto-Standard für Datei-Metadaten. Aktuell rendert die App den `---`-Block am Datei-Anfang als horizontale Trennlinie und stellt die YAML-Zeilen darunter als Klartext dar. Optisch stört das in jeder Frontmatter-haltigen Datei, semantisch ist es falsch.

Dieser Task ist die Grundlage für die beiden anderen Code-Tasks im Epic: ohne sauber erkannten Frontmatter-Block können weder Aliases ([4T-0050](4T-0050-aliases-aufloesung.md)) noch Properties-Editor ([4T-0051](4T-0051-properties-editor.md)) funktionieren.

## Lösungsansatz

### Frontmatter-Parser im Preload

In [src/main/preload.js](../../src/main/preload.js) wird vor dem `md.render()`-Aufruf eine neue Hilfsfunktion `extractFrontmatter(text)` aufgerufen:

- Prüft, ob der Text mit `---\n` beginnt (Zeile 1).
- Sucht ab Zeile 2 die nächste Zeile, die exakt `---` oder `...` enthält.
- Falls beide gefunden: extrahiert den Block dazwischen und parst ihn mit der gewählten YAML-Library.
- Gibt `{ raw, data, body }` zurück: `raw` ist der originale Frontmatter-Text inkl. Trennzeichen, `data` das geparste Objekt, `body` ist der Markdown-Text ab dem Ende des Frontmatter-Blocks.
- Falls kein Frontmatter erkannt: gibt `{ raw: null, data: null, body: text }` zurück.

Der bestehende Render-Pfad ruft danach `md.render(body)` auf statt `md.render(text)`. Der Renderer im Frontend bekommt zusätzlich das `data`-Objekt mitgereicht (über die bestehende IPC-Schnittstelle bzw. das `window.api`-Object).

### YAML-Library

`js-yaml` als Default-Wahl. Tolerant gegen Eingabefehler (gibt bei Parse-Fehler entweder partielles Ergebnis oder Exception, abhängig von Schema). Wir verwenden `yaml.load()` mit `safe`-Schema (kein Code-Eval).

Beim Task-Start kurz prüfen, ob `js-yaml` Round-Trip-fähig genug ist (Kommentare, Reihenfolge erhalten beim Schreiben). Falls nicht: Wechsel zu `yaml` (Library von Eemeli Aro) erwägen. Für diesen Task ist nur Lesen relevant; das Schreiben ist Sache von [4T-0051](4T-0051-properties-editor.md).

### Anzeige im Render-Pane

Default: Frontmatter wird im Render-Pane **nicht angezeigt**. Der Render-Pane beginnt mit dem ersten Element nach dem Frontmatter-Block.

Optional (Stretch-Goal in diesem Task, sonst 4T-0051): eine kompakte Properties-Box am Anfang des Render-Pane, die alle Top-Level-Felder als Key-Value-Liste zeigt. Read-only in 4T-0049, editierbar erst in 4T-0051. Bei sehr vielen Feldern (>10) eingeklappt.

Entscheidung beim Task-Start: ob die Read-only-Properties-Box hier schon mitkommt oder erst in 4T-0051.

### Anzeige im Source-Pane (CodeMirror)

Frontmatter-Block bleibt sichtbar und editierbar wie normaler Quelltext, aber mit eigener visueller Auszeichnung:

- Eigenes Decoration auf den drei `---`-Trennzeilen plus den dazwischenliegenden YAML-Zeilen.
- Dezenter Hintergrund (z.B. leicht abweichende Hintergrundfarbe), passend zum Light- und Dark-Theme.
- Optional: YAML-Highlighting innerhalb des Blocks (Keys vs. Values farblich getrennt). Aufwand vs. Nutzen beim Task-Start abwägen.

Implementierung über CodeMirror-Decoration. Die Erkennung des Block-Bereichs erfolgt anhand desselben Regex wie im Preload-Parser; eine kleine Hilfsfunktion liefert Start- und End-Zeile.

### Sonderfälle

- **Kein Frontmatter**: Render-Pane verhält sich wie bisher. Source-Pane ohne Decoration.
- **Unvollständiger Frontmatter-Block** (öffnendes `---` ohne schließendes): wird als regulärer Markdown-Inhalt behandelt, kein Parse-Versuch. Vermeidet, dass eine versehentlich angefangene Trennlinie das halbe Dokument schluckt.
- **Frontmatter mit Parse-Fehler**: `data` ist `null` oder enthält ein `__parseError`-Feld. Im Render-Pane wird statt der Properties-Box eine dezente Fehlermeldung gezeigt (z.B. „Frontmatter konnte nicht geparst werden: <message>"). Source-Pane bleibt unverändert editierbar.
- **`---` mitten im Dokument**: bleibt `<hr>`. Nur der erste Block ab Zeile 1 ist Frontmatter.
- **Frontmatter und Suche/Linter**: die bestehenden Linter-Regeln aus 4T-0020 und die Such-Treffer-Hervorhebung müssen weiter funktionieren. Linter darf Frontmatter-Zeilen nicht auf Markdown-Regeln prüfen (Frontmatter ist YAML, nicht Markdown). Such-Treffer im Frontmatter werden im Source-Pane angezeigt wie bisher.

### Akzeptanz-Smoke-Tests

1. Datei mit Standard-Frontmatter (`title`, `tags`, `date`) öffnen: Render-Pane zeigt das Dokument ohne `<hr>`-Linie und ohne YAML-Zeilen.
2. Source-Pane zeigt den Frontmatter-Block visuell abgesetzt.
3. Datei ohne Frontmatter: keine Veränderung zum bisherigen Verhalten.
4. Frontmatter mit fehlendem Schlusszeichen: keine Trennlinie geschluckt, Datei rendert wie ohne Frontmatter.
5. Frontmatter mit Syntax-Fehler: dezente Fehlermeldung im Render-Pane oder lautlos ausgelassen, je nach Entscheidung.
6. `---` mitten im Dokument: rendert weiter als horizontale Linie.
7. Such-Treffer im Frontmatter-Bereich funktionieren weiter (sichtbar im Source-Pane).
8. Linter aus 4T-0020 markiert keine Pseudo-Probleme in Frontmatter-Zeilen.
9. Theme-Wechsel: Frontmatter-Decoration im Source-Pane bleibt lesbar in Light und Dark.

## Akzeptanzkriterien

- `extractFrontmatter`-Hilfsfunktion in [src/main/preload.js](../../src/main/preload.js) extrahiert Frontmatter sauber, gibt `{ raw, data, body }` zurück.
- `md.render()` wird nur noch auf den `body`-Teil angewendet.
- Source-Pane zeigt den Frontmatter-Bereich visuell abgesetzt (eigene Decoration).
- Render-Pane zeigt keinen `<hr>` und keine YAML-Zeilen aus dem Frontmatter.
- Sonderfälle (kein Frontmatter, unvollständig, Parse-Fehler, `---` mitten im Dokument) verhalten sich wie spezifiziert.
- Linter aus 4T-0020 prüft Frontmatter-Zeilen nicht auf Markdown-Regeln.
- `js-yaml` (oder Alternative) als neue Dependency in `package.json`.
- Performance: Frontmatter-Parsing pro Render-Aufruf maximal einmalig; bei großen Dateien (>500 Zeilen) keine spürbare Render-Verlangsamung.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `extractFrontmatter`-Hilfsfunktion, Integration in den Render-Pfad, Übergabe des `data`-Objekts an den Renderer.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — CodeMirror-Decoration für den Frontmatter-Bereich; ggf. Empfang des `data`-Objekts.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Decoration-Hintergrund für Light- und Dark-Theme; ggf. Properties-Box-Styling (falls Stretch-Goal mitgenommen).
- `package.json` — neue Dependency `js-yaml` (oder Alternative).
- ggf. [src/main/backlinks.js](../../src/main/backlinks.js) — falls die Backlinks-Index-Logik schon hier vorbereitet wird, damit 4T-0050 nahtlos andocken kann. Entscheidung beim Task-Start.

## Lösung

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - Neuer Import `js-yaml` (war transitiv schon da, jetzt direkte Dependency).
  - Hilfsfunktion `extractFrontmatter(text)` erkennt `---`-Block am Datei-Anfang, sucht Schluss-`---` oder `-...`, parst den YAML-Inhalt mit `yaml.load` und Schema `JSON_SCHEMA` (kein Code-Eval). Gibt `{ raw, data, body, parseError, endOffset }` zurück. Sonderfälle abgedeckt: kein Frontmatter, einzelnes `---` ohne Schluss, Block ohne Schluss-Marker, ungültiges YAML.
  - `renderMarkdown(text, basePath)`: ruft `extractFrontmatter` auf und rendert nur `fm.body` statt `text`. Damit verschwindet der `<hr>` aus dem Render-Pane und die YAML-Zeilen werden nicht als Klartext angezeigt.
  - Neue API-Methode `getFrontmatter(text)` für 4T-0050 (Aliases) und 4T-0051 (Properties-Editor).
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**:
  - Hilfsfunktion `detectFrontmatterLines(doc)` liefert `{ fromLine, toLine }` für den Frontmatter-Bereich oder `null`. Erkennung identisch zur Preload-Logik (erste Zeile genau `---`, dann Schluss-Zeile `---` oder `...` exakt am Zeilenanfang).
  - Decoration `frontmatterLineDecoration = Decoration.line({ class: 'cm-frontmatter-line' })`.
  - `buildFrontmatterDecorations(doc)` baut das `Decoration.set` pro Zeile im Frontmatter-Block.
  - StateField `frontmatterField` mit `create`/`update`/`provide`, an `EditorView.decorations` angeschlossen. Re-Build nur bei Doc-Änderung.
  - Helper `lintIsInFrontmatter(state, pos)` analog zu `lintIsInCodeContext`. In `runLint` für alle drei Linter-Regelpfade (bareUrl, emptyLinkText/missingAltText, brokenWikiLink) ergänzt: Treffer im Frontmatter werden übersprungen.
  - `frontmatterField` in die Extensions-Liste von `createEditorState` eingehängt (nach `searchHighlightField`).
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: neue Regel `.cm-editor .cm-frontmatter-line` mit dezent bläulichem Hintergrund. Light: `rgba(33, 150, 243, 0.06)`, Dark: `rgba(100, 181, 246, 0.08)`. Beide Werte gewählt für klare Abgrenzung ohne Ablenkung.
- **[package.json](../../package.json)**: Versions-Bump 0.15.0 → 0.16.0, neue Dependency `"js-yaml": "^4.1.1"`.

### Implementierungsdetails

- **Sonderfall „Datei beginnt mit `---` ohne Schluss"**: in `extractFrontmatter` wird das per `match`-Check auf das Schluss-Regex behandelt; bei ausbleibendem Match wird kein Frontmatter erkannt, das Dokument rendert ganz normal mit `<hr>` aus dem `---`. Damit zerstört kein versehentlich angefangener Block den Render-Pfad.
- **Schluss-Marker `---` oder `...`**: YAML erlaubt beides. Das Regex `\r?\n(---|\.\.\.)[ \t]*(\r?\n|$)` deckt beide Varianten ab.
- **Synchronität zwischen Preload und Renderer**: Beide Seiten erkennen den Frontmatter-Bereich nach derselben Heuristik (erste Zeile genau `---`, Schluss-Zeile `---` oder `...`). Im Renderer arbeitet die Erkennung zeilenbasiert auf dem CodeMirror-Doc, im Preload offset-basiert auf dem String; beide kommen zum identischen Ergebnis.
- **Parse-Fehler-Verhalten in dieser Stufe**: Bei ungültigem YAML wird `data=null` und `parseError=<message>` zurückgegeben; der Render-Pfad ignoriert den Fehler lautlos (Body wird trotzdem korrekt vom Frontmatter abgetrennt). Sichtbare Fehler-Anzeige im Render-Pane kommt erst in 4T-0051 mit dem Properties-Editor.
- **CSS-Spezifität**: `.cm-editor .cm-frontmatter-line` reicht aus, weil `.cm-editor` der äußere CodeMirror-Container ist und kein Konflikt mit anderen Line-Decorations besteht.

### Smoke-Test (2026-05-20)

Alle acht in der Test-Anleitung definierten Punkte vom Nutzer geprüft und bestätigt:

1. Render-Pane ohne `<hr>` und ohne YAML-Zeilen bei Frontmatter-Datei.
2. Source-Pane mit dezent bläulicher Decoration im Frontmatter-Bereich.
3. Theme-Wechsel: lesbar in Light und Dark.
4. Datei ohne Frontmatter: unverändert.
5. Unvollständiger Block: keine Frontmatter-Behandlung.
6. `---` mitten im Dokument: bleibt `<hr>`.
7. Frontmatter mit Syntax-Fehler: kein Crash.
8. Linter: bare URLs und Wiki-Links im Frontmatter werden nicht markiert.

Zusätzlich: lokale `releases/SCG Markdown-0.15.0-*` wurden nach versehentlichem Überschreiben durch ersten Build-Lauf (mit alter `version: 0.15.0` in package.json) per `gh release download v0.15.0` aus dem GitHub-Asset wiederhergestellt. Lokaler Stand entspricht jetzt wieder dem offiziellen v0.15.0-Release.
