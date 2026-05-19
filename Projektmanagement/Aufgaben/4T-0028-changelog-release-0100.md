# 4T-0028 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.10.0

**Status**: Offen
**Epic**: [3E-0004 — Render-Lift und Export: Mermaid, KaTeX, Syntax-Highlighting, PDF](3E-0004-render-lift-und-export.md)
**Zielversion**: 0.10.0

## Warum

Abschluss-Sammeltask für 0.10.0. Die Umsetzungs-Tasks 4T-0021 (Mermaid),
4T-0022 (KaTeX) und 4T-0023 (Syntax-Highlighting) sind durch. [4T-0024](4T-0024-pdf-export.md)
(PDF-Export) wurde während der Umsetzung zurückgestellt und vollständig zurückgebaut,
der Stand ist im Task ausführlich dokumentiert. Jetzt müssen Hilfe-Dialog,
CHANGELOG und Release-Notes auf den neuen Stand gebracht, das Tag `v0.10.0`
gesetzt und das GitHub-Release angelegt werden. Konsequent zum Release-Prozess
in der projekt-lokalen [CLAUDE.md](../../CLAUDE.md) und zu den Vorbildern
[4T-0010](4T-0010-changelog-release-060.md) (0.6.0) und
[4T-0026](4T-0026-changelog-release-080.md) (0.8.0).

## Lösungsansatz

### Hilfe-Dialog erweitern

Drei neue Funktionen ergänzen — i18n-Keys in allen fünf Sprachen, plus Einträge
in `HELP_FEATURE_GROUPS` in [src/renderer/renderer.js](../../src/renderer/renderer.js).
**Keine neuen Shortcuts** im Release, daher keine Erweiterung der Tastenkürzel-Tabelle.

**Neue Funktionen** (Funktions-Liste, Gruppe „Ansicht"):

- Mermaid-Diagramme im Render-Pane (Fenced-Code-Blöcke mit `mermaid`-Tag werden
  als SVG-Diagramme gerendert; 4T-0021).
- KaTeX-Mathematik im Render-Pane (Inline `$…$` und Block `$$…$$`; 4T-0022).
- Syntax-Highlighting für Code-Blöcke im Render-Pane (Sprach-Tag-basiert,
  GitHub-Palette in Light und Dark; 4T-0023).

i18n-Keys neu: `help.feature.mermaid`, `help.feature.katex`,
`help.feature.codeHighlight`.

### CHANGELOG.md

Neuer Abschnitt `## [0.10.0] - JJJJ-MM-TT — Render-Lift` am Anfang des CHANGELOG.
Verweis auf Epic 3E-0004 im Untertitel-Absatz, plus expliziter Hinweis, dass
4T-0024 (PDF-Export) während der Umsetzung zurückgestellt wurde.

Subsektionen:

- **Neu**: Mermaid, KaTeX, Syntax-Highlighting — jeweils mit kurzer Funktionsbeschreibung.
- **Geändert**: Versions-Bump 0.9.0 → 0.10.0; build-renderer-Pipeline erweitert
  (`scripts/build-hljs-themes.js`, `scripts/build-katex-assets.js`,
  `scripts/build-mermaid.js`).
- **Zurückgestellt**: 4T-0024 PDF-Export — Begründung kurz, Verweis auf den
  Task für Details.
- **i18n**: Anzahl der neuen Schlüssel pro Sprache (Hilfe-Dialog-Erweiterung).

### Release-Notes

`dist/release-notes-0.10.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md)
ableiten. Auf Deutsch mit Umlauten, sektioniert wie das Template vorsieht.

Inhaltliche Sektionen:

- **Untertitel**: „Render-Lift — Mermaid, Mathematik und Code-Farben"
- **Download**: Setup-EXE und Portable-EXE wie üblich.
- **Was ist neu seit v0.9.0**: drei Hauptthemen (Mermaid, KaTeX, Highlight),
  jeweils mit ein bis zwei Sätzen Erklärung und einem konkreten Beispiel.
- **Zurückgestellt**: kurzer Hinweis zu PDF-Export, dass das Feature für einen
  späteren Release verschoben wurde.
- **System-Anforderungen**, **Hinweise** (SmartScreen) wie in bisherigen Releases.
- **Link zum CHANGELOG.md**.

### README.md aktualisieren

- **Status-Sektion** (vorletztes Kapitel): auf 0.10.0 umschreiben, ein bis zwei
  Sätze zum Render-Lift-Schwerpunkt.
- **Tastenkürzel-Tabelle**: keine Erweiterung nötig (keine neuen Shortcuts in 0.10.0).
- **EXE-Dateinamen**: durch `<version>`-Platzhalter versionsfrei, keine Pflege.
- Falls die README eine „Geplant"-Sektion enthält: PDF-Export dort als zurückgestellt
  vermerken (statt aus der Liste streichen — kommt später wieder rein).

### Test-Iteration mit dem Nutzer

Vor Commit und Tag eine finale EXE bauen und den Nutzer prüfen lassen:

- Hilfe-Dialog enthält die drei neuen Feature-Einträge in allen fünf Sprachen.
- Release-Notes lesen sich rund.
- README-Status-Sektion stimmt.

Erst nach Freigabe weiter zu Commit + Tag + Release.

### Commit, Tag und GitHub-Release

Gemäß [CLAUDE.md → Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. `npm run build` — EXEs in `releases/` (Portable und Setup).
2. Commit der Doku-Änderungen (Hilfe-Dialog, CHANGELOG, README) — Doku-Stand auf 0.10.0.
3. `git tag v0.10.0 <commit-sha>` und `git push origin v0.10.0`.
4. `gh release create v0.10.0 --title "v0.10.0 — Render-Lift" --notes-file dist/release-notes-0.10.0.md --latest "releases/SCG Markdown-0.10.0-Setup.exe" "releases/SCG Markdown-0.10.0-Portable.exe"`.

### Status-Updates

Nach erfolgreichem Release:

- 4T-0021, 4T-0022, 4T-0023: Status auf `Erledigt`.
- 4T-0028 selbst: Status auf `Erledigt`.
- 3E-0004: Status auf `Teilweise erledigt (PDF-Export verschoben)` — Epic
  bleibt nicht vollständig zu, weil 4T-0024 offen ist und in einem späteren
  Release nachgeholt wird.

## Akzeptanzkriterien

- Hilfe-Dialog zeigt die drei neuen Features in allen fünf Sprachen, in der
  Gruppe „Ansicht".
- CHANGELOG enthält den 0.10.0-Block mit den richtigen Subsektionen, inkl.
  Hinweis auf das zurückgestellte 4T-0024.
- `dist/release-notes-0.10.0.md` existiert und passt zum CHANGELOG.
- README-Status-Sektion ist auf 0.10.0 und nennt den Render-Lift-Schwerpunkt
  plus Hinweis zum verschobenen PDF-Export.
- Tag `v0.10.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.10.0 — Render-Lift` ist als „Latest" angelegt, mit beiden
  EXEs als Asset.
- Status-Werte der vier Tasks (4T-0021/22/23/28) und des Epics 3E-0004 sind
  konsistent gesetzt.

## Bezug zu Dateien

- `src/renderer/renderer.js` — `HELP_FEATURE_GROUPS` um drei neue Einträge erweitern.
- `src/i18n/{de,en,fr,es,it}.json` — drei neue `help.feature.*`-Keys pro Sprache.
- `CHANGELOG.md` — neuer 0.10.0-Block.
- `README.md` — Status-Sektion auf 0.10.0.
- neu: `dist/release-notes-0.10.0.md` (gitignored).

## Lösung
