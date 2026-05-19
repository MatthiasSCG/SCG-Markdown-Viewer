# 4T-0024 — PDF-Export über webContents.printToPDF

**Status**: Zurückgestellt
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: ursprünglich 0.10.0; zurückgestellt für späteren neuen Anlauf

> **Hinweis:** Der Task wurde während der Umsetzung in 0.10.0 zurückgestellt.
> Der Code wurde vollständig zurückgebaut, damit die App ohne halbfertigen
> PDF-Export ausgeliefert werden kann. Die Dokumentation unten beschreibt
> den letzten Implementierungsstand und die offenen Probleme, sodass ein
> späterer Anlauf direkt anknüpfen kann.

## Warum

Markdown-Dateien werden häufig mit Empfängern geteilt, die keinen Markdown-Reader installiert haben. Eine HTML-Vorschau lässt sich kopieren, aber kein eigenständig versendbares Dokument. PDF ist das Standardformat für „Markdown im Read-Only-Format an jemanden geben". Direkt aus der App, mit dem gerade gerenderten Pane als Quelle, vermeidet Umwege über externe Tools.

## Lösungsansatz

### Aufruf und Shortcut

- Menüpunkt `Datei → Als PDF exportieren…` direkt nach „Speichern unter…" (mit Separator). Accelerator `CmdOrCtrl+Shift+P`. Strg+P allein wird im Edit-Modus von CodeMirror gegrabbt, daher mit Umschalt-Modifier.
- Speichern-Dialog mit Default-Pfad:
  - Tab mit Pfad: `<basename ohne .md>.pdf` im selben Ordner.
  - „Unbenannt"-Tab: `Unbenannt.pdf` (lokalisiert) im Home-Verzeichnis.
- Status-Feedback per bestehende `showStatusbarHint`-Helper:
  - Erfolg: `pdf.statusOk` (1500 ms).
  - Fehler: `pdf.statusError` plus Detail (3000 ms, rot).
  - Abbruch im Save-Dialog: kein Hinweis.

### Render-Pipeline-Synchronisation

- KaTeX rendert synchron innerhalb `api.renderMarkdown()` — kein Warten nötig.
- Mermaid läuft fire-and-forget über `applyMermaidIfPresent`. Auf Modul-Ebene wird `lastApplyMermaidPromise` getrackt; vor `printToPDF` wartet der Renderer darauf.
- Zusätzlich ein 50-ms-Reflow-Wait nach Setzen der `printing`-Klasse, damit Print-CSS greift.

### IPC-Vertrag

- `api.exportPdf(defaultName)` im Preload exponiert.
- Main-Handler `pdf:export`:
  - `dialog.showSaveDialog(window, { defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })`
  - `window.webContents.printToPDF({ pageSize: 'A4', landscape: false, marginsType: 0, printBackground: true })`
  - `fs.promises.writeFile(filePath, buffer)`
  - Rückgabe `{ ok: true, filePath } | { canceled: true } | { ok: false, error }`.

### Print-CSS

- `@media print` plus `body.printing`-Klasse als zweiter Hook in `styles.css`.
- Ausgeblendet: Statusbar, Tab-Leiste, Sidebar (Outline/Backlinks), Splitter, Search-Bar, Modals, Empty-State, Drop-Overlay, Kontextmenü, Edit-Pane.
- Sichtbar: nur `.markdown-body` des aktiven Pane, eigene Padding-Werte zurückgesetzt (Electron `marginsType: 0` liefert ~10 mm Standardrand).
- Schriftgröße 11pt, Linkfarbe wie im Render-Pane, kein `attr(href)`-Suffix nach Links.
- `page-break-inside: avoid` für `pre`, `table`, `.mermaid-block`, `.katex-display`.
- `page-break-after: avoid` für `h1`–`h6`.
- Bilder mit `max-width: 100%`.
- Hljs-Farben bleiben durch `printBackground: true` sichtbar.

### Format und Konfiguration

- A4 Hochformat, fest. Konfigurierbarkeit (Format, Ränder, Landscape) ist nicht im Umfang.

## Akzeptanz-Smoke-Tests

1. Menü-Klick und Shortcut öffnen den Save-Dialog mit sinnvollem Default-Namen.
2. Export speichert die Datei am gewählten Ort.
3. Im PDF sind Statusbar, Tabs, Sidebar, Menü nicht enthalten.
4. Mermaid-SVGs als Vektor erhalten.
5. KaTeX-Formeln korrekt gesetzt.
6. Highlight-Farben sichtbar.
7. Lange Code-Blöcke und Tabellen brechen nicht mitten im Block über die Seite.
8. Relative Bilder (Base64-eingebettet) erscheinen.
9. Erfolgs-Hinweis bzw. Fehler-Hinweis in der Statusbar.
10. Dokument ohne Mermaid/KaTeX läuft ohne Hänger.

