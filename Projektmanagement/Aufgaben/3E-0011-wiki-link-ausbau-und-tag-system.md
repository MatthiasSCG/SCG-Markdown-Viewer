# 3E-0011 — Wiki-Link-Ausbau und Tag-System

**Status**: In Umsetzung — seit 2026-05-20
**Zielversion**: 0.17.0
**Vorgängerversion**: 0.16.0
**Reihenfolge im Meta-Plan**: Epic 2 von 6 (B → C → D → E → A → F)
**Aufsetzend auf**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md) (nutzt Aliases-Auflösung)
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkte 8, 9, 10, 15

## Ziel

Die Vernetzung von Notizen auf das Niveau heben, das Obsidian-Nutzer von Stock-Obsidian erwarten: Inline-Einbettungen mit `![[…]]`, präzises Linken auf Heading und Block in einer anderen Datei, ein eigenständiges Tag-System mit Sidebar, und ein gemeinsames Autocomplete-Framework für `[[` und `#`.

## Warum

Die aktuelle Wiki-Link-Implementierung (Plugin `wikiLinksPlugin` in [src/main/preload.js](../../src/main/preload.js)) kann nur `[[Datei]]` und `[[Datei|Label]]`. Heading-Anker (`[[Datei#Heading]]`) werden falsch behandelt (das `#` wird Teil des Datei-Pfads), Block-Anker (`[[Datei#^id]]`) sind unbekannt, und Embeds (`![[Datei]]`) werden gar nicht erkannt. Tags (`#tag`) sind ein zweiter, vom Wiki-Link unabhängiger Vernetzungs-Mechanismus, der in Obsidian fast überall sichtbar ist (Inline-Token, Tag-Sidebar, Tag-Suche).

Beide Mechanismen teilen sich technisch ein Pattern: ein Trigger-Zeichen im Editor öffnet ein Dropdown mit Vorschlägen aus einem Index, der durch den Watcher (`chokidar`) live gehalten wird. Sinnvoll, das Autocomplete-Framework einmal zu bauen und für beide Trigger zu verwenden.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Wiki-Embeds** `![[Datei]]` und `![[Datei|Label]]`. Renderer entscheidet anhand der Datei-Endung:
  - Bilder (`png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`) → `<img>` mit Base64-Pfad-Auflösung analog zu Markdown-Bildern.
  - Markdown-Dateien (`md`) → eingebettetes Render-Fragment der Zieldatei in einer dezenten Box mit Klick-Link.
  - PDFs → eingebetteter Viewer oder zumindest Klick-Link mit Icon. Detail beim Task entscheiden.
  - Andere Endungen → Klick-Link mit Datei-Icon.
- **Heading-Wiki-Links** `[[Datei#Heading]]` und `[[Datei#Heading|Label]]`. Auflösung führt zur Datei plus Slug-Anker. Im selben Dokument funktioniert `[[#Heading]]`.
- **Block-Wiki-Links** `[[Datei#^block-id]]`. Block-Anker-Syntax `^block-id` am Ende einer Zeile (Absatz, Listenelement, Tabellenzeile, Blockquote) ist im Markdown selbst erlaubt und wird als HTML-Anchor mit ID gerendert. Block-Wiki-Link führt zur Datei plus diesem Anker.
- **Tag-Parser**: Inline-Token `#tag` (Buchstaben, Ziffern, Bindestrich, Slash für Hierarchien wie `#projekt/markdown-viewer`). Code-Blöcke und Inline-Code sind ausgenommen, ebenso `#` mitten in einem Wort wie `foo#bar`.
- **Tag-Index**: Pro Datei die enthaltenen Tags, analog zum Backlinks-Index in [src/main/backlinks.js](../../src/main/backlinks.js). Live-aktualisiert über den vorhandenen `chokidar`-Watcher.
- **Tag-Sidebar**: dritte Sektion in der linken Sidebar neben Inhaltsverzeichnis und Backlinks. Hierarchische Tag-Anzeige, Klick filtert (oder springt zur Datei-Liste mit diesem Tag), Persistenz pro Spalte wie bei den anderen Sektionen.
- **Tags aus Frontmatter** (`tags:` als YAML-Liste): in den Tag-Index aufgenommen, gleichberechtigt zu Inline-Tags. Setzt 3E-0010 voraus.
- **Autocomplete-Framework** im CodeMirror-Editor:
  - Trigger `[[` öffnet Dropdown mit Datei-Vorschlägen aus dem Such-Raum (Backlinks-Suchraum). Aliases werden mit angezeigt.
  - Trigger `#` öffnet Dropdown mit Tag-Vorschlägen aus dem Tag-Index.
  - Pfeil-Navigation, Enter-Auswahl, Esc schließt.
