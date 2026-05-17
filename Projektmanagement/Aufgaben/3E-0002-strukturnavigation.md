# 3E-0002 — Strukturnavigation: Folding, Outline und Backlinks

**Status**: Offen
**Zielversion**: 0.8.0
**Vorgängerversion**: 0.7.0

## Ziel

Die App bekommt drei zusammengehörige Navigations- und Übersichts-Features, die alle dieselbe Wissensquelle (Heading-Hierarchie des Dokuments bzw. Wiki- und Markdown-Link-Bezüge zwischen Dateien) ausnutzen:

- **Code-Folding nach Überschriften** im Quellcode-Pane. Ein Heading der Stufe `N` definiert eine Region bis zum nächsten Heading der Stufe `<= N` oder bis zum Datei-Ende. Die Region ist im Gutter klappbar (analog zu IDEs).
- **Outline-Panel** als persistentes, ein-/ausklappbares Seiten-Panel je Spalte. Es zeigt die Heading-Hierarchie der aktiven Datei als klickbaren Baum. Synchronisation mit Cursor-Position im Editor und Scroll-Position im Render-Pane.
- **Backlinks-Panel** zeigt eingehende Referenzen auf die aktive Datei, sowohl `[[Wiki-Links]]` als auch relative `*.md`-Links. Suchraum ist der Ordner der aktiven Datei plus die zwei direkt darunterliegenden Unterordner-Ebenen (Variante A).

Folding und Outline arbeiten rein dokumentenintern. Backlinks ist das einzige Feature des Epics, das ordnerübergreifend operiert.

## Warum

- Markdown-Dokumente werden mit zunehmender Pflege länger und gliedern sich in viele Sektionen. Folding und Outline machen lange Dokumente überschaubar und ersetzen ständiges Scrollen durch Sprungnavigation.
- Wiki-Links sind seit 0.4.x unterstützt, eine **Rückkehr-Sicht** (welche Datei zeigt hierher) fehlt aber. Ohne sie bleibt das Wiki-Link-Modell halbiert: hinkommen kann man, zurück nur durch Suche.
- Drei Features mit gemeinsamem konzeptionellen Kern (Struktur des Dokuments und Bezüge zwischen Dokumenten) werden bewusst in einem Release zusammengefasst, weil sie sich UX-seitig ergänzen.

## Umfang und Abgrenzung

**Im Umfang:**

- CodeMirror-Heading-Folding im Quellcode-Pane mit `foldGutter`, Persistenz der eingeklappten Regions pro Tab innerhalb der laufenden Sitzung
- Outline-Panel als drittes Pane je Spalte (links neben Editor/Render), ein-/ausblendbar per Toggle in der Statusbar oder Tastenkürzel
- Synchronisation Outline ↔ Cursor (Editor) und Outline ↔ Scroll (Render)
- Backlinks-Panel als viertes Pane je Spalte (oder als Reiter im Outline-Panel, zu entscheiden in 4T-0015) mit Liste aller eingehenden Referenzen
- Index-Aufbau für Backlinks: asynchron beim Tabwechsel mit kurzem Indexier-Hinweis, `chokidar`-Watcher auf der jeweiligen Suchwurzel für Live-Aktualisierung
- Tiefenbegrenzung der Backlinks-Suche auf den Datei-Ordner und zwei zusätzliche Unterordner-Ebenen
- Hilfe-Dialog um die drei Features und die zugehörigen Tastenkürzel erweitern
- i18n-Keys in allen fünf Sprachen
- CHANGELOG-Eintrag, Release-Notes, Version-Bump 0.7.0 → 0.8.0

**Nicht im Umfang (für 0.8.0):**

- Globale Volltextsuche über alle Dateien des Suchraums
- Quick-Open-Dialog (`Strg+P`) auf Basis des Backlinks-Index
- Datei-Baum-Panel
- Marker-Datei-Mechanismus oder andere Workspace-Heuristiken (verworfen, siehe Architekturentscheidungen)
- Heading-Anker mit Hover-Kopier-Funktion (eigenes Thema)
- Frontmatter-Aliase oder andere unscharfe Backlink-Auflösung
- Outline-Drag-Drop zum Umsortieren von Sektionen

