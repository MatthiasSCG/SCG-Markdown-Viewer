# 4T-0057 — Autocomplete-Framework für `[[` und `#`

**Status**: Offen
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0
**Setzt voraus**: [4T-0054](4T-0054-wiki-link-heading-block-anker.md), [4T-0055](4T-0055-wiki-embeds.md), [4T-0056](4T-0056-tag-system.md)

## Warum

Mit dem Wiki-Link-Ausbau (Heading/Block-Anker, Embeds) und dem Tag-System bekommt die App zwei Vernetzungs-Mechanismen, die schnell ineinandergreifen. Ohne Autocomplete muss der Nutzer sich Datei-Namen, Aliases, Heading-Slugs, Block-IDs und Tag-Namen merken oder per Hand nachschlagen. In Obsidian ist Autocomplete für `[[` und `#` ein Kernfeature, das den Workflow erheblich beschleunigt.

Beide Trigger teilen sich das Pattern: Trigger-Zeichen plus Dropdown mit Filter-Vorschlägen aus einem indizierten Bestand. Sinnvoll, das Framework einmal zu bauen und für beide Trigger zu nutzen.

## Lösungsansatz

### CodeMirror-Autocomplete

CodeMirror 6 bringt `@codemirror/autocomplete` mit. Wir nutzen die `CompletionContext`-API und definieren eigene Completion-Quellen.

- **Quelle 1: Wiki-Link** — Trigger `[[`. Vorschläge: Datei-Basenames im Backlinks-Suchraum, plus Aliases aus dem Backlinks-Index. Wenn der Nutzer nach dem Datei-Namen `#` tippt: Heading-Vorschläge aus der Ziel-Datei.
- **Quelle 2: Tag** — Trigger `#`. Vorschläge: Tags aus dem Tag-Index (4T-0056), hierarchisch sortiert.

### Trigger-Erkennung

- `[[` öffnet das Dropdown ohne explizite Tasten-Aktion (CodeMirror löst beim Tippen aus).
- `#` öffnet das Dropdown nur, wenn das vorangegangene Zeichen kein Buchstabe/Ziffer ist (Heading-Marker am Zeilenanfang oder Tag im Fließtext).
- Beide Dropdowns schließen sich bei Esc, Tab/Enter wählt aus, Pfeil-Tasten navigieren.

### Vorschlags-Ranking

- Wiki-Link-Vorschläge: Datei-Basename-Match zuerst (Prefix-Match), Alias-Match danach (Substring-Match).
- Tag-Vorschläge: häufigste Tags zuerst, dann alphabetisch.
- Fuzzy-Search optional, kommt nur wenn die Default-Liste zu kurz ist. Beim Task-Start abwägen.

### Performance

- Indizes (Backlinks, Tags) sind bereits im Main-Prozess gepflegt. Renderer holt Vorschlagsliste per IPC bei Trigger; lokale Caches nicht nötig.
- Bei Backlinks-Cap-Erreichung (2000 Dateien) bleibt das Autocomplete schnell, weil die Map-Lookups O(1) sind. Dropdown-Render auf maximal 50 Einträge begrenzt.

### Hilfe für den Nutzer

- Im Dropdown-Item: links der Schlüsseltext (`Datei.md`, `#projekt/x`), rechts ein dezenter Hinweis (`Alias`, `Tag`, `Heading`).
- Wenn der Nutzer beim Tippen den Datei-Pfad mit `#` ergänzt, schaltet das Dropdown auf Heading-Vorschläge aus der Ziel-Datei um.

### Akzeptanz-Smoke-Tests

1. `[[` öffnet Dropdown mit Datei-Vorschlägen aus dem Suchraum.
2. `[[mar` filtert auf Dateien mit Prefix `mar`.
3. Aliases erscheinen als Vorschläge (mit „Alias"-Hinweis).
4. `[[Datei#` öffnet Dropdown mit Heading-Vorschlägen der Ziel-Datei.
5. `[[Datei#^` öffnet Dropdown mit Block-IDs der Ziel-Datei.
6. `#` im Fließtext öffnet Tag-Dropdown.
7. `# Heading` am Zeilenanfang öffnet kein Tag-Dropdown (Heading-Marker).
8. Pfeil-Navigation, Enter-Auswahl, Esc-Abbruch funktionieren.
9. Performance: bei 2000 Dateien bleibt das Dropdown unter 100 ms.

## Akzeptanzkriterien

- `@codemirror/autocomplete` ist in den Editor-Extensions integriert.
- Trigger `[[` mit Datei-/Alias-Vorschlägen plus Heading-/Block-Anker-Vorschlägen nach `#`.
- Trigger `#` mit Tag-Vorschlägen, ausschließend Heading-Marker.
- Hinweis-Spalte rechts in jedem Dropdown-Item (Alias/Tag/Heading).
- Esc, Pfeil, Enter, Tab wie üblich.
- Performance-Cap eingehalten.

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Completion-Quellen, Editor-Extension-Integration.
- [src/main/main.js](../../src/main/main.js) — neue IPC-Handler für Autocomplete-Anfragen (Datei-Liste, Aliases, Heading-Slugs einer Datei, Block-IDs einer Datei, Tag-Liste).
- [src/main/preload.js](../../src/main/preload.js) — API-Methoden für Renderer.
- [src/main/backlinks.js](../../src/main/backlinks.js) — Zusatz-Lookups (`headingsForFile`, `blockIdsForFile`).
- [src/renderer/styles.css](../../src/renderer/styles.css) — Dropdown-Stilfamilie, falls Default-CSS nicht reicht.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — Hinweis-Texte „Alias", „Tag", „Heading", „Block".

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
