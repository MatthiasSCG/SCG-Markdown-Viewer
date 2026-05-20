# 3E-0010 — Frontmatter, Aliases und Properties

**Status**: Offen
**Zielversion**: 0.16.0
**Vorgängerversion**: 0.15.0
**Reihenfolge im Meta-Plan**: Epic 1 von 6 (B → C → D → E → A → F)
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkte 7, 11, 18

## Ziel

Den Metadaten-Block am Anfang einer Markdown-Datei (YAML-Frontmatter zwischen `---`-Zeilen) als eigenständige Datenstruktur erkennen, sauber vom Render-Pfad trennen, für die Wiki-Link-Auflösung über Aliases nutzbar machen und mit einer UI-Komponente bearbeitbar machen.

## Warum

YAML-Frontmatter ist in Obsidian, Jekyll, Hugo, GitHub und anderen Markdown-Welten der De-facto-Standard für Datei-Metadaten (Titel, Tags, Aliases, Datum, beliebige Custom-Felder). Aktuell rendert die App den `---`-Block als horizontale Trennlinie mit darunterliegendem Text, was bei jeder Frontmatter-haltigen Datei optisch stört und semantisch falsch ist. Drei zusammenhängende Verbesserungen lösen das Problem:

- **Frontmatter erkennen und ausklammern**. Macht die Render-Ansicht für jede Frontmatter-haltige Datei sofort lesbar.
- **Aliases auswerten**. Erlaubt, eine Datei unter mehreren Namen per `[[Alias]]` zu verlinken. Sinnvoll bei Personen, Konzepten, Abkürzungen.
- **Properties bearbeitbar machen**. Form-Editor für die Felder, damit Metadaten ohne YAML-Syntax-Kenntnis gepflegt werden können.

Die drei Punkte hängen zusammen: Frontmatter ist die Grundlage, Aliases sind ein Feldtyp darauf, Properties ist die UI darauf. Sinnvoll als ein Epic.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Frontmatter-Parser** im Renderer-Pfad. `markdown-it`-Plugin (`markdown-it-front-matter` oder Eigenimplementierung), das den führenden `---`-Block erkennt, extrahiert und nicht als Markdown rendert.
- **Frontmatter-Anzeige im Source-Pane**. CodeMirror-Highlighting unterscheidet den Block visuell vom restlichen Text (z.B. dezenter Hintergrund oder eigene Token-Klasse).
- **Frontmatter-Anzeige im Render-Pane**. Default: ausgeblendet. Optional als kompakte Properties-Box am Datei-Anfang.
- **Aliases-Auswertung**. Der Backlinks-Index (aus 4T-0015) und die Wiki-Link-Auflösung erkennen `aliases:`-Einträge und führen eine Datei mit Alias unter beiden Namen.
- **Properties-Editor-UI**. Modale oder andockbare Form-Komponente, die die Frontmatter-Felder als typisierte Eingabefelder darstellt (String, Liste, Datum, Number, Boolean). Typ-Inferenz aus dem aktuellen Wert oder aus einer Feldnamen-Konvention. Speichern schreibt das YAML zurück.
- **Hilfe-Dialog**: neue Feature-Einträge in der passenden Gruppe, ggf. neuer Hilfe-Tab oder neue Sektion. Hilfe-Markdown bei Bedarf erweitert.
- CHANGELOG-Eintrag, Release-Notes, README-Update, Version-Bump, Tag, GitHub-Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Frontmatter-Validierung gegen ein Schema** (à la JSON Schema). Akzeptiert, was die YAML-Library parst.
- **Eigene Feldtypen** wie Datei-Referenzen, Multi-Select mit Vorschlägen, oder Datenbank-Felder à la Notion. Nur die fünf YAML-Primitiv-Typen.
- **Properties-Sidebar à la Obsidian 1.4** mit Live-Filter und Sortierung über Frontmatter-Werte. Properties ist hier eine reine Edit-UI für die aktive Datei, nicht ein Datenbank-Layer.
- **Tags aus Frontmatter** (`tags: [foo, bar]`) als verlinkbare Tags. Tags folgen in 3E-0011 mit eigenem Konzept; die Frontmatter-Lese-Logik wird dort wiederverwendet.

## Untergeordnete Tasks

