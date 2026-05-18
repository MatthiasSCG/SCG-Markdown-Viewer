# 4T-0026 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.8.0

**Status**: Erledigt
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Abschluss-Task für 0.8.0. Die Umsetzungs-Tasks 4T-0013 bis 4T-0015 sind durch; jetzt müssen Hilfe-Dialog, CHANGELOG und Release-Notes auf den neuen Stand gebracht, das Tag gesetzt und das GitHub-Release angelegt werden. Konsequent zum bisherigen Release-Prozess (siehe projekt-lokale `CLAUDE.md`) und zum Vorbild aus 4T-0010.

## Lösungsansatz

### Hilfe-Dialog erweitern

Drei neue Funktionen und mehrere neue Shortcuts ergänzen — i18n-Keys in allen fünf Sprachen, plus Einträge in `HELP_FEATURES` und `HELP_SHORTCUTS` in [src/renderer/renderer.js](src/renderer/renderer.js).

**Neue Funktionen** (Funktions-Liste):

- Heading- und Block-Folding mit Hierarchie-Spuren im Quellcode-Pane (4T-0013).
- Inhaltsverzeichnis-Sidebar mit Sprung-Klick und Folding-Sync (4T-0014).
- Backlinks-Sidebar mit Wiki- und Markdown-Link-Erkennung im Datei-Ordner plus zwei Unterordner-Ebenen (4T-0015).
- Gliederungs-Toggle, Inhaltsverzeichnis-Toggle, Backlinks-Toggle pro Spalte (Status persistent).
- `#anker`-Links innerhalb eines Dokuments funktionieren im Render-Pane (Seiteneffekt von 4T-0014).

**Neue Shortcuts** (Tastenkürzel-Tabelle):

- `Strg+Umschalt+[` — Heading-/Block-Region am Cursor einklappen.
- `Strg+Umschalt+]` — Region am Cursor entfalten.
- `Strg+Umschalt+O` — Inhaltsverzeichnis-Sidebar der aktiven Spalte umschalten.
- `Strg+Umschalt+B` — Backlinks-Sidebar der aktiven Spalte umschalten.

i18n-Keys neu: `help.feature.folding`, `help.feature.outline`, `help.feature.backlinks`, `help.feature.toggles08`, `help.feature.anchorLinks` (oder ähnlich, beim Schreiben final benennen); `help.shortcut.foldRegion`, `help.shortcut.unfoldRegion`, `help.shortcut.toggleOutline`, `help.shortcut.toggleBacklinks`.

### CHANGELOG.md

Neuer Abschnitt `## [0.8.0] - JJJJ-MM-TT — Strukturnavigation` am Anfang des CHANGELOG. Verweis auf Epic 3E-0002 im Untertitel-Absatz.

Subsektionen:

- **Neu**:
  - Heading- und Block-Folding mit Hierarchie-Spuren (4T-0013).
  - Inhaltsverzeichnis-Sidebar pro Spalte mit Sprung-Klick und Folding-Sync (4T-0014).
  - Backlinks-Sidebar pro Spalte mit Tiefen-begrenzter Indexierung (4T-0015).
  - Drei neue Statusbar-Toggles und Menüpunkte: Inhalt, Backlinks, Gliederung.
- **Behoben**:
  - `[Text](#slug)`-Anker-Links innerhalb eines Markdown-Dokuments funktionieren im Render-Pane (war seit Release 0.1 latent, repariert durch Einbindung von `markdown-it-anchor` für 4T-0014).
- **i18n**: ca. 25 neue Keys über alle fünf Sprachen, betroffen die Outline-, Backlinks- und Folding-Toggle-Bezeichnungen sowie Empty-States und Status-Hinweise.

### Release-Notes

Datei `dist/release-notes-0.8.0.md` aus `docs/release-notes-template.md` ableiten (Pfad `dist/` ist gitignored, gemäß projekt-lokaler `CLAUDE.md`):

