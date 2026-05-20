# 3E-0013 — Reading- und Sidebar-Komfort

**Status**: Offen
**Zielversion**: 0.19.0
**Vorgängerversion**: 0.18.0
**Reihenfolge im Meta-Plan**: Epic 4 von 6 (B → C → D → E → A → F)
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkte 16, 17, 20, 21, 25

## Ziel

Fünf voneinander unabhängige Komfort-Verbesserungen bündeln, die jeweils klein im Code-Aufwand, aber im Alltag spürbar sind: Tabellen-Editor-Hilfen, Outgoing-Links-Panel, Code-Block-Copy-Button, Word-Count in der Statusbar und Bookmarks. Keine berührt die Editor-Engine oder den Markdown-Parser tief.

## Warum

Diese Punkte sind in der Lückenanalyse als „Komfort, kein Konzept-Sprung" eingestuft. Sie sind einzeln zu klein für ein eigenes Epic, hängen thematisch lose zusammen (alle docken an Statusbar, Render-Pane oder Sidebar an) und ergeben in der Summe einen wahrnehmbaren UX-Schub. Reihenfolge der Umsetzung intern ist beliebig, weil keine technische Abhängigkeit zwischen den fünf Punkten besteht.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Tabellen-Editor-Hilfen** im CodeMirror-Editor (nur für klassische Pipe-Tabellen, nicht für SCG-Tabellen):
  - `Tab` und `Umschalt+Tab` springen zur nächsten bzw. vorherigen Zelle in derselben Zeile (oder Zeilenumbruch in nächste Tabellen-Zeile).
  - `Enter` am Zeilenende einer Tabellen-Zeile erstellt eine neue Tabellen-Zeile mit denselben Spalten.
  - Optional: Auto-Padding der Pipe-Spalten bei Speichern (`|---|---|` und gleichbreite Trenner). Beim Task-Start entscheiden.
