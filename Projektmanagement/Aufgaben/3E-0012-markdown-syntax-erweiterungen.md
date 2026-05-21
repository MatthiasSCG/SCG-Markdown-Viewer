# 3E-0012 — Markdown-Syntax-Erweiterungen: Callouts, Highlight, Footnotes

**Status**: Offen
**Zielversion**: 0.18.0
**Vorgängerversion**: 0.17.0
**Reihenfolge im Meta-Plan**: Epic 3 von 6 (B → C → D → E → A → F)
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkte 12, 13, 14

## Ziel

Drei in Obsidian und im erweiterten Markdown-Umfeld etablierte Syntax-Erweiterungen einbauen, die jeweils isoliert wirken und voneinander unabhängig sind: Callouts (Obsidian-Style Block-Hinweisboxen), Highlight (`==Text==` als gelber Hintergrund) und Footnotes (klassisch `[^1]` und inline `^[Text]`).

## Warum

Die drei Syntaxen lösen verschiedene typische Schreibbedürfnisse:

- **Callouts** ersetzen das übliche „Hinweis-/Achtung-/Beispiel-Boxen-Pattern", das bisher nur über manuelles HTML oder schwere Markdown-Tricks geht. In Obsidian sind sie der visuelle Standard für strukturierte Notizen.
- **Highlight** ist die Pandoc- und Obsidian-Konvention für „dieser Textabschnitt ist hervorgehoben". Komplementär zu Bold (Wichtigkeit) und Italic (Akzent). Ohne Hover-Tipps oder Aktion, nur visuell.
- **Footnotes** sind in längeren Dokumenten (technische Doku, Konzept-Texte) ein wertvoller Strukturanker. Aktuell rendert die App `[^1]`-Verweise als Text-Klartext, ohne Verlinkung.

Konzeptionell trivial im Sinne von „drei markdown-it-Plugins plus CSS", aber für die Doku-Use-Cases dieses Projekts (Konzepte, Anforderungen, Status-Texte) sehr hilfreich. Daher als gemeinsames Epic.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Callouts** in Obsidian-Syntax: `> [!type] Optionaler Titel` als erste Zeile eines Blockquotes, gefolgt von beliebigem Inhalt. Unterstützte `type`-Werte (Whitelist, fest):
  - `note`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `example`, `quote`.
  - Jeder Typ bekommt eine Default-Farbe, ein Default-Icon (Lucide) und einen Default-Titel.
  - Klappbare Callouts mit `> [!note]-` (Default eingeklappt) und `> [!note]+` (Default ausgeklappt).
- **Highlight** über `==Text==` als `<mark>`-Element. Inline-Token, erkennt nicht über Zeilenumbruch hinaus. Escape `\==` bleibt Klartext.
- **Footnotes** über `markdown-it-footnote` als Plugin:
  - Klassisch: `[^1]` im Text, `[^1]: Definition` am Datei-Ende.
  - Inline: `^[Inline-Fußnote]` ohne separate Definition.
  - Im Render-Pane: Fußnoten-Block am Ende mit Backlinks, hochgestellte Zahlen im Fließtext.
- **Block-Embed-Erweiterung** (Nachzieher aus [4T-0055](4T-0055-wiki-embeds.md), Epic 3E-0011): `![[Datei#^id]]` extrahiert in 3E-0011 nur die eine Zeile mit dem Block-Marker. Hier auf vollständige Block-Strukturen erweitern (mehrzeilige Listen-Items mit Sub-Inhalt, Code-Blöcke, Tabellenzeilen mit umliegenden Zellen, Blockquotes mit mehreren Zeilen). Implementierung über den markdown-it-AST statt der aktuellen Zeilen-Heuristik in `extractEmbedSnippet`. Thematisch passend, weil Block-Anker `^id` schon in 4T-0054 als Markdown-Syntax eingeführt wurde — die Erweiterung verfeinert eine bereits etablierte Syntax.
- **Editor-Highlighting** für die drei Syntaxen im Source-Pane, damit sie im Quellcode visuell erkennbar sind.
- **Linter-Erweiterung** (optional, je nach Aufwand): unbekannte Callout-Typen werden als bare URL markiert oder als „unbekannter Callout-Typ" angezeigt.
- **Hilfe-Dialog**: drei neue Feature-Einträge in der Gruppe „Bearbeitung", Hilfe-Markdown bei Bedarf um Beispiele erweitert.
- CHANGELOG, Release-Notes, README, Tag, Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Eigene Callout-Typen** durch Nutzer-Konfiguration. Whitelist bleibt fest.
- **Callout-Icons selbst gestaltbar**. Default-Icon pro Typ ist fest aus Lucide.
- **Highlight mit Farbwahl** (`=={color=red}Text==`). Nur gelb, theme-abgestimmt.
- **Footnote-Backreferences mit Custom-Symbolen** (Buchstaben statt Zahlen). Default-Verhalten von `markdown-it-footnote`.
- **Highlight in Editor-Live-Render**. Wirkt nur im Render-Pane. Inline-Live-Preview kommt erst in 3E-0014 (Epic A).

