# 4T-0014 — Outline-Panel mit Heading-Baum, klickbar und scroll-synchron

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Der Folding-Mechanismus aus 4T-0013 ist editor-intern und nur im Quellcode-Pane sichtbar. Für die Übersicht über lange Dokumente fehlt ein persistentes Inhaltsverzeichnis, das

- die Heading-Hierarchie als gut lesbaren Baum darstellt,
- per Klick zur jeweiligen Stelle im Editor und im Render-Pane springt,
- die aktuell sichtbare Stelle hervorhebt, sodass auch beim Scrollen die Position im Dokument klar ist.

## Lösungsansatz

### Sidebar-Container (gemeinsam mit Backlinks aus 4T-0015)

Ein gemeinsamer linker Sidebar-Container pro Spalte nimmt zwei Sektionen auf:

- **Outline** (oben, in diesem Task).
- **Backlinks** (unten, in 4T-0015).

Beide Sektionen sind unabhängig per Toggle kollabierbar. Wenn beide Sektionen versteckt sind, verschwindet die gesamte Sidebar inklusive Splitter, der Editor-/Render-Bereich nutzt die volle Spaltenbreite.

- **Position**: links in jeder Spalte, vor Editor- und Render-Pane.
- **Default-Breite**: 260 px beim ersten Einblenden. Min 180 px, Max 500 px, per Splitter verstellbar.
- **Initial-Sichtbarkeit**: versteckt bei frischer Installation. Status wird persistent in den Settings pro Spalte gespeichert; einmal eingeblendet bleibt das Outline-Panel über App-Neustarts hinweg sichtbar.
- **Toggle-Quellen** für das Outline-Panel:
  - Statusbar-Button (neues Icon, links neben den View-Toggles).
  - Menüleisten-Eintrag `Ansicht → Inhaltsverzeichnis` als Toggle mit Häkchen.
  - Tastenkürzel `Strg+Umschalt+O` (toggelt das Outline-Panel der aktiv fokussierten Spalte).
- **Multi-Window-Synchronisation**: keine fensterübergreifende Synchronisation, weil die Sichtbarkeit pro Spalte gilt und ein globales Verhalten nicht sinnvoll wäre. Der Menü-Haken zeigt den Stand der aktiv fokussierten Spalte.

### Heading-Hierarchie

- **Quelle**: derselbe `syntaxTree` aus dem CodeMirror-Markdown-Sprachpaket wie in 4T-0013. Damit ist die Hierarchie konsistent zum Folding und steht auch in der reinen Render-Ansicht zur Verfügung (CodeMirror-Doc bleibt im Hintergrund vorhanden).
- **Stufen 1 bis 6** werden alle angezeigt, ohne Konfigurations-Möglichkeit in 0.8.0.
- **ATX- und Setext-Headings** werden gleichermaßen erfasst.
- **Aktualisierung** bei Editor-Änderungen mit Debounce von 200 ms, kein Flackern beim Tippen.
- **Funktioniert auch bei „Unbenannt"-Tabs**, weil die Heading-Hierarchie aus dem Buffer abgeleitet wird, nicht aus der Datei.

### Darstellung

- Eingerückter Baum, ein Eintrag pro Heading, mit Heading-Stufe als Einrückungstiefe (1 Stufe = ca. 12 px Einrückung pro Ebene).
- Lange Heading-Titel werden mit Ellipsen abgeschnitten, voller Text im Tooltip beim Hover.
- Jeder Eintrag hat **zwei sichtbare Klick-Bereiche**:
  - **Falt-Indikator** links: Pfeil-Icon (14×14 px). Pfeil nach unten = Editor-Region offen, Pfeil nach rechts = Editor-Region zugeklappt.
  - **Heading-Text** rechts daneben: der eigentliche Heading-Inhalt.
- **Hervorhebung der aktiven Sektion**: dünner farbiger Balken links am Eintrag (3 px breit) plus leichte Hintergrund-Schattierung. Farbe theme-konsistent (Light/Dark).

### Bedienung (ausschließlich Maus)

Das Outline-Panel nimmt keinen Tastatur-Fokus. Pfeiltasten, Enter und Leertaste haben darin keine Funktion. Sprung- und Folding-Aktionen sind ausschließlich per Maus erreichbar.

- **Klick auf den Heading-Text** (Sprung-Klick):
  - Im Quellcode- oder Geteilt-Modus: Cursor in die entsprechende Heading-Zeile setzen, Zeile in den sichtbaren Bereich scrollen. **Falls die zugehörige Region im Editor zugeklappt ist, wird sie vorher automatisch entfaltet** (Aufruf `unfoldHeadingRegion(line)` aus 4T-0013).
  - Im Render-Modus: Render-Pane scrollt zum entsprechenden `<h*>`-Anker. Dazu wird die markdown-it-Pipeline in [src/main/preload.js](src/main/preload.js) um das Plugin **`markdown-it-anchor`** erweitert, das auf allen Headings ID-Attribute mit GitHub-kompatiblen Slugs setzt. Der Sprung erfolgt anschließend über den heute schon vorhandenen `#anker`-Handler in `handleRenderedClick` ([src/renderer/renderer.js:1374](src/renderer/renderer.js:1374)), der `target.scrollIntoView` aufruft.
