# 3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons

**Status**: Offen
**Zielversion**: 0.11.0
**Vorgängerversion**: 0.10.0

## Ziel

Drei eigenständige Quality-of-Life-Verbesserungen, in einem Release 0.11.0 gebündelt:

- **Auto-Update**: Die Setup-EXE prüft täglich auf neue Versionen, bietet dem Nutzer Download und Installation an. Die Portable-EXE prüft ebenfalls, leitet aber nur auf das GitHub-Release weiter.
- **Theme-Umschalter**: Drei-Wege-Wahl Hell / Dunkel / System mit Persistenz. Ersetzt die heutige rein systemgesteuerte Theme-Logik um eine manuelle Override-Option.
- **Statusbar-Buttons als Icons**: Die acht Wort-Buttons unten links werden, sofern eindeutig erkennbare Icons gefunden werden, durch Icon-Buttons ersetzt. Der Task ist konditional und wird nicht umgesetzt, wenn kein konsensfähiges Icon-Set zustande kommt.

## Warum

- **Auto-Update**: Heute merken Nutzer ein neues Release nur, wenn sie aktiv auf GitHub schauen. Manuelles Herunterladen plus Setup-Lauf ist ein Reibungspunkt, der die Adoption neuer Versionen ausbremst. Eine in die App eingebaute Update-Routine mit Nutzerfreigabe ist Standard bei Desktop-Apps und schließt eine seit 0.1.0 sichtbare Lücke.
- **Theme-Umschalter**: Aktuell folgt das Theme zwingend dem System-Setting über `prefers-color-scheme`. Wer in der App ein anderes Theme bevorzugen will als systemweit, kann das nicht. Manuelle Theme-Wahl ist Standard bei modernen Editoren.
- **Statusbar-Icons**: Acht Buttons mit Wort-Labels belegen viel Platz in der Statusbar. Bei schmalen Fenstern (kleine Monitore, Splitscreen) drücken sie die rechte Statusbar-Sektion. Icons sparen Platz und sind in vielen Editoren etabliert, sofern sie eindeutig erkennbar sind.

## Umfang und Abgrenzung

**Im Umfang:**

- Auto-Update mit `electron-updater` (Provider GitHub), inklusive täglichem Hintergrund-Check und manuellem Trigger über das Hilfe-Menü
- Drei-Wege-Theme-Auswahl mit Persistenz über `electron-store`, Trigger im Menü `Ansicht` und als Icon-Button in der Statusbar rechts neben dem Edit-Button
- Konditionale Umstellung der acht Statusbar-Buttons (Inhalt, Backlinks, Gliederung, Nummern, Umbruch, Quellcode, Geteilt, Gerendert) auf Inline-SVG-Icons
- Hilfe-Dialog um die neuen Funktionen erweitern, i18n-Keys in allen fünf Sprachen
- CHANGELOG, Release-Notes, Version-Bump 0.10.0 → 0.11.0, Tag und GitHub-Release

**Nicht im Umfang (für 0.11.0):**

- Code-Signing für den Installer (langfristiges Thema, unabhängig von 0.11.0)
- Delta-Updates oder differenzielle Patches
- Auto-Update für die Portable-EXE (technisch nicht unterstützt durch `electron-updater`)
- Theme-Konfiguration mit eigenen Farbpaletten
- Icon-Library-Dependency (z.B. lucide-react); Icons werden Inline-SVG wie das vorhandene `btn-edit`-Muster
- Konfigurierbare Statusbar (Ein-/Ausblenden einzelner Buttons)

## Untergeordnete Tasks

- [ ] [4T-0029 — Auto-Update mit täglichem Check und GitHub-Releases](4T-0029-auto-update.md)
- [ ] [4T-0030 — Theme-Umschalter Hell / Dunkel / System](4T-0030-theme-toggle.md)
- [ ] [4T-0031 — Statusbar-Buttons als Icons](4T-0031-statusbar-icons.md) — Konzept-Phase abgeschlossen, finale Icon-Auswahl steht im Task
- [ ] Abschluss-Sammeltask wird erst angelegt, wenn die Umsetzungs-Tasks auf `Wartet auf Test` stehen (Konvention aus [CLAUDE.md](../../CLAUDE.md)).

## Architekturentscheidungen

