# 3E-0014 — Inline Live Preview

**Status**: Offen
**Zielversion**: 0.20.0
**Vorgängerversion**: 0.19.0
**Reihenfolge im Meta-Plan**: Epic 5 von 6 (B → C → D → E → A → F)
**Aufsetzend auf**: [3E-0010](3E-0010-frontmatter-aliases-properties.md), [3E-0011](3E-0011-wiki-link-ausbau-und-tag-system.md), [3E-0012](3E-0012-markdown-syntax-erweiterungen.md), [3E-0013](3E-0013-reading-und-sidebar-komfort.md). Profitiert davon, dass alle neuen Markdown-Konstrukte bereits parsen.
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkt 1

## Ziel

Den Edit-Modus um eine dritte Render-Variante neben Quellcode und Geteilt erweitern: einen **Inline-Live-Preview-Modus**, in dem Markdown im Editor selbst gerendert wird. Bold-Text erscheint fett (mit unsichtbaren Sternen, sobald der Cursor nicht in der Zeile ist), Headings groß, Links als blaue, klickbare Anker. Cursor in der Zeile macht die Markdown-Quelle sichtbar; Cursor woanders zeigt das gerenderte Erscheinungsbild. Konzeptionell wie Obsidians „Live Preview" seit v0.13.

## Warum

Das aktuelle Modell „Source-Pane links, Render-Pane rechts" ist gut zum Verifizieren und für Doku-Schreibarbeit. Es bricht aber den Schreibfluss, weil das Auge zwischen zwei Panes wandert. Obsidian hat genau dieses Problem mit Live Preview gelöst: man tippt direkt in das gerenderte Bild und sieht jederzeit das Ergebnis, ohne zwei Spalten zu vergleichen. Für längere Texte (Notizen, Konzepte, Doku-Drafts) ist das der natürlichere Modus.

