# 4T-0013 — Code-Folding nach Überschriften im Editor

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Längere Markdown-Dokumente sind im Quellcode-Pane heute nur durch Scrollen oder Suchen navigierbar. Strukturierte Editoren zeigen am Gutter pro Heading eine klappbare Region, sodass die übergeordnete Gliederung jederzeit sichtbar bleibt und Sektionen nach Bedarf ein- oder ausgeblendet werden können. Diese Möglichkeit fehlt aktuell und ist Teil des Strukturnavigations-Pakets.

## Lösungsansatz

### Folding-Engine

CodeMirror 6 bietet ein `foldGutter` und einen `foldService`-Mechanismus, der pro Sprachpaket Folding-Regions definieren kann. Für Markdown wird der `foldService` so erweitert, dass jeder Heading-Knoten im `syntaxTree` eine klappbare Region eröffnet.

- **Region-Definition**: Ein Heading der Stufe `N` (ATX oder Setext) eröffnet eine Region, die bis zum Beginn des nächsten Headings mit Stufe `<= N` oder zum Datei-Ende reicht.
  - **ATX**: `#` bis `######` am Zeilenanfang.
  - **Setext**: `Heading\n====` (Stufe 1) und `Heading\n----` (Stufe 2). Werden mitberücksichtigt, weil das Markdown-Sprachpaket sie als reguläre Heading-Knoten liefert.
- **Verschachtelung**: Regions können beliebig tief verschachtelt sein. Ein `##`-Heading innerhalb eines `#`-Bereichs eröffnet eine innere Region, die unabhängig von der äußeren ein- und ausklappbar ist.
- **Quelle der Heading-Knoten**: `syntaxTree` der CodeMirror-Markdown-Sprachpaket-Instanz. Falls das Sprachpaket bereits eine `foldNodeProp`-Definition für Headings mitbringt (siehe Implementierungs-Recherche), wird sie genutzt; andernfalls eigene Implementierung über `syntaxTree`-Traversal.

### Falt-Indikatoren am Gutter

- Eigener `foldGutter`-Eintrag, links vom Zeilennummern-Gutter (oder bei deaktivierten Zeilennummern direkt am linken Rand).
- Pfeil-Icon: nach unten zeigend = expandiert, nach rechts zeigend = zugeklappt.
- Style aus dem aktiven CodeMirror-Theme (Light/Dark), passend zu den bestehenden GitHub-Palette-Themes aus 4T-0003.

### Bedienung

- **Klick auf Falt-Indikator** am Gutter: Toggle der jeweiligen Region.
- **Tastenkürzel** am Cursor:
  - `Strg+Umschalt+[`: Region am Cursor einklappen.
  - `Strg+Umschalt+]`: Region am Cursor entfalten.
- **Bei aktiver Selektion**: nur die Region, in der der Cursor steht, wird gefaltet bzw. entfaltet. Mehrere Regions innerhalb der Selektion werden bewusst nicht gleichzeitig getoggelt, um die Semantik einfach zu halten.

### Zustand und Persistenz

- Eingeklappter Zustand pro Region wird im CodeMirror-`foldState` (StateField) gehalten und überlebt Editor-Re-Renders innerhalb der laufenden Sitzung.
- **Default beim Öffnen eines Tabs**: alle Regions offen. Folding-State wird nicht persistiert, weder über Tab-Schließen noch über App-Neustart hinweg.
- **View-Wechsel** (Quellcode ↔ Geteilt ↔ Gerendert ↔ zurück): Folding-Zustand bleibt im CodeMirror-State erhalten, weil die Editor-Instanz nicht neu erzeugt wird.
- **Tab-Wechsel** innerhalb einer laufenden Sitzung: Folding-Zustand bleibt pro Tab erhalten, weil jeder Tab seine eigene CodeMirror-Instanz hat.

### Schnittstelle zum Outline-Panel (4T-0014)

Das Folding-Modell muss von außerhalb des Editors lesbar und steuerbar sein, damit das Outline-Panel:

- für jede Heading-Region anzeigen kann, ob sie aktuell zugeklappt ist (Pfeil-Indikator am Outline-Eintrag),
- per Klick auf seinen eigenen Falt-Indikator die zugehörige Editor-Region toggeln kann,
- beim Sprung-Klick auf eine zugeklappte Region diese vorher automatisch entfaltet.

Konkret:

- **Read-API** `isHeadingRegionFolded(line)`: gibt für eine Heading-Zeile zurück, ob die zugehörige Region eingeklappt ist. Quelle ist der CodeMirror-`foldState`, abgefragt über `foldedRanges` (CodeMirror-6-API).
- **Write-API** `foldHeadingRegion(line)` und `unfoldHeadingRegion(line)`: toggeln die Region einer bestimmten Heading-Zeile gezielt. Implementiert über CodeMirror-Transaktionen mit `foldEffect` bzw. `unfoldEffect`.
- **Änderungs-Notification**: Bei jeder Folding-Änderung (egal ob aus dem Gutter, aus dem Outline-Panel oder per Tastenkürzel) wird ein Renderer-internes Event ausgelöst, auf das das Outline-Panel reagiert, um seine Indikatoren zu aktualisieren. Implementierung über CodeMirror-`ViewPlugin` mit `update`-Callback, der bei `transaction.effects` vom Typ `foldEffect`/`unfoldEffect` ein DOM-Custom-Event auslöst.

## Akzeptanzkriterien

**Folding-Verhalten:**

- Im Quellcode-Pane erscheint links neben den Zeilennummern (oder bei deaktivierten Zeilennummern direkt am linken Rand) ein Falt-Indikator vor jedem ATX- oder Setext-Heading.
- Klick auf den Indikator klappt den Bereich vom Heading bis zum nächsten gleich- oder höhergestellten Heading ein. Erneuter Klick öffnet die Region wieder.
- Verschachtelte Regions funktionieren korrekt: Ein `##`-Heading lässt sich unabhängig von der umschließenden `#`-Region klappen.
- Bei deaktivierten Zeilennummern bleibt das Folding-Gutter sichtbar.

**Tastenkürzel:**

- `Strg+Umschalt+[` klappt die Heading-Region ein, in der der Cursor steht.
- `Strg+Umschalt+]` entfaltet die Region am Cursor.
- Bei aktiver Selektion wird nur die Region am Cursor getoggelt, nicht alle Regions innerhalb der Selektion.

**Zustand und Persistenz:**

- Beim Öffnen eines Tabs sind alle Regions offen.
- Folding-Zustand überlebt View-Wechsel (Quellcode/Geteilt/Gerendert/Geteilt zurück) und Tab-Wechsel innerhalb der laufenden Sitzung.
- Folding-Zustand wird nicht persistiert: beim Schließen des Tabs ist er verloren, beim Neustart der App ebenso.

**Theme:**

- Folding-Indikatoren passen sich an das aktive Theme (Light/Dark) an, konsistent mit den CodeMirror-Themes aus 4T-0003.

**Schnittstelle zum Outline-Panel:**

- `isHeadingRegionFolded(line)`, `foldHeadingRegion(line)` und `unfoldHeadingRegion(line)` stehen als Renderer-interne API zur Verfügung und werden vom Outline-Panel aus 4T-0014 genutzt.
- Bei jeder Folding-Änderung (Editor-Gutter, Outline-Indikator, Tastenkürzel) wird ein Custom-Event im Renderer ausgelöst, das das Outline-Panel zur Aktualisierung seiner Pfeil-Indikatoren empfängt.

## Bezug zu Dateien

- `src/renderer/renderer.js` — Erweiterung der CodeMirror-Extensions um `foldGutter` und Markdown-`foldService`; Read- und Write-Helper für das Outline-Panel; Tastenkürzel-Handler `Strg+Umschalt+[` / `Strg+Umschalt+]`; Renderer-interner Event-Bus für Folding-Änderungen.
- `src/renderer/styles.css` — Gutter-Styles für Falt-Indikatoren (Light und Dark).
- `src/i18n/{de,en,fr,es,it}.json` — Hilfe-Dialog-Texte (im Sammeltask am Epic-Ende, nicht in 4T-0013 selbst).

## Implementierungs-Recherche (vor Umsetzungsbeginn)

- Prüfen, ob `@codemirror/lang-markdown` bereits eine `foldNodeProp`-Definition für ATX- und Setext-Heading-Knoten mitbringt. Falls ja, kann die eigene Region-Definition entfallen; falls nein, eigene Implementierung über `syntaxTree`-Traversal.
- Konkrete CodeMirror-6-API für externen Read-/Write-Zugriff auf den `foldState`: `foldedRanges`, `foldEffect`, `unfoldEffect` im Detail prüfen und in einem kurzen Spike-Snippet validieren.

## Lösung
