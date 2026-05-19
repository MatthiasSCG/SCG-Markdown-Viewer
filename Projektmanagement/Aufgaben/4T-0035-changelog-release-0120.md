# 4T-0035 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.12.0

**Status**: Offen
**Epic**: [3E-0006 — SCG Table](3E-0006-scg-table.md)
**Zielversion**: 0.12.0

## Warum

Abschluss-Sammeltask für das Epic [3E-0006](3E-0006-scg-table.md). Bündelt Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes, README-Update, Test-Iteration und den vollständigen Release-Prozess (Build, Commit, Tag, GitHub-Release) gemäß den Projekt-Konventionen in [CLAUDE.md](../../CLAUDE.md#abschluss-sammeltask-am-epic-ende).

Wird erst angelegt und bearbeitet, wenn [4T-0034](4T-0034-scg-table-parser.md) auf „Wartet auf Test" oder „Erledigt" steht. So bleiben Detail-Entscheidungen aus der Umsetzung im jeweiligen Umsetzungs-Task und wandern nicht vorzeitig hierhin.

## Lösungsansatz

### 1. Kurzeintrag im Hilfe-Dialog (Funktions-Gruppe „Bearbeitung")

- Neuer Feature-Eintrag `help.feature.scgTable` in allen fünf Sprachdateien:
  - [src/i18n/de.json](../../src/i18n/de.json)
  - [src/i18n/en.json](../../src/i18n/en.json)
  - [src/i18n/fr.json](../../src/i18n/fr.json)
  - [src/i18n/es.json](../../src/i18n/es.json)
  - [src/i18n/it.json](../../src/i18n/it.json)
- Beschreibung kompakt: ein Satz mit Querverweis auf den ausführlichen Hilfe-Tab. Vorschlag: „Tabellen mit mehrzeiligen Zellen über einen `scg-table`-Code-Block. Details im Hilfe-Tab „SCG Table"."
- Eintrag in `HELP_FEATURE_GROUPS` in [src/renderer/renderer.js](../../src/renderer/renderer.js) in der Gruppe **„Bearbeitung"** einsortieren.
- Kein neuer Tastenkürzel-Eintrag, weil scg-table keine Shortcut-Bindung hat.
- **Hinweis**: Der ausführliche Hilfe-Tab „SCG Table" wird in [4T-0036](4T-0036-scg-table-hilfe-tab.md) angelegt und ist nicht Bestandteil dieses Sammeltasks.

### 2. CHANGELOG ergänzen

In [CHANGELOG.md](../../CHANGELOG.md) ganz oben neuen Block:

```markdown
## [0.12.0] - JJJJ-MM-TT — SCG Table

Epic [3E-0006](Projektmanagement/Aufgaben/3E-0006-scg-table.md).

### Neu
- **SCG-Tabellen** (4T-0034): Fenced-Code-Block mit Sprach-Tag `scg-table` rendert
  MediaWiki-ähnliche Tabellen mit mehrzeiligen Block-Zellen (geschachtelte Listen,
  Absätze, Code-Blocks innerhalb der Zellen). Eingebettet als Code-Block bleibt
  der Inhalt in fremden Markdown-Renderern als lesbarer Code-Block sichtbar.
- **Hilfe-Tab „SCG Table"** (4T-0036): Ausführliche Doku zur scg-table-Syntax mit
  Beispielen, Tipps und Portabilitäts-Hinweis als dritter Tab im Hilfe-Dialog
  neben „Funktionen" und „Tastenkürzel".

### i18n
- 1 neuer Feature-Key (`help.feature.scgTable`) und 1 neuer Tab-Key
  (`help.tab.scgTable`) in allen fünf Sprachen.
- 5 neue Hilfe-Markdown-Dateien (`src/i18n/help/scg-table.{de,en,fr,es,it}.md`)
  mit dem Tab-Inhalt.
```

### 3. Release-Notes erzeugen

- `dist/release-notes-0.12.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten (gitignored).
- Schwerpunkt: scg-table-Funktion mit kompaktem Syntax-Beispiel.
- Standard-Abschnitte: Download-Tabelle, „Was ist neu seit v0.11.0", System-Anforderungen, SmartScreen-Hinweis, Link zum CHANGELOG.

### 4. README aktualisieren

- Status-Sektion (vorletztes Kapitel in [README.md](../../README.md)) auf 0.12.0 umschreiben. Ein bis zwei Sätze über den Release-Schwerpunkt scg-table.
- Tastenkürzel-Tabelle bleibt unverändert (keine neuen Shortcuts).
- EXE-Dateinamen sind versionsfrei mit `<version>` notiert, brauchen keine Pflege.

### 5. Test-Iteration mit dem Nutzer

- `npm run build` ausführen.
- Smoke-Test der Portable-EXE per Doppelklick durch den Implementierenden (per [CLAUDE.md](../../CLAUDE.md#test-phase-exe-build-vor-jeder-test-aufforderung) bei Änderungen an Preload).
- Test-Aufforderung an Nutzer:
  - Hilfe-Dialog: neuer scg-table-Eintrag in allen fünf Sprachen sichtbar und verständlich?
  - Beispiel-Tabellen (Liste, Code-Block, mehrere Absätze in Zellen) rendern wie erwartet?
  - CHANGELOG- und README-Status-Sektion sitzen?
- **Erst nach Freigabe** weiter mit Release-Schritt.

### 6. Commit, Tag, GitHub-Release

Gemäß [CLAUDE.md — Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. Commit aller Doku-Änderungen.
2. `npm run build` (erzeugt Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap` in `releases/`).
3. Tag: `git tag v0.12.0 <commit-sha>` und `git push origin v0.12.0`.
4. GitHub-Release: `gh release create v0.12.0 --title "v0.12.0 — SCG Table" --notes-file dist/release-notes-0.12.0.md --latest` mit allen vier Asset-Dateien (Setup, Portable, `latest.yml`, `*.blockmap`).

