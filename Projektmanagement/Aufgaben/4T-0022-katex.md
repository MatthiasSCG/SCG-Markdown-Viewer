# 4T-0022 — KaTeX-Mathematik im Render-Pane

**Status**: Test bestanden
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

In vielen Markdown-Anwendungen (technisch, wissenschaftlich, auch im PM-Umfeld bei Kennzahl-Formeln) sind mathematische Formeln üblich. Heute werden `$…$`- und `$$…$$`-Sequenzen wie normaler Text gerendert, was unleserlich ist. Mit KaTeX-Integration werden Formeln formelhaft gesetzt und konsistent mit GitHub-/MkDocs-Verhalten dargestellt.

## Lösungsansatz

### Bibliothek und markdown-it-Plugin

- Dependency: `katex` ^0.16.x als Core-Library.
- Plugin: `@vscode/markdown-it-katex`. Aktiv gepflegt vom VS-Code-Team, kompatibel zu markdown-it^14, bringt die Whitespace-Heuristik für die `$`-Kollision mit Dollar-Beträgen mit. Der ältere `markdown-it-katex` ist seit 2017 nicht mehr aktualisiert, deshalb verworfen.
- Registrierung in `src/main/preload.js` per `md.use(katexPlugin, { throwOnError: false, errorColor: '#cc0000' })`.

### Syntax und Delimiter

- Inline `$…$` und Block `$$…$$`. Plugin-Standard erkennt das `$`-Paar nur dann als Mathe, wenn das öffnende `$` von keinem Whitespace gefolgt und das schließende `$` von keinem Whitespace vorangegangen ist. Damit bleiben Dollar-Beträge wie `Das kostet $5 bis $10` Fließtext.
- `\$` bleibt durch Backslash-Escape ein einfaches Dollar-Zeichen.
- Plugin-Default für `\(…\)` / `\[…\]` bleibt aktiv (keine Konflikte, hilft für Pasta aus LaTeX-Quellen).

### Asset-Pipeline

- Neues Script `scripts/build-katex-assets.js`, das beim Renderer-Build aus `node_modules/katex/dist/` die Datei `katex.min.css` nach `src/renderer/katex/katex.css` und alle `fonts/*.woff2` nach `src/renderer/katex/fonts/` kopiert. Die CSS referenziert die Fonts per relativem `url(fonts/*.woff2)`, was nach dem Kopieren korrekt auflöst.
- Aufruf aus `scripts/build-renderer.js` analog zum hljs-Theme-Build.
- `src/renderer/index.html` bekommt einen `<link>` auf `katex/katex.css`.
- `src/renderer/katex/` ist gitignored, weil generiert.

### Bundle und CSP

- Größenzuwachs ~700 KB (CSS plus rund zehn woff2-Schnitte). Akzeptiert, weil KaTeX offline funktionieren soll und nicht lazy ladbar ohne deutliche Komplexität (Initial-Render-Flicker).
- CSP in `index.html` setzt keinen `font-src`, fällt auf `default-src 'self'` zurück. Lokale Fonts laden damit problemlos. Kein CSP-Eingriff nötig.

### Fehlerverhalten

- Bei KaTeX-Parsing-Fehlern: `throwOnError: false` plus `errorColor: '#cc0000'`. KaTeX rendert die fehlerhafte Stelle als roten Inline-Text mit Tooltip; der Render-Pane bleibt funktionsfähig.

### Theme

- KaTeX rendert spanbasiert mit `currentColor` für die Schrift; Formeln erben automatisch die Vordergrundfarbe aus dem Container und passen sich Light/Dark an. Falls Sichtprüfung Kontrastprobleme zeigt, gezielter Override in `styles.css`.

### Edit-Live-Update

- Edit-Modus rendert über das bestehende 150-ms-Debounce neu. KaTeX läuft im selben markdown-it-Pfad mit, kein extra Hook nötig.

## Akzeptanz-Smoke-Tests

1. Inline `$E = mc^2$` rendert formelhaft.
2. Block `$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$` als zentrierte Block-Formel.
3. `\$5` bleibt Dollar-Zeichen.
4. `Das kostet $5 bis $10` bleibt Fließtext (Whitespace-Regel).
5. `$x +$` mit fehlendem Operand: roter Inline-Fehler, Render-Pane funktioniert weiter.
6. Im Edit-Modus erscheinen Änderungen live nach Debounce.
7. Theme-Wechsel: Formeln passen sich an Light/Dark an.

## PDF-Vorbereitung

- Print-CSS in 4T-0024 darf die KaTeX-Spans nicht überschreiben und muss sicherstellen, dass die Schriftarten in das PDF eingebettet werden (Electron `printToPDF` bettet System- und Webfonts standardmäßig ein).

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