- **Wiki-Link-Linter erweitern** (aus 4T-0020): Heading- und Block-Anker werden gegen die Ziel-Datei geprüft. Wenn das Heading oder die Block-ID nicht existiert, wird der Link als bare URL markiert.
- **Hilfe-Dialog**: neue Feature-Einträge in „Bearbeitung" und „Navigation", neue Shortcuts (falls Autocomplete einen Trigger-Hotkey bekommt).
- CHANGELOG, Release-Notes, README, Tag, Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Block-Embed** `![[Datei#^id]]` (eingebetteter Block-Inhalt aus einer anderen Datei). Heading- und Block-Links als Sprungziel ja, als Einbettung ist das ein eigener Aufwand und wird zurückgestellt.
- **Tag-Pane à la Obsidian** mit Häufigkeitssortierung und Tag-Statistik-View. Tag-Sidebar bleibt einfach: hierarchische Liste mit Klick-Filter.
- **Auto-Vervollständigung im Render-Pane**. Autocomplete wirkt nur im Editor.
- **Tag-Umbenennung** (Refactoring aller Vorkommen eines Tags). Manuelle Suche-und-Ersetze reicht für 0.17.0.
- **Globale Tag-Suche** mit Mehrfach-Filter. Tag-Sidebar zeigt eine Tag-Auswahl, die ist nicht mit der Volltext-Suche kombiniert.

## Untergeordnete Tasks

- [ ] [4T-0054 — Wiki-Link-Parser für Heading- und Block-Anker (inkl. Linter-Erweiterung)](4T-0054-wiki-link-heading-block-anker.md)
- [ ] [4T-0055 — Wiki-Embeds `![[…]]`](4T-0055-wiki-embeds.md)
- [ ] [4T-0056 — Tag-System: Parser, Index und Sidebar](4T-0056-tag-system.md)
- [ ] [4T-0057 — Autocomplete-Framework für `[[` und `#`](4T-0057-autocomplete-framework.md)
- [ ] [4T-0058 — Hilfe-Dialog um Wiki-Link-Ausbau und Tag-System erweitern](4T-0058-hilfe-dialog-wiki-link-tag.md)
- [ ] [4T-0059 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.17.0](4T-0059-changelog-release-0170.md)

**Schnitt-Entscheidung zum Epic-Start (2026-05-20):** Linter-Erweiterung (Heading- und Block-Anker-Prüfung) wurde mit Task 1 (Wiki-Link-Parser) zusammengelegt, weil beide denselben Parser-Pfad anpassen und der Linter eine kleine Folge-Änderung ist. Damit sechs Tasks statt der ursprünglich vorgesehenen sieben.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **Wiki-Link-Plugin** in [src/main/preload.js](../../src/main/preload.js) wird umgebaut: parse-Logik trennt Pfad, optionalen Heading-Anker (`#text`) und optionalen Block-Anker (`#^id`). `hasExtension`-Heuristik wird nur auf den Pfad-Teil angewendet.
- **Block-ID-Syntax**: `^block-id` am Ende einer Zeile, durch Leerzeichen abgetrennt. Renderer hängt ein `id`-Attribut an das umschließende HTML-Element. Slug-Validierung: nur `[a-zA-Z0-9-_]`, sonst kein Anker.
- **Embed-Rendering**: zwei mögliche Architekturen. Variante 1: bereits im Preload zu HTML expandieren (rekursiver Render der eingebetteten Markdown-Datei). Variante 2: nur ein Platzhalter-Element im Preload, der Renderer holt den Inhalt asynchron nach. Entscheidung beim Task-Start, abhängig von Performance-Tests.
- **Tag-Index-Persistenz**: zur Laufzeit im Speicher, analog zum Backlinks-Index. Kein Disk-Cache, weil der Index beim App-Start in wenigen Sekunden neu aufgebaut wird.
- **Autocomplete-Library**: CodeMirror 6 hat `@codemirror/autocomplete` als offizielles Paket. Default-Lösung, Anpassung über `CompletionContext` und benutzerdefinierte Quellen.
- **Tag-Hierarchie**: `#a/b/c` wird als Tag mit drei Ebenen verstanden. In der Sidebar als Baum dargestellt, in der Tag-Index-Map flach gespeichert mit Slash-Notation.