## Akzeptanzkriterien

- `Datei → Als PDF exportieren…` und/oder das Tastenkürzel öffnen den Speichern-Dialog mit sinnvollem Default-Dateinamen.
- Die erzeugte PDF-Datei enthält den Inhalt des aktuellen Render-Pane in A4-Hochformat.
- Statusbar, Tab-Leiste, Sidebar-Panels (Outline/Backlinks) und Menüleiste sind im PDF **nicht** enthalten.
- Mermaid-Diagramme erscheinen als Vektor-SVG im PDF.
- KaTeX-Formeln erscheinen korrekt gesetzt im PDF.
- Syntax-Highlighting-Farben sind im PDF sichtbar (`printBackground: true`).
- Lange Code-Blöcke und Tabellen werden nicht mitten im Block über eine Seite umgebrochen (best effort über `page-break-inside: avoid`).
- Relative Bilder (Base64-eingebettet im Render-Pane) erscheinen im PDF.
- Bei Erfolg kurzer Statusbar-Hinweis „PDF exportiert"; bei Fehler 3-Sekunden-Hinweis in Rot mit Fehlerbeschreibung.
- Der Aufruf bricht nicht ab, wenn das Dokument keinerlei Mermaid- oder KaTeX-Inhalte hat.

## Bezug zu Dateien

- `src/main/main.js` — neuer IPC-Handler `pdf:export`, Speichern-Dialog, `printToPDF`-Aufruf, Datei-Schreibe-Logik, Fehler-Routing zum Renderer.
- `src/main/preload.js` — neue API-Methode `exportPdf(defaultName)`.
- `src/main/menu.js` — neuer Menüpunkt `Datei → Als PDF exportieren…`.
- `src/renderer/renderer.js` — Vorbereitung des Render-Pane (Warten auf Mermaid/KaTeX-Render), Setzen/Entfernen der `printing`-Klasse, Statusbar-Hinweise.
- `src/renderer/styles.css` — Print-CSS-Regeln (`@media print`), Klasse `body.printing` mit Versteck-Regeln für UI-Chrome.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Menüpunkt, Default-Dateiname, Statusbar-Hinweise, Fehlermeldungen.

## Stand bei Zurückstellung (innerhalb 0.10.0)

### Was implementiert und wieder zurückgebaut wurde

Folgender Code war im Zwischenstand vorhanden und wurde mit der Zurückstellung
**vollständig entfernt**:

- **`src/main/main.js`** — IPC-Handler `pdf:export`: öffnet `dialog.showSaveDialog`
  mit Filter `*.pdf`, ruft `webContents.emulateMedia({ media: 'print' })` plus
  `webContents.printToPDF({ pageSize: 'A4', landscape: false, marginsType: 0,
  printBackground: true })`, schreibt den Buffer per `fs.writeFile` und
  schaltet `emulateMedia` im `finally` wieder auf `'screen'` zurück.
  Rückgabe `{ ok, filePath } | { canceled: true } | { ok: false, error }`.
- **`src/main/preload.js`** — `exportPdf(defaultPath)` als IPC-Wrapper plus
  `onMenuExportPdf(cb)` zur Entgegennahme des Menü-Events.
- **`src/main/menu.js`** — Menüeintrag „Als PDF exportieren…" nach „Speichern
  unter…" mit Separator, Accelerator `CmdOrCtrl+Shift+P`, `enabled: hasActiveTab`,
  sendet `menu:exportPdf`.
- **`src/renderer/renderer.js`** — Funktion `exportActiveTabAsPdf`: Default-Pfad
  bestimmen (`<basename>.pdf` neben der Markdown-Datei, sonst `<Unbenannt>.pdf`
  im Home-Verzeichnis), `printing`-Klasse auf `html` UND `body` setzen, auf
  `lastApplyMermaidPromise` plus zwei `requestAnimationFrame`-Ticks warten,
  IPC anstoßen, Statusbar-Feedback per bestehendes `showStatusbarHint`-Helper,
  Klassen im `finally` aufräumen. Plus Modul-Variable `lastApplyMermaidPromise`,
  in der beide `applyMermaidIfPresent`-Aufrufstellen ihr Promise tracken.
