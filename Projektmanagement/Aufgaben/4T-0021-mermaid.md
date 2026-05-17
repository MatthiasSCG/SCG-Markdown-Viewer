# 4T-0021 — Mermaid-Diagramme im Render-Pane

**Status**: Offen
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

Mermaid-Diagramme sind in technischer und Projektmanagement-Dokumentation weit verbreitet (Flowcharts, Sequenz-Diagramme, Gantt, ERD). Heute werden `mermaid`-Code-Blöcke wie jeder andere Code-Block angezeigt, also als Quellcode-Text. Damit ist der Diagramm-Inhalt im Render-Pane unbrauchbar. Mit Mermaid-Rendering wird der Markdown-Reader-Viewer auf das Niveau von GitHub-/GitLab-Rendern gehoben.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Bibliothek und Integration

- Dependency: `mermaid` (offizielles Paket).
- **Lazy-Loading**: Nicht in das Renderer-Bundle aufnehmen. Beim Render eines Dokuments wird das HTML-Output nach `<pre><code class="language-mermaid">…</code></pre>` durchsucht. Bei mindestens einem Treffer wird `mermaid` per `import()` dynamisch geladen, dann initialisiert und die Blöcke umgerendert.
- Initialisierung: `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: themeName })`. `themeName` wird je nach System-Theme auf `default` (Light) oder `dark` gesetzt und bei Theme-Wechsel zur Laufzeit aktualisiert (alle bestehenden Diagramme neu rendern).
- Render-Schritt: für jeden gefundenen Block `mermaid.render(id, source)` aufrufen, das resultierende SVG in den Container einsetzen, ursprüngliches `<pre>` ersetzen.

### Fehlerverhalten

- Bei Syntax-Fehlern im Mermaid-Quellcode zeigt Mermaid normalerweise ein Fehler-SVG. Das ist akzeptabel; zusätzlich wird darunter dezent der Original-Quellcode als `<pre>` erhalten, sodass die Bearbeitung im Edit-Modus klar bleibt. (Im Edit-Modus ist der Quellcode im Editor ohnehin sichtbar.)
- Keine roten Toast-Meldungen oder modale Fehler-Dialoge.

### Theme-Sync

- Bei Wechsel des System-Themes wird die Mermaid-Konfiguration aktualisiert und alle gerenderten Diagramme im aktuellen Render-Pane neu gerendert. Bei vielen Diagrammen mit Debounce, um Flackern bei schnellen Theme-Wechseln zu vermeiden.

### Sicherheit

- `securityLevel: 'strict'` verhindert Skript-Tags und externe Ressourcen-Loads aus dem Mermaid-Quellcode.
- Keine Aktivierung der Mermaid-Plug-Ins, die externe Konfigurationen laden würden.

### Edit-Live-Update

- Beim Editieren im Edit-Modus (Render-Pane mit Live-Update alle 150 ms) werden Mermaid-Blöcke jedes Mal neu gerendert. Effizienz: Blöcke mit unverändertem Quellcode werden nicht neu gerendert (Vergleich Hash oder Texte vor dem `mermaid.render`-Aufruf).

## Akzeptanzkriterien

- Ein Code-Block mit Sprachangabe `mermaid` wird im Render-Pane als SVG-Diagramm dargestellt.
- Beispiele aus den Mermaid-Doku-Klassikern (Flowchart `graph TD`, Sequence `sequenceDiagram`, Gantt `gantt`, Class `classDiagram`) werden korrekt gerendert.
- Im Edit-Modus aktualisiert sich das gerenderte Diagramm beim Tippen mit dem gleichen Debounce wie das übrige Render-Update.
- Bei System-Theme-Wechsel (Light ↔ Dark) passen sich alle gerenderten Diagramme an das neue Theme an.
- Syntaktisch fehlerhafte Mermaid-Quellen führen zu einer dezenten Fehler-Darstellung an Ort des Blocks, nicht zum Ausfall des gesamten Render-Pane.
- Code-Blöcke mit anderer Sprache (z.B. `js`, `python`) werden **nicht** als Mermaid interpretiert.
- Beim Öffnen eines Dokuments ohne Mermaid-Blöcke wird die Mermaid-Library **nicht** geladen.
- Beim PDF-Export aus 4T-0024 sind Mermaid-Diagramme als SVG im PDF enthalten (Render abgeschlossen vor `printToPDF`).

## Bezug zu Dateien

- `src/main/preload.js` — Render-Pipeline (markdown-it-Output bleibt unangetastet bei Mermaid, weil Post-Processing im Renderer erfolgt).
- `src/renderer/renderer.js` — Mermaid-Lazy-Loader, Post-Render-Hook, Theme-Sync, Edit-Live-Update-Optimierung.
- `src/renderer/styles.css` — Container-Styles für gerenderte Diagramme (zentrierung, Max-Breite, Theme-Hintergrund).
- `package.json` — Dependency `mermaid`, Version-Bump.

## Lösung
