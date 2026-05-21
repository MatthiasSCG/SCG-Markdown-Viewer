# 4T-0063 — Footnotes (`[^1]` und inline `^[Text]`)

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0

## Warum

Footnotes sind in längeren Dokumenten (technische Doku, Konzept-Texte) ein wertvoller Strukturanker. Aktuell rendert die App `[^1]`-Verweise als Text-Klartext, ohne Verlinkung.

## Lösungsansatz

### Plugin

`markdown-it-footnote` ist die Standard-Lösung, gepflegt und kompatibel.

### Verhalten

- **Klassisch**: `[^1]` im Text, `[^1]: Definition` am Datei-Ende. Im Render-Pane: hochgestellte Zahl im Fließtext mit Anchor-Link, Fußnoten-Block am Ende mit Backlinks.
- **Inline**: `^[Inline-Fußnote]` ohne separate Definition. Wird wie eine klassische Fußnote nummeriert und gerendert.
- Default-Verhalten von `markdown-it-footnote` (Zahlen statt Buchstaben, Standard-Symbole).

### CSS

Fußnoten-Block am Ende des Render-Pane mit dezentem Trenner, kleinere Schrift, Backlink-Pfeil. Theme-konform hell und dunkel.

### Editor-Highlighting

CodeMirror-Markdown-Sprachpaket erkennt `[^1]` und `[^1]:` nicht speziell. Eigene CodeMirror-Decoration optional. Entscheidung beim Task-Start.

## Akzeptanzkriterien

- `[^1]` im Text wird zur hochgestellten Zahl mit Anchor-Link auf den Fußnoten-Block.
- `[^1]: Definition` am Datei-Ende erscheint im Fußnoten-Block mit Backlink-Pfeil zum Verweis im Text.
- `^[Inline-Fußnote]` rendert wie eine klassische Fußnote.
- Theme-Wechsel hell/dunkel: Fußnoten-Block bleibt lesbar.
- Keine Kollision mit Frontmatter am Datei-Anfang (beide arbeiten an verschiedenen Stellen).
- Portable-Export: Backlinks funktionieren auch im exportierten HTML.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — `markdown-it-footnote` in der markdown-it-Pipeline, zusätzlich in `mdPortable`.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Fußnoten-Block-Styling.
- `package.json` — neue Dependency `markdown-it-footnote`.

## Reihenfolge im Epic

Nach Callouts ([4T-0061](4T-0061-callouts.md)). Reihenfolge gegenüber Highlight ([4T-0062](4T-0062-highlight.md)) beliebig, da unabhängig.
