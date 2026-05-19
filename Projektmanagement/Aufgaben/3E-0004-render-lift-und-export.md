# 3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF

**Status**: Teilweise erledigt — 4T-0021/22/23/28 abgeschlossen und in 0.10.0 ausgeliefert; 4T-0024 zurückgestellt
**Zielversion**: 0.10.0
**Vorgängerversion**: 0.9.0
**Release**: [v0.10.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.10.0)

## Ziel

Drei Render-Erweiterungen und eine Export-Funktion, alle gemeinsam im Render-Pane verankert:

- **Mermaid-Diagramme** (`mermaid`-Code-Blöcke) werden als SVG gerendert, statt als reiner Code-Text angezeigt zu werden.
- **KaTeX-Mathematik**: Inline-Mathe `$…$` und Block-Mathe `$$…$$` werden formelhaft gesetzt.
- **Syntax-Highlighting** für Code-Blöcke mit Sprachangabe, wie es im README seit Längerem als „spätere Phase" vorgemerkt war.
- **PDF-Export** des aktuellen Render-Pane-Inhalts mit eigener Print-CSS, über `webContents.printToPDF`. Direkt aus der App ohne externe Tools.

## Warum

- Die im README seit 0.1.x angekündigten Render-Erweiterungen (Mermaid, KaTeX, Syntax-Highlighting) sind ein häufig genannter Wunsch und heben den Markdown-Viewer auf das Niveau, das Nutzer von GitHub und ähnlichen Tools kennen.
- PDF-Export ist die natürliche Ergänzung des Render-Pane: was sichtbar ist, soll auch teilbar sein, ohne dass Empfänger Markdown-Reader installieren müssen.
- Alle vier Themen hängen am Render-Pipeline-Stack. Sie zusammen anzufassen vermeidet, die markdown-it-Konfiguration mehrfach in aufeinanderfolgenden Releases anfassen zu müssen.
- Mermaid muss **vor** PDF-Export integriert sein, sonst landen Diagramme als Code im PDF.

## Umfang und Abgrenzung

**Im Umfang:**

- **Mermaid**: `mermaid`-Library als Dependency, Aktivierung für Code-Blöcke mit Sprachangabe `mermaid`. Light- und Dark-Theme-Variante, abgestimmt aufs System-Theme.
- **KaTeX**: `katex`-Library, markdown-it-Plugin (z.B. `markdown-it-katex` oder `@vscode/markdown-it-katex`), Inline (`$…$`) und Block (`$$…$$`). CSS-Bundling der KaTeX-Fonts.
- **Syntax-Highlighting**: leichtgewichtige Library (Vorschlag: `highlight.js` mit Auto-Detection und/oder per Sprach-Tag), Light- und Dark-Theme, abgestimmt aufs CodeMirror-Highlighting im Editor-Pane (visuelle Konsistenz).
- **PDF-Export**: Menüpunkt `Datei → Als PDF exportieren…` mit Speichern-Dialog, eigene Print-CSS (Seitenränder, Schriftgrößen, keine UI-Chrome, lesbare Seitenumbrüche).
- Hilfe-Dialog um die vier Features erweitern (drei Render-Features, ein Export).
- i18n-Keys in allen fünf Sprachen.
- CHANGELOG-Eintrag, Release-Notes, Version-Bump 0.9.0 → 0.10.0.

**Nicht im Umfang (für 0.10.0):**

- Mermaid-Editor-Vorschau im Edit-Modus (Inline-Live-Preview der Diagramme während des Tippens)
- KaTeX-Editor-Hilfe (z.B. Symbol-Picker)
- Konfigurierbares Syntax-Highlighting-Theme (das Theme folgt dem System-Theme)
- Export als HTML (eigener Task, wenn gewünscht)
- Export als DOCX oder andere Formate
- Druck direkt aus der App (`webContents.print()`)
- PDF mit Inhaltsverzeichnis oder Hyperlinks aus Headings
- Wasserzeichen, Fußzeilen mit Seitenzahl oder ähnliche Print-Anreicherungen (im ersten Wurf nicht; ggf. nachziehbar)
- WYSIWYG-Bearbeitung der gerenderten Inhalte

## Untergeordnete Tasks

- [x] [4T-0021 — Mermaid-Diagramme im Render-Pane](4T-0021-mermaid.md) — erledigt, in v0.10.0
- [x] [4T-0022 — KaTeX-Mathematik im Render-Pane](4T-0022-katex.md) — erledigt, in v0.10.0
- [x] [4T-0023 — Syntax-Highlighting für Code-Blöcke im Render-Pane](4T-0023-code-syntax-highlighting.md) — erledigt, in v0.10.0
- [ ] [4T-0024 — PDF-Export über webContents.printToPDF](4T-0024-pdf-export.md) — **zurückgestellt** in 0.10.0 (Theme-/Container-Konflikte im Print-Modus, Stand und Versuche im Task dokumentiert; Code zurückgebaut)
- [x] [4T-0028 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.10.0](4T-0028-changelog-release-0100.md) — erledigt

## Architekturentscheidungen

