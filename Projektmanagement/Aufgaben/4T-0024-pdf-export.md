# 4T-0024 — PDF-Export über webContents.printToPDF

**Status**: Offen
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

Markdown-Dateien werden häufig mit Empfängern geteilt, die keinen Markdown-Reader installiert haben. Eine HTML-Vorschau lässt sich kopieren, aber kein eigenständig versendbares Dokument. PDF ist das Standardformat für „Markdown im Read-Only-Format an jemanden geben". Direkt aus der App, mit dem gerade gerenderten Pane als Quelle, vermeidet Umwege über externe Tools.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Aufruf

- Neuer Menüpunkt: `Datei → Als PDF exportieren…` (Tastenkürzel-Vorschlag `Strg + Umschalt + P`, zu bestätigen).
- Öffnet einen Speichern-Dialog mit Default-Dateiname: `<Basename der Markdown-Datei>.pdf` im selben Ordner. Bei „Unbenannt"-Tabs: `Unbenannt.pdf` im Home-Ordner als Default.
- Nach erfolgreicher Speicherung kurzer Statusbar-Hinweis „PDF exportiert" (1 Sekunde), bei Fehler 3 Sekunden in Rot mit Begründung.

### Vorbereitung des Render-Pane

- Sicherstellen, dass alle asynchronen Render-Schritte abgeschlossen sind: Mermaid-SVGs (aus 4T-0021) und KaTeX-Formeln (aus 4T-0022) gerendert. Implementierung via `Promise.all` auf den Render-Tasks oder über einen Event, der nach abgeschlossener Render-Pipeline feuert.
- Vor dem Print-Aufruf eine temporäre `body`-Klasse `printing` setzen, die Statusbar, Tabs, Sidebar-Panels und Menüleiste ausblendet und die Print-CSS aktiviert.

### Print-CSS

- Eigene `print.css` oder `@media print`-Regeln im bestehenden Stylesheet.
- Inhalte:
  - Seitenränder (z.B. 20 mm rundum).
  - Schriftgröße 11–12 pt, lesbare Schriftart.
  - `page-break-inside: avoid` für Code-Blöcke, Tabellen, Mermaid-Diagramme, KaTeX-Blöcke.
  - Heading-Stile mit Seiten-freundlichen Abständen.
  - Bilder mit `max-width: 100%`.
  - Linkfarbe und -unterstreichung wie im Render-Pane, aber URL nicht als Suffix anzeigen (keine `content: " (" attr(href) ")"`-Regel, weil das in PMd-typischen Wiki-Link-Strukturen unleserlich würde).

### IPC und printToPDF

- Renderer ruft per IPC `pdf:export` im Main an, übergibt den Default-Dateinamen.
- Main öffnet `dialog.showSaveDialog`, danach ruft er auf `BrowserWindow.webContents.printToPDF({format: 'A4', landscape: false, marginsType: 0, printBackground: true})`.
- Buffer in die gewählte Datei schreiben (`fs.writeFile`), Ergebnis an Renderer zurückmelden.
- Renderer entfernt die `printing`-Klasse, zeigt Statusbar-Hinweis.

### Format

- Default A4 Hochformat. Konfigurierbarkeit nicht im Umfang.
- `printBackground: true`, damit Highlight-Farben aus 4T-0023 sichtbar bleiben.

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

## Lösung
