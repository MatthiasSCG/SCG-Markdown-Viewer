# 4T-0013 — Code-Folding nach Überschriften im Editor

**Status**: Test bestanden
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Längere Markdown-Dokumente sind im Quellcode-Pane heute nur durch Scrollen oder Suchen navigierbar. Strukturierte Editoren zeigen am Gutter pro Heading eine klappbare Region, sodass die übergeordnete Gliederung jederzeit sichtbar bleibt und Sektionen nach Bedarf ein- oder ausgeblendet werden können. Diese Möglichkeit fehlt aktuell und ist Teil des Strukturnavigations-Pakets.

## Lösungsansatz

### Folding-Engine

Heading-Folding ist im Sprachpaket `@codemirror/lang-markdown` (Version 6.5) **bereits eingebaut**. Die Bibliothek registriert per `foldService.of(...)` einen Service, der jeden Heading-Knoten (ATX und Setext) im `syntaxTree` erkennt und über die interne `findSectionEnd`-Logik die Region bis zum Beginn des nächsten Headings mit Stufe `<= N` bzw. zum Datei-Ende auflöst. Verschachtelung wird mitbedient.

- **Konsequenz für 4T-0013**: Die Region-Definition muss **nicht selbst implementiert** werden. Es reicht:
  - In den CodeMirror-Extensions `foldGutter()` (aus `@codemirror/language`) ergänzen.
  - Das bereits genutzte `markdownLanguage`-Sprachpaket bleibt unverändert; der `foldService` wirkt automatisch.
- **ATX-** (`#` bis `######`) und **Setext-Headings** (`Heading\n====`, `Heading\n----`) werden gleichermaßen erfasst, weil das Sprachpaket beide als Heading-Knoten markiert.
- **Verschachtelung**: Regions können beliebig tief verschachtelt sein, ein `##`-Heading innerhalb eines `#`-Bereichs eröffnet eine innere Region, die unabhängig von der äußeren ein- und ausklappbar ist.

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

## Implementierungs-Recherche (geklärt vor Umsetzungsbeginn)

- **Heading-Folding im Sprachpaket**: in `@codemirror/lang-markdown` 6.5 bereits enthalten (siehe `node_modules/@codemirror/lang-markdown/dist/index.cjs`, `foldService.of(...)` mit `findSectionEnd`-Logik). Keine eigene Implementierung der Region-Definition nötig.
- **Read-/Write-API für externen Zugriff auf den `foldState`**: `foldedRanges(state)` für Read, `foldEffect`/`unfoldEffect` für Write, alle aus `@codemirror/language`. Change-Notification über einen eigenen `ViewPlugin` mit `update()`-Callback, der `transaction.effects` auf diese Effect-Typen filtert und ein DOM-Custom-Event auslöst.

## Lösung

Umgesetzt im Renderer, ohne Eingriff in den Main-Prozess.

**Imports** in `src/renderer/renderer.js`:

- Aus `@codemirror/view` zusätzlich `ViewPlugin`, `gutter`, `GutterMarker`.
- Aus `@codemirror/language` zusätzlich `syntaxTree`, `codeFolding`, `foldKeymap`, `foldedRanges`, `foldable`, `foldEffect`, `unfoldEffect`, `foldState`. `foldKeymap` enthält bereits die Standard-Bindings `Strg+Umschalt+[` (Fold) und `Strg+Umschalt+]` (Unfold) sowie die Alternativen `Strg+Alt+[` / `Strg+Alt+]` und wird unverändert übernommen.
- **Wichtig**: `codeFolding()` muss explizit als Extension geladen werden, weil das `foldState`-Field sonst nicht im EditorState aktiv ist. Bei Verwendung des Standard-`foldGutter` wurde `codeFolding()` automatisch mit eingehängt; mit dem eigenen Gutter (siehe unten) entfällt das, also setzen wir es selbst.

**Eigener Folding-Gutter mit dynamischen Hierarchie-Spuren** (statt CodeMirrors Standard-`foldGutter`):