### 7. Status-Updates

Nach erfolgreichem Release alle zugehörigen Vorgänge auf `Erledigt`:

- [4T-0034](4T-0034-scg-table-parser.md)
- [4T-0036](4T-0036-scg-table-hilfe-tab.md)
- 4T-0035 (dieser Task)
- [3E-0006](3E-0006-scg-table.md)

## Akzeptanzkriterien

- Hilfe-Dialog enthält den neuen Feature-Eintrag `help.feature.scgTable` in allen fünf Sprachen, einsortiert in die Gruppe „Bearbeitung", mit Querverweis auf den separaten Hilfe-Tab „SCG Table" (eigentlicher Tab ist Bestandteil von 4T-0036, nicht dieses Sammeltasks).
- [CHANGELOG.md](../../CHANGELOG.md) hat neuen Block `## [0.12.0]` mit Verweis auf 3E-0006.
- `dist/release-notes-0.12.0.md` existiert und folgt der Template-Struktur.
- README-Status-Sektion ist auf 0.12.0 mit kurzem Hinweis auf scg-table umgeschrieben.
- `package.json` hat `version: 0.12.0`.
- Tag `v0.12.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.12.0` ist als `--latest` markiert mit allen vier Assets (Setup-EXE, Portable-EXE, `latest.yml`, `*.blockmap`).
- Update-Erkennung der installierten Vorversion 0.11.0 erkennt 0.12.0 als neue Version (regulärer Check über das `electron-updater`-Setup aus 4T-0029, manuelle Validierung nur stichprobenartig).

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — `HELP_FEATURE_GROUPS` um scg-table-Eintrag erweitern.
- [src/i18n/{de,en,fr,es,it}.json](../../src/i18n) — neuer Help-Feature-Key `help.feature.scgTable`.
- [CHANGELOG.md](../../CHANGELOG.md) — neuer Block für 0.12.0.
- `package.json` — Version 0.11.0 → 0.12.0.
- [README.md](../../README.md) — Status-Sektion auf 0.12.0.
- `dist/release-notes-0.12.0.md` — Release-Notes für GitHub-Release (gitignored, taucht im Repo nicht auf).

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