Inline Live Preview ist gleichzeitig die strukturell tiefgreifendste Erweiterung in der Lückenanalyse. Sie betrifft die Editor-Engine, nicht den Markdown-Parser. Die übrigen Markdown-Erweiterungen aus 3E-0010 bis 3E-0013 werden hier wiederverwendet, deshalb steht dieses Epic in der Reihenfolge bewusst nach ihnen.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Architektur**: CodeMirror-6-View-Plugin mit Decorations (Mark-Decorations zum Verstecken von Markup-Zeichen, Widget-Decorations für gerenderte Inhalte, Replace-Decorations für Blöcke). Reuse des bestehenden Markdown-Sprachpakets von CodeMirror.
- **Cursor-bewusste Anzeige**: in der Zeile, in der der Cursor steht, bleibt die Quelle sichtbar (Markdown-Marker werden nicht versteckt). In allen anderen Zeilen wird die Quelle visuell durch das gerenderte Bild ersetzt.
- **Unterstützte Inline-Elemente**:
  - Bold (`**`/`__`), Italic (`*`/`_`), Strikethrough (`~~`), Highlight (`==` aus 3E-0012), Inline-Code (`` ` ``).
  - Links (`[Text](url)`) und Wiki-Links (`[[Datei]]` aus 3E-0011 inklusive Heading/Block-Anker).
  - Bilder (`![alt](url)`) und Wiki-Embeds (`![[…]]` aus 3E-0011).
  - Math inline (`$…$`).
  - Tag-Token (`#tag` aus 3E-0011).
  - Footnote-Verweise (`[^1]` aus 3E-0012) als hochgestellte Zahl mit Hover-Tooltip.
- **Unterstützte Block-Elemente**:
  - Headings (`#` bis `######`) als großgesetzte Zeilen.
  - Listen (ungeordnet, geordnet, Task) mit Bullets/Nummern.
  - Blockquote (`>`) mit Einrückung und Akzent-Balken.
  - Callouts (aus 3E-0012) als Box.
  - Horizontale Linie (`---`, `***`).
  - Tabellen (Pipe und SCG) als gerendertes Tabellen-Widget.
  - Fenced-Code-Blöcke mit Syntax-Highlighting, KaTeX-Block, Mermaid-Block als Widget.
  - Math-Block (`$$…$$`).
- **Modus-Wahl pro Tab**: vierter View-Modus neben „Gerendert", „Geteilt", „Quellcode" — z.B. „Live". Persistent pro Tab, Sitzungs-konform. Hotkey-Erweiterung der bestehenden Strg+1/2/3.
- **Source-Modus bleibt erhalten**: die bestehende reine Source-Ansicht (`Strg+3`) bleibt unverändert. Power-User können jederzeit dorthin wechseln.
- **Settings**: optionaler Toggle, ob Live oder Source der Default für neue Tabs ist.
- **Hilfe-Dialog** mit neuem Feature-Eintrag, neuem Shortcut, ggf. erweiterter SCG-Table-Sektion (Tabellen-Widget in Live-Modus).
- CHANGELOG, Release-Notes, README, Tag, Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Voll-WYSIWYG ohne Markup-Sichtbarkeit irgendwann**. Obsidian zeigt die Markup-Zeichen mindestens, wenn der Cursor in der Zeile ist; wir tun dasselbe. Wer reines WYSIWYG ohne Marker-Sichtbarkeit will, ist mit der Render-Ansicht besser bedient.
- **Click-to-Place-Cursor in einem gerenderten Widget**: anspruchsvolles Detail, weil Widgets keine Cursor-Positionen haben. Wir akzeptieren, dass Klick auf ein eingebettetes Bild- oder Tabellen-Widget nicht den Cursor dorthin setzt, sondern auf den Anfang der nächsten Quell-Zeile.
- **Drag-and-Drop von gerenderten Zeilen** zum Umsortieren. Obsidian hat Drag-Handles am linken Rand; das ist ein eigenes Feature und bleibt für später.
- **Properties-Editor im Live-Modus** als Inline-Widget. Properties-Editor (aus 3E-0010) bleibt ein separater Dialog, nicht im Editor inline.

## Untergeordnete Tasks

Werden zu Beginn der Epic-Umsetzung als 4T-Dateien angelegt. Vorgesehene Tasks:

1. **Architektur-Spike** — CodeMirror-View-Plugin-Skelett, Decoration-Strategie, Cursor-Erkennung. Liefert ein minimal funktionierendes Bold/Italic-Beispiel als Beweis.
2. **Inline-Markup gerendert** — Bold, Italic, Strikethrough, Highlight, Inline-Code, Inline-Math, Tag-Pillen.
3. **Inline-Links** — Markdown-Links, Wiki-Links inklusive Heading/Block-Anker, Footnote-Verweise.
4. **Block-Markup gerendert** — Headings, Listen, Blockquote, Callouts, Trennlinien.
5. **Widget-Blöcke** — Tabellen (Pipe und SCG), Fenced-Code mit Highlighting, Mermaid, KaTeX-Block, Bild- und Notiz-Embeds.
6. **View-Modus-Integration** — vierter Modus, Hotkey, Settings-Toggle für Default, Persistenz, Hilfe-Dialog.
7. **Abschluss-Sammeltask** — CHANGELOG, Release-Notes, README, Test-Iteration, Tag und GitHub-Release für 0.20.0.

Architektur-Spike ist ein eigener Task, weil das Konzept getestet werden muss, bevor die einzelnen Element-Typen ausgerollt werden. Falls der Spike strukturelle Probleme aufdeckt (z.B. Performance-Brücke), wird der Epic-Plan vor Task 2 angepasst.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **CodeMirror-View-Plugin** mit `EditorView.decorations`-API. Mark-Decoration für „verstecke Marker", Replace-Decoration für „ersetze diesen Range durch Widget".
- **Cursor-Erkennung**: Listener auf `EditorState.selection`. Bei Cursor-Bewegung wird neu gerechnet, welche Zeilen aktiv sind; diese Zeilen bekommen keine Mark-Decoration.
- **Token-Quelle**: CodeMirror-Markdown-Sprachpaket liefert einen Lezer-AST. Wir traversieren ihn statt selbst zu parsen. Bei Widget-Blöcken (Tabellen, Code, Math, Mermaid) wird der Block-Text durch markdown-it gerendert und als DOM-Widget eingebettet.
- **Re-Render-Strategie**: nur bei Änderungen im sichtbaren Viewport plus Buffer. Widget-Cache nach Block-Inhalt-Hash, um teure Widgets (Mermaid, KaTeX) nicht bei jedem Tastendruck neu zu bauen.
- **Theme-Wechsel**: alle Widgets müssen beim Theme-Wechsel neu gerendert werden (Mermaid hat sein eigenes Theme; Tabellen und Callouts hängen am CSS).
- **Split-Modus und Live-Modus**: im Split-Modus links Live-Editor und rechts Render-Pane ist semantisch redundant; in 0.20.0 entfällt diese Kombination und Split bleibt mit Source-Editor links. Klärung beim Task-Start, ob es trotzdem als Option angeboten wird.
- **Performance-Ziel**: Live-Modus muss bei einer 500-Zeilen-Datei flüssig (60 fps) bleiben, auch beim Tippen. Profilieren mit DevTools.

## Reihenfolge der Umsetzung

1. **Architektur-Spike** zwingend zuerst. Liefert die Antwort, ob der gewählte CodeMirror-Decoration-Ansatz trägt.
2. **Inline-Markup gerendert** als nächstes, weil es das einfachste mit den meisten Lerneffekten ist.
3. **Inline-Links** danach, weil sie auf der Inline-Decoration-Logik aufsetzen und Click-Handling brauchen.
4. **Block-Markup gerendert** als drittes Code-Stück.
5. **Widget-Blöcke** als aufwendigstes Stück, mit Cache und Theme-Reaktion.
6. **View-Modus-Integration** zum Schluss der Code-Tasks.
7. **Sammeltask** schließt das Epic ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Live-Preview-View-Plugin, Widget-Render-Helfer, Modus-Integration, Hotkey, Settings-Toggle.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Live-Mode-Styling für alle Inline- und Block-Elemente, theme-konform.
- [src/renderer/index.html](../../src/renderer/index.html) — ggf. neue Statusbar-Icon-Definition, ggf. neuer View-Modus-Button.
- [src/main/menu.js](../../src/main/menu.js) — neuer Menüpunkt im Ansicht-Menü für Live-Modus.
- [src/main/main.js](../../src/main/main.js) — Persistenz des Live-Default-Settings.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für Modus-Label, Settings, Hilfe.
- `package.json` — Version-Bump auf 0.20.0, eventuell neue CodeMirror-Helper-Pakete.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.20.0.md`.

## Offene Punkte / Risiken

- **Performance bei großen Dateien**: das Hauptrisiko. Wenn die Decoration-Berechnung pro Tastendruck zu teuer ist, leidet der Schreibfluss. Mitigation: Viewport-Beschränkung, Inkrementeller Lezer-AST, Widget-Cache. Architektur-Spike muss das absichern.
- **Konflikt mit Listen-Indent (4T-0016)** und Tabellen-Editor (aus 3E-0013): die Tab-Handler dürfen in keinem Modus brechen. Live-Modus muss die Source-Tab-Logik vollständig erben.
- **Widget-DOM-Leaks**: Mermaid-Widgets hängen sich gerne in den `<body>`. Cleanup-Strategie analog zu 4T-0021.
- **Cursor-Verhalten bei Replace-Decorations**: wenn der Cursor in eine Zeile mit ersetztem Widget kommt, muss das Widget zur Quelle aufgeklappt werden, ohne Caret-Flicker. Detail-Aufwand groß.
- **Math-Inline-Heuristik aus 4T-0022**: die Dollar-Heuristik darf im Live-Modus nicht plötzlich Dollar-Beträge als Math erkennen. Reuse desselben Inline-Plugins schützt davor.
- **Tabellen-Editor-Komfort aus 3E-0013**: muss im Live-Modus genauso funktionieren wie im Source-Modus. Tab/Enter-Handler dürfen nicht durch Decoration-Logik verschluckt werden.