- `foldStructureField` (`StateField`): Bei Doc-Änderung werden aus dem `syntaxTree` gesammelt:
  - **Headings**: Knoten `ATXHeading1..6` und `SetextHeading1..2`. Pro Heading werden `level`, `fromLine`, `toLine` (letzte zur Region gehörige Zeile, Zeile vor dem nächsten Heading mit gleicher oder höherer Stufe bzw. letzte Doc-Zeile) und `track` (= `level`) berechnet.
  - **Block-Foldables**: Knoten der Typen `ListItem`, `Blockquote`, `FencedCode`, `HTMLBlock`, `Table`, sofern mehrzeilig. Pro Block werden `fromLine`, `toLine`, `from`/`to` (Region-Form `from = Ende der Startzeile`, `to = Knoten-Ende`, analog zur markdown-`foldNodeProp`-Logik) und `track` (= `maxHeadingLevel` + Verschachtelungstiefe innerhalb anderer Blocks) berechnet.
  - **`totalTracks`** = `maxHeadingLevel` + `maxBlockDepth`. Spurenanzahl ist dynamisch und passt sich an die in der Datei vorkommenden Heading-Ebenen und Block-Verschachtelungstiefen an.
- `FoldGutterMarker`: Pro sichtbarer Zeile, die mindestens eine Region berührt, ein Marker mit `totalTracks` Spuren. Pro Spur:
  - `start`-Eintrag: Pfeil-Indikator (`⌄` offen, `›` zugeklappt), klickbar, mit `data-fold-kind` (`heading` oder `block`) und `data-fold-line`.
  - `inside`-Eintrag: senkrechte Linie über die volle Zeilenhöhe — **gilt einheitlich für Heading- und Block-Regionen**.
  - leer, wenn die Spur diese Zeile nicht überdeckt.
- `FoldGutterSpacer` + `initialSpacer` / `updateSpacer`: Hält die Gutter-Breite proportional zur tatsächlichen Spurenanzahl. Beim Hinzufügen oder Entfernen einer Heading-Ebene bzw. Block-Tiefe wächst der Gutter mit.
- **Drei voneinander unabhängige Wege zur Breitenpropagation** (jeweils robust gegen Layout-Eigenheiten des CodeMirror-Gutter-Mechanismus): (1) Inline-Style `width`/`min-width`/`flex` am Marker- und Spacer-DOM, (2) CSS-`calc()` über die CSS-Custom-Property `--scg-tracks` am Marker-Root, (3) der `ViewPlugin` `foldGutterWidthSync` setzt `width` und `min-width` direkt am `.cm-headingGutter`-DOM, sobald sich das `foldStructureField` ändert.
- **`foldStructureField`-Update auch ohne `docChanged`**: Der lezer-markdown-Parser arbeitet asynchron und liefert den vollständigen `syntaxTree` häufig erst über ein späteres, nicht-doc-änderndes Update nach. Mein Update-Callback vergleicht `syntaxTree(tr.state) === syntaxTree(tr.startState)`; wenn die Identity wechselt, wird die Struktur neu berechnet — auch ohne Doc-Änderung.
- `lineMarkerChange`: Meldet `true`, wenn sich `foldState` **oder** `foldStructureField` zwischen `startState` und `state` geändert hat. So wird der Gutter auch ohne Doc-Änderung neu gerendert, sobald per Tastenkürzel oder Klick gefaltet/entfaltet wird.
- `domEventHandlers.click`: Liest `data-fold-line` und `data-fold-kind` am angeklickten Spur-Span. Bei `kind === 'heading'` wird über `foldHeadingRegion` / `unfoldHeadingRegion` getoggelt, bei `kind === 'block'` direkt per `foldEffect`/`unfoldEffect` auf die im `foldStructureField` gespeicherte Block-Region.

**Erweiterungen** in `createEditorState`:

- `codeFolding()`, `foldStructureField`, `headingFoldGutter` und `foldChangeNotifier` werden **vor** dem `lineNumbers`-Compartment in die Extension-Liste eingehängt. Dadurch landet der Heading-Gutter links vom Zeilennummern-Gutter im DOM, weil CodeMirror Gutters in Registrierungs-Reihenfolge anordnet.
- `keymap.of([...foldKeymap, ...defaultKeymap, ...historyKeymap])` ersetzt das bisherige Keymap, sodass die Folding-Bindings vor den Default-Keymap-Einträgen greifen.

**Renderer-interne API** (für 4T-0014):

- `getHeadingRegion(view, line)`: Hilfsfunktion, liefert die `foldable`-Region (`{from, to}`) für eine 1-basierte Zeilennummer, oder `null` falls die Zeile kein Heading ist. Quelle ist der markdown-`foldService` aus dem Sprachpaket.
- `isHeadingRegionFolded(view, line)`: Liest `foldedRanges(state)` und prüft, ob die Region exakt als gefaltet eingetragen ist.
- `foldHeadingRegion(view, line)` / `unfoldHeadingRegion(view, line)`: Idempotente Toggle-Helfer; dispatchen `foldEffect` bzw. `unfoldEffect`. Geben `true` zurück, wenn ein Zustandswechsel stattgefunden hat.

