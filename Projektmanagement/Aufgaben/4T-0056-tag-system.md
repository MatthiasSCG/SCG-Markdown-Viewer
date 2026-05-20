# 4T-0056 — Tag-System: Parser, Index und Sidebar

**Status**: Erledigt — 2026-05-20, Test bestanden
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

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/main/preload.js](../../src/main/preload.js)**:
  - Neues `tagsPlugin` als markdown-it Inline-Rule erkennt `#tag` mit Hierarchie-Slashes. Erzeugt `<a class="tag-link" href="#tag:<name>">#<name></a>`. Negativer Look-behind `(?<![\p{L}\p{N}_#])` verhindert Treffer mitten in Wörtern und nach Doppelhash.
  - Plugin wird in `md` und `mdPortable` registriert (im portablen Export bleiben Tag-Pillen als Text sichtbar, ohne Filter-Funktion).
  - Neue API-Methoden `requestTags` (Tag-Liste mit optionalem Filter-Tag) und `onMenuToggleTags` (Menü-Trigger).
- **[src/main/backlinks.js](../../src/main/backlinks.js)**:
  - `parseFile` sammelt zusätzlich Inline-Tags aus dem Body (per `TAG_RE`-Regex) und Frontmatter-`tags:` aus dem YAML-Block. Normalisierungs-Funktion `normalizeAliases` wird wiederverwendet.
  - Neue Maps `tagsPerFile` (Original-Casing) und inverse `tagMap` (case-insensitive Lookup) im Index.
  - Helper `addToTagMap`/`removeFromTagMap`/`getAllTagsWithCounts`/`filesForTag` analog zur Alias-Logik.
  - `ensureIndex` und `onWatcherChange` pflegen beide Maps mit Diff-Logik bei add/change/unlink.
  - Neue exportierte Funktion `tagsFor(filePath, filterTag)` für den IPC-Handler. Liefert Tag-Liste sortiert nach Häufigkeit (absteigend) und bei Gleichstand alphabetisch; optional die Datei-Liste für einen Filter-Tag.
- **[src/main/main.js](../../src/main/main.js)**: neuer IPC-Handler `tags:request`; `getMenuState` reicht `tagsVisible` durch.
- **[src/main/menu.js](../../src/main/menu.js)**: neuer Menüpunkt `Ansicht → Tags` als Checkbox mit Accelerator `CmdOrCtrl+Shift+T`.
- **[src/renderer/index.html](../../src/renderer/index.html)**: neue Sidebar-Sektion `.sidebar-tags` zwischen Properties und Backlinks pro Pane mit Filter-Input, Status-Element, Tree-Container und Files-Container. Neuer Statusbar-Button `#btn-tags` mit Lucide-Tag-Icon zwischen Properties- und Backlinks-Icon.
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**:
  - `state.tags = { visibleByPane, filterByPane, queryByPane }`.
  - `getPaneEls` um `tagsSection`, `tagsFilter`, `tagsStatus`, `tagsTree`, `tagsFiles` erweitert.
  - `applySidebarVisibility` zählt Tag-Sektion zur Sichtbarkeit.
  - Komplette Tag-Sidebar-Logik: `applyTagsVisibility`, `toggleTagsPanel`, `persistTagsSettings`, `loadTagsSettings`, `updateTagsToggleButton`, `renderTags` (Token-basierte Race-Abwehr), `renderTagsTreeView` (flache Anzeige mit voller Slash-Pfad-Darstellung), `renderTagsFilesView` (Datei-Liste mit Header und Back-Button).
  - Event-Listener: Statusbar-Button-Click, Filter-Input pro Pane (mit `state.tags.queryByPane`-Update), Menü-Trigger, Hotkey `Strg+Umschalt+T` in der bestehenden Sidebar-Toggle-Keydown-Logik.
  - Tab-Wechsel und externer Reload rufen `renderTags` auf, wenn die Sektion sichtbar ist.
  - `applyAllLayouts` ruft `applyTagsVisibility` für beide Panes.
  - `loadTagsSettings` beim App-Start.
  - `reportMenuStateNow` reicht `tagsVisible` durch.
  - `handleRenderedClick` erkennt `href="#tag:<name>"` und aktiviert die Tag-Sidebar mit dem entsprechenden Filter (Sektion wird eingeblendet, falls noch nicht sichtbar; Menü-Häkchen wird über `reportMenuStateNow` synchronisiert).
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: `.tag-link` für Inline-Tag-Pillen im Render-Pane (dezent blau, theme-konform). `.tags-*`-Stilfamilie für die Sidebar: Filter-Input, flache Tree-Items mit Hover-Hervorhebung, Datei-Liste mit Header und Back-Button.
- **i18n (DE/EN/FR/ES/IT)**: 12 neue Keys je Sprache (`menu.view.tags`, `tags.title`, `tags.toggle`, `tags.toggleTitle`, `tags.filterPlaceholder`, `tags.empty`, `tags.noMatch`, `tags.unavailable`, `tags.indexing`, `tags.oversized`, `tags.back`, `tags.noFiles`).