- **`src/renderer/styles.css`** — `@media print`-Block plus parallele
  `body.printing`-Regeln: UI-Elemente verstecken (Statusbar, Tabbar, Sidebar,
  Splitter, Search, Modals, Empty-State, Drop-Overlay, Kontextmenü),
  Container-Backgrounds auf Weiß zwingen (`main`, `.panes-container`,
  `.pane-group`, `.content`, `.pane-rendered` — bewusst **ohne** `.pane`,
  weil das `.pane-source` mit erfasst und Spezifitätskonflikt erzeugt
  hat), Layout-Reset (`height: auto`, `overflow: visible`), Print-Regeln
  `page-break-inside: avoid` für `pre`, `table`, `.mermaid-block`,
  `.katex-display` und `page-break-after: avoid` für Headings, Body auf
  weiß plus schwarze Schrift.
- **`src/i18n/{de,en,fr,es,it}.json`** — fünf Keys: `menu.file.exportPdf`,
  `pdf.defaultUntitled`, `pdf.saveDialogTitle`, `pdf.statusOk`,
  `pdf.statusError`.
- **`dist/test-4t-0024.md`** — Test-Markdown mit Headings, Listen, Tabelle,
  zwei Code-Blöcken (Python/SQL), zwei KaTeX-Blöcken, zwei Mermaid-Diagrammen,
  einem langen JavaScript-Code-Block für Seitenumbruchs-Test. Test-Datei
  bleibt in `dist/` (gitignored) als Referenz für den späteren Wiederanlauf
  liegen.

### Was funktioniert hat

- **Menüeintrag, Shortcut, IPC-Pfad, Save-Dialog, Datei schreiben** — alle
  Schritte des Kontrollflusses laufen sauber durch. Erfolg- und Fehler-
  Hinweise in der Statusbar werden korrekt angezeigt.
- **Mermaid-Promise-Tracking** — `lastApplyMermaidPromise` ist eine saubere
  Lösung, um vor dem `printToPDF` auf den letzten Mermaid-Render-Lauf zu
  warten. Das Pattern kann beim Wiederanlauf wiederverwendet werden.
- **Seitenumbrüche** über `@media print`-Regeln greifen, sobald
  `emulateMedia({ media: 'print' })` aktiv ist. Lange Code-Blöcke bleiben
  zusammen.

### Was nicht zuverlässig funktioniert hat

Die zentrale Schwierigkeit lag im **CSS-Setup für den Print-Modus** in einer
App, die zur Laufzeit ein vollwertiges Light-/Dark-Theme samt mehreren
Containern mit `var(--bg)`-Hintergrund hat. Konkrete Beobachtungen aus den
Tests:

1. **Nur erste Seite im PDF** — Ursache war `html, body { height: 100%;
   overflow: hidden; }` in der Grundlayout-CSS. Im Print-Modus kappt das
   den Inhalt aufs Viewport. **Gelöst** durch `html.printing, body.printing
   { height: auto !important; overflow: visible !important; }` plus
   `document.documentElement.classList.add('printing')` (zusätzlich zur
   `body`-Klasse, sonst greift der `html`-Selektor nicht).

2. **Dark-Mode im PDF trotz @media print** — `webContents.printToPDF()`
   emuliert per Default das `screen`-Medium. **Teil-Lösung** durch
   `webContents.emulateMedia({ media: 'print' })` vor dem Print-Aufruf.
   Reicht aber alleine nicht, weil das Print-Stylesheet die Container-
   Hintergründe nicht zuverlässig überschreibt.

3. **Schwarzer Rahmen außen um den Inhalt im PDF** — die Container zwischen
   `body` und `.markdown-body` (`main`, `.panes-container`, `.pane-group`,
   `.content`, `.pane-rendered`) hatten weiterhin `var(--bg)`-Hintergrund.
   **Teil-Lösung** durch `background: #ffffff !important` auf alle diese
   Container in `body.printing`. Hat den Rahmen reduziert, aber im
   Live-Test des Nutzers blieb der visuelle Eindruck unbefriedigend.

4. **Source-Pane plötzlich im PDF sichtbar** — Bug in der Eile entstanden:
   meine „alle Container auf Weiß"-Regel listete `body.printing .pane`. Da
   `.pane-source` HTML-seitig auch die Klasse `.pane` trägt, hat
   `display: block !important` auf `.pane` die vorherige
   `display: none !important`-Regel auf `.pane-source` überschrieben
   (gleiche Spezifität, spätere Regel gewinnt). **Gelöst** durch entfernen
   von `.pane` aus dem Layout-Reset-Block.

