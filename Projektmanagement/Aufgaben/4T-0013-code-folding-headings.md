# 4T-0013 — Code-Folding nach Überschriften im Editor

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Längere Markdown-Dokumente sind im Quellcode-Pane heute nur durch Scrollen oder Suchen navigierbar. Strukturierte Editoren zeigen am Gutter pro Heading eine klappbare Region, sodass die übergeordnete Gliederung jederzeit sichtbar bleibt und Sektionen nach Bedarf ein- oder ausgeblendet werden können. Diese Möglichkeit fehlt aktuell und ist Teil des Strukturnavigations-Pakets.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

- CodeMirror-`foldGutter` aktivieren und mit einem Markdown-spezifischen `foldService` versorgen, der Heading-Regions aus dem `syntaxTree` des Markdown-Sprachpakets ableitet.
- Region-Definition: Ein Heading der Stufe `N` (ATX, also `#` bis `######`) eröffnet eine Region, die bis zum Beginn des nächsten Headings mit Stufe `<= N` oder zum Datei-Ende reicht. Setext-Headings (`Heading\n====`) werden mitberücksichtigt, sofern der Markdown-Parser sie als Heading-Knoten liefert.
- Eingeklappter Zustand pro Region wird im CodeMirror-State gehalten und überlebt Re-Renders. Persistenz innerhalb der Sitzung pro Tab, nicht über App-Neustart hinweg.
- Klick auf den Falt-Indikator klappt eine Region einzeln. Tastenkürzel (Vorschlag, zu bestätigen): `Strg+Umschalt+[` / `Strg+Umschalt+]` zum Ein-/Ausklappen am Cursor.
- Style-Anpassung am Gutter passend zum bestehenden Light-/Dark-Theme.

### Zusammenspiel mit dem Outline-Panel (4T-0014)

Das Folding-Modell muss von außerhalb des Editors lesbar und steuerbar sein, damit das Outline-Panel:

- für jede Heading-Region anzeigen kann, ob sie aktuell zugeklappt ist (Pfeil-Indikator am Outline-Eintrag),
- per Klick auf seinen eigenen Falt-Indikator die zugehörige Editor-Region toggeln kann,
- beim Sprung-Klick auf eine zugeklappte Region diese vorher automatisch entfaltet.

Konkret:

- **Read-API**: Eine Helper-Funktion `isHeadingRegionFolded(line)` (oder vergleichbar) gibt für eine Heading-Zeile zurück, ob die zugehörige Region eingeklappt ist. Quelle ist der CodeMirror-`foldState`.
- **Write-API**: Funktionen `foldHeadingRegion(line)` und `unfoldHeadingRegion(line)`, die die Region einer bestimmten Heading-Zeile gezielt einklappen oder entfalten. Implementiert über CodeMirror-Transaktionen, die den `foldState` verändern.
- **Änderungs-Notification**: Bei jeder Folding-Änderung (egal ob aus dem Gutter, aus dem Outline oder per Tastenkürzel) wird ein Renderer-internes Event ausgelöst, auf das das Outline-Panel reagiert, um seine Indikatoren zu aktualisieren.

## Akzeptanzkriterien

- Im Quellcode-Pane erscheint links neben den Zeilennummern (oder einer eigenen Spalte, falls Zeilennummern aus sind) ein Falt-Indikator vor jedem Heading.
- Klick auf den Indikator klappt den Bereich vom Heading bis zum nächsten gleich- oder höhergestellten Heading ein. Erneuter Klick öffnet die Region wieder.
- Verschachtelte Regions funktionieren korrekt: Ein `##`-Heading lässt sich unabhängig von der umschließenden `#`-Region klappen.
- Der Folding-Zustand überlebt View-Wechsel (Quellcode/Geteilt/Gerendert/Geteilt zurück) und Tab-Wechsel.
- Folding-Indikatoren passen sich an das aktive Theme (Light/Dark) an.
- Bei deaktivierten Zeilennummern bleibt das Folding-Gutter sichtbar.

**Schnittstelle zum Outline-Panel:**

- Read- und Write-Helper für Folding-Zustand stehen zur Verfügung, sodass das Outline-Panel aus 4T-0014 sowohl den Zustand abfragen als auch Folding-Aktionen auslösen kann.
- Bei jeder Folding-Änderung (Editor-Gutter, Outline-Indikator, Tastenkürzel) erhält das Outline-Panel ein Update-Event und aktualisiert seine Pfeil-Indikatoren.

## Bezug zu Dateien

- `src/renderer/renderer.js` — Erweiterung der CodeMirror-Extensions um `foldGutter` und Markdown-`foldService`.
- `src/renderer/styles.css` — Gutter-Styles für Falt-Indikatoren (Light und Dark).
- `src/i18n/{de,en,fr,es,it}.json` — Hilfe-Dialog-Texte (in 4T-Sammel-Task am Epic-Ende).

## Lösung
