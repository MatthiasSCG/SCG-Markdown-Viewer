# 4T-0062 — Highlight `==Text==`

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0

## Warum

`==Text==` ist die Pandoc- und Obsidian-Konvention für „dieser Textabschnitt ist hervorgehoben". Komplementär zu Bold (Wichtigkeit) und Italic (Akzent). Aktuell rendert die App `==…==` als Klartext.

## Lösungsansatz

### Plugin

Entweder `markdown-it-mark` (existierendes, kleines Paket) oder Eigenimplementierung als Inline-Rule. Entscheidung beim Task-Start, abhängig von einer kurzen Prüfung des Packages.

### Verhalten

- `==Text==` rendert als `<mark>Text</mark>`.
- Inline-Token, erkennt nicht über Zeilenumbruch hinaus.
- Escape `\==` bleibt Klartext.
- Innerhalb `$…$`-KaTeX-Math-Blöcken wird `==` nicht als Highlight interpretiert (KaTeX-Plugin läuft im Inline-Ruler vor dem Highlight-Plugin).

### CSS

`<mark>` bekommt einen gelben, theme-konformen Hintergrund (im Dunkelmodus etwas gedämpfter). Keine Farbwahl per Inline-Syntax.

### Editor-Highlighting

CodeMirror-Markdown-Sprachpaket erkennt `==…==` nicht von Haus aus. Eigene CodeMirror-Decoration optional. Entscheidung beim Task-Start.

## Akzeptanzkriterien

- `==Text==` rendert im Render-Pane als gelb hinterlegter `<mark>`-Bereich.
- `\==Text\==` bleibt Klartext.
- Theme-Wechsel hell/dunkel: gelber Hintergrund bleibt lesbar.
- Kein Konflikt mit `---` (YAML-Frontmatter-Trenner) oder `==` in `$…$`-Math-Blöcken.
- Portable-Export: `<mark>`-Element wird mit inline Background-Color exportiert.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — neues Highlight-Plugin (oder `markdown-it-mark`) in der markdown-it-Pipeline, zusätzlich in `mdPortable`.
- [src/renderer/styles.css](../../src/renderer/styles.css) — `mark`-Stil für hell und dunkel.
- `package.json` — ggf. neue Dependency `markdown-it-mark`.

## Reihenfolge im Epic

Nach Callouts ([4T-0061](4T-0061-callouts.md)). Reihenfolge gegenüber Footnotes ([4T-0063](4T-0063-footnotes.md)) beliebig, da unabhängig.