## Untergeordnete Tasks

- [ ] [4T-0061 — Callouts (Obsidian-Style Block-Hinweisboxen)](4T-0061-callouts.md)
- [ ] [4T-0062 — Highlight `==Text==`](4T-0062-highlight.md)
- [ ] [4T-0063 — Footnotes (`[^1]` und inline `^[Text]`)](4T-0063-footnotes.md)
- [ ] [4T-0064 — Block-Embed-Erweiterung (AST-basiert)](4T-0064-block-embed-ast.md)
- [ ] [4T-0065 — Hilfe-Dialog um Callouts, Highlight und Footnotes erweitern](4T-0065-hilfe-dialog-syntax-erweiterungen.md)
- [ ] [4T-0066 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.18.0](4T-0066-changelog-release-0180.md)

**Schnitt-Entscheidung zum Epic-Start (2026-05-21):** Highlight und Footnotes werden als getrennte Tasks geführt (die im Epic-Text erwogene Bündel-Option wird verworfen), weil saubere ID-Trennung und Nachvollziehbarkeit im CHANGELOG schwerer wiegen als der gesparte Test-Zyklus. Punkt 5 aus dem ursprünglichen Konzept (Hilfe-Dialog + Sammeltask) wird gemäß Konvention seit Epic 3E-0011 in zwei getrennte Tasks aufgeteilt: 4T-0065 für den Hilfe-Dialog, 4T-0066 für CHANGELOG/Release.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **Callouts-Plugin**: keine etablierte markdown-it-Library deckt Obsidian-Syntax direkt ab. Eigenimplementierung als markdown-it-Rule, die Blockquotes mit `[!type]`-Header transformiert.
- **Callout-CSS**: pro Typ eine eigene Klasse `callout-<type>` mit Farb-Token aus dem Theme. Klappen-Mechanismus über `<details>`/`<summary>` (browsernativ, kein JS).
- **Callout-Icons**: Lucide-SVG inline, analog zur Statusbar-Lösung aus 4T-0031. Pro Typ ein passendes Icon.
- **Highlight-Plugin**: entweder `markdown-it-mark` (existierendes Paket) oder Eigenimplementierung als Inline-Rule. `markdown-it-mark` ist bekannt und klein.
- **Footnote-Plugin**: `markdown-it-footnote` ist die Standard-Lösung, gepflegt und kompatibel.
- **Konflikt mit KaTeX**: `==` darf nicht innerhalb von `$…$`-Math-Blöcken als Highlight interpretiert werden. KaTeX-Plugin läuft im Inline-Ruler vor dem Highlight-Plugin, das sollte den Konflikt automatisch lösen.
- **Editor-Highlighting für Callouts**: CodeMirror-Markdown-Sprachpaket erkennt Blockquotes; die `[!type]`-Zeile darin wird nicht speziell hervorgehoben. Eigene CodeMirror-Decoration optional, beim Task entscheiden.

## Reihenfolge der Umsetzung

1. **Callouts zuerst**, weil sie aufwendig sind und am meisten Sichtbarkeit haben.
2. **Highlight und Footnotes** in beliebiger Reihenfolge danach, beide klein und unabhängig.
3. **Hilfe-Dialog und Sammeltask** schließen ab.

Reihenfolge ist nicht zwingend; es gibt keine technische Abhängigkeit zwischen den drei Syntaxen.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — drei neue Plugins in der markdown-it-Pipeline, zusätzlich in `mdPortable` für den HTML-Export.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Callout-Boxen pro Typ, Highlight-Hintergrund, Footnote-Block.
- [src/renderer/index.html](../../src/renderer/index.html) — Inline-SVG-Definitionen für Callout-Icons, falls nicht im Preload erzeugt.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für Hilfe.
- `package.json` — Version-Bump auf 0.18.0, ggf. zwei neue Dependencies (`markdown-it-mark`, `markdown-it-footnote`).
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.18.0.md`.

## Offene Punkte / Risiken

- **Konflikt Highlight mit `--`-Strikethrough**: keiner, weil GFM-Strikethrough `~~` benutzt. Aber `==` darf nicht mit YAML-Frontmatter-Trennlinien (`---`) oder mit Mathematik-Delimitern kollidieren. Sollte sauber trennbar sein.
- **Callout-Indent in geschachtelten Blockquotes**: ob `> > [!note]` ein Callout im Callout darstellt oder ein normaler Blockquote-Tiefenwechsel ist. Obsidian rendert das nicht als geschachtelten Callout. Wir folgen demselben Verhalten.
- **Footnote-Definitions am Datei-Ende und Frontmatter am Datei-Anfang**: keine Kollision erwartet, beide arbeiten an verschiedenen Stellen.
- **Portable Export**: Callouts brauchen im exportierten HTML inline Styles, damit sie auch in fremden Renderern als Box erscheinen. Footnotes haben ein eigenes Backlink-Modell, das auch im Portable funktioniert.
