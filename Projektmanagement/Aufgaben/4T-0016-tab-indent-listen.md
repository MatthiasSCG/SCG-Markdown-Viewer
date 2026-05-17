# 4T-0016 — Tab und Shift-Tab in Listen für Ein-/Ausrücken

**Status**: Offen
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Heute fügt `Tab` im Quellcode-Pane ein Tab-Zeichen ein. In Listen ist das selten gewollt. In den meisten Markdown-Editoren ist `Tab` in Listen das natürliche Mittel, ein Listenelement eine Ebene einzurücken, `Shift+Tab` rückt aus. Damit lassen sich Listen schnell strukturieren, ohne mit Leerzeichen-Zählen zu hantieren.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

- **Kontext-Erkennung**: Beim Tastendruck `Tab` bzw. `Shift+Tab` prüfen, ob die aktuelle Zeile (bzw. bei Selektion: alle umschlossenen Zeilen) Teil einer Markdown-Liste ist. Erkannte Marker:
  - Ungeordnete Liste: `- `, `* `, `+ ` (mit optionaler Einrückung davor)
  - Geordnete Liste: `1. `, `2. `, … (auch `1) ` ggf.)
  - Task-Liste: `- [ ] `, `- [x] `
- **Einrücken** bei `Tab`: zwei Leerzeichen (oder vier, zu entscheiden im Detail-Design; Vorschlag zwei, weil Markdown-üblich) vor den Marker einfügen.
  - Bei **geordneten Listen** wird die Nummer beim Einrücken auf `1.` zurückgesetzt (eine neue Sub-Liste beginnt). Das entspricht dem typischen Verhalten der meisten Markdown-Editoren und gibt im gerenderten Output eine saubere, bei 1 startende Sub-Liste. Die ursprüngliche Nummer wird nicht erhalten.
  - Bei **ungeordneten Listen** bleibt der Marker (`-`, `*`, `+`) unverändert, nur Leerzeichen werden vorangestellt.
  - Bei **Task-Listen** (`- [ ] `, `- [x] `) bleibt der Marker inklusive Status unverändert.
- **Ausrücken** bei `Shift+Tab`: führende Leerzeichen vor dem Marker um zwei reduzieren, sofern vorhanden. Beim Erreichen der nullten Ebene weiteren Shift-Tab als No-Op.
  - Die Nummer einer geordneten Liste bleibt beim Ausrücken **unverändert**, kein automatisches Umnummerieren der Ziel-Ebene. Markdown rendert auch nicht-fortlaufende Nummerierungen tolerant. Eine spätere Verfeinerung wäre möglich, ist aber nicht im Umfang.
- **Mehrzeilen-Selektion**: Wenn die Selektion mehrere Zeilen umfasst, gilt die Operation für alle Zeilen, die Listen-Marker tragen. Nicht-Listen-Zeilen in der Selektion bleiben unangetastet.
- **Fallback außerhalb von Listen**: Default-Tab-Verhalten von CodeMirror beibehalten (Tab-Zeichen einfügen). Damit keine Regression in nicht-Listen-Kontexten.
- **CodeMirror-Integration**: eigene `keymap`-Erweiterung mit höherer Priorität als der Default. Innerhalb des Handlers Markdown-Kontext aus `syntaxTree` ablesen, falls verfügbar; sonst Regex-Fallback auf die aktuelle Zeile.

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
