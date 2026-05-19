# 4T-0033 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.11.0

**Status**: Erledigt
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0
**Release**: [v0.11.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.11.0)

## Warum

Abschluss-Sammeltask für 0.11.0. Die Umsetzungs-Tasks [4T-0030](4T-0030-theme-toggle.md) (Theme-Umschalter), [4T-0031](4T-0031-statusbar-icons.md) (Statusbar-Icons) und [4T-0029](4T-0029-auto-update.md) (Update-Erkennung) sind durch. Plus ein Pre-existing-Bugfix für die Sidebar-Sektionen (Commit `8f7da17`). [4T-0032](4T-0032-auto-install.md) (Auto-Install) wurde wegen SmartScreen-Risiken bei unsigniertem Installer zurückgestellt.

Jetzt müssen Hilfe-Dialog, CHANGELOG und Release-Notes auf den neuen Stand gebracht, die Version von der Test-Niedrigversion `0.10.99` zurück auf `0.11.0` gesetzt, `allowPrerelease` für den Live-Betrieb deaktiviert, das Pre-Release `v0.11.0-rc1` aufgeräumt, der Tag `v0.11.0` gesetzt und das GitHub-Release angelegt werden.

Vorbilder im Repo: [4T-0010](4T-0010-changelog-release-060.md) (0.6.0), [4T-0026](4T-0026-changelog-release-080.md) (0.8.0), [4T-0028](4T-0028-changelog-release-0100.md) (0.10.0).

## Lösungsansatz

### Hilfe-Dialog erweitern

**Neue Funktionen** (Funktions-Liste, Gruppe „Allgemein" für Update, „Ansicht" hat den bestehenden `theme`-Eintrag):

- **Theme-Umschalter** (4T-0030): Der bestehende `help.feature.theme` wurde bereits in 4T-0030 inhaltlich erweitert (manuelle Wahl Hell/Dunkel/System, Statusbar-Icon, Menü). Keine zusätzliche Änderung nötig.
- **Statusbar-Icons** (4T-0031): Wird **nicht** als eigene Hilfe-Position aufgenommen, weil es ein rein visueller Refresh ohne funktionale Erweiterung ist. Tooltips an den Icons (lokalisiert) machen die Funktion direkt erkennbar.
- **Update-Erkennung** (4T-0029): Neuer Hilfe-Eintrag `help.feature.updateCheck` in Gruppe „Allgemein".

**i18n-Keys neu**: `help.feature.updateCheck` in fünf Sprachen.

**Keine neuen Shortcuts** in 0.11.0, daher keine Erweiterung der Tastenkürzel-Tabelle.

### CHANGELOG.md

Neuer Abschnitt `## [0.11.0] - JJJJ-MM-TT — <Untertitel>` am Anfang. Verweis auf Epic 3E-0005 plus expliziter Hinweis, dass 4T-0032 (Auto-Install) zurückgestellt wurde.

Subsektionen:

- **Neu**: Theme-Umschalter, Statusbar-Icons, Update-Erkennung.
- **Geändert**: Versions-Bump 0.10.0 → 0.11.0; build-Pipeline erweitert (publish-Block, latest.yml als Release-Asset, archive-build.js SemVer-Pre-Release-Support, electron-updater als Dependency).
- **Behoben**: Pre-existing-Bugfix für die Sidebar-Sektionen aus 4T-0014/4T-0015 (Outline und Backlinks lassen sich wieder unabhängig ein-/ausblenden).
- **Zurückgestellt**: 4T-0032 Auto-Install (bis Code-Signing-Zertifikat vorliegt).
- **i18n**: Anzahl der neuen Schlüssel pro Sprache.

### Release-Notes

`dist/release-notes-0.11.0.md` aus [docs/release-notes-template.md](../../docs/release-notes-template.md) ableiten. Auf Deutsch mit Umlauten.

Inhaltliche Sektionen:

- **Untertitel**: „Theme-Wahl, Icons und Update-Erkennung"
- **Download**: Setup-EXE und Portable-EXE wie üblich.
- **Was ist neu seit v0.10.0**: drei Hauptthemen (Theme, Icons, Update-Erkennung), je mit ein bis zwei Sätzen Erklärung und Hinweis auf den fehlenden Auto-Install in dieser Version.
- **Behoben**: Sidebar-Sektion-Sichtbarkeit.
- **Zurückgestellt**: kurzer Hinweis zu Auto-Install (4T-0032), Gründe und Voraussetzung Code-Signing.
- **System-Anforderungen**, **Hinweise** (SmartScreen) wie in bisherigen Releases.
- **Link zum CHANGELOG.md**.

### README.md aktualisieren

