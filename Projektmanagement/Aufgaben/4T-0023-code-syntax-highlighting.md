# 4T-0023 — Syntax-Highlighting für Code-Blöcke im Render-Pane

**Status**: Offen
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

Im Editor-Pane werden Code-Blöcke per CodeMirror-Markdown-Sprachpaket leicht hervorgehoben. Im Render-Pane bleiben Code-Blöcke aktuell unformatiert. Das ist ein sichtbarer Bruch zwischen Edit- und Render-Ansicht und entwertet Code-Block-Sprach-Tags wie ```` ```python ````, die im Markdown-Quelltext stehen, aber im Rendern keine Wirkung haben.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Bibliothek

- Vorschlag: `highlight.js` in einer kompakten Variante mit kuratierter Sprach-Auswahl. Begründung: weit verbreitet, gut gepflegt, automatische Sprach-Detection bei fehlendem Tag, Themes lassen sich per CSS austauschen.
- Alternative: `shiki`. Pro: bessere Tokenisierung über TextMate-Grammatik, näher an VS-Code-Output. Contra: deutlich größer und schwergewichtiger. **Entscheidung im Detail-Design**.
- **Kuratierte Sprachen** (initial): `javascript`, `typescript`, `python`, `java`, `csharp`, `cpp`, `go`, `rust`, `bash`, `shell`, `sql`, `json`, `yaml`, `xml`, `html`, `css`, `markdown`, `plaintext`. Weitere on-demand erweiterbar.

### Integration

- markdown-it-`highlight`-Option setzen, sodass beim Render von Fenced-Code-Blöcken mit Sprach-Tag automatisch hervorgehoben wird.
- Bei unbekanntem Sprach-Tag: `plaintext`, keine Hervorhebung.
- Bei keinem Sprach-Tag: optional Auto-Detection durch highlight.js, oder bewusst keine Hervorhebung. **Entscheidung im Detail-Design** (Vorschlag: keine Auto-Detection, weil Fehlerkennungen mehr Verwirrung stiften als nützen).

### Theme

- Light- und Dark-CSS-Theme von highlight.js, ausgewählt passend zu den GitHub-Palette-Themes, die der Editor-Pane bereits verwendet (visuelle Konsistenz Editor ↔ Render).
- Theme-Wechsel zur Laufzeit beim System-Theme-Wechsel.

### Inline-Code

- Inline-Code (`` `foo` ``) wird **nicht** hervorgehoben, nur Fenced-Code-Blöcke. Inline-Code bleibt mit einfachem Monospace-Style.

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
