# 3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons

**Status**: Offen
**Zielversion**: 0.11.0
**Vorgängerversion**: 0.10.0

## Ziel

Drei eigenständige Quality-of-Life-Verbesserungen, in einem Release 0.11.0 gebündelt:

- **Update-Erkennung**: Die App prüft täglich auf neue Versionen und zeigt bei Treffer einen Dialog mit Link zur GitHub-Release-Seite. Setup- und Portable-Variante verhalten sich identisch (kein automatischer Download, kein automatischer Install). Auto-Installation wurde wegen SmartScreen-Risiken bei unsigniertem Installer in [4T-0032](4T-0032-auto-install.md) ausgelagert und zurückgestellt.
- **Theme-Umschalter**: Drei-Wege-Wahl Hell / Dunkel / System mit Persistenz. Ersetzt die heutige rein systemgesteuerte Theme-Logik um eine manuelle Override-Option.
- **Statusbar-Buttons als Icons**: Die acht Wort-Buttons unten links wurden durch Inline-SVG-Icons aus Lucide ersetzt.

## Warum

- **Auto-Update**: Heute merken Nutzer ein neues Release nur, wenn sie aktiv auf GitHub schauen. Manuelles Herunterladen plus Setup-Lauf ist ein Reibungspunkt, der die Adoption neuer Versionen ausbremst. Eine in die App eingebaute Update-Routine mit Nutzerfreigabe ist Standard bei Desktop-Apps und schließt eine seit 0.1.0 sichtbare Lücke.
- **Theme-Umschalter**: Aktuell folgt das Theme zwingend dem System-Setting über `prefers-color-scheme`. Wer in der App ein anderes Theme bevorzugen will als systemweit, kann das nicht. Manuelle Theme-Wahl ist Standard bei modernen Editoren.
- **Statusbar-Icons**: Acht Buttons mit Wort-Labels belegen viel Platz in der Statusbar. Bei schmalen Fenstern (kleine Monitore, Splitscreen) drücken sie die rechte Statusbar-Sektion. Icons sparen Platz und sind in vielen Editoren etabliert, sofern sie eindeutig erkennbar sind.

## Umfang und Abgrenzung

**Im Umfang:**

- Update-Erkennung mit `electron-updater` (Provider GitHub), täglicher Hintergrund-Check, 45-s-Verzögerung beim Start, manueller Trigger über das Hilfe-Menü
- Update-Dialog mit drei Optionen (Zum Download / Später / Diese Version überspringen), Setup- und Portable-Variante einheitlich behandelt
- Drei-Wege-Theme-Auswahl mit Persistenz über `electron-store`, Trigger im Menü `Ansicht` und als Icon-Button in der Statusbar rechts neben dem Edit-Button
- Umstellung der acht Statusbar-Buttons (Inhalt, Backlinks, Gliederung, Nummern, Umbruch, Quellcode, Geteilt, Gerendert) auf Inline-SVG-Icons aus Lucide
- Hilfe-Dialog um die neuen Funktionen erweitern, i18n-Keys in allen fünf Sprachen
- CHANGELOG, Release-Notes, Version-Bump 0.10.0 → 0.11.0, Tag und GitHub-Release

**Nicht im Umfang (für 0.11.0):**

- **Automatischer Download und Installation des Updates** — wegen SmartScreen-Risiken bei unsigniertem Installer in [4T-0032](4T-0032-auto-install.md) ausgelagert; wird umgesetzt, sobald ein Code-Signing-Zertifikat vorliegt
- Code-Signing für den Installer (langfristiges Thema, Voraussetzung für 4T-0032)
- Delta-Updates oder differenzielle Patches
- Theme-Konfiguration mit eigenen Farbpaletten
- Icon-Library-Dependency (z.B. lucide-react); Icons werden Inline-SVG wie das vorhandene `btn-edit`-Muster
- Konfigurierbare Statusbar (Ein-/Ausblenden einzelner Buttons)

## Untergeordnete Tasks

- [x] [4T-0029 — Update-Erkennung und Benachrichtigung mit Link](4T-0029-auto-update.md) — Test bestanden am 2026-05-19, Commits drin, gepushed (Scope am 2026-05-19 reduziert, Auto-Install nach [4T-0032](4T-0032-auto-install.md) ausgelagert)
- [x] [4T-0030 — Theme-Umschalter Hell / Dunkel / System](4T-0030-theme-toggle.md) — Test bestanden am 2026-05-19, Commits drin, gepushed
- [x] [4T-0031 — Statusbar-Buttons als Icons](4T-0031-statusbar-icons.md) — Test bestanden am 2026-05-19, Commits drin, gepushed
- [ ] [4T-0032 — Auto-Download und Auto-Installation des Updates](4T-0032-auto-install.md) — **Zurückgestellt** bis Code-Signing-Zertifikat vorliegt; nicht Teil von 0.11.0
- [ ] Abschluss-Sammeltask wird erst angelegt, wenn 4T-0029 auf `Wartet auf Test` steht (Konvention aus [CLAUDE.md](../../CLAUDE.md)).

## Architekturentscheidungen

