# 4T-0016 — Tab und Shift-Tab in Listen für Ein-/Ausrücken

**Status**: Erledigt
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Heute fügt `Tab` im Quellcode-Pane ein Tab-Zeichen ein. In Listen ist das selten gewollt. In den meisten Markdown-Editoren ist `Tab` in Listen das natürliche Mittel, ein Listenelement eine Ebene einzurücken, `Shift+Tab` rückt aus. Damit lassen sich Listen schnell strukturieren, ohne mit Leerzeichen-Zählen zu hantieren.

## Lösungsansatz

### Getroffene Detail-Entscheidungen (vor Umsetzung)

- **Einrück-Schrittweite**: 2 Leerzeichen pro Ebene. Markdown-üblich und kompakt; CommonMark akzeptiert beides.
- **Geordnete-Listen-Marker**: nur `1.`/`2.`/… mit Punkt. Variante `1)` mit Klammer wird **nicht** als Listen-Marker erkannt — passt zum Bestand im Repo und vereinfacht das Regex.
- **Version-Bump**: `package.json` wird im selben Commit von `0.8.0` auf `0.9.0` angehoben, damit Test-EXEs der laufenden 0.9.0-Entwicklung in `releases/` eindeutig zugeordnet sind (vgl. Projekt-Konvention).

### Verhalten

- **Kontext-Erkennung** beim Tastendruck `Tab` bzw. `Shift+Tab`:
  - Erkannte Marker (per Regex auf die aktuelle Zeile, nach optionalen führenden Leerzeichen):
    - Ungeordnete Liste: `- `, `* `, `+ `
    - Geordnete Liste: `\d+\. `
    - Task-Liste: `- [ ] `, `- [x] ` (Sonderfall der ungeordneten Liste)
  - Code-Block-Schutz: `syntaxTree` an der Cursor-Position prüfen. Befindet sich der Cursor innerhalb eines `FencedCode`- oder `CodeBlock`-Knotens, greift die Listen-Logik **nicht** — Default-Tab-Verhalten bleibt erhalten.
  - Tabellen werden vom verwendeten CommonMark-Parser ohne GFM-Extension nicht als Tabellen-Knoten erkannt. Sie sind aber kein Problem, weil Tabellen-Zeilen mit `|` beginnen und damit nicht auf die Listen-Marker matchen.
- **Einrücken** bei `Tab`:
  - Zwei Leerzeichen vor den Marker einfügen.
  - Bei **geordneten Listen** wird die Nummer auf `1.` zurückgesetzt (eine neue Sub-Liste beginnt; bei Mehrzeilen-Selektion gilt das pro Zeile, Markdown rendert mehrere `1.`-Zeilen korrekt als 1/2/3).
  - Bei **ungeordneten Listen** und **Task-Listen** bleibt der Marker (inkl. Task-Status `[ ]`/`[x]`) unverändert.
- **Ausrücken** bei `Shift+Tab`:
  - Führende Leerzeichen vor dem Marker um zwei reduzieren, sofern vorhanden. Bei Ebene 0 No-Op.
  - Die Nummer einer geordneten Liste bleibt unverändert (keine Umnummerierung der Ziel-Ebene).
- **Mehrzeilen-Selektion**: jede Zeile der Selektion einzeln prüfen. Listen-Zeilen werden bearbeitet, Nicht-Listen-Zeilen bleiben unangetastet. Die Operation läuft als **eine** Transaktion, sodass `Strg+Z` sie als Ganzes rückgängig macht.
- **Fallback außerhalb von Listen / in Code-Blöcken**: Handler gibt `false` zurück, CodeMirror führt das Default-Verhalten aus.

### Technische Umsetzung

- Neue Datei `src/renderer/editor/tab-indent.js` (oder Inline in `renderer.js`, klein gehalten) mit zwei Keymap-Handlern (`Tab`, `Shift-Tab`) und einer reinen Helper-Funktion `applyListIndent(state, delta)`, die für eine gegebene Selektion eine `ChangeSpec[]`-Liste erzeugt.
- Einbindung in `createEditorState()` als zusätzliche `keymap.of([...])`-Extension mit **höherer Priorität** als `defaultKeymap` (über `Prec.high` aus `@codemirror/state`). Reihenfolge bleibt: eigener Tab-Handler → `foldKeymap` → `defaultKeymap` → `historyKeymap`.
- Die Transaktion wird mit `userEvent: 'input.indent'` annotiert, damit die History sie als atomaren Schritt führt.

### Akzeptanz im Edit-Modus

Tab/Shift+Tab wirken nur, wenn der Editor schreibbar ist. Im Read-Only-Modus (Pane ohne aktivierten Edit-Mode) bleibt das Default-Verhalten unverändert; CodeMirror unterbindet Edits in dem Modus ohnehin.

## Akzeptanzkriterien