## Untergeordnete Tasks

- [ ] [4T-0013 — Code-Folding nach Überschriften im Editor](4T-0013-code-folding-headings.md)
- [ ] [4T-0014 — Outline-Panel mit Heading-Baum, klickbar und scroll-synchron](4T-0014-outline-panel.md)
- [ ] [4T-0015 — Backlinks-Panel mit Tiefen-begrenzter Indexierung](4T-0015-backlinks-panel.md)

## Architekturentscheidungen

- **Workspace-Konzept verworfen.** Die App bleibt dokumentenzentriert. Backlinks leiten ihre Suchwurzel automatisch aus dem Ordner der aktiven Datei ab. Es gibt keinen expliziten Workspace-Befehl, keine Marker-Datei, keine Workspace-Persistenz. Begründung: Der Nutzer arbeitet mit Markdown in Strukturen ohne Workspace-Begriff, und ein zusätzliches mentales Modell hätte mehr Last als Nutzen verursacht.
- **Suchraum-Tiefe fest auf maximal zwei zusätzliche Unterordner-Ebenen begrenzt** (Ebene 0 = Datei-Ordner, plus Ebene 1 und 2). Begründung: Garantiert eine vorhersagbare Worst-Case-Datei-Anzahl im Index, deckelt die Performance, und entspricht der typischen Ablage-Tiefe in den Markdown-Sammlungen des Nutzers. Ebenen 3 und tiefer werden bewusst nicht erfasst. Die Begrenzung ist im Backlinks-Panel transparent gemacht.
- **Blinder Fleck nach oben akzeptiert.** Wenn die aktive Datei tief in einer Hierarchie liegt, werden Backlinks aus übergeordneten Ordnern (z.B. einer Index-Datei eine Ebene höher) nicht erfasst. Das ist eine bewusste Konsequenz der Variante A und im Hilfe-Dialog erklärt. Wer Backlinks aus übergeordneten Ebenen sehen will, wechselt den aktiven Tab auf eine Datei in der entsprechenden Ebene.
- **Backlinks-Auflösung exakt.** Nur Treffer der Form `[[Dateiname]]` → `Dateiname.md` (mit oder ohne Endung im Link) und relative `*.md`-Pfade werden indiziert. Keine Alias-Auflösung über Frontmatter, keine Heading-Anker-Auflösung, keine Fuzzy-Matches. Begründung: einfach, deterministisch, schnell. Erweiterung später möglich.
- **Index-Aufbau asynchron** mit `chokidar`-Watcher pro Suchwurzel. Begründung: blockiert die UI nicht bei größeren Bäumen; Watcher hält den Index live, ohne dass beim Tabwechsel jedesmal vollständig neu gescannt werden muss. Caching pro Suchwurzel über den Lebenszyklus des Fensters.
- **Outline und Folding sind dokumentenintern**. Beide leiten die Heading-Struktur aus dem CodeMirror-Markdown-Parser ab (`@codemirror/language` `syntaxTree`), nicht aus markdown-it im Render-Pane. Begründung: Single Source of Truth; im Edit-Modus stehen Heading-Informationen auch dann zur Verfügung, wenn der Render-Pane gar nicht aktiv ist.
- **Outline und Backlinks als zwei getrennte Panels** (statt einer kombinierten Sidebar mit Tabs). Begründung: Beide werden parallel gebraucht (Outline für Navigation im aktuellen Dokument, Backlinks als persistente Rückkehr-Sicht), Zusammenlegung würde ständiges Hin-und-Her-Wechseln erzwingen. Beide sind unabhängig ein-/ausklappbar.
- **Sidebar-Geltung pro Spalte, nicht pro Fenster.** Im Zwei-Spalten-Layout hat jede Spalte ihre eigene linke Sidebar mit eigenem Outline und eigenen Backlinks der jeweils dort aktiven Datei. Begründung: konsistent mit dem bisherigen Spalten-Modell (eigene Tab-Leiste pro Spalte, eigene Inhalte). Eine Fenster-weite Sidebar würde ihren Inhalt an „welche Spalte hat Fokus" koppeln, was bei häufigem Spaltenwechsel verwirrt.
- **Outline und Backlinks sind ausschließlich per Maus bedienbar**, kein Tastatur-Fokus, keine Pfeil-/Enter-Navigation. Begründung: passt zum schlanken App-Stil; Tastatur-Fokus erfordert sonst eigenes Fokus-Management und Konflikte mit Editor-Tastenkürzeln.
- **Outline und Code-Folding sind verknüpft, aber nicht zwangsgekoppelt.** Outline zeigt für jede Heading-Region einen Indikator, ob sie im Editor zugeklappt ist; Klick auf den Heading-Text im Outline springt und entfaltet ggf. die Region; ein separater Falt-Indikator am Outline-Eintrag toggelt nur das Folding ohne Sprung. Das Outline-eigene Visualisierungs-Aufklappen (Verbergen von Sub-Headings im Baum) ist davon entkoppelt. Details in 4T-0013 und 4T-0014.

