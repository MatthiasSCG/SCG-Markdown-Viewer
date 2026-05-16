# 4T-0003 — Editor-Engine: CodeMirror 6 einbauen, readOnly toggelbar

**Status**: Offen
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

(Wird nach Umsetzung ausgefüllt.)