5. **Verbleibendes Problem nach allen Fixes** — laut Test des Nutzers
   sieht der Dark-Mode-Export auch nach der vollständigen Reihe von Fixes
   nicht zufriedenstellend aus. Wahrscheinliche Restursachen (zu verifizieren
   beim Wiederanlauf):
   - CodeMirror-Editor erzeugt eventuell DOM-Elemente außerhalb von
     `.pane-source` (Portale, Tooltips, Layer-Container am `<body>`), die
     vom `display: none`-Override nicht erfasst werden.
   - Hljs-Theme im Dark-Modus setzt Code-Block-Backgrounds (über die
     prefixed `[data-theme="dark"] .hljs-*`-Regeln aus 4T-0023). Diese
     Regeln greifen weiter, weil `printing` das `data-theme`-Attribut nicht
     ändert. Im Print-Modus müsste das Light-Hljs-Theme erzwungen werden.
   - Mermaid-Diagramme sind im Dark-Theme mit `theme: 'dark'` initialisiert
     (4T-0021). Im PDF sollten sie auf das Light-Theme umgerendert werden,
     was zusätzlich Aufwand bedeutet.
   - Inline-Style-Attribute am Render-Pane oder am Body (z.B. CodeMirror
     setzt eigene `style="background: ..."` an gewissen Elementen), die nur
     mit `style`-Attribut-Reset (per JS) zu beseitigen wären.

### Empfehlung für späteren Wiederanlauf

- **Variante A — eigener Print-Renderer:** Anstatt `webContents.printToPDF`
  auf dem laufenden Fenster aufzurufen, ein separates, verstecktes
  `BrowserWindow` öffnen, das eine **dedizierte Print-HTML-Seite** lädt
  (nur Markdown-Body, eigenes minimales Stylesheet, im Light-Modus, mit
  bereits gerenderten Mermaid-SVGs und KaTeX-HTML). Vorteile: keine Theme-
  Konflikte, keine UI-Chrome zu verstecken, keine Container-Backgrounds
  zu überschreiben. Aufwand: höher; Pflege der Print-Sicht-Pipeline.
- **Variante B — bestehenden Ansatz verfeinern:** zusätzlich zum aktuellen
  Stand das `data-theme` für die Print-Dauer hart auf `light` zwingen
  (`document.documentElement.setAttribute('data-theme', 'light')` und am
  Ende zurücksetzen), Mermaid-Diagramme im Light-Theme neu rendern lassen
  (`rerenderAllMermaidBlocks()` mit Forced-Theme aufrufen), Hljs greift
  dann automatisch über `:root:not([data-theme="dark"])`. Hat den
  Vorteil, sich nah am bestehenden Code-Stand zu bewegen.
- **Variante B+ — Theme-Variablen-Override (verfeinert):** statt im Print-CSS
  jede einzelne Container-Klasse zu überschreiben (was im Test wegen
  Spezifitätskonflikten gekippt ist), die CSS-Custom-Properties am
  `<html>`-Element direkt per JS auf Light-Werte setzen:
  ```js
  const root = document.documentElement;
  const overrides = {
    '--bg': '#ffffff', '--bg-alt': '#f5f5f5', '--bg-toolbar': '#fafafa',
    '--tab-active-bg': '#ffffff', '--tab-bg': '#ececec',
    '--code-bg': '#f6f8fa', '--hover': '#efefef',
    '--fg': '#1f1f1f', '--fg-muted': '#6a6a6a',
    '--border': '#e0e0e0', '--border-strong': '#c8c8c8',
  };
  const saved = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = root.style.getPropertyValue(k);
    root.style.setProperty(k, v);
  }
  // … plus data-theme auf 'light', Mermaid neu rendern …
  // im finally: saved-Werte wiederherstellen, data-theme zurueck.
  ```
  Damit folgen **alle** theme-abhängigen Container automatisch dem Light-Schema,
  ohne dass man einzelne Selektoren in Print-CSS auflisten muss. Vermeidet
  die Spezifitäts-Falle, die beim aktuellen Anlauf mit `.pane` vs.
  `.pane-source` aufgetreten ist. Mein Favorit für den Wiederanlauf.
- In allen Varianten den `lastApplyMermaidPromise`-Sync vor dem Print
  beibehalten — der war sauber gelöst.

## Lösung
