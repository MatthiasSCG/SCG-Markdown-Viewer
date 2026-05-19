# 4T-0043 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.14.0

**Status**: Offen
**Epic**: [3E-0008 — SCG Table Stufe 3](3E-0008-scg-table-konverter-verschachtelung.md)
**Zielversion**: 0.14.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0008](3E-0008-scg-table-konverter-verschachtelung.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess gemäß den Projekt-Konventionen in [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst bearbeitet, wenn [4T-0040](4T-0040-scg-table-verschachtelung.md), [4T-0041](4T-0041-scg-table-html-konverter.md) und [4T-0042](4T-0042-scg-table-hilfe-tab-stufe-3.md) auf „Wartet auf Test" oder „Erledigt" stehen.

## Lösungsansatz

### 1. CHANGELOG

Neuer Block ganz oben in [CHANGELOG.md](../../CHANGELOG.md):

```markdown
## [0.14.0] - JJJJ-MM-TT — SCG Table: Verschachtelung und HTML-Export

Epic [3E-0008](Projektmanagement/Aufgaben/3E-0008-scg-table-konverter-verschachtelung.md).

### Neu
- **Verschachtelte SCG-Tabellen** (4T-0040): bis zu 3 Ebenen tief.
- **HTML-Konverter** (4T-0041): Menü „Datei → Exportieren → Portables Markdown…" ersetzt scg-table-Codeblocks durch inline HTML-Tabellen für Portabilität in fremden Renderern.
- **Hilfe-Tab erweitert** (4T-0042): neue Sektion „Verschachtelte Tabellen und HTML-Export".

### Geändert
- Versions-Bump 0.13.0 → 0.14.0.

### i18n
- 2 neue JSON-Keys (`menu.file.export`, `menu.file.exportPortable`) in allen fünf Sprachen.
- Hilfe-Markdown-Dateien um Verschachtelung-und-HTML-Export-Sektion erweitert.
```

### 2. Release-Notes

- `dist/release-notes-0.14.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: Verschachtelung und HTML-Export, mit kompaktem Syntax- und Bedienungs-Beispiel.
- Standard-Abschnitte: Download-Tabelle, „Was ist neu seit v0.13.0", System-Anforderungen, SmartScreen-Hinweis, Hinweis zur Rückwärtskompatibilität.

### 3. README aktualisieren

Gemäß [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende) Punkt 4:

- **Status-Sektion** (vorletztes Kapitel) auf 0.14.0 mit kurzem Hinweis auf Verschachtelung und Export-Funktion.
- **`### Markdown-Umfang`**: SCG-Table-Bullet ggf. um Hinweis auf Verschachtelung und Export erweitern.
- **`### Hilfe-Dialog`**: bestehende Tab-Beschreibung passt vermutlich; prüfen.
- **`### Datei öffnen`** / **`### Native Menüleiste`** / Funktionsumfang-Sektionen: prüfen, ob die neue Export-Funktion an einer dieser Stellen genannt werden sollte. Vorschlag: kompakter Hinweis im SCG-Table-Markdown-Umfang-Bullet (zum Stichwort „Export") reicht, kein separater Funktionsumfang-Abschnitt.
- **Tastenkürzel-Tabelle**: keine Änderungen (keine neuen Bindings).

### 4. Test-Iteration mit dem Nutzer

- `npm run build`, Portable-EXE bauen.
- Smoke-Test der EXE per Doppelklick (per CLAUDE.md bei Preload-/Menü-Änderungen).
- Test-Aufforderung an Nutzer:
  - CHANGELOG inhaltlich korrekt?
  - README-Status-Sektion und Markdown-Umfang-Bullet passend?
  - Release-Notes inhaltlich passend?
- **Erst nach Freigabe** weiter mit Release.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md — Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (erzeugt Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap`).
3. Tag: `git tag v0.14.0 <commit-sha>` und `git push origin v0.14.0`.
4. GitHub-Release: `gh release create v0.14.0 --title "v0.14.0 — SCG Table: Verschachtelung und HTML-Export" --notes-file dist/release-notes-0.14.0.md --latest` mit allen vier Asset-Dateien.

### 6. Status-Updates

- [4T-0040](4T-0040-scg-table-verschachtelung.md), [4T-0041](4T-0041-scg-table-html-konverter.md), [4T-0042](4T-0042-scg-table-hilfe-tab-stufe-3.md), 4T-0043 (dieser Task) auf `Erledigt`.
- Epic [3E-0008](3E-0008-scg-table-konverter-verschachtelung.md) auf `Erledigt`.

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.14.0]` mit Verweis auf 3E-0008.
- `dist/release-notes-0.14.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion auf 0.14.0; Markdown-Umfang-Bullet ggf. ergänzt.
- `package.json` hat `version: 0.14.0`.
- Tag `v0.14.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.14.0` ist als `--latest` markiert mit allen vier Assets.

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.14.0.
- `package.json` — Version 0.13.0 → 0.14.0.
- [README.md](../../README.md) — Status-Sektion, ggf. Markdown-Umfang.
- `dist/release-notes-0.14.0.md` — Release-Notes (gitignored).

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
