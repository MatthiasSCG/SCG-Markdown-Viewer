# 4T-0023 — Syntax-Highlighting für Code-Blöcke im Render-Pane

**Status**: Test bestanden
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

Im Editor-Pane werden Code-Blöcke per CodeMirror-Markdown-Sprachpaket leicht hervorgehoben. Im Render-Pane bleiben Code-Blöcke aktuell unformatiert. Das ist ein sichtbarer Bruch zwischen Edit- und Render-Ansicht und entwertet Code-Block-Sprach-Tags wie ```` ```python ````, die im Markdown-Quelltext stehen, aber im Rendern keine Wirkung haben.

## Lösungsansatz

### Bibliothek

- `highlight.js` ^11.x, genutzt als `highlight.js/lib/core` mit expliziter Sprach-Registrierung. Damit landet nur die kuratierte Sprachliste im Bundle (~50–80 KB) statt der vollständige Default-Bundle (mehrere hundert KB).
- Shiki verworfen wegen Größe und Komplexität (TextMate-Grammatik braucht Laufzeit-WASM, schwerer einzubinden als die JS-only-Tokenisierung von highlight.js).
- **Kuratierte Sprachen** (initial): `javascript`, `typescript`, `python`, `java`, `csharp`, `cpp`, `go`, `rust`, `bash`, `sql`, `json`, `yaml`, `xml`, `html`, `css`, `markdown`, `plaintext`. Aliase (`js`, `ts`, `sh`, `py`, `c#`, `c++`) deckt highlight.js automatisch ab.

### Integration

- `highlight.js/lib/core` wird in `src/main/preload.js` importiert, die Sprachen werden dort registriert. markdown-it bekommt im Konstruktor die `highlight`-Option mit Callback: bei bekannter Sprache `hljs.highlight(str, { language, ignoreIllegals: true }).value`, sonst Fallback auf den escapten Rohtext. Das Ergebnis-HTML trägt fest die `hljs`-/`hljs-*`-Klassen.
- **Keine Auto-Detection** ohne Sprach-Tag (zu viele Fehlerkennungen bei kurzen Snippets oder Konfig-Auszügen).
- Bei unbekanntem Sprach-Tag oder Tokenizer-Fehler: stiller Fallback auf `<pre><code class="hljs">…</code></pre>` mit escaptem Text. Keine Fehlermeldung.
- Inline-Code bleibt unangetastet (kein Highlight, kein `hljs`-Klassen-Wrapping).

### Theme

- Aus dem highlight.js-Paket: `github.css` (Light) und `github-dark.css` (Dark). Passend zur GitHub-Palette, die der Editor-Pane (CodeMirror) bereits spiegelt (`--syntax-*` in `styles.css`).
- **Prefix-Build-Step**: `scripts/build-hljs-themes.js` liest beide CSS-Dateien aus `node_modules/highlight.js/styles/`, prefixt die Selektoren mit `:root:not([data-theme="dark"])` bzw. `[data-theme="dark"]` und schreibt das Ergebnis nach `src/renderer/hljs-themes.css`. Aus dem `.hljs { ... }`-Top-Block werden `background`-/`padding`-Properties gefiltert, weil unser Container `--code-bg` und Eigen-Padding setzt. Der Bauschritt wird vor `build:renderer` automatisch ausgelöst (Aufruf aus `scripts/build-renderer.js`).
- `src/renderer/hljs-themes.css` wird per `<link>` in `index.html` geladen und ist gitignored (analog zum Renderer-Bundle, weil generiert).
- Theme-Wechsel zur Laufzeit kommt ohne Re-Render aus: die Klassen am HTML-Output bleiben, nur die CSS-Selektoren reagieren auf `data-theme` am `<html>`.

### Akzeptanz-Smoke-Tests

1. Block mit `javascript`-Tag wird mit JS-Tokenfarben dargestellt.
2. Block ohne Sprach-Tag bleibt monospace, ohne Highlight.
3. Block mit unbekanntem Tag (`elvish`) bleibt monospace, ohne Highlight, ohne Fehler.
4. Theme-Wechsel zur Laufzeit (System-Theme) wechselt auch das Highlight-Theme ohne Re-Render.
5. Inline-Code (`` `foo` ``) unverändert (kein Highlight, kein `hljs`-Wrapping).
6. Identischer Code-Block in Edit- und Render-Pane: vergleichbare Farben (GitHub-Palette beidseits).

### Versions-Bump und Hilfe-Dialog

- `package.json`: `version: 0.10.0`, Dependency `highlight.js`.
- Hilfe-Dialog-Eintrag und i18n-Keys kommen im Abschluss-Sammeltask des Epics, **nicht** in diesem Task.
- PDF-Berücksichtigung: nur Vermerk; Print-CSS in 4T-0024 darf die `.hljs-*`-Farben nicht überschreiben.

## Akzeptanzkriterien

- Ein Fenced-Code-Block mit Sprach-Tag (z.B. ```` ```javascript ````) wird im Render-Pane mit Syntax-Highlighting in der passenden Sprache dargestellt.
- Code-Block ohne Sprach-Tag bleibt monospace, ohne Hervorhebung.
- Code-Block mit unbekanntem Tag bleibt monospace, ohne Hervorhebung, ohne Fehlermeldung.
- Im Edit-Modus aktualisiert sich die Hervorhebung beim Tippen mit dem üblichen Debounce.
- Theme-Wechsel (Light/Dark) wechselt auch das Highlight-Theme.
- Visuelle Konsistenz: Identischer Code im Editor-Pane (CodeMirror) und im Render-Pane (highlight.js) verwendet vergleichbare Farben.
- Inline-Code (`` `bar` ``) bleibt unverändert (monospace, ohne Highlight-Tokenisierung).
- Beim PDF-Export sind die Highlight-Farben sichtbar (Print-CSS muss die Farben nicht entfernen).

## Bezug zu Dateien

- `src/main/preload.js` — markdown-it-`highlight`-Callback registrieren, der highlight.js aufruft.
- `src/renderer/renderer.js` — Theme-Sync für Light/Dark.
- `src/renderer/styles.css` — Import der zwei highlight.js-Theme-CSS-Dateien, Auswahl je nach `body`-Klasse.
- `package.json` — Dependency `highlight.js` (oder Alternative).
- `scripts/build-renderer.js` — ggf. Sprach-Auswahl konfigurieren, um den Bundle klein zu halten.

## Lösung
