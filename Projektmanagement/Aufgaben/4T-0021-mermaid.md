# 4T-0021 — Mermaid-Diagramme im Render-Pane

**Status**: Erledigt
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0
**Release**: [v0.10.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.10.0)

## Warum

Mermaid-Diagramme sind in technischer und Projektmanagement-Dokumentation weit verbreitet (Flowcharts, Sequenz-Diagramme, Gantt, ERD). Heute werden `mermaid`-Code-Blöcke wie jeder andere Code-Block angezeigt, also als Quellcode-Text. Damit ist der Diagramm-Inhalt im Render-Pane unbrauchbar. Mit Mermaid-Rendering wird der Markdown-Reader-Viewer auf das Niveau von GitHub-/GitLab-Rendern gehoben.

## Lösungsansatz

### Bibliothek und Lazy-Loading

- Dependency: `mermaid` ^11.x.
- Mermaid sitzt nicht im Haupt-Renderer-Bundle (~3 MB Aufschlag wäre unverhältnismäßig für Dokumente ohne Diagramme). Stattdessen separater esbuild-Lauf:
  - `src/renderer/mermaid-entry.js` re-exportiert `mermaid` als ESM-Default-Export.
  - `scripts/build-mermaid.js` bundlet diesen Entry zu `src/renderer/mermaid.bundle.js`.
  - `scripts/build-renderer.js` ruft den Mermaid-Build vor dem Haupt-Bundle auf (analog zu Hljs/KaTeX-Assets).
- Lazy-Load im Renderer per `import(new URL('./mermaid.bundle.js', import.meta.url).href)`. esbuild kann diesen variablen Import nicht statisch auflösen und reicht ihn zur Laufzeit durch; das Mermaid-Bundle wird damit erst beim ersten Mermaid-Block geholt.
- Falls Mermaid intern Worker oder dynamische Sub-Module nachlädt, die sich im `asar`-Archiv nicht öffnen lassen: `mermaid.bundle.js` in `build.asarUnpack` aufnehmen. Erst nach realem Build prüfen.

### Erkennung von Mermaid-Blöcken

- 4T-0023 setzt für jeden Fenced-Code-Block mit Sprach-Tag aktuell nur dann eine `language-X`-Klasse, wenn die Sprache in hljs registriert ist. Unbekannte Tags wie `mermaid` bekommen keine Klasse → Selektor unzuverlässig.
- **Add-on-Fix im Highlight-Callback** in `preload.js`: auch bei unbekanntem Tag die `language-${lang}`-Klasse mitschreiben (sonst Verhalten unverändert). Damit findet der Mermaid-Post-Processor zuverlässig `pre > code.language-mermaid`.

### Post-Render-Hook im Renderer

- Neue Funktion `applyMermaidIfPresent(container)` in `renderer.js`. Aufruf nach jedem Setzen von `els.renderedHtml.innerHTML = api.renderMarkdown(...)`.
- Bei mindestens einem `code.language-mermaid` wird Mermaid lazy geladen und mit `{ startOnLoad: false, securityLevel: 'strict', theme: currentMermaidTheme() }` initialisiert.
- Pro Block: `mermaid.render(id, source)` aufrufen, das `<pre>` durch einen `<div class="mermaid-block" data-source="...">` mit dem SVG ersetzen. `data-source` bleibt für späteres Re-Rendering bei Theme-Wechsel erhalten.

### Render-Cache

- Modul-Level-Map `Map<sourceHash + ':' + theme, svgString>`. Schlanker FNV-1a-Hash über den Quelltext. Verhindert wiederholten Mermaid-Parse beim Tippen im Edit-Modus (Debounce 150 ms → ohne Cache jede Iteration teuer).

### Theme-Sync zur Laufzeit

- `api.onThemeChanged(...)`: alle vorhandenen `.mermaid-block`-Container lesen `dataset.source`, werden mit dem neuen Theme neu gerendert (Cache greift bei Wiederholung).

### Fehlerverhalten

- `mermaid.render()` wirft bei Syntax-Fehler. Catch → Container bekommt `class="mermaid-block mermaid-error"`, zeigt Original-Quelltext im `<pre>` plus die Mermaid-Fehlermeldung als gedämpfter Sekundär-Text. Kein Toast, kein Modal. Render-Pane bleibt funktionsfähig.

### Sicherheit

- `securityLevel: 'strict'` deckt Skript-Tags und externe Loads aus dem Mermaid-Quellcode ab.
- SVG wird per `innerHTML` eingesetzt; bei `strict` ist der Mermaid-Output sicher.

## Akzeptanz-Smoke-Tests

1. Flowchart `graph TD A-->B`.
2. Sequence `sequenceDiagram` mit zwei Akteuren.
3. Gantt mit zwei Tasks.
4. ClassDiagram mit zwei Klassen.
5. Fehlerhaftes Mermaid → dezente Fehlerdarstellung, restlicher Render-Pane funktioniert.
6. Dokument ohne Mermaid-Blöcke: `mermaid.bundle.js` wird **nicht** geladen (DevTools-Network oder Performance-Profile als Verifikation).
7. Theme-Wechsel: alle Diagramme rendern in der neuen Palette.
8. Edit-Modus: Tippen aktualisiert das Diagramm nach Debounce.
9. Code-Block mit anderer Sprache (z.B. `javascript`) bleibt Code-Block, nicht Mermaid.

## PDF-Vorbereitung

- 4T-0024 muss vor `printToPDF` warten, bis alle `applyMermaidIfPresent`-Promises aufgelöst sind. Hier wird der Aufruf als `async`-Funktion exportiert; 4T-0024 baut darauf auf.

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
