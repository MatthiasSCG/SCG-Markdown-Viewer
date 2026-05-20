# 4T-0056 — Tag-System: Parser, Index und Sidebar

**Status**: Offen
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0

## Warum

Tags (`#tag`) sind in Obsidian, Logseq und vielen Notizen-Tools ein zweiter Vernetzungs-Mechanismus neben Wiki-Links. Sie eignen sich für transversale Kategorien („alle Notizen mit `#projekt/markdown-viewer`"), die nicht in eine einzelne Datei-Hierarchie passen.

Aktuell rendert die App `#tag`-Sequenzen als normalen Text. Es gibt keinen Index, keine Suche, keine Sidebar. Frontmatter-`tags:`-Einträge werden ebenfalls nicht als Tags behandelt.

## Lösungsansatz

### Tag-Parser

In [src/main/preload.js](../../src/main/preload.js):

- Neue markdown-it Inline-Rule, die `#tag` als eigenes Token erkennt.
- Regex: `(?<=^|\s)#([\p{L}\p{N}_/-]+)` — beginnt mit `#`, Buchstaben/Ziffern/Bindestrich/Unterstrich/Slash. Slash erlaubt Hierarchien.
- Ausschlüsse: Code-Blöcke und Inline-Code (gleiche Logik wie der Linter); Heading-Marker am Zeilenanfang (`# Heading`) sind keine Tags.
- Output-HTML: `<a href="#tag:<name>" class="tag-link">#<name></a>`. Klick öffnet/aktiviert die Tag-Sidebar mit Filter.

### Tag-Index

In [src/main/backlinks.js](../../src/main/backlinks.js) wird der bestehende Index um Tag-Daten erweitert:

- Pro Datei eine Liste der Inline-Tags (aus dem Body) plus eine Liste der Frontmatter-Tags (aus `tags:`).
- `parseFile` liefert die Listen mit; Watcher pflegt sie analog zu Aliases.
- Inverse Map `tagMap: Map<tagLower, Set<absPath>>` für Lookup „welche Dateien führen Tag X".

### Tag-Sidebar

Vierte Sidebar-Sektion neben Inhaltsverzeichnis, Properties und Backlinks. Position: zwischen Properties und Backlinks (Reihenfolge: Inhalt → Properties → Tags → Backlinks).

Inhalte:

- **Hierarchische Tag-Anzeige**: Slashes als Hierarchie-Trenner (`#a/b/c` → drei Ebenen). Aufgeklappt nach erstem Auftauchen einer Ebene.
- **Tag-Häufigkeit** pro Eintrag in Klammern: `#projekt (12)`.
- **Klick auf Tag** filtert die Liste auf Dateien, die diesen Tag führen. Klick auf eine Datei öffnet sie (oder aktiviert den existierenden Tab).
- **Filter-Feld** am Sektionsanfang für Tag-Suche (Substring-Match).
- Toggle wie Outline und Backlinks: Menü `Ansicht → Tags`, Statusbar-Icon, Hotkey (Vorschlag `Strg+Umschalt+T`, beim Task-Start prüfen ob frei).

### Frontmatter-`tags:`

Pflege im Tag-Index analog zu Aliases:

- Akzeptierte YAML-Formen: Liste (`tags: [foo, bar]`), mehrzeilige Liste, einzelner String.
- Frontmatter-Tags werden zusammen mit Inline-Tags in den Index aufgenommen.
- Im Render-Pane werden Frontmatter-Tags nicht zusätzlich als `#tag` angezeigt; sie tauchen nur in der Sidebar auf.

### Persistenz

- `tags.visibleColumn0`, `tags.visibleColumn1` (analog Outline/Backlinks).
- Aktuelle Filter-Eingabe wird nicht persistiert (Session-lokal).

### Akzeptanz-Smoke-Tests

1. `#projekt` im Markdown wird als klickbarer Tag-Link gerendert.
2. `#a/b/c` erscheint hierarchisch in der Sidebar (drei Ebenen).
3. Frontmatter mit `tags: [foo, bar]` erscheint ebenfalls in der Sidebar.
4. Klick auf einen Tag in der Sidebar filtert die Datei-Liste.
5. Filter-Feld mit Substring-Eingabe reduziert die Tag-Anzeige.
6. Tag-Index aktualisiert sich bei Datei-Änderung über den Watcher.
7. `#tag` in Code-Block, Inline-Code, oder als Heading-Marker am Zeilenanfang wird **nicht** als Tag erkannt.
8. Theme-Wechsel: Tag-Pillen lesbar in Hell und Dunkel.
9. Sprachwechsel: Sektion-Titel, Filter-Placeholder, leere-Hinweis.

## Akzeptanzkriterien

- Inline-Tag-Erkennung mit Hierarchie-Slashes.
- Tag-Index pflegt Inline- und Frontmatter-Tags pro Datei plus inverse Map.
- Tag-Sidebar als vierte Sektion zwischen Properties und Backlinks.
- Filter-Feld, hierarchische Anzeige, Häufigkeits-Anzeige, Klick-Filter.
- Toggle über Menü, Statusbar und Hotkey; Persistenz pro Spalte.
- Frontmatter-`tags:` werden mit erfasst.
- i18n in fünf Sprachen.

## Bezug zu Dateien

- [src/main/preload.js](../../src/main/preload.js) — Tag-Inline-Rule, Render-Output.
- [src/main/backlinks.js](../../src/main/backlinks.js) — Tag-Index, inverse Map, Watcher-Update.
- [src/main/main.js](../../src/main/main.js) — IPC-Handler für Tag-Sidebar (Tag-Liste anfordern, Datei-Liste pro Tag anfordern).
- [src/main/menu.js](../../src/main/menu.js) — Menüeintrag `Ansicht → Tags`.
- [src/renderer/index.html](../../src/renderer/index.html) — neue Sidebar-Sektion `.sidebar-tags` pro Pane, Statusbar-Icon `#btn-tags`.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Tag-Sidebar-Logik, Klick-Handler, Persistenz, `state.tags`.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Stile für Tag-Sektion, Tag-Pillen, hierarchische Anzeige.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings.

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