**Change-Notification** (`foldChangeNotifier`):

- Ein leichter `ViewPlugin`, der bei jedem Update durch alle Transaktions-Effekte iteriert. Wenn ein `foldEffect` oder `unfoldEffect` erkannt wird, feuert er ein `CustomEvent('scg:foldchange', { detail: { paneIdx } })` auf `document`. Der `paneIdx` wird über `paneEditors.indexOf(update.view)` ermittelt; ist die View nicht gefunden, ist `paneIdx` `null`.
- Konsument ist im aktuellen Stand niemand; das Outline-Panel aus 4T-0014 wird darauf abonnieren.

**Styling** in `src/renderer/styles.css`:

- `.cm-headingGutter`: keine feste `min-width` mehr — der `FoldGutterSpacer` aus dem Gutter-Setup gibt die Breite dynamisch vor (10 px pro Spur).
- `.scg-heading-gutter`: Flex-Container über die volle Zeilenhöhe.
- `.scg-heading-track`: 10 px breit, mittig ausgerichtet. Bei `.scg-heading-line` zeichnet ein Pseudo-Element eine 1 px starke senkrechte Linie in `--border-strong`. Bei `.scg-heading-marker` ist der Span klickbar (`cursor: pointer`), mittlere Auffälligkeit (`opacity: 0.65`), bei Hover voll sichtbar.
- Heading- und Block-Spuren werden visuell gleich behandelt (gleiche Linie, gleicher Pfeil); Unterschied steckt nur im DOM-Attribut `data-fold-kind` für den Click-Handler.
- Light und Dark werden über die bestehenden CSS-Variablen abgedeckt; spezielle Theme-Regeln waren nicht nötig.
- Pfeil-Marker: `⌄` für expandierte Region, `›` für zugeklappte Region (direkt im Marker-DOM gesetzt).

**Persistenz und Verhalten:**

- Folding-State wird im CodeMirror-`foldState`-StateField gehalten, das Bestandteil der EditorView-Instanz ist. Jeder Tab hat eine eigene CodeMirror-Instanz pro Pane, in der der Folding-State innerhalb der Sitzung überlebt.
- Beim Schließen eines Tabs oder beim App-Neustart geht der State verloren; das ist beabsichtigt und entspricht den Akzeptanzkriterien.

**Versions-Bump:**

- `package.json` von `0.7.1` auf `0.8.0` angehoben (Zielversion des Epics 3E-0002).

**Gliederungs-Toggle (Statusbar + Menü)** — als Nachzügler zu 4T-0013 nach dem Test ergänzt:

- Neues Property `tab.showFoldGutter` (Default `true`) und neues `Compartment` `editorCompartments.foldGutter`. Das Compartment enthält die rein visuellen Extensions `headingFoldGutter` und `foldGutterWidthSync`; **`foldStructureField` bleibt absichtlich außerhalb**, weil das Outline-Panel aus 4T-0014 die Heading-Liste daraus liest und unabhängig vom Toggle-Zustand funktionieren muss. `codeFolding()` bleibt ebenfalls dauerhaft aktiv, damit die Tastenkürzel `Strg+Umschalt+[`/`]` auch ohne Spalte greifen.
- Statusbar-Button `#btn-fold-gutter` mit Label `Gliederung` (i18n-Key `source.foldGutter`) im `.source-toggles`-Block, eingereiht zwischen `Inhalt` und `Nummern`.
- Menüeintrag `Ansicht → Gliederung` als `checkbox`, im gemeinsamen Block mit `Inhaltsverzeichnis`, `Zeilennummern`, `Zeilenumbruch`. Reihenfolge: Inhaltsverzeichnis → Gliederung → Zeilennummern → Zeilenumbruch.
- `toggleShowFoldGutter()` analog zu `toggleShowLineNumbers()`: setzt das Property, reconfiguriert das Compartment via `syncEditorForPane`, aktualisiert Statusbar-Button und Menü-Häkchen, persistiert über die TabSettings.
- Persistenz pro Tab (TabSettings) — wandert mit beim Tab-Verschieben in andere Fenster und überlebt App-Neustarts.
- i18n-Keys `source.foldGutter`, `source.foldGutterTitle`, `menu.view.foldGutter` in allen fünf Sprachen.

**Bewusst nicht in 4T-0013:**

- Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes — folgen im Sammeltask am Epic-Ende (siehe 3E-0002, Reihenfolge 4).