- **Outgoing-Links-Panel** als dritte Sektion in der linken Sidebar neben Inhaltsverzeichnis und Backlinks. Zeigt alle Wiki-Links und relativen Markdown-Links der aktiven Datei, mit Zeile, Anker (falls vorhanden) und Text-Snippet. Klick öffnet das Ziel. Toggle per Statusbar-Button, Menüpunkt und Hotkey.
- **Code-Block Copy-Button** im Render-Pane. Kleiner Button rechts oben am Fenced-Code-Block, der den Inhalt in die Zwischenablage kopiert. Kurze visuelle Bestätigung („Kopiert"). Wirkt auch für SCG-Tabellen-Code-Blöcke und für Highlight-Blöcke mit Sprach-Tag.
- **Word Count** in der Statusbar:
  - Aktive Datei: Wörter, Zeichen, Lesezeit (Schätzung, z.B. 200 Wörter pro Minute).
  - Bei Auswahl im Editor: zusätzlich „X Wörter, Y Zeichen ausgewählt".
  - Klick zeigt optional erweiterten Dialog mit weiteren Statistiken (Absätze, Sätze, Headings).
- **Bookmarks**: persistente Lesezeichen-Liste auf Datei-Ebene (nicht Zeilen-Ebene in 0.19.0).
  - Aktive Datei zu Bookmarks hinzufügen über Datei-Menü oder Statusbar-Icon.
  - Bookmark-Liste in einer eigenen Sidebar-Sektion oder in einem eigenen Menü.
  - Klick öffnet die Datei. Persistent über App-Neustart hinweg.
- **Hilfe-Dialog**: fünf neue Feature-Einträge in den jeweils passenden Gruppen, neue Shortcuts.
- CHANGELOG, Release-Notes, README, Tag, Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Bookmarks auf Zeilen-Ebene** (also nicht nur „Datei merken", sondern „Datei plus Position"). Wäre ein nächster Schritt; in 0.19.0 reicht Datei-Ebene.
- **Tabellen-Spalten-Resize per Maus** im Render-Pane. Nur Tab-/Enter-Komfort im Editor.
- **Statistik-Export** der Word-Count-Werte. Statusbar-Anzeige und optionaler Dialog reichen.
- **Outgoing-Links-Graph** als Visualisierung. Liste-Form ohne Visualisierung.
- **Copy-Button für SCG-Tabellen als CSV o.ä.**. Copy kopiert den Quelltext, nicht ein konvertiertes Format.

## Untergeordnete Tasks

Werden zu Beginn der Epic-Umsetzung als 4T-Dateien angelegt. Vorgesehene Tasks:

1. **Tabellen-Editor-Komfort** — Tab/Shift+Tab/Enter in Pipe-Tabellen.
2. **Outgoing-Links-Panel** — neue Sidebar-Sektion, Index-Aufbau aus der aktiven Datei.
3. **Code-Block Copy-Button** — Render-Pane-Hook, Clipboard-API, kurze Bestätigung.
4. **Word Count in Statusbar** — Live-Berechnung, Selektionsbehandlung, optionaler Detail-Dialog.
5. **Bookmarks** — Persistenz, UI in Datei-Menü oder Statusbar, Sidebar- oder Menü-Liste.
6. **Hilfe-Dialog erweitern und Abschluss-Sammeltask** — CHANGELOG, README, Release.

Pro Task ein eigenes 4T, weil sie inhaltlich getrennt sind und einzeln testbar bleiben.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **Tabellen-Editor-Tab-Verhalten**: muss mit dem bestehenden Listen-Indent-Tab aus 4T-0016 koexistieren. Tab wirkt im Listen-Kontext als Indent, im Tabellen-Kontext als Zell-Sprung. Erkennung beider Kontexte muss klar getrennt sein.
- **Outgoing-Links-Index**: kann direkt aus dem markdown-it-Token-Stream der aktiven Datei abgeleitet werden, kein eigener Watcher nötig (Backlinks-Index aus 4T-0015 ist der umgekehrte Fall und arbeitet anders).
- **Code-Block-Copy-Button-Platzierung**: rechts oben am `<pre>`-Element, mit Hover-Zustand. CSS-only-Lösung für den Button-Look, kleiner JS-Hook im Renderer für die Clipboard-Aktion.
- **Word-Count-Granularität**: Wörter durch Whitespace-Split, Zeichen durch String-Länge. Code-Blöcke, Inline-Code und Frontmatter zählen nicht mit (für Lesezeit-Schätzung sinnvoll). Beim Task entscheiden.
- **Bookmark-Persistenz**: `electron-store` analog zu Theme und Auto-Save-Einstellung. Datenstruktur: Liste von Datei-Pfaden mit Anzeige-Namen und Timestamp.
- **Bookmark-Platzierung in der UI**: zwei Optionen — vierte Sidebar-Sektion (zu Outline, Backlinks, Outgoing-Links) oder eigenes Datei-Menü „Lesezeichen" mit Untermenüs. Entscheidung beim Task-Start, vermutlich Sidebar-Sektion für Konsistenz.

## Reihenfolge der Umsetzung

Intern keine harte Abhängigkeit. Empfohlene Reihenfolge nach steigendem Aufwand und Sichtbarkeit:

1. **Code-Block Copy-Button** zuerst (klein, hoher Sichtbarkeitsgewinn).
2. **Word Count in Statusbar** (klein, klare Akzeptanz).
3. **Outgoing-Links-Panel** (mittel, baut auf bekanntem Sidebar-Pattern auf).
4. **Tabellen-Editor-Komfort** (mittel, Tab-Konflikt mit Listen-Indent muss sauber gelöst werden).
5. **Bookmarks** (mittel, Persistenz und UI-Entscheidung).
6. **Hilfe-Dialog und Sammeltask** schließen ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Tabellen-Editor-Tab-Logik, Outgoing-Links-Index und Sidebar-Sektion, Copy-Button-Hook im Render-Pane, Word-Count-Berechnung, Bookmark-Liste.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Copy-Button-Styling, Outgoing-Links-Sektion, Bookmark-Liste, Statusbar-Layout für Word-Count.
- [src/renderer/index.html](../../src/renderer/index.html) — neue Statusbar-Felder, ggf. neuer Sidebar-Container.
- [src/main/main.js](../../src/main/main.js) — Bookmark-Persistenz über `electron-store`.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für UI und Hilfe.
- `package.json` — Version-Bump auf 0.19.0, keine neuen Dependencies erwartet.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.19.0.md`.

## Offene Punkte / Risiken

- **Tab-Konflikt im Editor**: Listen-Indent (4T-0016), Tabellen-Editor-Sprung (dieser Epic), Code-Block-Default-Tab. Drei Kontexte, klare Erkennung beim Cursor-Stand nötig. Mitigation: Prio-Reihenfolge Tabelle vor Liste vor Default-Tab.
- **Copy-Button und Print/Export**: der Button darf im PDF-Export (sobald 1.0.0 oder später) nicht mit ausgedruckt werden. CSS-`@media print { display: none; }`.
- **Word-Count-Performance** bei sehr großen Dateien: einfache Re-Berechnung bei jedem Tastendruck wäre zu teuer. Debounce auf 150 ms analog zur Render-Vorschau.
- **Bookmarks-Konflikt mit „Zuletzt geöffnet"**: zwei ähnliche Listen. Klarheit nötig — Recent sind die letzten 10 (FIFO), Bookmarks sind die explizit gemerkten. Im UI getrennt halten.
- **Outgoing-Links und Wiki-Embeds**: Embeds aus 3E-0011 sind auch ausgehende Verlinkungen. Outgoing-Links-Panel listet sie mit auf, mit Markierung als „Embed" statt „Link".