## Reihenfolge der Umsetzung

1. **4T-0013** Code-Folding — kleinster Task, rein editor-intern, dient als Warmup mit dem CodeMirror-`syntaxTree`.
2. **4T-0014** Outline-Panel — baut auf demselben `syntaxTree`-Mechanismus auf, ergänzt das erste sichtbare Sidebar-Panel.
3. **4T-0015** Backlinks-Panel — letzter Schritt, inklusive Index-Aufbau, Watcher und Tiefenbegrenzung. Profitiert davon, dass das Sidebar-Layout aus 4T-0014 bereits etabliert ist.
4. Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes und Version-Bump als Abschluss-Sammeltask (Format wie 4T-0010), zu planen am Ende, nicht jetzt schon angelegt.

## Bezug zu Dateien

- `src/renderer/index.html` — Sidebar-Container für Outline und Backlinks, Statusbar-Toggles
- `src/renderer/renderer.js` — Sidebar-Logik, Outline-Render, Backlinks-Render, Index-Anbindung, Cursor- und Scroll-Synchronisation
- `src/renderer/styles.css` — Sidebar-Layout, Outline-Baum, Backlinks-Liste, Folding-Gutter
- `src/main/main.js` — IPC für Backlinks-Index-Aufbau und -Aktualisierung (Indexierung läuft im Main-Prozess wegen `chokidar`)
- `src/main/preload.js` — neue IPC-Kanäle für Index-Abruf und Live-Updates
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys für Outline-Panel, Backlinks-Panel, Hilfe-Erweiterungen
- `package.json` — Version 0.7.0 → 0.8.0, ggf. Folding-Erweiterung im Markdown-Sprachpaket
- `CHANGELOG.md` — Eintrag für 0.8.0
- neu: `docs/release-notes-0.8.0.md` (gitignored)

## Offene Punkte / Risiken

- **Folding-Persistenz über App-Neustart hinweg**: nicht im Umfang. Folding-Status überlebt nur die laufende Sitzung, nicht den Quit. Wenn dies später anders gewollt ist, eigener Task.
- **Watcher-Last bei tiefen/breiten Verzeichnisstrukturen**: Auch bei der Tiefenbegrenzung auf zwei Ebenen kann ein Ordner viele Dateien enthalten. `chokidar` mit `depth: 2` und Markdown-Filter sollte ausreichend sein, im Worst Case Throttling oder Debouncing im Index-Update notwendig. Konkret in 4T-0015 abzudecken.
- **Outline bei sehr großen Dokumenten**: Render-Performance des Heading-Baums bei mehreren hundert Headings. Virtualisierung wahrscheinlich nicht nötig, aber im Auge behalten. Konkret in 4T-0014.
- **Tab-Datei außerhalb der heutigen Suchraum-Konvention**: Wenn die aktive Datei direkt unter dem Laufwerks-Root liegt (z.B. `C:\notiz.md`), wäre der Suchraum technisch das gesamte Laufwerk plus zwei Ebenen — also potenziell extrem groß. Schutzmechanismus (z.B. Hard-Cap auf X Dateien oder Y MB) in 4T-0015 vorsehen.