- **Klick auf den Falt-Indikator** (reiner Folding-Toggle):
  - Toggelt die Editor-Region per `foldHeadingRegion(line)` bzw. `unfoldHeadingRegion(line)` aus 4T-0013, ohne den Cursor zu bewegen und ohne im Render-Pane zu scrollen.

### Seiteneffekt: `#anker`-Links generell funktionsfähig

Die Einbindung von `markdown-it-anchor` ist im Kern eine Voraussetzung für den Outline-Sprung im Render-Modus. Sie repariert aber als Seiteneffekt ein bisher latentes Problem: Der `#anker`-Zweig in `handleRenderedClick` ([src/renderer/renderer.js:1374](src/renderer/renderer.js:1374)) hat seit dem ersten Release Markdown-Anker-Links wie `[Link](#mein-heading)` zwar entgegengenommen, aber wegen fehlender Heading-IDs nichts gefunden und damit stillschweigend nicht gescrollt. Mit `markdown-it-anchor` setzen Headings ab 0.8.0 reguläre IDs, und Anker-Links innerhalb eines Dokuments funktionieren erstmals erwartungsgemäß. Im CHANGELOG-Eintrag von 0.8.0 ist das als „Behoben" festzuhalten.

### Synchronisation Outline ↔ Editor/Render

- **Hervorhebung der aktiven Sektion** folgt:
  - Im Edit- oder Geteilt-Modus: Cursor-Zeile im Editor. Aktive Sektion ist das zuletzt durchschrittene Heading mit Zeilennummer `<= Cursor-Zeile` (Sticky-Scroll-Semantik). Bei Cursor zwischen zwei Headings zählt das **obere**.
  - Im Render-Modus: Scroll-Position im Render-Pane. Das oberste vollständig sichtbare Heading gilt als aktiv.
- **Update gedrosselt** auf 100 ms Debounce, kein Flackern bei schnellem Scrollen oder Cursor-Bewegung.

- **Folding-Sync**:
  - Outline lauscht auf das Folding-Änderungs-Custom-Event aus 4T-0013.
  - Bei jeder Folding-Änderung werden die Pfeil-Indikatoren der betroffenen Outline-Einträge aktualisiert, ohne dass der gesamte Baum neu rendert.

### Empty State

Bei einer Datei ohne Headings erscheint ein lokalisierter Hinweistext:

- DE: „Keine Überschriften in diesem Dokument"
- EN: „No headings in this document"
- FR, ES, IT: sinngemäß.

### Persistenz

- **Sichtbarkeit pro Spalte**: in den Settings als `outline.visible.column0` und `outline.visible.column1`, oder via einem gemeinsamen Settings-Bereich pro Spalte (Detail im Settings-Schema-Design).
- **Breite des Sidebar-Containers** pro Spalte: `sidebar.width.column0` / `sidebar.width.column1`. Wenn beide Sektionen (Outline und Backlinks) versteckt sind, wird die Breite weiter gehalten und greift wieder, sobald mindestens eine Sektion eingeblendet wird.

## Akzeptanzkriterien

**Anzeige und Persistenz:**

- Statusbar-Button, Menüleisten-Eintrag `Ansicht → Inhaltsverzeichnis` oder `Strg+Umschalt+O` toggeln das Outline-Panel der aktiv fokussierten Spalte.
- Sichtbarkeits-Status persistent über App-Neustart hinweg, pro Spalte unabhängig.
- Default bei frischer Installation: versteckt.
- Default-Breite beim ersten Einblenden: 260 px. Min 180, Max 500. Splitter-Position persistent.
- Beim Toggle aller Sektionen (Outline und Backlinks) auf unsichtbar verschwindet die gesamte Sidebar inklusive Splitter.

**Heading-Baum:**

- Outline zeigt alle Heading-Stufen 1 bis 6, eingerückt nach Stufe.
- ATX- und Setext-Headings werden gleichermaßen erfasst.
- Update bei Editor-Änderungen mit 200 ms Debounce, ohne Flackern.
- Funktioniert auch bei „Unbenannt"-Tabs (Heading-Hierarchie aus dem Buffer).
- Lange Titel werden mit Ellipsen abgeschnitten, voller Text im Tooltip beim Hover.

**Klick-Verhalten:**

