# 4T-0053 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.16.0

**Status**: Offen
**Epic**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md)
**Zielversion**: 0.16.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0010](3E-0010-frontmatter-aliases-properties.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess gemäß den Projekt-Konventionen in [CLAUDE.md, Abschnitt „Abschluss-Sammeltask am Epic-Ende"](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst bearbeitet, wenn [4T-0049](4T-0049-frontmatter-erkennung.md), [4T-0050](4T-0050-aliases-aufloesung.md), [4T-0051](4T-0051-properties-editor.md) und [4T-0052](4T-0052-hilfe-dialog-frontmatter-properties.md) auf „Wartet auf Test" oder „Erledigt" stehen.

## Lösungsansatz

### 1. CHANGELOG

Neuer Block ganz oben in [CHANGELOG.md](../../CHANGELOG.md):

```markdown
## [0.16.0] - JJJJ-MM-TT — Frontmatter, Aliases und Properties

Feature-Release. Epic [3E-0010](Projektmanagement/Aufgaben/3E-0010-frontmatter-aliases-properties.md).

### Neu
- **Frontmatter-Erkennung** (4T-0049): YAML-Block am Datei-Anfang wird erkannt und vom Render-Pane ausgeklammert; Source-Pane zeigt ihn visuell abgesetzt.
- **Aliases-Auflösung in Wiki-Links und Backlinks** (4T-0050): `aliases:`-Einträge machen eine Datei unter mehreren Namen verlinkbar.
- **Properties-Editor** (4T-0051): Form-Dialog für Frontmatter-Felder mit typisierten Eingaben (String, Liste, Datum, Number, Boolean).
- **Hilfe-Dialog erweitert** (4T-0052): drei neue Funktions-Einträge.

### Geändert
- Versions-Bump 0.15.0 → 0.16.0.

### i18n
- N neue JSON-Keys über fünf Sprachen.
```

### 2. Release-Notes

- `dist/release-notes-0.16.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: die drei neuen Funktionen mit knappen Beispielen (z.B. Frontmatter-Block mit `aliases:`, Properties-Dialog-Screenshot oder Beschreibung).
- System-Anforderungen-Sektion und SmartScreen-Hinweis aus Template übernehmen.
- Migrations-Hinweis: bestehende Dateien mit `---`-Block am Anfang werden ab 0.16.0 nicht mehr als horizontale Linie gerendert.

### 3. README aktualisieren

Gemäß [CLAUDE.md, Abschnitt „Abschluss-Sammeltask"](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende) Punkt 4:

- **Status-Sektion** auf 0.16.0 mit kurzem Hinweis auf Frontmatter, Aliases, Properties. Aufsetzend-auf-Kette um 0.15.0-Schritt ergänzen.
- **`### Markdown-Umfang`**: neuer Punkt zu Frontmatter (oder Erweiterung des Wiki-Link-Punkts um Aliases).
- **`### Hilfe-Dialog`**: bestehende Tab-Struktur passt; ggf. Hinweis auf die neuen Funktions-Einträge.
- **Funktionsumfang-Hauptkapitel**: neue Sub-Sektion „Frontmatter und Properties" oder Erweiterung einer bestehenden, je nach Stil. Entscheidung beim Task-Start.
- **Tastenkürzel-Tabelle**: ergänzen, falls in 4T-0051 ein Hotkey für Properties-Editor festgelegt wurde (z.B. `Strg+;`).

### 4. Test-Iteration mit dem Nutzer

- `npm run build`, Portable-EXE bauen.
- Smoke-Test der EXE per Doppelklick (per [CLAUDE.md, Abschnitt „EXE-Build vor jeder Test-Aufforderung"](../../CLAUDE.md#test-phase-exe-build-vor-jeder-test-aufforderung) bei Preload-, Main- oder Build-Änderungen).
- Test-Aufforderung an Nutzer mit Verifikation aller drei Funktionen plus Hilfe-Dialog-Inhalte plus Doku-Stand.
- **Erst nach Freigabe** weiter mit Release.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md, Abschnitt „Release-Prozess"](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen mit Subject-Form `4T-0053: Doku-Stand fuer 0.16.0 (Epic 3E-0010 abgeschlossen)`.
2. `npm run build` (erzeugt Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap`).
3. Tag: `git tag v0.16.0 <commit-sha>` und `git push origin v0.16.0`.
4. GitHub-Release: `gh release create v0.16.0 --title "v0.16.0 — Frontmatter, Aliases und Properties" --notes-file dist/release-notes-0.16.0.md --latest` mit allen vier Asset-Dateien (Setup-EXE, Portable-EXE, `latest.yml`, Setup-Blockmap).

### 6. Status-Updates

- [4T-0049](4T-0049-frontmatter-erkennung.md), [4T-0050](4T-0050-aliases-aufloesung.md), [4T-0051](4T-0051-properties-editor.md), [4T-0052](4T-0052-hilfe-dialog-frontmatter-properties.md), 4T-0053 (dieser Task) auf `Erledigt`.
- Epic [3E-0010](3E-0010-frontmatter-aliases-properties.md) auf `Erledigt`.

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.16.0]` mit Verweis auf 3E-0010.
- `dist/release-notes-0.16.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion auf 0.16.0; Funktionsumfang um Frontmatter, Aliases, Properties erweitert.
- `package.json` hat `version: 0.16.0`.
- Tag `v0.16.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.16.0` ist als `--latest` markiert mit allen vier Assets.
- Alle vier vorherigen Tasks und das Epic stehen auf `Erledigt`.

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.16.0.
- `package.json` — Version 0.15.0 → 0.16.0.
- [README.md](../../README.md) — Status-Sektion, Funktionsumfang, ggf. Tastenkürzel-Tabelle.
- `dist/release-notes-0.16.0.md` — Release-Notes (gitignored).

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
