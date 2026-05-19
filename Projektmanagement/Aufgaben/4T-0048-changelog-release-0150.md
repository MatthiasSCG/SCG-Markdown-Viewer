# 4T-0048 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.15.0

**Status**: Offen
**Epic**: [3E-0009 — SCG Table Stufe 4](3E-0009-scg-table-sortierung-status.md)
**Zielversion**: 0.15.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0009](3E-0009-scg-table-sortierung-status.md). Bündelt CHANGELOG-Eintrag, Release-Notes, README-Update und den vollständigen Release-Prozess gemäß den Projekt-Konventionen in [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst bearbeitet, wenn [4T-0044](4T-0044-scg-table-status-hervorhebung.md), [4T-0045](4T-0045-scg-table-spalten-default.md), [4T-0046](4T-0046-scg-table-sortierbar.md) und [4T-0047](4T-0047-scg-table-hilfe-tab-stufe-4.md) auf „Wartet auf Test" oder „Erledigt" stehen.

## Lösungsansatz

### 1. CHANGELOG

Neuer Block ganz oben in [CHANGELOG.md](../../CHANGELOG.md):

```markdown
## [0.15.0] - JJJJ-MM-TT — SCG Table: Sortierung, Status-Hervorhebung und Spalten-Default

Epic [3E-0009](Projektmanagement/Aufgaben/3E-0009-scg-table-sortierung-status.md).

### Neu
- **Status-Hervorhebung** (4T-0044): Semantische Klassen `error`/`warn`/`ok`/`info`/`neutral` über Punkt-Notation am Zell-/Zeilen-Marker.
- **Spalten-Default-Ausrichtung** (4T-0045): `{|+cols="left center right"` als Tabellen-Header-Attribut.
- **Sortierbare Tabellen** (4T-0046): `{|+sortable` mit Click-Handler, Sort-Indikator-Icons und numerischer/Locale-basierter Heuristik.
- **Hilfe-Tab erweitert** (4T-0047): neue Sektion „Sortierung, Status-Hervorhebung und Spalten-Default"; Funktions-Eintrag in „Bearbeitung".

### Geändert
- Versions-Bump 0.14.0 → 0.15.0.

### i18n
- N neue JSON-Keys (Status-Klassen-Labels, ggf. Sort-Indikator-Tooltips, scgTableExtended).
- Hilfe-Markdown-Dateien um Sortierung-Status-Default-Sektion erweitert.
```

### 2. Release-Notes

- `dist/release-notes-0.15.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: die drei neuen Funktionen mit Beispielen.

### 3. README aktualisieren

Gemäß [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende) Punkt 4:

- **Status-Sektion** auf 0.15.0 mit kurzem Hinweis auf die drei neuen Funktionen.
- **`### Markdown-Umfang`**: SCG-Table-Bullet ggf. um Hinweise auf Sortierung, Status-Hervorhebung, Spalten-Default erweitern.
- **`### Hilfe-Dialog`**: bestehende Beschreibung passt vermutlich; prüfen.
- **Tastenkürzel-Tabelle**: keine Änderungen (keine neuen Bindings).

### 4. Test-Iteration mit dem Nutzer

- `npm run build`, Portable-EXE bauen.
- Smoke-Test der EXE per Doppelklick (per CLAUDE.md bei Preload-/Menü-/Renderer-Änderungen).
- Test-Aufforderung an Nutzer mit Verifikation aller drei Funktionen plus Hilfe-Tab-Inhalt.
- **Erst nach Freigabe** weiter mit Release.

### 5. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md — Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (erzeugt Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap`).
3. Tag: `git tag v0.15.0 <commit-sha>` und `git push origin v0.15.0`.
4. GitHub-Release: `gh release create v0.15.0 --title "v0.15.0 — SCG Table: Sortierung, Status-Hervorhebung und Spalten-Default" --notes-file dist/release-notes-0.15.0.md --latest` mit allen vier Asset-Dateien.

### 6. Status-Updates

- [4T-0044](4T-0044-scg-table-status-hervorhebung.md), [4T-0045](4T-0045-scg-table-spalten-default.md), [4T-0046](4T-0046-scg-table-sortierbar.md), [4T-0047](4T-0047-scg-table-hilfe-tab-stufe-4.md), 4T-0048 (dieser Task) auf `Erledigt`.
- Epic [3E-0009](3E-0009-scg-table-sortierung-status.md) auf `Erledigt`.

## Akzeptanzkriterien

- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.15.0]` mit Verweis auf 3E-0009.
- `dist/release-notes-0.15.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion auf 0.15.0; Markdown-Umfang-Bullet ggf. ergänzt.
- `package.json` hat `version: 0.15.0`.
- Tag `v0.15.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.15.0` ist als `--latest` markiert mit allen vier Assets.

## Bezug zu Dateien

- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.15.0.
- `package.json` — Version 0.14.0 → 0.15.0.
- [README.md](../../README.md) — Status-Sektion, ggf. Markdown-Umfang.
- `dist/release-notes-0.15.0.md` — Release-Notes (gitignored).

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
