# 4T-0003 — Editor-Engine: CodeMirror 6 einbauen, readOnly toggelbar

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Der Quellcode-Bereich ist aktuell ein `<pre><code>`-Block, der nur darstellen kann. Für den Edit-Modus brauchen wir eine echte Editor-Komponente mit Cursor, Selektion, Undo/Redo, Markdown-Syntax-Highlighting und sauberer Tastatur-Interaktion. CodeMirror 6 ist die leichtgewichtige, modulare Wahl. Im Ansichtsmodus läuft die gleiche Komponente in `readOnly: true`, im Edit-Modus mit `readOnly: false`.

## Lösungsansatz

- **Dependencies** (alle MIT-Lizenz):
  - `codemirror` (Meta-Paket)
  - `@codemirror/state`
  - `@codemirror/view`
  - `@codemirror/lang-markdown`
  - `@codemirror/language` (für Markdown-Highlighting-Theme)
  - `@codemirror/commands` (für Undo/Redo, Default-Keymap)
  - `@codemirror/search` (Basis für 4T-0007)
  - `@lezer/highlight`, `@lezer/markdown` (transitiv)
- **Integration**: Pro Pane eine eigene CodeMirror-Instanz. Beim Initialisieren wird der bisherige `<pre><code class="pane-source-code">` durch ein `<div class="pane-source-editor">` ersetzt, in das CodeMirror per `new EditorView({ ... })` einhängt.
- **Compartments** für dynamisch umschaltbare Extensions:
  - `readOnlyCompartment` (toggle: true ↔ false beim Edit-Toggle)
  - `lineNumbersCompartment` (toggle: lineNumbers() ↔ leer)
  - `lineWrapCompartment` (toggle: EditorView.lineWrapping ↔ leer)
  - `themeCompartment` (Light/Dark synchron zum bestehenden Theme-System)
- **Live-Update der Render-Vorschau**: Im Edit-Modus mit aktivem Geteilt-View wird bei jeder Doc-Änderung der Renderer neu gefüttert. Debounce 150 ms, damit nicht bei jedem Tastenanschlag ge-markdown-rendert wird.
- **Edit-Toggle-Verhalten**: Klick im Render-Modus → erst View auf „Geteilt" wechseln, dann readOnly ausschalten. Klick im Quellcode- oder Geteilt-Modus → readOnly direkt umschalten. Klick auf „Gerendert" bei aktivem Edit → Edit-Modus aussetzen (readOnly wieder true).
- **Cursor-Indikator**: Im Edit-Modus zeigt der Statusbar-Edit-Toggle eine aktive Klasse, der Cursor ist sichtbar, im Read-Only ist er nur als dezenter Strich oder gar nicht sichtbar.
- **File-Watcher-Konflikt**: Wenn die geöffnete Datei extern verändert wird und der Buffer nicht dirty ist, läuft der bisherige Auto-Reload-Pfad (Inhalt ersetzen). Wenn der Buffer dirty ist (siehe 4T-0004), Reload abblocken und einen Konflikt-Dialog anzeigen mit zwei Optionen:
  - „Vom Datenträger neu laden und meine Änderungen verwerfen"
  - „Eigene Version behalten" (Buffer bleibt, externe Änderung wird ignoriert; nächster Save überschreibt extern)
- **Performance**: Bei großen Dateien (>1 MB) CodeMirror-Extensions reduzieren oder warnen — Detail-Entscheidung in der Umsetzung.

## Akzeptanzkriterien

- Im Quellcode- und Geteilt-Modus wird der Markdown-Quelltext mit Syntax-Highlighting angezeigt (Überschriften, Code-Blöcke, Links, Listen visuell unterscheidbar).
- Nummern- und Umbruch-Toggles wirken auf den Editor (sichtbar im UI).
- Im Read-Only-Zustand (Default) ist Eingabe nicht möglich. Selektion und Kopieren (Strg+C) bleiben möglich.
- Im Edit-Zustand können Cursor gesetzt, Text eingegeben, gelöscht, ausgeschnitten, eingefügt werden. Undo/Redo (Strg+Z, Strg+Y) funktionieren.
- Bei geteiltem View aktualisiert sich die Render-Vorschau live mit ca. 150 ms Verzögerung.
- Edit-Toggle wechselt aus „Gerendert" automatisch zu „Geteilt", aus „Geteilt"/„Quellcode" toggelt nur readOnly.
- Klick auf „Gerendert" bei aktivem Edit deaktiviert Edit.
- Theme-Wechsel (Light/Dark) ändert das CodeMirror-Theme sofort.
- Externe Dateiänderung bei nicht-dirtigem Buffer: Auto-Reload wie vorher. Bei dirty Buffer: Konflikt-Dialog erscheint.

## Bezug zu Dateien

- `package.json` — neue Dependencies `@codemirror/*` und `codemirror`
- `src/renderer/index.html` — Source-Pane-Struktur anpassen
- `src/renderer/renderer.js` — CodeMirror-Initialisierung pro Pane, Compartment-Verwaltung, Edit-Toggle-Logik, Live-Update-Routine
- `src/renderer/styles.css` — CodeMirror-Theme-Anpassungen (Light/Dark, Schrift, Hintergrund)
- `src/main/main.js` — File-Watcher-Reload mit Dirty-Abfrage über IPC (Detail in 4T-0004)

## Lösung

CodeMirror 6 als Editor-Engine eingeführt. Edit-Modus pro Tab toggelbar, Live-Render im Split-Modus, Theme-aware Syntax-Highlighting via CSS-Variablen.

**Bundler-Einführung (nicht im Ursprungsplan, aber technisch notwendig)**: Da CodeMirror 6 als ESM mit bare-imports (`@codemirror/state` etc.) ausgeliefert wird und der Electron-Renderer ohne Bundler keine `node_modules`-Auflösung kann, wurde **esbuild** als minimaler Bundler eingeführt:

- `scripts/build-renderer.js`: bundlet `src/renderer/renderer.js` samt aller Imports (eigene Module wie `i18n.js` und externe wie CodeMirror) zu `src/renderer/renderer.bundle.js`. ~30 Zeilen Build-Script, kein Dev-Server-Overhead.
- `package.json` scripts: `build:renderer` neu; `start`, `dev`, `build`, `build:installer`, `build:portable` vorgelagert um `npm run build:renderer &&`.
- `.gitignore`: `src/renderer/renderer.bundle.js` ausgeschlossen.
- `index.html`: `<script src="renderer.bundle.js">` statt `renderer.js`.

**Dependencies**: `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/commands`, `@codemirror/search` (vorbereitend für 4T-0007). `@lezer/highlight` ist transitiv verfügbar und wird für Syntax-Tags importiert. `esbuild` als devDependency.

**`src/renderer/index.html`**:
- Source-Pane: `<pre><code class="pane-source-code">` → `<div class="pane-source-editor">` (Mount-Container für die EditorView).
- Edit-Toggle: `disabled`-Attribut entfernt.

**`src/renderer/styles.css`**:
- Alte `.pane-source pre`/`.ln-row`/`.ln-num`/`.ln-text`-Klassen entfernt (~30 Zeilen).
- Neuer Block für `.pane-source-editor` und CodeMirror-Selektoren (`.cm-editor`, `.cm-scroller`, `.cm-content`, `.cm-line`, `.cm-gutters`, `.cm-cursor`, `.cm-selectionBackground`).
- Edit-Toggle-Active-Styling über `.btn-edit.active`.
- Neue CSS-Variablen pro Theme: `--syntax-heading`, `--syntax-link`, `--syntax-url`, `--syntax-code`, `--syntax-meta`, `--syntax-list`, `--syntax-quote`, `--syntax-comment`, `--syntax-keyword`, `--syntax-string`, `--syntax-number`, `--syntax-selection`. GitHub-inspirierte Paletten für Light und Dark.

**`src/renderer/renderer.js`**:
- Imports für CodeMirror-Module plus `tags` aus `@lezer/highlight`.
- Eigenes `HighlightStyle.define(...)` (`mdHighlightStyle`) mit Tag-zu-CSS-Variablen-Mapping — Theme-Wechsel funktioniert automatisch über CSS-Variablen ohne JS-Re-Bind.
- Pro Pane eine `EditorView` mit drei `Compartment`s für `readOnly`, `lineNumbers`, `lineWrap`. Toggle-Aktionen rufen `dispatch({ effects: compartment.reconfigure(...) })` auf — kein Doc-Reset.
- `createEditorState(opts)`: erzeugt einen `EditorState` mit Markdown-Parser, Highlighting, Default-Keymap, History (Undo/Redo) und einem `EditorView.updateListener`, der bei `docChanged` den Tab-Inhalt aktualisiert und im Split-Modus die Render-Vorschau debounced (150 ms) neu rendert.
- `ensureEditorForPane(paneIdx)`: erzeugt die View lazy beim ersten Bedarf, registriert Scroll-Listener am `view.scrollDOM` für `saveScroll`.
- `syncEditorForPane(paneIdx)`: gleicht Doc und Compartments mit dem aktiven Tab ab; setzt CSS-Klasse `.read-only` auf den Container, damit der Cursor im Read-Only-Mode ausgeblendet wird.
- `renderPaneContent` ersetzt den alten `renderSourceCode`-Pfad; `saveScroll` liest Source-Scroll aus `view.scrollDOM.scrollTop`.
- `toggleEditMode`: Render-Mode → automatischer Wechsel zu Split + Edit-Aktivierung; Source/Split → einfacher Toggle. Bei Edit-Aktivierung erhält der Editor den Tastaturfokus.
- `setViewMode`: Wechsel auf „Gerendert" deaktiviert den Edit-Modus automatisch.
- `syncToolbarToActiveTab`: setzt `.active`-Klasse auf den Edit-Toggle in der Statusbar.
- `bindUi`: Klick-Handler für Edit-Toggle plus **Strg+E**-Shortcut in der globalen Keydown-Logik.
- `createTab`: Tab bekommt neue Property `editMode: false` (nicht persistiert; Persistenz kommt mit Dirty-State in 4T-0004).
- `getSearchContainer`: liefert bei Source-Scope das `.pane-source-editor` (CodeMirror-DOM). Bestehende `<mark>`-Highlight-Logik flackert dort, weil CodeMirror sein DOM laufend re-rendert — wird in 4T-0007 sauber durch `@codemirror/search` ersetzt.

**Theme-Anpassungen für Dark-Mode** (nach erstem Test ergänzt):
- Syntax-Farben in der GitHub-Dark-Palette für gute Lesbarkeit (Links/Code/Strings/Kommentare).
- Selection-Background mit kräftigerer Alpha (0.5 statt 0.25) und `!important`, damit CodeMirror-eigene inline-Styles überschrieben werden.

**Bewusst nicht in dieser Stufe**:
- Dirty-State (Sternchen im Tab/Fenstertitel), Speichern, „Speichern unter", Schließen-Dialog: kommen in **4T-0004**.
- Konflikt-Dialog bei externer Dateiänderung mit aktivem Edit-Buffer: Auto-Reload überschreibt aktuell ohne Rückfrage; sauber in **4T-0004**.
- Suchen und Ersetzen über CodeMirror-Decorations: kommt in **4T-0007**.
- Hilfe-Modal-Erweiterung um Strg+E: kommt in **4T-0009**.