- **Update-Erkennung über `electron-updater` mit Provider `github`.** Begründung: Die App veröffentlicht ohnehin auf GitHub Releases, der bestehende Release-Prozess wird nur um zwei zusätzliche Asset-Dateien erweitert (`latest.yml`, `*.blockmap`). Keine eigene Update-Infrastruktur nötig.
- **Setup- und Portable-EXE einheitlich behandelt.** Da kein Auto-Download stattfindet (siehe Auslagerung an [4T-0032](4T-0032-auto-install.md)), zeigen beide Varianten denselben Dialog mit Link zum GitHub-Release. Eine Variant-Detection ist in 0.11.0 nicht nötig.
- **Auto-Install zurückgestellt.** SmartScreen-Risiken bei unsignierter Setup-EXE machen den Auto-Install-Pfad in der aktuellen Konstellation zu brüchig. 4T-0032 dokumentiert den späteren Wiederanlauf, sobald ein Code-Signing-Zertifikat vorliegt; die in 4T-0029 etablierte Infrastruktur (electron-updater, GitHub-Provider, `latest.yml`, Dialog-Struktur) wird dort nahtlos weiterverwendet.
- **Drei-Wege-Theme-State (`light` / `dark` / `system`).** Default ist `system`, also identisch zum heutigen Verhalten für Bestandsnutzer. Im Modus `system` läuft die bestehende matchMedia-Logik weiter; bei `light` und `dark` wird das `data-theme`-Attribut hart gesetzt und der matchMedia-Listener pausiert.
- **Persistenz Theme über `electron-store`.** Konsistent mit Schriftart und Fenster-Bounds. Schlüssel `theme`.
- **Theme-Trigger an zwei Stellen**: Menü `Ansicht → Theme` (Radio-Group) plus Icon-Button rechts neben `btn-edit` in der Statusbar. Klick auf den Statusbar-Icon-Button schaltet zyklisch durch die drei Zustände.
- **Statusbar-Icons als Inline-SVG, ohne Library-Dependency.** Konsistent mit dem bestehenden `btn-edit`-Muster in [src/renderer/index.html](../../src/renderer/index.html). Quelle: lizenzkompatible SVG-Sets (Lucide MIT, Feather MIT) als Vorlage, Inline-Einbettung im HTML.
- **Konditionale Umsetzung 4T-0031.** Die Icon-Auswahl wird in einer Konzept-Phase mit Vorschlägen und Nutzer-Freigabe abgesichert. Wird auch nur für einen der acht Buttons kein konsensfähiges Icon gefunden, wird der Task verworfen, der heutige Text-Zustand bleibt.

## Reihenfolge der Umsetzung

1. ✅ **4T-0030 Theme-Umschalter** — abgeschlossen am 2026-05-19, gepushed.
2. ✅ **4T-0031 Statusbar-Icons** — abgeschlossen am 2026-05-19, gepushed. Plus Pre-existing-Bugfix für die Sidebar-Sektion-Sichtbarkeit (Commit `8f7da17`).
3. ✅ **4T-0029 Update-Erkennung** — abgeschlossen am 2026-05-19, gepushed. Build- und Release-Prozess erweitert (publish-Block, latest.yml, Blockmap als Release-Assets, archive-build.js-Erweiterung). Pre-Release `v0.11.0-rc1` auf GitHub als Update-Ziel; bleibt bis zum Abschluss-Sammeltask stehen. App-Version während Entwicklung `0.10.99` wegen electron-updater-Channel-Falle (Pre-Release-Suffix → falscher Channel-Lookup); vor finalem Release Rückbau auf `0.11.0` plus `allowPrerelease=false`.
4. **Abschluss-Sammeltask**: Hilfe-Dialog, CHANGELOG, Release-Notes, README-Status-Sektion, Tag und GitHub-Release für 0.11.0. Plus Cleanup des Pre-Release v0.11.0-rc1 und Rückbau App-Version + `allowPrerelease`.
5. **4T-0032** wird in 0.11.0 **nicht** umgesetzt (zurückgestellt bis Code-Signing).

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Übergreifend betroffen:

- `package.json` — Version 0.10.0 → 0.11.0, neue Dependency `electron-updater`, `publish`-Block im `build`.
- `src/main/main.js`, `src/main/menu.js`, `src/main/preload.js` — Update-Routine, Theme-Persistenz, Menü-Einträge.
- `src/renderer/index.html`, `src/renderer/renderer.js`, `src/renderer/styles.css` — Theme-Icon-Button, ggf. Statusbar-Icons.
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys für Update-Dialoge, Theme-Menü, ggf. Tooltips der Icon-Buttons.
- `CHANGELOG.md` — Block für 0.11.0.
- `scripts/archive-build.js` — `latest.yml` und `*.blockmap` mit ins `releases/`-Archiv ziehen, sofern dort sinnvoll, oder ausschließlich an das GitHub-Release-Asset koppeln.

## Offene Punkte / Risiken

- **Code-Signing als Voraussetzung für 4T-0032**: Ein OV- oder EV-Zertifikat wäre für die Auto-Install-Stufe nötig. Bis dahin bleibt 4T-0032 zurückgestellt.
- **Release-Prozess-Erweiterung**: Mit der Update-Erkennung muss neben den beiden EXEs auch `latest.yml` ins GitHub-Release-Asset. Die Beschreibung in [CLAUDE.md](../../CLAUDE.md) muss entsprechend ergänzt werden. Aufgabe des Sammeltasks.
- **Pre-Release als Update-Ziel während 4T-0029-Entwicklung**: Während der Implementierung wird ein Pre-Release `v0.11.0-rc1` auf GitHub erstellt, gegen das die App `0.11.0-dev.0` ihren Update-Check ausführt. Vor dem finalen Release v0.11.0 wird `allowPrerelease` zurück auf `false` gesetzt.