- Klick auf den **Heading-Text** eines Eintrags setzt im Editor den Cursor auf die Heading-Zeile bzw. scrollt im Render-Pane zum jeweiligen Anker.
- Ist die zugehörige Region im Editor zugeklappt, wird sie beim Klick auf den Heading-Text automatisch entfaltet.
- Klick auf den **Falt-Indikator** links neben dem Heading-Text toggelt nur das Folding der zugehörigen Editor-Region. Der Cursor und der Scroll-Stand bleiben unverändert.

**Folding-Synchronisation:**

- Outline-Einträge, deren Editor-Region aktuell zugeklappt ist, zeigen den Pfeil nach rechts. Offene Regions: Pfeil nach unten.
- Wird im Editor selbst (Gutter oder Tastenkürzel) eine Region zugeklappt oder aufgeklappt, aktualisiert sich der Outline-Indikator entsprechend, ohne dass der gesamte Baum neu rendert.

**Synchronisation der aktiven Sektion:**

- Aktive Sektion wird optisch hervorgehoben (dünner farbiger Balken links plus leichte Hintergrund-Schattierung), theme-konsistent.
- Im Edit-/Geteilt-Modus folgt sie der Cursor-Zeile (zuletzt durchschrittenes Heading bei Cursor zwischen zwei Headings das obere).
- Im Render-Modus folgt sie dem obersten vollständig sichtbaren Heading beim Scrollen.
- Update-Drosselung 100 ms.

**Bedienung:**

- Outline-Panel ist ausschließlich per Maus bedienbar.
- Kein Tastatur-Fokus. Pfeiltasten, Enter und Leertaste haben keine Funktion im Panel.

**Empty State:**

- Bei Datei ohne Headings erscheint der lokalisierte Hinweistext „Keine Überschriften in diesem Dokument" (in den anderen vier Sprachen sinngemäß).

**Render-Modus-Sprung und `#anker`-Links:**

- Heading-Elemente im Render-Pane tragen ab 0.8.0 ID-Attribute mit GitHub-kompatiblen Slugs (z.B. „Mein Heading" → `id="mein-heading"`), erzeugt durch `markdown-it-anchor`.
- Outline-Klick im Render-Modus scrollt zum entsprechenden Heading.
- Dokument-interne Anker-Links der Form `[Text](#slug)` funktionieren ab 0.8.0 ebenfalls (vorher latent kaputt).

**Sonstiges:**

- Sprachwechsel aktualisiert die UI-Texte (Toggle-Label, Empty-State, Tooltips) live in allen offenen Fenstern.

## Bezug zu Dateien

- `src/renderer/index.html` — Sidebar-Container pro Spalte mit Outline- und Backlinks-Sektionen, Statusbar-Toggle-Button für Outline.
- `src/renderer/renderer.js` — Heading-Extraktion aus `syntaxTree`, Render des Baums, zwei getrennte Klick-Bereiche pro Eintrag, Cursor- und Scroll-Listener für Aktiv-Sektion, Sichtbarkeits-Toggle, Splitter-Logik, Folding-Sync-Listener.
- `src/renderer/styles.css` — Sidebar-Layout, Baum-Einrückung, Falt-Indikator-Icons, Aktiv-Hervorhebung, Splitter, Theme-Anpassungen.
- `src/main/main.js` — Settings-Erweiterung (`outline.visible`, `sidebar.width`), Synchronisation des Menü-Häkchens mit dem Renderer-Zustand der aktiven Spalte.
- `src/main/preload.js` — Integration von `markdown-it-anchor` in die markdown-it-Pipeline; IPC für Sichtbarkeits-Persistenz und Menü-Häkchen-Sync.
- `src/main/menu.js` — neuer Menüpunkt `Ansicht → Inhaltsverzeichnis` als Toggle mit Häkchen, Tastenkürzel `Strg+Umschalt+O` registriert.
- `src/i18n/{de,en,fr,es,it}.json` — Keys: Panel-Titel, Toggle-Label (Statusbar und Menü), Empty-State, Tooltips. Konkret etwa fünf bis sieben neue Keys pro Sprache.
- `package.json` — neue Dependency `markdown-it-anchor`.

## Implementierungs-Recherche (geklärt vor Umsetzungsbeginn)

- **Anker-Slug-Berechnung im Render-Pane**: heute nicht vorhanden, weil markdown-it ohne entsprechendes Plugin keine IDs auf Headings setzt. Lösung: `markdown-it-anchor` als neue Dependency, GitHub-kompatible Slug-Regel als Default. Repariert dabei den seit Release 0.1 latenten `#anker`-Bug.
- **Settings-Schema-Design**: bleibt als Detail-Design-Punkt während der Umsetzung offen, ob `outline.visible.column0/1` direkt im Settings-Schema landet oder über einen verschachtelten `sidebar`-Bereich aufgebaut wird. Mit dem Backlinks-Panel aus 4T-0015 abstimmen.

## Lösung