- **Mermaid lazy laden**, nicht in den Renderer-Bundle aufnehmen. Begründung: Mermaid ist groß (mehrere MB), aber nur in Dokumenten relevant, die tatsächlich Mermaid-Blöcke enthalten. Detection per Scan des HTML-Outputs nach `<pre><code class="language-mermaid">`. Bei Treffer asynchron laden, dann Blöcke umrendern.
- **KaTeX-Fonts werden in den Bundle aufgenommen**, weil sonst beim Offline-Rendering CSS-Fonts fehlen. Akzeptierter Größen-Aufschlag (KaTeX-Fonts ~250 KB).
- **Syntax-Highlighting verwendet `highlight.js`** in der kompakten Variante mit den verbreitetsten Sprachen (Vorschlag: js/ts, py, java, csharp, cpp, go, rust, bash, sql, json, yaml, xml, html, css, markdown, plaintext). Weitere Sprachen on-demand laden, wenn der Sprach-Tag eines Blocks nicht zur Bundle-Sprachliste gehört.
- **Theme-Synchronisation Editor-Highlighting (CodeMirror) ↔ Render-Highlighting (highlight.js)**: Farbpalette pro Theme (Light/Dark) angeglichen, sodass derselbe Code-Block im Edit-Modus und im Render-Pane vergleichbar aussieht. Begründung: kognitive Konsistenz.
- **PDF-Export nutzt `webContents.printToPDF` mit einer dedizierten Print-CSS** (`@media print`-Regeln zusätzlich zu einer ggf. separaten `print.css`). Die Statusbar, Tabs und Sidebar-Panels werden vor dem Print ausgeblendet, der Render-Pane bekommt eine optimierte Schriftgröße und Seitenränder.
- **Mermaid- und KaTeX-Rendering im PDF**: Wichtig, dass die SVGs und HTML-Mathe-Knoten bereits gerendert sind, bevor `printToPDF` ausgelöst wird. Implementierung wartet auf Abschluss der asynchronen Render-Schritte (Promise.all).
- **PDF-Export-Format**: A4 als Default, Hochformat. Konfigurierbarkeit (Format, Orientierung, Ränder) ist nicht im Umfang von 0.10.0.

## Reihenfolge der Umsetzung

1. **4T-0023** Syntax-Highlighting — kleinster und unabhängigster Schritt, integriert sich rein in den markdown-it-Renderer.
2. **4T-0022** KaTeX — ähnlich isoliert, Bundling der Fonts neu, ansonsten reiner Render-Eingriff.
3. **4T-0021** Mermaid — größerer Schritt wegen Lazy-Loading-Mechanik und Theme-Abstimmung.
4. **4T-0024** PDF-Export — letzter Schritt, weil er auf den fertigen Render-Pipeline-Outputs aller drei vorherigen Tasks aufsetzt.
5. Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes und Version-Bump als Sammeltask am Epic-Ende.

## Bezug zu Dateien

- `src/main/preload.js` — markdown-it-Konfiguration mit neuen Plugins (KaTeX, Highlight), Mermaid-Post-Processing-Hook.
- `src/renderer/renderer.js` — Mermaid-Lazy-Load und -Render-Trigger, PDF-Export-Aufruf.
- `src/renderer/styles.css` — KaTeX-CSS-Import, Highlight-Theme-CSS (Light/Dark), Print-CSS für PDF-Export.
- `src/main/main.js` — IPC-Handler für PDF-Export (Speichern-Dialog, `printToPDF`-Aufruf, Datei-Schreibe-Logik).
- `src/main/menu.js` — neuer Menüpunkt `Datei → Als PDF exportieren…`.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Menüpunkt, Export-Dialog, Hilfe-Erweiterungen, Fehlermeldungen.
- `package.json` — neue Dependencies (`mermaid`, `katex`, `markdown-it-katex` o.ä., `highlight.js`), Version 0.9.0 → 0.10.0.
- `CHANGELOG.md` — Eintrag für 0.10.0.
- neu: `docs/release-notes-0.10.0.md` (gitignored).

## Offene Punkte / Risiken

- **Bundle-Größe**: Mermaid, KaTeX und highlight.js zusammen erhöhen die Renderer-Bundle deutlich. Mermaid lazy laden ist Pflicht; KaTeX und highlight.js werden eager geladen. Im Detail-Design prüfen, ob auch KaTeX lazy ladbar ist, ohne Initial-Render-Flicker.
- **Mermaid-Sicherheit**: Mermaid `init({ securityLevel: 'strict' })`, um keine Inline-Skripte oder externen Ressourcen zu laden. Konkret in 4T-0021.
- **KaTeX und Strikethrough-Syntax**: `$…$` kann in seltenen Fällen mit anderen Markdown-Inhalten kollidieren (z.B. Dollar-Beträge im Fließtext). markdown-it-Plugin muss konfiguriert sein, dass Mathematik nur in eindeutigen Kontexten greift.
- **Highlight.js-Größe**: kompletter Build ist mehrere hundert KB. Custom-Build mit Sprach-Auswahl empfohlen. Konkret in 4T-0023.
- **PDF-Seitenumbrüche** in der Mitte von langen Code-Blöcken oder Tabellen wirken hässlich. `page-break-inside: avoid` in der Print-CSS einplanen, konkret in 4T-0024.
- **PDF-Bilder mit Base64-Data-URIs**: heute lädt der Render-Pane relative Bilder als Base64 ein. Beim PDF-Export sollte das funktionieren. Verifizieren im Detail-Design von 4T-0024.
- **Mermaid- und KaTeX-Fehler im Quelltext** (Syntax-Fehler im Diagramm/Formel): sollten dezent als Fehler-Hinweis im Render-Pane angezeigt werden, nicht den gesamten Pane abschießen. Konkret in 4T-0021 und 4T-0022.
