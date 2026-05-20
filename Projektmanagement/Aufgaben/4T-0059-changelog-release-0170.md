# 4T-0059 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.17.0

**Status**: Offen
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0011](3E-0011-wiki-link-ausbau-und-tag-system.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess gemäß den Projekt-Konventionen in [CLAUDE.md, Abschnitt „Abschluss-Sammeltask am Epic-Ende"](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst bearbeitet, wenn [4T-0054](4T-0054-wiki-link-heading-block-anker.md), [4T-0055](4T-0055-wiki-embeds.md), [4T-0056](4T-0056-tag-system.md), [4T-0057](4T-0057-autocomplete-framework.md) und [4T-0058](4T-0058-hilfe-dialog-wiki-link-tag.md) auf „Wartet auf Test" oder „Erledigt" stehen.

## Lösungsansatz

### 1. CHANGELOG

Neuer Block ganz oben in [CHANGELOG.md](../../CHANGELOG.md):

```markdown
## [0.17.0] - JJJJ-MM-TT — Wiki-Link-Ausbau und Tag-System

Feature-Release. Zweites Etappenziel aus dem Meta-Plan „Obsidian-Parity-Roadmap". Epic [3E-0011](Projektmanagement/Aufgaben/3E-0011-wiki-link-ausbau-und-tag-system.md).

### Neu
- **Wiki-Link-Heading- und Block-Anker** (4T-0054): `[[Datei#Heading]]`, `[[Datei#^id]]`, Block-ID-Syntax `^id` am Zeilenende, Linter-Erweiterung.
- **Wiki-Embeds** (4T-0055): `![[…]]` für Bilder, Markdown-Notizen und PDF.
- **Tag-System** (4T-0056): Inline-Tags `#tag`, Frontmatter-`tags:`, neue Tag-Sidebar als vierte Sektion mit Hierarchie und Filter.
- **Autocomplete** (4T-0057): Dropdown für `[[` (Dateien, Aliases, Heading-/Block-Anker) und `#` (Tags).
- **Hilfe-Dialog erweitert** (4T-0058).

### Geändert
- Versions-Bump 0.16.0 → 0.17.0.

### i18n
- N neue JSON-Keys über fünf Sprachen.
```

### 2. Release-Notes

- `dist/release-notes-0.17.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: die vier neuen Funktionen mit konkreten Beispielen.

### 3. README aktualisieren

- **Status-Sektion** auf 0.17.0 mit Beschreibung des zweiten Etappenziels.
- **Sektion „Frontmatter und Properties"** ggf. um Heading- und Block-Anker-Hinweis ergänzen (Anker werden mit Wiki-Links zusammen erklärt — neue Sektion „Wiki-Link-Erweiterungen und Tags"?). Entscheidung beim Task-Start.
- **Links-Tabelle** um Heading- und Block-Anker-Verhalten erweitern.
- **Tastenkürzel-Tabelle** um Strg+Umschalt+T (Tag-Sidebar) und ggf. Block-Anker-Syntax-Hinweis.
- Neue Subsektion oder Punkt zu **Embeds**, **Tags** und **Autocomplete**.

### 4. Test-Iteration

- `npm run build`, Portable-EXE bauen, Smoke-Test per Doppelklick.
- Test-Aufforderung mit Verifikation aller vier neuen Funktionen plus Hilfe-Dialog-Stand plus README-Doku-Stand.
- **Erst nach Freigabe** weiter mit Release.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md, Abschnitt „Release-Prozess"](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (Setup-EXE, Portable-EXE, `latest.yml`, Setup-Blockmap).
3. Tag: `git tag v0.17.0 <commit-sha>` und `git push origin v0.17.0`.
4. GitHub-Release: `gh release create v0.17.0 --title "v0.17.0 — Wiki-Link-Ausbau und Tag-System" --notes-file dist/release-notes-0.17.0.md --latest` mit den vier Asset-Dateien.

### 6. Status-Updates

- [4T-0054](4T-0054-wiki-link-heading-block-anker.md) bis [4T-0058](4T-0058-hilfe-dialog-wiki-link-tag.md), 4T-0059 (dieser Task) auf `Erledigt`.
- Epic [3E-0011](3E-0011-wiki-link-ausbau-und-tag-system.md) auf `Erledigt — in v0.17.0 ausgeliefert`, `Release`-Frontmatter-Zeile ergänzen.

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.17.0]` mit Verweis auf 3E-0011.
- `dist/release-notes-0.17.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion auf 0.17.0; Funktionsumfang um Wiki-Link-Erweiterungen, Embeds, Tags und Autocomplete erweitert; Tastenkürzel-Tabelle aktualisiert.
- `package.json` hat `version: 0.17.0`.
- Tag `v0.17.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.17.0` ist als `--latest` markiert mit allen vier Assets.
- Alle fünf vorherigen Tasks und das Epic stehen auf `Erledigt`.

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.17.0.
- `package.json` — Version 0.16.0 → 0.17.0.
- [README.md](../../README.md) — Status-Sektion, Funktionsumfang, Tastenkürzel-Tabelle.
- `dist/release-notes-0.17.0.md` — Release-Notes (gitignored).

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
