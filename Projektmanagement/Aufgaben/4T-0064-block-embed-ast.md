# 4T-0064 — Block-Embed-Erweiterung (AST-basiert)

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0
**Setzt voraus**: [4T-0054 — Wiki-Link-Parser für Heading- und Block-Anker](4T-0054-wiki-link-heading-block-anker.md), [4T-0055 — Wiki-Embeds](4T-0055-wiki-embeds.md)

## Warum

Aus Epic 3E-0011 wurde der Punkt „vollständige Block-Range-Erkennung beim Wiki-Embed" als Nachzieher in 0.18.0 verschoben (siehe [4T-0055, Schnitt-Anpassungen am Meta-Plan](4T-0055-wiki-embeds.md#schnitt-anpassungen-am-meta-plan)). Aktuell extrahiert `extractEmbedSnippet` bei `![[Datei#^id]]` nur die eine Zeile mit dem Block-Marker. Mehrzeilige Strukturen (Listen-Items mit Sub-Inhalt, Code-Blöcke, Tabellenzeilen mit umliegenden Zellen, mehrzeilige Blockquotes) werden nicht vollständig eingebettet.

## Lösungsansatz

### AST-basierte Block-Range-Erkennung

`extractEmbedSnippet` in [src/main/backlinks.js](../../src/main/backlinks.js) wird von der aktuellen Zeilen-Heuristik auf eine markdown-it-AST-basierte Implementierung umgestellt:

1. Quelldatei mit demselben markdown-it-Setup parsen, das auch für Wiki-Links zum Einsatz kommt.
2. Token-Stream nach dem Block-Marker `^id` durchsuchen, der typischerweise am Ende eines Block-Tokens steht.
3. Das umgebende Block-Element (Listen-Item, Code-Block, Tabellen-Zeile, Blockquote) identifizieren und vollständig extrahieren.
4. Bei Listen: das vollständige Listen-Item inklusive geschachtelter Sub-Listen.
5. Bei Tabellen: die ganze Zeile, ggf. mit Header-Zeile zum Kontext.
6. Bei Blockquotes: alle Zeilen des Blockquotes.

### Heading-Anker bleibt wie bisher

`![[Datei#Heading]]` extrahiert von der Heading-Zeile bis zur nächsten gleichrangigen oder höheren Heading. Diese Logik aus 4T-0055 bleibt unverändert.

### Fallback

Bei unbekannten Block-Strukturen oder Parser-Fehler bleibt das aktuelle Verhalten (Zeilen-Heuristik) als Fallback.

## Akzeptanzkriterien

- `![[Datei#^id]]` bei einem mehrzeiligen Listen-Item bettet das ganze Item ein, inkl. Sub-Listen.
- `![[Datei#^id]]` bei einem Code-Block bettet den ganzen Code-Block ein (alle Zeilen zwischen den Fences).
- `![[Datei#^id]]` bei einer Tabellen-Zeile bettet die ganze Zeile ein (alle Zellen).
- `![[Datei#^id]]` bei einem mehrzeiligen Blockquote bettet alle Blockquote-Zeilen ein.
- Heading-Anker-Verhalten unverändert.
- Bei Parser-Fehler oder unbekannter Block-Struktur: Fallback auf aktuelle Zeilen-Heuristik, kein Bruch.

## Bezug zu Dateien

- [src/main/backlinks.js](../../src/main/backlinks.js) — `extractEmbedSnippet` AST-basiert refactored.
- [src/main/preload.js](../../src/main/preload.js) — ggf. neue Helper-Funktion zum gemeinsamen markdown-it-Setup (falls bisher nicht ausgelagert).

## Reihenfolge im Epic

Nach Callouts, Highlight und Footnotes, weil thematisch eigenständig und nicht von den anderen drei Tasks abhängig.
