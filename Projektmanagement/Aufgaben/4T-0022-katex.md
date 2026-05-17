# 4T-0022 — KaTeX-Mathematik im Render-Pane

**Status**: Offen
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

In vielen Markdown-Anwendungen (technisch, wissenschaftlich, auch im PM-Umfeld bei Kennzahl-Formeln) sind mathematische Formeln üblich. Heute werden `$…$`- und `$$…$$`-Sequenzen wie normaler Text gerendert, was unleserlich ist. Mit KaTeX-Integration werden Formeln formelhaft gesetzt und konsistent mit GitHub-/MkDocs-Verhalten dargestellt.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Bibliothek und markdown-it-Plugin

- Dependency: `katex` und ein markdown-it-Plugin wie `@vscode/markdown-it-katex` oder `markdown-it-katex` (Auswahl im Detail-Design nach kurzer Evaluation; entscheidend: aktuelles Update, kein abandoned package).
- Plugin in der markdown-it-Konfiguration in `preload.js` registrieren.
- KaTeX-CSS und -Fonts in den Renderer-Bundle aufnehmen. Akzeptiert Größenzuwachs (~250 KB) zugunsten von Offline-Funktion.

### Syntax-Erkennung

- **Inline-Mathe**: `$…$`, nur wenn die schließende `$` von einem Nicht-Whitespace direkt davor steht und der Inhalt nicht leer ist. Vermeidet Kollisionen mit Dollar-Beträgen im Fließtext (z.B. `Das kostet $5 bis $10`).
- **Block-Mathe**: `$$…$$` (mehrzeilig erlaubt), als eigener Block ohne Inline-Kontext.
- **Escape**: `\$` bleibt ein einfaches Dollar-Zeichen.

### Fehlerverhalten

- Bei KaTeX-Parsing-Fehlern: roter Fehlertext an Ort und Stelle (`throwOnError: false`, `errorColor`-Option setzen), kein Render-Pane-Ausfall.

### Theme-Sync

- KaTeX-Output ist in Light- und Dark-Theme grundsätzlich lesbar (HTML mit CSS-Variablen, keine bildbasierte Darstellung). Sicherstellen, dass Formelfarben dem Vordergrund-Text-Theme folgen, ggf. CSS-Override für Dark-Mode.

### Edit-Live-Update

- Wie bei Mermaid (4T-0021): Live-Update beim Tippen über das 150-ms-Debounce.
- Formel-Render ist im Vergleich zu Mermaid sehr schnell; keine besondere Optimierung nötig.

## Akzeptanzkriterien

- `$E = mc^2$` im Fließtext wird als inline-mathematische Formel gesetzt.
- `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$` als eigener Block wird als Block-Formel gesetzt.
- `\$5` im Fließtext bleibt einfaches Dollar-Zeichen, kein Mathe-Mode.
- Sequenzen mit Dollar-Zeichen, die nicht eindeutig Mathe-Modus sind (`$5 bis $10`), werden **nicht** als Mathe interpretiert.
- Syntaktisch ungültige KaTeX-Quellen erscheinen als rote Fehler-Text-Inline-Markierung, der Render-Pane bleibt funktionsfähig.
- Im Edit-Modus aktualisiert sich die Formel beim Tippen live.
- Formel-Darstellung passt sich an Light/Dark-Theme an (Kontrast bleibt erhalten).
- Beim PDF-Export aus 4T-0024 erscheinen Formeln korrekt im PDF (HTML-Mathe bleibt erhalten, KaTeX-Fonts sind eingebettet oder System-installiert).

## Bezug zu Dateien

- `src/main/preload.js` — markdown-it-Konfiguration um KaTeX-Plugin erweitern.
- `src/renderer/renderer.js` — ggf. nichts, wenn das Plugin ausreicht; sonst kleine Post-Processing-Hooks.
- `src/renderer/styles.css` — KaTeX-CSS-Import, Dark-Mode-Anpassungen.
- `package.json` — Dependencies `katex`, KaTeX-markdown-it-Plugin.
- `scripts/build-renderer.js` — ggf. KaTeX-CSS und -Fonts in den Bundle einbinden.

## Lösung