- **Auto-Update über `electron-updater` mit Provider `github`.** Begründung: Die App veröffentlicht ohnehin auf GitHub Releases, der bestehende Release-Prozess wird nur um zwei zusätzliche Asset-Dateien erweitert (`latest.yml`, `*.blockmap`). Keine eigene Update-Infrastruktur nötig.
- **Update nur für Setup-EXE.** `electron-updater` unterstützt das `portable`-Target nicht. Die Portable-EXE führt denselben Check durch, zeigt aber nur einen Hinweis-Dialog mit Link auf das GitHub-Release. Erkennung der Variante über `process.env.PORTABLE_EXECUTABLE_DIR`.
- **Drei-Wege-Theme-State (`light` / `dark` / `system`).** Default ist `system`, also identisch zum heutigen Verhalten für Bestandsnutzer. Im Modus `system` läuft die bestehende matchMedia-Logik weiter; bei `light` und `dark` wird das `data-theme`-Attribut hart gesetzt und der matchMedia-Listener pausiert.
- **Persistenz Theme über `electron-store`.** Konsistent mit Schriftart und Fenster-Bounds. Schlüssel `theme`.
- **Theme-Trigger an zwei Stellen**: Menü `Ansicht → Theme` (Radio-Group) plus Icon-Button rechts neben `btn-edit` in der Statusbar. Klick auf den Statusbar-Icon-Button schaltet zyklisch durch die drei Zustände.
- **Statusbar-Icons als Inline-SVG, ohne Library-Dependency.** Konsistent mit dem bestehenden `btn-edit`-Muster in [src/renderer/index.html](../../src/renderer/index.html). Quelle: lizenzkompatible SVG-Sets (Lucide MIT, Feather MIT) als Vorlage, Inline-Einbettung im HTML.
- **Konditionale Umsetzung 4T-0031.** Die Icon-Auswahl wird in einer Konzept-Phase mit Vorschlägen und Nutzer-Freigabe abgesichert. Wird auch nur für einen der acht Buttons kein konsensfähiges Icon gefunden, wird der Task verworfen, der heutige Text-Zustand bleibt.

## Reihenfolge der Umsetzung

1. **4T-0030 Theme-Umschalter** zuerst, weil der Eingriff klein und der Persistenz-Mechanismus einfach ist. Etabliert den Drei-Wege-Theme-State, an dem 4T-0024 (PDF-Export, zurückgestellt) später wieder andocken kann.
2. **4T-0031 Statusbar-Icons** als zweiter Schritt, beginnend mit der Konzept-Phase (Icon-Vorschläge). Bei Ablehnung der Konzept-Phase wird der Task verworfen, ohne Code anzufassen. Bei Freigabe folgt die Umsetzung mit reinem Renderer-Eingriff.
3. **4T-0029 Auto-Update** als letzter Schritt, weil er den Build- und Release-Prozess erweitert (`publish`-Konfiguration in `package.json`, zusätzliche Release-Assets `latest.yml` und `*.blockmap`). Anpassungen am Release-Prozess werden im Abschluss-Sammeltask in [CLAUDE.md](../../CLAUDE.md) nachgezogen.
4. **Abschluss-Sammeltask**: Hilfe-Dialog, CHANGELOG, Release-Notes, README-Status-Sektion, Tag und GitHub-Release für 0.11.0.

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Übergreifend betroffen:

- `package.json` — Version 0.10.0 → 0.11.0, neue Dependency `electron-updater`, `publish`-Block im `build`.
- `src/main/main.js`, `src/main/menu.js`, `src/main/preload.js` — Update-Routine, Theme-Persistenz, Menü-Einträge.
- `src/renderer/index.html`, `src/renderer/renderer.js`, `src/renderer/styles.css` — Theme-Icon-Button, ggf. Statusbar-Icons.
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys für Update-Dialoge, Theme-Menü, ggf. Tooltips der Icon-Buttons.
- `CHANGELOG.md` — Block für 0.11.0.
- `scripts/archive-build.js` — `latest.yml` und `*.blockmap` mit ins `releases/`-Archiv ziehen, sofern dort sinnvoll, oder ausschließlich an das GitHub-Release-Asset koppeln.

## Offene Punkte / Risiken

- **SmartScreen und unsignierter Installer**: Bei jeder neuen Setup-EXE entsteht ein neuer Hash. SmartScreen kann den Auto-Update-Lauf erneut blockieren, was den Update-Flow im schlimmsten Fall abbricht. Mitigation: Im Fehlerfall klare Nutzer-Meldung mit Link zum manuellen Download. Code-Signing bleibt mittel- bis langfristig zu klären.
- **Release-Prozess-Erweiterung**: Mit Auto-Update muss neben den beiden EXEs auch `latest.yml` ins GitHub-Release-Asset. Die Beschreibung in [CLAUDE.md](../../CLAUDE.md) muss entsprechend ergänzt werden. Aufgabe des Sammeltasks.
- **Mermaid-Theme-Re-Init**: Beim Theme-Wechsel zur Laufzeit müssen alle bereits gerenderten Mermaid-Diagramme neu gerendert werden. 4T-0021 hat dafür eine Basis; in 4T-0030 zu verifizieren.
- **Icon-Eindeutigkeit für die Ansichts-Buttons** (Quellcode / Geteilt / Gerendert): Hier ist die Icon-Wahl am heikelsten, weil kein etablierter Markt-Standard existiert. Falls hier kein eindeutiges Set zustande kommt, fällt 4T-0031.
- **Theme-Auto-Update-Interaktion**: Wenn ein Update herunterlädt und im Hintergrund ein Theme-Wechsel passiert, sollte das ohne Race-Condition funktionieren. Unkritisch, aber im Test mit zu prüfen.