### Implementierungsdetails

- **Token-basierte Race-Abwehr in `renderTags`**: identisches Problem wie der Properties-Race in 4T-0051, hier aber unvermeidbar async, weil `api.requestTags` ein IPC-Call ist. Lösung: pro Pane ein Counter `tagsRenderToken[paneIdx]`, beim Start eines Aufrufs inkrementiert. Nach dem `await` wird verglichen: wenn der Counter nicht mehr stimmt, ist ein neuerer Aufruf gestartet — der alte verwirft sein Ergebnis. Defensiv wird der Container nach dem await nochmals geleert, falls ein paralleler Aufruf doch noch Items angehängt hat.
- **Flache Anzeige statt Hierarchie-Indent**: ursprünglich war eine pseudo-hierarchische Anzeige geplant, die aus der Slash-Anzahl im Tag-Namen ein Indent ableitet (`#a/b` → `padding-left: 14px`). Beim Test fiel auf, dass das ohne echte Parent-Knoten verwirrt — Tags mit Slash sahen aus wie eingerückt „unter etwas", obwohl der vermeintliche Parent nicht existiert. Entscheidung: flache Anzeige mit vollem Slash-Pfad. Eine echte Baum-Struktur mit ableitbaren Parent-Knoten, Parent-Counts und Prefix-Filter wäre konzeptionell mehr Aufwand (Backend muss Prefix-Lookup unterstützen, Parent-Counts müssen dedupliziert berechnet werden) und kommt in einer späteren Iteration.
- **Negativer Look-behind bei TAG_RE**: `(?<![\p{L}\p{N}_#])` verhindert `foo#bar`-Treffer mitten im Wort und `##tag` aus Markdown-Doppelhash. Code-Block-Tracking aus 4T-0054 (über `inFence`-Flag) wird wiederverwendet — Tags in Fenced-Code werden nicht indiziert.
- **`#` als Heading vs. Tag**: `# Heading` am Zeilenanfang wird vom Block-Tokenizer als Heading konsumiert, bevor die Inline-Rule läuft. Daher kein Konflikt zwischen Heading-Marker und Tag.
- **Frontmatter-Tags-Integration**: das Frontmatter-Feld `tags:` wird mit der gleichen Normalisierungs-Funktion (`normalizeAliases`) durch Liste, einzelnen String oder mehrzeilige Form akzeptiert. Tags aus Frontmatter und Inline-Tags landen im gleichen Set pro Datei.
- **Klick auf Tag-Pille im Render-Pane**: Klick-Handler erkennt `href="#tag:<name>"`-Pattern als spezielle Behandlung vor dem allgemeinen `#`-Anker-Pfad. Bei nicht-sichtbarer Tag-Sektion wird sie eingeblendet plus Filter gesetzt; sonst nur Filter aktualisiert.

### Bugfix-Iteration während des Tasks

Nach erster Test-Iteration fielen zwei Bugs auf, die im selben Build behoben wurden:

1. **Pseudo-Indent für Tags mit Slashes**: aus der Slash-Anzahl wurde `padding-left` abgeleitet, ohne dass Parent-Knoten existieren. Fix: Indent komplett raus, flache Anzeige.
2. **Tags drei- bis vierfach beim Tab-Wechsel**: klassischer Async-Race, wie bei 4T-0051. Fix: Token-basierte Validierung pro Pane plus Defensiv-Reset nach dem `await`.

### Smoke-Test (2026-05-20)

16 Test-Punkte vom Nutzer verifiziert: Tag-Pillen im Render-Pane, drei Toggle-Wege, Tag-Liste mit Häufigkeit, Filter-Input, Klick-Filter, Datei-Liste, Back-Button, Klick auf Tag-Pille, Frontmatter-Integration, Persistenz, Tab-Wechsel, Live-Update über Watcher, Sprachwechsel, Theme-Wechsel, Heading-/Wort-Ausschluss, Code-Block-Ausschluss. Plus die beiden Folge-Fixes (Indent, Race). Alle Punkte bestanden.
