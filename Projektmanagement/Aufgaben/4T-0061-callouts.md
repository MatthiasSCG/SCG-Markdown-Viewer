# 4T-0061 — Callouts (Obsidian-Style Block-Hinweisboxen)

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0

## Warum

In Obsidian und im erweiterten Markdown-Umfeld sind Callouts der visuelle Standard für strukturierte Notizen (Hinweis-, Achtung-, Beispiel-Boxen). Bisher geht das in der App nur über manuelles HTML oder Markdown-Tricks. Mit Callouts steht eine etablierte Syntax für das Pattern bereit.

## Lösungsansatz

### Syntax

Obsidian-Style: `> [!type] Optionaler Titel` als erste Zeile eines Blockquotes, gefolgt von beliebigem Inhalt. Beispiel:

```markdown
> [!note] Mein Titel
> Hier steht der Inhalt der Callout-Box,
> beliebig viele Zeilen.
```

Klappbare Varianten:

- `> [!note]-` Default eingeklappt
- `> [!note]+` Default ausgeklappt

### Whitelist der Typen

Feste Whitelist von 10 Typen, jeder mit Default-Farbe, Default-Icon (Lucide) und Default-Titel:

- `note` — neutraler Hinweis
- `info` — Information
- `tip` — Tipp
- `success` — Erfolg
- `question` — Frage
- `warning` — Warnung
- `failure` — Fehler
- `danger` — Gefahr
- `example` — Beispiel
- `quote` — Zitat

Unbekannte Typen werden als normaler Blockquote gerendert (keine Callout-Box), optional via Linter als unbekannter Typ markiert.

### markdown-it-Plugin

Eigenimplementierung als markdown-it-Rule, weil keine etablierte Library Obsidian-Syntax direkt abdeckt. Nimmt einen Blockquote-Block, prüft die erste Zeile auf das `[!type]`-Muster, transformiert in `<details class="callout callout-<type>">…</details>` oder `<div class="callout callout-<type>">…</div>` je nach klappbarer Variante.

### CSS

Pro Typ eine eigene Klasse `.callout-<type>` mit Farb-Token aus dem Theme. Klappen-Mechanismus über `<details>`/`<summary>` (browsernativ, kein JS). Header zeigt das Lucide-SVG-Icon, den Titel (Default oder Override) und ggf. den Klapppfeil.

### Editor-Highlighting

CodeMirror-Markdown-Sprachpaket erkennt Blockquotes; die `[!type]`-Zeile darin wird nicht speziell hervorgehoben. Eigene CodeMirror-Decoration optional. Entscheidung beim Task-Start.

### Linter-Erweiterung (optional)

Unbekannte Callout-Typen werden als „unbekannter Callout-Typ" angezeigt. Entscheidung beim Task-Start, je nach Aufwand.

## Akzeptanzkriterien

- Alle 10 Whitelist-Typen rendern als Callout-Box mit Icon, Farbgebung und Default-Titel.
- Override-Titel (`> [!note] Mein Titel`) ersetzt den Default-Titel.
- Klappbare Varianten `-` (eingeklappt) und `+` (ausgeklappt) funktionieren ohne JavaScript.
- Theme-Wechsel hell/dunkel: alle Typen behalten lesbaren Kontrast.
- Unbekannte Typen werden als normaler Blockquote gerendert, nicht als Box.
- Geschachtelte Callouts `> > [!note]` rendern wie normaler Blockquote-Tiefenwechsel (kein Callout im Callout), analog zu Obsidian.
- Portable-Export: Callouts brauchen inline Styles, damit sie auch im exportierten HTML als Box erscheinen.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — neues `calloutsPlugin` in der markdown-it-Pipeline, zusätzlich in `mdPortable` für den HTML-Export. Lucide-Icons als Inline-SVG.
- [src/renderer/styles.css](../../src/renderer/styles.css) — `.callout` und `.callout-<type>` für die 10 Typen, hell- und dunkel-konform.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — Default-Titel pro Typ (10 Keys), evtl. Linter-Hinweis bei unbekanntem Typ.
- Bei Linter-Erweiterung: Linter-Pfad in [src/renderer/renderer.js](../../src/renderer/renderer.js) oder [src/main/preload.js](../../src/main/preload.js).

## Reihenfolge im Epic

Erster Task im Epic, weil aufwendigster Teil und höchste Sichtbarkeit.