- `Tab` auf einer Zeile, die mit `- `, `* `, `+ `, `1. ` oder `- [ ] ` beginnt (mit oder ohne Einrückung), rückt diese Zeile um zwei Leerzeichen ein.
- Bei einer geordneten Liste setzt das Einrücken die Nummer auf `1.` zurück. Aus `2. Bar` wird beim Einrücken `  1. Bar`.
- `Shift+Tab` auf einer eingerückten Listen-Zeile rückt sie um zwei Leerzeichen aus, bis Ebene 0 erreicht ist. Die Nummer einer geordneten Liste wird beim Ausrücken nicht verändert.
- Bei Mehrzeilen-Selektion gilt die Operation für alle Listen-Zeilen in der Selektion, nicht-Listen-Zeilen bleiben unverändert.
- Außerhalb von Listen fügt `Tab` weiterhin ein Tab-Zeichen ein (unverändertes CodeMirror-Default-Verhalten).
- Das Verhalten funktioniert auch innerhalb einer Tabellen-Zelle nicht (Tab in einer Tabelle ist kein Listen-Indent, normales Tab-Zeichen). Eindeutige Abgrenzung über `syntaxTree`-Kontext.
- Strg+Z macht eine Einrückungs- oder Ausrückungs-Operation als Ganzes rückgängig, nicht zeichenweise.

## Bezug zu Dateien

- `src/renderer/renderer.js` — neue CodeMirror-`keymap`-Extension, Kontext-Erkennung über `syntaxTree`.
- `src/renderer/styles.css` — keine Änderung erwartet.
- `src/i18n/{de,en,fr,es,it}.json` — Hilfe-Texte am Epic-Ende.

## Lösung

**Keymap-Extension** in `src/renderer/renderer.js`:

- Neue Helper-Funktionen `lineInsideCodeBlock(state, line)`, `selectionTouchesList(state)` und `applyListIndent(view, delta)` direkt vor `createEditorState()`.
- Regex `LIST_LINE_RE = /^(\s*)((?:[-*+]|\d+\.)\s)/` erkennt Listen-Marker am Zeilenanfang (ungeordnet, geordnet, Task-Liste implizit über `-`).
- `applyListIndent` iteriert über alle Selection-Ranges, sammelt Listen-Zeilen (per `seenLines`-Set entdoppelt) und baut eine einzige Transaktion mit `userEvent: 'input.indent.more'` bzw. `input.indent.less`. Damit fasst die History die Operation atomar zu einem Strg+Z-Schritt zusammen.
- Konstante `LIST_INDENT_STEP = 2` als zentrale Schrittweite.
- Einbindung als `Prec.high(keymap.of([{key:'Tab',...},{key:'Shift-Tab',...}]))` direkt **vor** dem bestehenden `keymap.of([...defaultKeymap...])` in `createEditorState()`. Bei `false`-Rückgabe (keine Listen-Zeile, Read-Only-State, oder Code-Block-Kontext) reicht CodeMirror den Tastendruck an die nachfolgenden Keymaps weiter — das Default-Verhalten ausserhalb von Listen bleibt damit unverändert.

**Spezifika je Marker:**

- Ungeordnete Liste (`- `, `* `, `+ `) und Task-Liste (`- [ ] `, `- [x] `): Einrücken fügt zwei Leerzeichen vor den Marker ein, der Marker selbst bleibt unverändert (Task-Status `[ ]`/`[x]` wird durch das Regex nicht angefasst).
- Geordnete Liste (`\d+\. `): Einrücken ersetzt den gesamten Marker-Bereich durch `<leading>  1. `. Die Sub-Liste beginnt damit neu bei `1.`, Markdown rendert mehrere `1.`-Geschwister korrekt als 1/2/3.
- Ausrücken entfernt unabhängig vom Listen-Typ bis zu zwei führende Whitespace-Zeichen; bei Ebene 0 ist die Operation No-Op. Die Nummer einer geordneten Liste bleibt beim Ausrücken erhalten.

**Code-Block-Schutz**: `lineInsideCodeBlock` löst den `syntaxTree`-Knoten an der Zeilenanfang-Position auf und wandert die Parent-Kette hoch. Liegt ein `FencedCode`- oder `CodeBlock`-Knoten darüber, wird die Zeile übersprungen. Tabellen sind ohne extra Behandlung sicher, weil sie mit `|` beginnen und damit nicht auf `LIST_LINE_RE` matchen.

**Imports**: `Prec` zu den Imports aus `@codemirror/state` ergänzt; keine neue Dependency nötig (`syntaxTree`, `EditorView`, `keymap` waren bereits da).

**Versionssprung**: `package.json` von `0.8.0` auf `0.9.0` gehoben, damit Test-EXEs der laufenden 0.9.0-Entwicklung in `releases/` eindeutig zugeordnet sind und die offizielle 0.8.0-EXE nicht überschreiben.

**Bewusst nicht in 4T-0016:**

- Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes — folgen im Sammeltask am Epic-Ende.
- Tab→Space-Normalisierung beim Ausrücken (wenn führende Indentation Tabs statt Spaces nutzt). Aktuell werden pauschal die ersten zwei Whitespace-Zeichen entfernt; das ist für reine Spaces korrekt und für gemischte Indentation der einfachste Fallback.
- Renumber-Logik beim Ausrücken in die Ziel-Ebene (Markdown rendert nicht-fortlaufende Nummern tolerant; Aufwand-Nutzen-Verhältnis spricht gegen Renumber).
