# 4T-0039 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.13.0

**Status**: Offen
**Epic**: [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md)
**Zielversion**: 0.13.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0007](3E-0007-scg-table-spans-ausrichtung.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess (Build, Commit, Tag, GitHub-Release) gemäß den Projekt-Konventionen in [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst bearbeitet, wenn [4T-0037](4T-0037-scg-table-spans-ausrichtung-parser.md) und [4T-0038](4T-0038-scg-table-hilfe-tab-stufe-2.md) auf „Wartet auf Test" oder „Erledigt" stehen. So bleiben Detail-Entscheidungen aus der Umsetzung in den jeweiligen Tasks und wandern nicht vorzeitig in den Sammeltask.

Anders als bei 0.12.0 ([4T-0035](4T-0035-changelog-release-0120.md)) ist kein zusätzlicher Hilfe-Dialog-Eintrag nötig: der bestehende `help.feature.scgTable`-Eintrag aus 0.12.0 verweist bereits auf den Hilfe-Tab, und dort wird die Stufe-2-Doku in 4T-0038 ergänzt. Kein neuer i18n-Key.

## Lösungsansatz

### 1. CHANGELOG ergänzen

In [CHANGELOG.md](../../CHANGELOG.md) ganz oben neuen Block:

```markdown
## [0.13.0] - JJJJ-MM-TT — SCG Table Stufe 2: Spans, Ausrichtung und Accessibility

Epic [3E-0007](Projektmanagement/Aufgaben/3E-0007-scg-table-spans-ausrichtung.md).

### Neu
- **Zell-Attribute in SCG-Tabellen** (4T-0037): `colspan`, `rowspan`, `align`
  (`left`/`center`/`right`) und `valign` (`top`/`middle`/`bottom`) als Whitelist-
  Attribute am Zellenanfang (`| attr="val" attr="val" | Inhalt`). Strikte Wert-
  Validierung, keine freien `style="…"`-Attribute (kein XSS-Risiko).
- **Accessibility-Verbesserung** (4T-0037): `<th>` in der Header-Zeile bekommt
  automatisch `scope="col"`, `<th>` als Zeilen-Header `scope="row"`. Damit
  verbinden Screen-Reader Datenzellen mit ihren Headern.
- **Hilfe-Tab um Stufe-2-Doku erweitert** (4T-0038): Neue Sektion „Stufe 2:
  Spans und Ausrichtung" mit Syntax-Übersicht und Beispiel im Tab „SCG Table".

### Geändert
- **Versions-Bump** 0.12.0 → 0.13.0 ([package.json](package.json)).
- CSS-Klassen `.scg-table .align-{left|center|right}` und `.valign-{top|middle|bottom}`
  in [src/renderer/styles.css](src/renderer/styles.css).

### i18n
- Keine neuen i18n-Keys. Die Hilfe-Inhalte sind als Markdown-Dateien organisiert
  (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`); diese wurden um die Stufe-2-
  Sektion erweitert (siehe 4T-0038).
```

### 2. Release-Notes erzeugen

- `dist/release-notes-0.13.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: Zell-Attribute aus Stufe 2 mit kompaktem Syntax-Beispiel.
- Standard-Abschnitte: Download-Tabelle, „Was ist neu seit v0.12.0", System-Anforderungen, SmartScreen-Hinweis, Link zum CHANGELOG.

### 3. README aktualisieren

Gemäß [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende), Punkt 4:

- **Status-Sektion** (vorletztes Kapitel in [README.md](../../README.md)) auf 0.13.0 mit kurzem Hinweis auf Stufe-2-Erweiterung umschreiben.
- **`### Markdown-Umfang`**: bestehender SCG-Table-Bullet ggf. um Hinweis auf Stufe-2-Attribute ergänzen.
- **`### Hilfe-Dialog`**: bestehende Tab-Beschreibung passt vermutlich, keine Anzahl-Angaben zu pflegen. Prüfen.
- **Tastenkürzel-Tabelle**: keine Änderungen (keine neuen Bindings in Stufe 2).

### 4. Test-Iteration mit dem Nutzer

- `npm run build`, Portable-EXE bauen.
- Smoke-Test der Portable-EXE per Doppelklick durch den Implementierenden (per CLAUDE.md bei Preload-Änderungen).
- Test-Aufforderung an Nutzer:
  - Stufe-2-Beispiele rendern wie erwartet?
  - Hilfe-Tab zeigt neue Sektion in allen fünf Sprachen?
  - CHANGELOG und README-Status-Sektion sitzen?
- **Erst nach Freigabe** weiter mit Release-Schritt.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md — Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (erzeugt Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap` in `releases/`).
3. Tag: `git tag v0.13.0 <commit-sha>` und `git push origin v0.13.0`.
4. GitHub-Release: `gh release create v0.13.0 --title "v0.13.0 — SCG Table Stufe 2" --notes-file dist/release-notes-0.13.0.md --latest` mit allen vier Asset-Dateien.

### 6. Status-Updates

Nach erfolgreichem Release alle zugehörigen Vorgänge auf `Erledigt`:

- [4T-0037](4T-0037-scg-table-spans-ausrichtung-parser.md)
- [4T-0038](4T-0038-scg-table-hilfe-tab-stufe-2.md)
- 4T-0039 (dieser Task)
- [3E-0007](3E-0007-scg-table-spans-ausrichtung.md)

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.13.0]` mit Verweis auf 3E-0007.
- `dist/release-notes-0.13.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion ist auf 0.13.0 umgeschrieben; Markdown-Umfang-Bullet ggf. um Stufe-2-Hinweis erweitert.
- `package.json` hat `version: 0.13.0`.
- Tag `v0.13.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.13.0` ist als `--latest` markiert mit allen vier Assets (Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap`).

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.13.0.
- `package.json` — Version 0.12.0 → 0.13.0.
- [README.md](../../README.md) — Status-Sektion, ggf. Markdown-Umfang.
- `dist/release-notes-0.13.0.md` — Release-Notes (gitignored).

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