- [x] [4T-0049 — Frontmatter-Erkennung und Render-Ausschluss](4T-0049-frontmatter-erkennung.md) — erledigt 2026-05-20, Commit `9d9508c`, gepushed
- [x] [4T-0050 — Aliases-Auflösung in Wiki-Links und Backlinks](4T-0050-aliases-aufloesung.md) — erledigt 2026-05-20, Commit `4c52b72`, gepushed
- [x] [4T-0051 — Properties-Editor für Frontmatter-Felder](4T-0051-properties-editor.md) — erledigt 2026-05-20, Commit `903448b`, gepushed; als Sidebar-Sektion statt Modal umgesetzt
- [x] [4T-0052 — Hilfe-Dialog um Frontmatter, Aliases und Properties erweitern](4T-0052-hilfe-dialog-frontmatter-properties.md) — erledigt 2026-05-20
- [ ] [4T-0053 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.16.0](4T-0053-changelog-release-0160.md)

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **YAML-Library**: `js-yaml` ist die bekannte Wahl im Node-Umfeld und in Electron-Apps wie Obsidian. Tolerant gegen Eingabefehler, schreibbar als Round-Trip.
- **Render-Pfad-Integration**: Frontmatter wird im Preload vor dem `md.render()`-Aufruf abgeschnitten und der parsed Block separat zurückgeliefert. Der Renderer entscheidet, ob er ihn als Properties-Box, als ausgeblendet oder als Quelltext darstellt.
- **Aliases-Speicherung im Backlinks-Index**: pro Datei ein optionales `aliases`-Feld in der Index-Datenstruktur. Wiki-Link-Auflösung sucht zuerst nach Datei-Pfad, dann nach Aliases.
- **Properties-Editor-Platzierung**: zwei plausible Optionen — modaler Dialog wie der Einstellungs-Dialog oder ein eingeklappter Bereich am Anfang des Render-Pane. Entscheidung beim Task-Start.
- **YAML-Round-Trip-Treue**: Kommentare, Leerzeilen und Schlüsselreihenfolge sollten beim Schreiben möglichst erhalten bleiben. Wenn `js-yaml`-Defaults das nicht leisten, prüfen wir `yaml`-Library (eemeli) als Alternative.

## Reihenfolge der Umsetzung

1. **Frontmatter-Parser zuerst.** Ohne ihn geht nichts. Erst sauberer Render-Ausschluss, dann Source-Highlighting.
2. **Aliases-Auflösung als nächstes.** Setzt nur auf den Parser auf, ist klein und liefert sofortigen User-Wert. Die Wiki-Link-Erweiterungen aus 3E-0011 profitieren später direkt davon.
3. **Properties-Editor zuletzt.** Aufwendigster Teil. Setzt auf Parser und auf YAML-Round-Trip auf.
4. **Hilfe-Dialog und Sammeltask** schließen das Epic ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — Frontmatter-Parser-Integration vor `md.render()`.
- [src/main/backlinks.js](../../src/main/backlinks.js) — Aliases-Feld im Index, Auflösung über Alias.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Properties-Editor-UI, ggf. Render-Pane-Properties-Box.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Styling für Properties-Box und Editor.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für UI und Hilfe.
- `package.json` — Version-Bump auf 0.16.0, neue Dependency `js-yaml` (oder Alternative).
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.16.0.md`.

## Offene Punkte / Risiken

- **YAML-Round-Trip-Treue**: siehe Architekturentscheidungen. Risiko, dass Kommentare oder Reihenfolge beim Speichern verloren gehen. Mitigation: vor Schreibvorgang Backup-Vergleich, im Zweifel Library wechseln.
- **Performance-Impact bei sehr großen Dateien**: Frontmatter-Parsing ist klein, aber die Render-Pipeline läuft im Edit-Modus alle 150 ms. Sicherstellen, dass der Parser pro Render höchstens einmal läuft und Ergebnisse memoisiert.
- **Konflikt mit `<hr>` mitten im Dokument**: nur der erste `---`-Block ab Zeile 1 ist Frontmatter; weitere `---` bleiben horizontale Linien. Implementierung muss das strikt prüfen, sonst zerstört der Parser legitime `<hr>`-Elemente.
- **Properties-Editor und Auto-Save**: wenn ein Property geändert wird und Auto-Save aktiv ist, läuft sofort ein Schreibvorgang. Race-Condition bei schnellen Mehrfachänderungen muss verhindert werden (z.B. Debounce auf 500 ms im Editor).
