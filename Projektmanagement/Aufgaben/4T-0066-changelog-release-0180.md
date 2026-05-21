# 4T-0066 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.18.0

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0012](3E-0012-markdown-syntax-erweiterungen.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess gemäß den Projekt-Konventionen in [CLAUDE.md, Abschnitt „Tasks zu Epic-Beginn anlegen (inkl. Sammeltask)"](../../CLAUDE.md#tasks-zu-epic-beginn-anlegen-inkl-sammeltask).

Skelett zu Epic-Beginn angelegt. Inhaltlich gefüllt wird der Task erst, wenn [4T-0061](4T-0061-callouts.md), [4T-0062](4T-0062-highlight.md), [4T-0063](4T-0063-footnotes.md), [4T-0064](4T-0064-block-embed-ast.md) und [4T-0065](4T-0065-hilfe-dialog-syntax-erweiterungen.md) auf „Wartet auf Test" oder „Erledigt" stehen.

## Lösungsansatz

### 1. CHANGELOG

Neuer Block ganz oben in [CHANGELOG.md](../../CHANGELOG.md):

```markdown
## [0.18.0] - JJJJ-MM-TT — Markdown-Syntax-Erweiterungen: Callouts, Highlight, Footnotes

Feature-Release. Drittes Etappenziel aus dem Meta-Plan „Obsidian-Parity-Roadmap". Epic [3E-0012](Projektmanagement/Aufgaben/3E-0012-markdown-syntax-erweiterungen.md).

### Neu
- **Callouts** (4T-0061): `> [!type] Titel`-Syntax, 10 Typen, klappbare Varianten.
- **Highlight** (4T-0062): `==Text==` als gelber Marker.
- **Footnotes** (4T-0063): `[^1]` und inline `^[Text]`.
- **Block-Embed-Erweiterung** (4T-0064): vollständige Block-Range bei `![[Datei#^id]]` (Listen-Items, Code-Blöcke, Tabellenzeilen, Blockquotes).
- **Hilfe-Dialog erweitert** (4T-0065).

### Geändert
- Versions-Bump 0.17.1 → 0.18.0.

### i18n
- N neue JSON-Keys über fünf Sprachen.
```

### 2. Release-Notes

- `dist/release-notes-0.18.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: die drei neuen Markdown-Syntaxen mit konkreten Beispielen, ergänzt um die Block-Embed-Verfeinerung.

### 3. README aktualisieren

- **Status-Sektion** auf 0.18.0 mit Beschreibung des dritten Etappenziels.
- **Markdown-Umfang**-Sektion: neue Bullets für Callouts, Highlight, Footnotes.
- **Hilfe-Dialog**-Sektion: neue Funktions-Einträge der Gruppe Bearbeitung.
- Block-Embed-Hinweis bei der bestehenden Wiki-Embed-Beschreibung ergänzen.

### 4. Test-Iteration

- `npm run build`, Portable-EXE bauen, Smoke-Test per Doppelklick.
- Test-Aufforderung mit Verifikation der vier neuen Funktionen plus README-Doku-Stand. Hilfe-Dialog-Inhalte sind bereits in 4T-0065 abgenommen.
- **Erst nach Freigabe** weiter mit Release.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md, Abschnitt „Release-Prozess"](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (Setup-EXE, Portable-EXE, `latest.yml`, Setup-Blockmap).
3. Tag: `git tag v0.18.0 <commit-sha>` und `git push origin v0.18.0`.
4. GitHub-Release: `gh release create v0.18.0 --title "v0.18.0 — Markdown-Syntax-Erweiterungen" --notes-file dist/release-notes-0.18.0.md --latest` mit den vier Asset-Dateien.

### 6. Status-Updates

- [4T-0061](4T-0061-callouts.md) bis [4T-0065](4T-0065-hilfe-dialog-syntax-erweiterungen.md) und 4T-0066 (dieser Task) auf `Erledigt`.
- Epic [3E-0012](3E-0012-markdown-syntax-erweiterungen.md) auf `Erledigt — in v0.18.0 ausgeliefert`, `Release`-Frontmatter-Zeile ergänzen.

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.18.0]` mit Verweis auf 3E-0012.
- `dist/release-notes-0.18.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion auf 0.18.0; Markdown-Umfang um Callouts, Highlight, Footnotes erweitert; Hilfe-Dialog-Sektion aktualisiert.
- `package.json` hat `version: 0.18.0`.
- Tag `v0.18.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.18.0` ist als `--latest` markiert mit allen vier Assets.
- Alle fünf vorherigen Tasks und das Epic stehen auf `Erledigt`.

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.18.0.
- `package.json` — Version 0.17.1 → 0.18.0.
- [README.md](../../README.md) — Status-Sektion, Markdown-Umfang, Hilfe-Dialog-Sektion.
- `dist/release-notes-0.18.0.md` — Release-Notes (gitignored).
