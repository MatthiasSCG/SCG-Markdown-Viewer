# 4T-0014 — Outline-Panel mit Heading-Baum, klickbar und scroll-synchron

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Der Folding-Mechanismus aus 4T-0013 ist editor-intern und nur im Quellcode-Pane sichtbar. Für die Übersicht über lange Dokumente fehlt ein persistentes Inhaltsverzeichnis, das

- die Heading-Hierarchie als gut lesbaren Baum darstellt,
- per Klick zur jeweiligen Stelle im Editor und im Render-Pane springt,
- die aktuell sichtbare Stelle hervorhebt, sodass auch beim Scrollen die Position im Dokument klar ist.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

- **Position**: linkes Seiten-Panel **pro Spalte**, Breite zwischen ca. 200 und 400 px, per Splitter veränderbar. Toggle in der Statusbar (neuer Button) und Menüleiste (`Ansicht → Inhaltsverzeichnis`). Im Zwei-Spalten-Layout kann jede Spalte ihr Outline-Panel unabhängig ein- und ausblenden.
- **Quelle der Heading-Hierarchie**: derselbe `syntaxTree` aus dem CodeMirror-Markdown-Sprachpaket wie in 4T-0013. Damit ist die Hierarchie konsistent zum Folding und steht auch in der reinen Render-Ansicht zur Verfügung (CodeMirror-Doc bleibt im Hintergrund vorhanden).
- **Darstellung**: eingerückter Baum, ein Eintrag pro Heading, mit Heading-Stufe als Einrückungstiefe. Maximal sechs Ebenen, längere Titel ellipsen mit Tooltip auf vollen Text.
- **Bedienung ausschließlich per Maus.** Das Outline-Panel nimmt keinen Tastatur-Fokus, es gibt keine Pfeiltasten-Navigation und keinen Enter-Sprung. Tastenkürzel `F1`, `Esc` etc. bleiben am Editor.

### Klick-Verhalten und Zusammenspiel mit Code-Folding (4T-0013)

Jeder Outline-Eintrag hat zwei voneinander getrennte Klick-Bereiche:

- **Klick auf den Heading-Text** ist der Sprung-Klick:
  - Im Quellcode-/Geteilt-Modus: Cursor in die entsprechende Heading-Zeile setzen, Zeile in den sichtbaren Bereich scrollen. **Falls die zugehörige Region im Editor zugeklappt ist, wird sie vorher automatisch entfaltet**, sonst landet der Cursor in einer unsichtbaren Zeile.
  - Im Render-Modus: Render-Pane zum entsprechenden `<h*>` scrollen.
- **Klick auf den kleinen Falt-Indikator links neben dem Heading-Text** (Pfeil-Icon, analog zum Editor-Gutter) ist der reine Folding-Toggle: klappt die zugehörige Editor-Region zu oder auf, ohne den Cursor zu bewegen und ohne im Render-Pane zu scrollen.
- **Optischer Indikator für eingeklappte Regions**: Outline-Einträge, deren Editor-Region aktuell zugeklappt ist, sind mit einem Pfeil nach rechts (statt nach unten) gekennzeichnet. Damit ist auf einen Blick sichtbar, welche Sections momentan nicht im Editor expandiert sind.

Wichtig zur Abgrenzung: Das **Outline-eigene Aufklappen oder Zuklappen des Heading-Baums** (Verbergen von H3-Kindern unter einem H2-Knoten in der Outline-Sicht) ist davon **entkoppelt**. Wer im Outline einen Heading-Knoten visuell zusammenklappt, beeinflusst damit nicht das Editor-Folding. Folding-Aktionen aus dem Outline laufen ausschließlich über den separaten Falt-Indikator.

### Synchronisation

- **Hervorhebung der aktuellen Sektion** (sticky highlight): basierend auf Cursor-Zeile im Editor oder Scroll-Position im Render-Pane, je nach aktivem Pane. Update gedrosselt (z.B. 100 ms Debounce).
- **Empty State**: Bei Datei ohne Headings ein lokalisierter Hinweistext „Keine Überschriften gefunden".

## Akzeptanzkriterien

**Anzeige und Persistenz:**

- Statusbar oder Menü bieten einen Toggle, der das Outline-Panel **pro Spalte** ein- oder ausblendet. Status persistent über App-Neustart hinweg, pro Spalte unabhängig.
- Bei sichtbarem Panel zeigt der Baum die Headings der aktiven Datei der Spalte, eingerückt nach Stufe.
- Breite des Panels lässt sich per Splitter verändern und bleibt nach Neustart erhalten.
- Outline aktualisiert sich bei jeder Editor-Änderung (Heading hinzufügen/entfernen) mit kurzem Debounce, ohne Flackern.

**Klick-Verhalten:**

- Klick auf den **Heading-Text** eines Eintrags setzt im Editor den Cursor auf die Heading-Zeile bzw. scrollt im Render-Pane zum jeweiligen Anker.
- Ist die zugehörige Region im Editor zugeklappt, wird sie beim Klick auf den Heading-Text automatisch entfaltet, sodass der Cursor in einer sichtbaren Zeile landet.
- Klick auf den **Falt-Indikator** links neben dem Heading-Text toggelt nur das Folding der zugehörigen Editor-Region. Der Cursor und der Scroll-Stand bleiben unverändert.

**Folding-Synchronisation:**

- Outline-Einträge, deren Editor-Region aktuell zugeklappt ist, zeigen einen Pfeil nach rechts statt nach unten als Indikator.
- Wird im Editor selbst (über den Gutter) eine Region zugeklappt oder aufgeklappt, aktualisiert sich der Outline-Indikator entsprechend, ohne dass das Panel neu rendert.

**Bedienung:**

- Outline-Panel ist ausschließlich per Maus bedienbar.
- Outline-Panel nimmt keinen Tastatur-Fokus. Pfeiltasten, Enter und Leertaste haben darin keine Funktion.

**Sonstiges:**

- Aktive Sektion wird in der Liste optisch hervorgehoben und folgt Cursor (Editor-Pane) bzw. Scroll-Position (Render-Pane), gedrosselt auf ca. 100 ms.
- Sprachwechsel aktualisiert die UI-Texte (Toggle-Label, Empty-State) live.
- Bei Datei ohne Headings erscheint ein lokalisierter Empty-State-Text.

## Bezug zu Dateien

- `src/renderer/index.html` — Container für das Outline-Panel pro Spalte, Statusbar-Toggle.
- `src/renderer/renderer.js` — Heading-Extraktion aus `syntaxTree`, Render des Baums, Klick-Handler, Cursor-/Scroll-Listener, Settings-Persistenz.
- `src/renderer/styles.css` — Layout, Baum-Einrückung, Hervorhebung, Splitter.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Panel-Titel, Toggle-Label, Empty-State, Tooltip-Texte.

## Lösung
