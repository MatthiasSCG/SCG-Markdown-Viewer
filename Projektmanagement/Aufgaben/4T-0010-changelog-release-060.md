# 4T-0010 — CHANGELOG, Release-Notes, Version-Bump auf 0.6.0

**Status**: Offen
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

(Wird nach Umsetzung ausgefüllt.)