## Reihenfolge der Umsetzung

1. **Wiki-Link-Parser umbauen** als Erstes. Heading- und Block-Anker sind die direkteste Lücke und schnell umsetzbar. Block-ID-Syntax kommt mit.
2. **Embeds**, weil sie auf den umgebauten Parser aufsetzen und vom selben Code profitieren.
3. **Tag-Parser, Index, Sidebar** als nächstes größeres Stück. Eigenständiger Block.
4. **Autocomplete-Framework** zuletzt unter den Code-Tasks, weil es auf den Indizes für Wiki-Ziele und Tags aufsetzt.
5. **Linter-Erweiterung** ergänzt nach den Parser-Änderungen, weil der Linter sonst gegen die alten Parser-Annahmen läuft.
6. **Hilfe-Dialog und Sammeltask** schließen das Epic ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — Wiki-Link-Plugin (Heading, Block, Embed), Block-ID-Inline-Token, Tag-Inline-Token.
- [src/main/backlinks.js](../../src/main/backlinks.js) — Tag-Index neben Backlinks-Index, Aliases-Lookup in Wiki-Link-Auflösung.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Tag-Sidebar-Sektion, Autocomplete-Framework, Embed-Klick-Handler.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Embed-Boxen, Tag-Pillen, Autocomplete-Dropdown.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für Sidebar-Sektion, Linter-Tooltips, Hilfe.
- `package.json` — Version-Bump auf 0.17.0, ggf. neue Dependencies (`@codemirror/autocomplete` ist evt. schon transitiv vorhanden).
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.17.0.md`.

## Offene Punkte / Risiken

- **Embed-Rendering-Tiefe**: rekursive Embeds (`A` embeddet `B`, `B` embeddet `A`) müssen eine Tiefenbegrenzung haben, sonst Endlosschleife. Analog zur SCG-Table-Verschachtelung aus 3E-0008 (Limit 3).
- **PDF-Embeds**: Electron kann PDFs nativ rendern, aber als `<embed>` oder `<webview>`. Detail beim Task-Start.
- **Tag-Konflikt mit Headings**: `# Heading` am Zeilenanfang ist ein H1, kein Tag. Tag-Parser muss diesen Kontext erkennen (kein Tag, wenn `#` am Zeilenanfang von Leerzeichen gefolgt ist, oder wenn die Zeile ein Heading ist).
- **Autocomplete-Performance** bei sehr vielen Dateien: das Dropdown muss innerhalb des Backlinks-Suchraum-Caps (2000 Dateien, 50 MB) flüssig bleiben. Fuzzy-Search statt linearer Scan.
- **Slug-Kollisionen bei Block-Anchors**: zwei Blöcke in derselben Datei mit derselben ID. Erste Definition gewinnt; Linter könnte später warnen.
- **Aliases-Abhängigkeit von 3E-0010**: dieses Epic geht davon aus, dass Aliases aus Frontmatter im Backlinks-Index bereits verfügbar sind. Falls 3E-0010 bei Start dieses Epics noch nicht fertig ist, wird die Aliases-Wiki-Link-Auflösung hier stillschweigend kein Ergebnis liefern.