- **Untertitel**: ein Satz, was 0.8.0 besonders macht (Vorschlag: „Strukturnavigation: Folding, Inhaltsverzeichnis und Backlinks").
- **Download**: Tabelle mit Setup-EXE und Portable-EXE.
- **Was ist neu seit v0.7.1**: drei Hauptsektionen für Folding, Outline, Backlinks plus ein Behoben-Block für die Anker-Links.
- **System-Anforderungen**: unverändert.
- **Hinweise**: SmartScreen-Warnung, keine Migrations-Schritte nötig (Sidebars sind initial versteckt).
- **Link auf CHANGELOG.md** am Ende.

Stil und Tonalität wie bei den bisherigen Release-Notes (`gh release view v0.7.1` als aktuelle Referenz).

### Version-Bump

`package.json` zeigt bereits 0.8.0 (gemäß Konvention seit Entwicklungsbeginn der Version). Hier kein Code-Bump nötig, nur Bestätigung.

### Build und GitHub-Release

Gemäß projekt-lokaler `CLAUDE.md`:

1. `npm run build` — EXEs erzeugen, `postbuild`-Hook verschiebt sie nach `releases/`.
2. `git tag v0.8.0 <commit-sha>` (commit-sha des Release-Commits).
3. `git push origin v0.8.0`.
4. `gh release create v0.8.0 --title "v0.8.0 — Strukturnavigation" --notes-file dist/release-notes-0.8.0.md --latest "releases/SCG Markdown-0.8.0-Setup.exe" "releases/SCG Markdown-0.8.0-Portable.exe"`.

### Status-Updates

- 4T-0013, 4T-0014, 4T-0015, 4T-0026 auf `Erledigt`.
- 3E-0002 auf `Erledigt`.

## Akzeptanzkriterien

- Hilfe-Dialog (`?`-Button in der Toolbar bzw. via Menü) zeigt im Funktions-Block die neuen 0.8.0-Features und in der Tastenkürzel-Tabelle die vier neuen Bindings, in allen fünf Sprachen.
- `CHANGELOG.md` hat einen vollständigen 0.8.0-Eintrag mit Datum, Untertitel und Verweis auf 3E-0002.
- `dist/release-notes-0.8.0.md` existiert, folgt der Template-Struktur, auf Deutsch mit Umlauten.
- EXEs liegen in `releases/`.
- Git-Tag `v0.8.0` ist gepusht.
- GitHub-Release `v0.8.0` ist erstellt, als `--latest` markiert, mit beiden EXEs als Assets.
- Auf der GitHub-Repo-Seite zeigt „Releases" die neue Version als „Latest".

## Bezug zu Dateien

- `CHANGELOG.md`
- neu: `dist/release-notes-0.8.0.md` (gitignored, taucht nicht im Repo auf)
- `src/renderer/renderer.js` (Hilfe-Dialog-Inhalte)
- `src/i18n/{de,en,fr,es,it}.json` (neue Hilfe-Keys)
- `package.json` (bereits 0.8.0, nur Verifikation)

## Lösung

**CLAUDE.md** — neuer Abschnitt `## Abschluss-Sammeltask am Epic-Ende` vor dem bestehenden Release-Prozess-Abschnitt, der die Methodik (wann anlegen, wann ausführen, Standard-Inhalte, Reihenfolge) festhält und auf die historischen Vorbilder 4T-0010 und 4T-0026 verweist. Der nachfolgende Release-Prozess-Abschnitt wurde mit einem Verweis auf den Sammeltask eingeleitet.

**Hilfe-Dialog** in `src/renderer/renderer.js`:

- Vier neue Funktions-Einträge in `HELP_FEATURES`: `help.feature.foldGutter`, `help.feature.outline`, `help.feature.backlinks`, `help.feature.anchorLinks`.
- Vier neue Shortcut-Einträge in `HELP_SHORTCUTS`: `Strg+Umschalt+O` (Outline), `Strg+Umschalt+B` (Backlinks), `Strg+Umschalt+[` (Region einklappen), `Strg+Umschalt+]` (Region entfalten) mit zugehörigen i18n-Keys.

**i18n** (`src/i18n/{de,en,fr,es,it}.json`):

- 4 neue `help.feature.*`-Keys und 4 neue `help.shortcut.*`-Keys pro Sprache (20 Keys über alle fünf Sprachen).

**CHANGELOG.md** — neuer Block `## [0.8.0] - 2026-05-18 — Strukturnavigation: Folding, Inhaltsverzeichnis und Backlinks` mit Verweis auf 3E-0002 und Sektionen `Neu`, `Geändert`, `Behoben`, `i18n`. Die Behoben-Sektion adressiert den seit Release 0.1 latent kaputten `[Text](#slug)`-Bug.

**Release-Notes** `dist/release-notes-0.8.0.md` — aus `docs/release-notes-template.md` abgeleitet, drei Was-ist-neu-Sektionen (Folding, Outline, Backlinks), plus Geändert und Behoben. Datei-Pfad in `dist/` wegen `.gitignore` (Konvention aus `CLAUDE.md`).

**Build + Tag + GitHub-Release** gemäß `CLAUDE.md`-Abschnitt „Release-Prozess":

1. `npm run build` — EXEs unter `releases/` archiviert.
2. Commit + Push des Doku-Stands.
3. `git tag v0.8.0` auf dem Doku-Commit, `git push origin v0.8.0`.
4. `gh release create v0.8.0 --title "v0.8.0 — Strukturnavigation" --notes-file dist/release-notes-0.8.0.md --latest "releases/SCG Markdown-0.8.0-Setup.exe" "releases/SCG Markdown-0.8.0-Portable.exe"`.

**Status-Updates**: 4T-0013, 4T-0014, 4T-0015, 4T-0026 und das Epic 3E-0002 alle auf `Erledigt`.