- **Status-Sektion** (vorletztes Kapitel): auf 0.11.0 umschreiben, ein bis zwei Sätze zu den Schwerpunkten.
- **Tastenkürzel-Tabelle**: keine Erweiterung nötig (keine neuen Shortcuts).
- **Lucide-Lizenz**: kurzer Hinweis in der README oder im About-Dialog, dass die acht Statusbar-Icons aus Lucide (ISC-Lizenz) stammen. Konkret: Ergänzung im About-Dialog analog zur bestehenden Markdown-Mark-Attribution.
- **EXE-Dateinamen**: durch `<version>`-Platzhalter versionsfrei.

### CLAUDE.md erweitern

Im Release-Prozess-Abschnitt (Schritt 3 „GitHub-Release anlegen") die `gh release create`-Befehlszeile um die zusätzlichen Asset-Dateien ergänzen:

- `latest.yml` (Update-Manifest für electron-updater)
- `SCG Markdown-<version>-Setup.exe.blockmap` (für künftige differenzielle Updates / 4T-0032)

Beispielzeile aktualisieren.

### Version-Rückbau und Live-Konfiguration

- [package.json](../../package.json): Version von `0.10.99` (Test-Niedrigversion aus 4T-0029) zurück auf `0.11.0`.
- [src/main/main.js](../../src/main/main.js): `autoUpdater.allowPrerelease = true` zurück auf `false`. Damit findet die Live-App nur stabile Releases, nicht Pre-Releases.

### Pre-Release-Cleanup

- Pre-Release [v0.11.0-rc1](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.11.0-rc1) auf GitHub löschen (`gh release delete v0.11.0-rc1 --cleanup-tag`). Es ist nach dem v0.11.0-Release nicht mehr relevant und würde Verwirrung stiften.

### Lucide-Lizenz-Hinweis

Im About-Dialog ([src/renderer/index.html](../../src/renderer/index.html), Sektion `about-modal`) eine Zeile ergänzen analog zur bestehenden Markdown-Mark-Attribution, z.B.:

> „Statusbar-Icons: Lucide (ISC) — lucide.dev"

i18n-Key `about.lucide` in fünf Sprachen.

### Test-Iteration mit dem Nutzer

Vor Commit und Tag eine finale EXE bauen und den Nutzer prüfen lassen:

- Hilfe-Dialog enthält den neuen Update-Erkennung-Eintrag in allen fünf Sprachen.
- Release-Notes lesen sich rund.
- README-Status-Sektion stimmt.
- About-Dialog zeigt Lucide-Attribution.
- Update-Check funktioniert nicht mehr gegen das Pre-Release (weil allowPrerelease=false und Version 0.11.0).

Erst nach Freigabe weiter zu Commit + Tag + Release.

### Commit, Tag und GitHub-Release

Gemäß [CLAUDE.md → Release-Prozess](../../CLAUDE.md#release-prozess-tag--github-release-bei-jedem-versionssprung):

1. `npm run build` — EXEs plus `latest.yml`/Blockmap in `releases/`.
2. Commit der Doku-Änderungen — Doku-Stand auf 0.11.0.
3. Push.
4. `git tag v0.11.0 <commit-sha>` und `git push origin v0.11.0`.
5. `gh release create v0.11.0 --title "v0.11.0 — ..." --notes-file dist/release-notes-0.11.0.md --latest "releases/SCG Markdown-0.11.0-Setup.exe" "releases/SCG Markdown-0.11.0-Portable.exe" "releases/SCG Markdown-0.11.0-Setup.exe.blockmap" "releases/latest.yml"`.
6. Pre-Release-Cleanup: `gh release delete v0.11.0-rc1 --cleanup-tag --yes`.

### Status-Updates

Nach erfolgreichem Release:

- 4T-0029, 4T-0030, 4T-0031: Status auf `Erledigt`.
- 4T-0032: bleibt `Zurückgestellt`.
- 4T-0033 selbst: Status auf `Erledigt`.
- 3E-0005: Status auf `Erledigt`.

## Akzeptanzkriterien

- Hilfe-Dialog zeigt den neuen `help.feature.updateCheck`-Eintrag in allen fünf Sprachen, in der Gruppe „Allgemein".
- CHANGELOG enthält den 0.11.0-Block mit den richtigen Subsektionen, inkl. Hinweis auf den zurückgestellten 4T-0032.
- `dist/release-notes-0.11.0.md` existiert und passt zum CHANGELOG.
- README-Status-Sektion ist auf 0.11.0.
- About-Dialog zeigt Lucide-Attribution.
- `package.json` Version ist `0.11.0`, `allowPrerelease=false` in main.js.
- CLAUDE.md-Release-Prozess listet `latest.yml` und Blockmap als zusätzliche Assets.
- Tag `v0.11.0` ist gesetzt und auf GitHub gepushed.
- GitHub-Release `v0.11.0 — ...` ist als „Latest" angelegt, mit allen vier Assets (Setup, Portable, Blockmap, latest.yml).
- Pre-Release `v0.11.0-rc1` ist gelöscht.
- Status-Werte aller Tasks und des Epics 3E-0005 sind konsistent gesetzt.

## Bezug zu Dateien

- `src/renderer/renderer.js` — `HELP_FEATURE_GROUPS` um Update-Eintrag erweitern.
- `src/renderer/index.html` — About-Dialog um Lucide-Attribution.
- `src/i18n/{de,en,fr,es,it}.json` — `help.feature.updateCheck` und `about.lucide`.
- `CHANGELOG.md` — neuer 0.11.0-Block.
- `README.md` — Status-Sektion auf 0.11.0.
- `CLAUDE.md` — Release-Prozess-Erweiterung.
- `package.json` — Version 0.10.99 → 0.11.0.
- `src/main/main.js` — `allowPrerelease=false`.
- neu: `dist/release-notes-0.11.0.md` (gitignored).

## Lösung

Umgesetzt am 2026-05-19. Manueller Test der finalen 0.11.0-Portable durch den Nutzer am selben Tag bestanden (Hilfe-Dialog, About-Dialog, Update-Check „Sie verwenden bereits die aktuelle Version 0.11.0"). Tag, Release und Pre-Release-Cleanup direkt im Anschluss durchgeführt.

### Komponenten-Stand

- **Hilfe-Dialog** ([src/renderer/renderer.js](../../src/renderer/renderer.js)): `HELP_FEATURE_GROUPS` in Gruppe „Allgemein" um `help.feature.updateCheck` erweitert. Der bestehende `help.feature.theme`-Eintrag wurde bereits in 4T-0030 inhaltlich angepasst.
- **About-Dialog** ([src/renderer/index.html](../../src/renderer/index.html)): zusätzlicher `<p class="about-credits">` mit `data-i18n="about.lucide"` unter der Markdown-Mark-Attribution.
- **CHANGELOG.md** ([../../CHANGELOG.md](../../CHANGELOG.md)): neuer Block `## [0.11.0] - 2026-05-19 — Theme-Wahl, Statusbar-Icons und Update-Erkennung` mit Subsektionen Neu, Geändert, Behoben, Zurückgestellt, i18n. Verweise auf alle vier 4T-Tasks und das Epic.
- **Release-Notes** ([../../dist/release-notes-0.11.0.md](../../dist/release-notes-0.11.0.md), gitignored): aus Template abgeleitet, mit Download-Tabelle, drei Hauptthemen, Hinweis zu zurückgestelltem Auto-Install und SmartScreen-Note.
- **README.md** ([../../README.md](../../README.md)): Status-Sektion auf 0.11.0, Lizenz-Sektion um Lucide-Hinweis erweitert.
- **CLAUDE.md** ([../../CLAUDE.md](../../CLAUDE.md)): Release-Prozess-Schritt 3 mit `latest.yml` und `*.blockmap` als zusätzliche Asset-Dateien. Beispiel-`gh release create` auf v0.11.0 aktualisiert.
- **Version-Rückbau**: [package.json](../../package.json) von `0.10.99` auf `0.11.0`, [src/main/main.js](../../src/main/main.js) `allowPrerelease=true` auf `false`.
- **i18n** in allen fünf Sprachen ([de.json](../../src/i18n/de.json), `en/fr/es/it`): 2 neue Keys (`help.feature.updateCheck`, `about.lucide`).

### Release-Schritte

1. `npm run build` für 0.11.0 (Setup-EXE, Portable-EXE, `latest.yml`, Setup-Blockmap nach `releases/`).
2. Smoke-Test der Portable-EXE.
3. Doku- und Konfigurations-Commit.
4. Push.
5. Tag `v0.11.0`, Push des Tags.
6. GitHub-Release `v0.11.0 — Theme-Wahl, Statusbar-Icons und Update-Erkennung` als „Latest" mit allen vier Assets.
7. Pre-Release `v0.11.0-rc1` plus Tag gelöscht (`gh release delete v0.11.0-rc1 --cleanup-tag --yes`), weil das Pre-Release nach dem finalen Release nicht mehr gebraucht wird und Verwirrung stiften würde.
8. Status-Updates aller 4T-Tasks und des Epics auf `Erledigt`. 4T-0032 bleibt `Zurückgestellt`.
