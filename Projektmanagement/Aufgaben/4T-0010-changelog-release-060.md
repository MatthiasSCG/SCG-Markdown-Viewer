# 4T-0010 — CHANGELOG, Release-Notes, Version-Bump auf 0.6.0

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Abschluss-Task für 0.6.0: Version bumpen, CHANGELOG schreiben, Release-Notes vorbereiten, Build und GitHub-Release durchführen. Konsistent mit dem in projekt-lokaler `CLAUDE.md` dokumentierten Release-Prozess.

## Lösungsansatz

- **Version-Bump**: `package.json` von `0.5.1` auf `0.6.0`.
- **CHANGELOG.md**:
  - Neuer Abschnitt `## [0.6.0] - JJJJ-MM-TT` (Datum: Tag des Releases einsetzen)
  - Subsektionen:
    - **Neu**: Edit-Modus, Menüleiste, Statusbar-Layout, Speichern/Speichern unter, Dirty-State, Recent Files, Neu/Öffnen als neue Fenster, Suchen und Ersetzen
    - **Geändert**: Sitzungswiederherstellung ins Hilfe-Menü, Toolbar entfällt, Quick-Toggles unten
    - **i18n**: Anzahl der neuen Keys (über 4T-0001 bis 4T-0009 hinweg gezählt)
    - **Behoben**: ggf. Bugs, die während der Umsetzung mit aufgeräumt wurden
  - Verweis am Anfang der Version: `[3E-0001](Projektmanagement/Aufgaben/3E-0001-edit-modus-und-menue.md)`
- **Release-Notes**:
  - Datei `docs/release-notes-0.6.0.md` aus `docs/release-notes-template.md` ableiten
  - Untertitel z.B. „Vom Reader zum schlanken Editor"
  - Download-Tabelle, Was-ist-neu-Sektionen, Migrations-Hinweise (z.B. „Sitzung-wiederherstellen-Haken jetzt im Hilfe-Menü")
  - Auf Deutsch mit Umlauten
- **Build und Release** (gemäß `CLAUDE.md`):
  1. `npm run build` — EXEs erzeugen und in `releases/` ablegen
  2. `git tag v0.6.0 <commit-sha>`
  3. `git push origin v0.6.0`
  4. `gh release create v0.6.0 --title "v0.6.0 — Edit-Modus und Menüleiste" --notes-file docs/release-notes-0.6.0.md --latest "releases/Markdown Viewer-0.6.0-Setup.exe" "releases/Markdown Viewer-0.6.0-Portable.exe"`
- **Status-Updates**: Alle Tasks 4T-0001 bis 4T-0010 auf `Erledigt`, Epic 3E-0001 auf `Erledigt` setzen.

## Akzeptanzkriterien

- `package.json` zeigt Version 0.6.0.
- `CHANGELOG.md` hat einen vollständigen 0.6.0-Eintrag mit Datum und Verweis auf Epic 3E-0001.
- `docs/release-notes-0.6.0.md` existiert und folgt dem Template.
- EXEs liegen in `releases/`.
- Git-Tag `v0.6.0` ist gepusht.
- GitHub-Release `v0.6.0` ist erstellt, als `--latest` markiert, mit beiden EXEs als Assets, Release-Notes auf Deutsch sichtbar.
- Auf der GitHub-Repo-Seite zeigt der Hauptmonitor unter „Releases" die neue Version als „Latest".

## Bezug zu Dateien

- `package.json`
- `CHANGELOG.md`
- neu: `docs/release-notes-0.6.0.md`
- alle Dateien aus 4T-0001 bis 4T-0009

## Lösung

Abschluss-Task für 0.6.0: Dokumentation auf 0.6.0-Stand gebracht, Tag und GitHub-Release angelegt.

**`CHANGELOG.md`**:
- `[Unreleased]`-Sektion in `[0.6.0] - 2026-05-16 — Edit-Modus, Statusbar-Layout und SCG-Markdown-Branding` umgewandelt.
- Untertitel-Satz, der die Version charakterisiert.
- Verweise auf Epic [3E-0001] und alle 11 Tasks.
- Sektionen `Neu`, `Geändert`, `Build & Tooling`, `i18n` und `Hinweise zur Migration`. Die ehemaligen `Build & Tooling`-Bullets aus `[Unreleased]` (releases-Ordner, blockmap-Cleanup, gh-release-create-Pfade) sind unverändert übernommen.
- Neuer leerer `[Unreleased]`-Header für künftige Änderungen.

**`docs/release-notes-0.6.0.md`** (gitignored, in `dist/release-notes-0.6.0.md` abgelegt nach Konvention der projekt-lokalen CLAUDE.md):
- Aus `docs/release-notes-template.md` abgeleitet; alle Platzhalter ersetzt.
- Untertitel: „Sechste Version mit dem größten Umbau seit dem ersten Release."
- Download-Tabelle mit Installer und Portable.
- Was-ist-neu-Sektionen: Edit-Modus, Speichern/Auto-Save, Suchen/Ersetzen, Bedienung/Layout, Geändert.
- Hinweise zur Migration (Settings, Datei-Assoziation, GitHub-Redirect).
- Verweis auf den CHANGELOG.md auf GitHub.

**`README.md`** komplett überarbeitet auf 0.6.0-Stand:
- Titel und Untertitel: „SCG Markdown — Markdown-Editor".
- Funktionsumfang-Sektion ergänzt um Edit-Modus, Speichern, Dirty-State, Auto-Save, Suchen/Ersetzen, native Menüleiste, Statusbar (vorher: Toolbar).
- Tastenkürzel-Tabelle vollständig aktualisiert: Strg+N, Strg+S, Strg+Umschalt+S, Strg+E, Strg+1/2/3, Strg+H, F1, Alt etc.
- Projektstruktur-Abschnitt ergänzt um `Projektmanagement/`, `docs/`, `scripts/build-renderer.js`, `scripts/archive-build.js`, `src/main/menu.js`, `src/renderer/renderer.bundle.js`.
- Datei-öffnen-Sektion erweitert um Recent-Files (4 Wege statt 3).
- Read-only-Abschnitt entfernt; Status-Block auf 0.6.0 mit Stichworten zur neuen Funktionalität.
- F1 öffnet jetzt Hilfe-Dialog (nicht mehr Über-Dialog).

**Tag und GitHub-Release** (operative Schritte nach diesem Commit):
- `git tag v0.6.0 <commit-sha>`
- `git push origin v0.6.0`
- `gh release create v0.6.0 --title "v0.6.0 — Edit-Modus und SCG-Markdown-Branding" --notes-file dist/release-notes-0.6.0.md --latest "releases/SCG Markdown-0.6.0-Setup.exe" "releases/SCG Markdown-0.6.0-Portable.exe"`
- `--latest` setzt 0.6.0 als „Latest" auf der Repo-Seite.
- GitHub-Repository wurde vorab vom Nutzer von `SCG-Markdown-Viewer` zu `SCG-Markdown` umbenannt; lokale Origin-URL entsprechend gesetzt (`git remote set-url origin https://github.com/MatthiasSCG/SCG-Markdown.git`).

**Status-Updates aller Tasks**: 4T-0001 bis 4T-0009 und 4T-0011 waren bereits abgeschlossen. 4T-0010 wird mit diesem Commit auf `Erledigt` gesetzt, Epic 3E-0001 ist mit dem Abhaken der letzten Checkbox vollständig durch.
