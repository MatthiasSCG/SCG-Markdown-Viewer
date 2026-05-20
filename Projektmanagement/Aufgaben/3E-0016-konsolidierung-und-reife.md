# 3E-0016 — Konsolidierung und 1.0.0-Reife

**Status**: Offen
**Zielversion**: 1.0.0
**Vorgängerversion**: 0.21.0
**Reihenfolge im Meta-Plan**: Epic 7 von 7, Abschluss-Klammer nach (B → C → D → E → A → F)
**Aufsetzend auf**: [3E-0010](3E-0010-frontmatter-aliases-properties.md), [3E-0011](3E-0011-wiki-link-ausbau-und-tag-system.md), [3E-0012](3E-0012-markdown-syntax-erweiterungen.md), [3E-0013](3E-0013-reading-und-sidebar-komfort.md), [3E-0014](3E-0014-inline-live-preview.md), [3E-0015](3E-0015-konfigurierbare-tastenkuerzel.md), plus die zurückgestellten Tasks [4T-0024](4T-0024-pdf-export.md) und [4T-0032](4T-0032-auto-install.md)
**Quelle**: Entscheidung vom 2026-05-20, Variante 1 („Konsolidierung und Reife") als 1.0.0-Klammer

## Ziel

Den App-Stand nach Abschluss von 3E-0010 bis 3E-0015 zur 1.0.0-Reife bringen. Drei Stränge: zurückgestellte Funktionen aus früheren Releases endgültig nachholen (PDF-Export, Auto-Install), die App über alle bisherigen Features hinweg auf Stabilität, Performance und Doku-Vollständigkeit prüfen, und mit dem Sprung auf 1.0.0 Featurevollständigkeit signalisieren.

## Warum

Die App hat aktuell zwei sichtbar zurückgestellte Themen, die im Code-Stand und in den Tasks dokumentiert sind:

- **PDF-Export** ([4T-0024](4T-0024-pdf-export.md)) wurde in 0.10.0 begonnen und wegen Theme- und Container-Konflikten im Print-Modus zurückgebaut. Drei Wiederanlauf-Varianten (A, B, B+) sind im Task vorgemerkt.
- **Auto-Install des Update-Pakets** ([4T-0032](4T-0032-auto-install.md)) wurde in 0.11.0 wegen SmartScreen-Risiken bei unsigniertem Installer zurückgestellt. Voraussetzung für den Wiederanlauf ist ein Code-Signing-Zertifikat (OV oder EV).

Beide Themen wandern in 1.0.0, weil ein Major-Versionssprung der natürliche Zeitpunkt ist, offene Versprechen einzulösen. Außerdem ist 1.0.0 der Anlass, die App über sechs Feature-Epics hinweg ganzheitlich zu prüfen statt nur pro Epic. Inline Live Preview (3E-0014) ist strukturell tiefgreifend; das Zusammenspiel mit Frontmatter, Tags, Callouts, Wiki-Embeds und Bookmarks ist nur in einer Cross-Cutting-Test-Phase verlässlich abgesichert. Performance bei großen Dateien und großen Vault-ähnlichen Ordnerstrukturen wurde in keinem der Feature-Epics als Hauptthema behandelt; ein eigener Performance-Audit ist für 1.0.0 angemessen.

Der 1.0.0-Sprung signalisiert nach außen: der in der README beschriebene Funktionsumfang ist vollständig und stabil. Bisher steht im README-Status-Abschnitt „Funktional vollständig für den aktuellen Funktionsumfang"; mit 1.0.0 wird das zur expliziten Reife-Erklärung.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **PDF-Export-Wiederanlauf** ([4T-0024](4T-0024-pdf-export.md)). Eine der drei dort dokumentierten Varianten umsetzen. Entscheidung beim Task-Start, vermutlich Variante B oder B+ (basierend auf der dortigen Bewertung; finale Wahl nach kurzer Re-Evaluation).
- **Code-Signing-Vorbereitung**. Beschaffung eines OV- oder EV-Zertifikats, falls noch nicht vorhanden. Wenn die Beschaffung nicht innerhalb des 1.0.0-Fensters möglich ist (Lieferzeit Wochen), wird Code-Signing als separater Task verschoben, und Auto-Install bleibt zurückgestellt — die Entscheidung wird zu Epic-Start abhängig vom Zertifikatsstand getroffen.
- **Auto-Install und Auto-Download** ([4T-0032](4T-0032-auto-install.md)). Nur durchführbar, wenn Code-Signing realisiert ist. Sonst weiter zurückgestellt.
- **Performance-Audit über die App-Hotspots**:
  - Live-Preview-Render bei großen Dateien (500+ Zeilen).
  - Backlinks- und Tag-Index-Aufbau im Suchraum mit ~1500 Dateien (knapp unterhalb des Caps von 2000).
  - Render-Pane-Reflow beim Wechsel zwischen großen Dateien.
  - Bundle-Größe des Renderers, insbesondere `mermaid.bundle.js` und KaTeX-Assets.
  - App-Start-Zeit bis zum ersten interaktiven Tab.
- **Bugfix-Sweep**. Sammlung aller offen gebliebenen Auffälligkeiten aus den Test-Iterationen der vorangegangenen Releases. Cross-Cutting-Themen, die in einzelnen Epic-Test-Phasen nicht aufgefallen wären:
  - Sitzungs-Wiederherstellung mit allen neuen Features (Bookmarks, Tag-Sidebar, Live-Preview-Modus, konfigurierte Hotkeys).
  - Multi-Window-Verhalten mit Live-Preview, Properties-Editor und konfigurierten Hotkeys.
  - Theme-Wechsel zur Laufzeit mit allen neuen Widgets (Callouts, Embeds, Tag-Pillen, Properties-Box).
  - Drag-and-Drop von Dateien mit Frontmatter und Aliases.
- **Doku-Konsolidierung**:
  - README-Vollständigkeitsprüfung: jede über die sechs Epics dazugekommene Funktion ist im Funktionsumfang erwähnt; Status-Abschnitt umgeschrieben für 1.0.0.
  - Hilfe-Dialog inhaltlich vollständig, Funktionen alle in der richtigen Gruppe, Shortcuts vollzählig.
  - CHANGELOG-Glättung: Inkonsistenzen zwischen Releases (Format, Verweise, Datum) ausräumen, falls vorhanden.
  - „Über"-Dialog auf 1.0.0 und aktualisiertes Copyright.
  - SCG-Table-Hilfe-Tab-Verweise prüfen, falls Wiki-Embeds oder Properties-Editor dort eingreifen.
- **Lizenz- und Dependency-Review**: alle über die sechs Epics dazugekommenen Dependencies (voraussichtlich `js-yaml`, `markdown-it-mark`, `markdown-it-footnote`, ggf. weitere) auf Lizenz und Wartungsstand prüfen. Update der Lizenz-Sektion in der README falls nötig.
- **Cross-Cutting-Tests**: vollständige Tastenkürzel-Tabelle aus dem Hilfe-Dialog manuell durchgehen (Smoke-Test pro Hotkey, nach 3E-0015 doppelt wichtig). Vollständige Funktions-Tabelle aus dem Hilfe-Dialog manuell durchgehen, ob alle neuen Funktionen ausgeführt werden können. Portable- und Setup-EXE-Vergleich.
- **CHANGELOG-Eintrag für 1.0.0**, Release-Notes-Sondervariante mit Rückblick über die 0.x-Reihe, Tag und GitHub-Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Differenzielle Updates** über `electron-updater` (Blockmap-basiert). Auto-Install bringt zunächst nur das volle Setup-EXE; Block-Updates kommen, wenn überhaupt, in einem späteren Minor.
- **Cross-Plattform-Build** (Mac, Linux). Bleibt Windows-only.
- **Neue Funktionen**, die nicht in den vorhergegangenen Epics enthalten waren. 1.0.0 ist Konsolidierung, kein Feature-Release.
- **Refactoring um des Refactorings willen**. Nur dort eingreifen, wo Performance- oder Stabilitäts-Audit es nötig macht.
- **Test-Automatisierung** (Unit- oder Integrations-Tests). Wäre ein eigenes Projekt-Vorhaben; 1.0.0 bleibt beim etablierten manuellen Test-Workflow.

## Untergeordnete Tasks

Werden zu Beginn der Epic-Umsetzung als 4T-Dateien angelegt. Vorgesehene Tasks:

1. **PDF-Export-Wiederanlauf** — Re-Evaluation der drei Varianten aus [4T-0024](4T-0024-pdf-export.md), Umsetzung der gewählten Variante.
2. **Code-Signing** — Zertifikats-Beschaffung und Einbau in die Build-Pipeline. Eigener Task, weil mit externer Lieferzeit verbunden.
3. **Auto-Install und Auto-Download** — Umsetzung von [4T-0032](4T-0032-auto-install.md) auf Basis der in 4T-0029 etablierten Infrastruktur. Voraussetzung: Task 2 abgeschlossen.
4. **Performance-Audit und -Fixes** — Profilierung der genannten Hotspots, gezielte Optimierungen.
5. **Bugfix-Sweep und Cross-Cutting-Tests** — Sitzungs-Wiederherstellung, Multi-Window, Theme-Wechsel, Drag-and-Drop. Behebung der dabei gefundenen Defekte.
6. **Doku-Konsolidierung und Lizenz-Review** — README, Hilfe-Dialog, CHANGELOG-Glättung, Über-Dialog, Dependency-Lizenzen.
7. **Abschluss-Sammeltask 1.0.0** — Release-Notes mit 0.x-Rückblick, CHANGELOG-Eintrag, README-Status-Sektion, Test-Iteration, Tag und GitHub-Release.

Falls Code-Signing nicht im 1.0.0-Fenster realisierbar ist, fallen Tasks 2 und 3 raus, und das Epic schließt ohne Auto-Install. Die 1.0.0-Reife ist dadurch nicht gefährdet, weil die Update-Erkennung mit Link zur Release-Seite seit 0.11.0 etabliert ist.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **PDF-Export-Variante**: Re-Evaluation der drei in [4T-0024](4T-0024-pdf-export.md) dokumentierten Varianten (A, B, B+) im Licht des aktuellen Render-Pane-Stands (KaTeX, Mermaid, Callouts, Embeds). Wahrscheinlich Variante B+, weil sie laut Task-Dokumentation die robusteste Lösung war; finale Wahl beim Task-Start.
- **Code-Signing-Zertifikat**: OV reicht für die SmartScreen-Reputation-Akkumulation und ist deutlich günstiger als EV. EV würde sofort SmartScreen-Reputation liefern, ist aber hardware-gebunden (USB-Token) und teuer. Empfehlung: OV, falls Reputations-Aufbau über Zeit akzeptabel ist.
- **Performance-Mess-Methode**: Electron-DevTools-Profiler für Render- und Live-Preview-Hotspots, einfache Zeitmessung im Code für Indizes-Aufbau, `npm run build` mit Bundle-Analyzer für die Bundle-Größe.
- **1.0.0-Release-Notes-Format**: nicht nur das, was sich zu 0.21.0 geändert hat, sondern ein Rückblick über die gesamte 0.x-Reihe mit Highlights pro Minor. Vorbild sind die Major-Release-Notes etablierter Open-Source-Projekte.
- **README-Status-Sektion**: bisher chronologische Aufzählung der Releases. Bei 1.0.0 umschreiben in eine thematische Übersicht („Funktionsumfang in fünf Bereichen: Editor, Render, Vernetzung, Komfort, System").

## Reihenfolge der Umsetzung

1. **PDF-Export-Wiederanlauf zuerst.** Eigenständig, nicht abhängig von Code-Signing. Hat klare Wiederanlauf-Varianten im bereits geschriebenen Task.
2. **Code-Signing parallel anstoßen** (Beschaffung mit Lieferzeit), inhaltliche Umsetzung in der Build-Pipeline erfolgt nach Eingang.
3. **Auto-Install nach Code-Signing.** Setzt darauf auf.
4. **Performance-Audit als nächster Block.** Liefert Fix-Tasks, die punktuell eingebaut werden.
5. **Bugfix-Sweep und Cross-Cutting-Tests** danach. Hier kommen die meisten manuellen Tests.
6. **Doku-Konsolidierung** als vorletzter Schritt, weil sie auf den endgültigen Funktionsstand zugreift.
7. **Abschluss-Sammeltask 1.0.0** schließt das Epic, das Meta-Programm und den 0.x-Versionsbogen ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- [src/main/main.js](../../src/main/main.js) — Auto-Install-Flow, PDF-Export-IPC.
- [src/main/preload.js](../../src/main/preload.js) — Performance-Optimierungen im Render-Pfad (falls nötig).
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — PDF-Export-UI-Trigger, Performance-Optimierungen.
- [src/renderer/styles.css](../../src/renderer/styles.css) — `@media print`-Regeln für PDF-Export, sodass Statusbar, Sidebar, Tabs und Copy-Buttons ausgeblendet sind.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — PDF-Export- und Auto-Install-Strings.
- [README.md](../../README.md) — Status-Sektion umgeschrieben, Funktionsumfang vollständig.
- [CHANGELOG.md](../../CHANGELOG.md) — 1.0.0-Eintrag.
- [package.json](../../package.json) — Version-Bump auf 1.0.0, Code-Signing-Konfiguration in `build.win`.
- `dist/release-notes-1.0.0.md` — Sonderformat mit 0.x-Rückblick.
- `build/installer.nsh` — falls Code-Signing zusätzliche NSIS-Anpassungen braucht.
- [4T-0024](4T-0024-pdf-export.md), [4T-0032](4T-0032-auto-install.md) — Status-Aktualisierung beim Wiederanlauf, „Lösung"-Abschnitt befüllen.

## Offene Punkte / Risiken

- **Code-Signing-Lieferzeit**: OV-Zertifikate kommen üblicherweise in ein bis zwei Wochen, EV-Zertifikate können länger dauern. Falls die Beschaffung 1.0.0 verzögern würde, Code-Signing und Auto-Install in ein 1.1.0-Patch verschieben.
- **PDF-Export-Komplexität**: die in 4T-0024 dokumentierten Schwierigkeiten waren real. Risiko, dass eine der drei Varianten beim Wiederanlauf erneut scheitert. Mitigation: zuerst Spike-artiger Test, dann Commitment zur Variante. Im Notfall PDF-Export erneut zurückstellen — dann muss aber im Release-Bericht klar kommuniziert werden, dass 1.0.0 ohne PDF-Export released wird, und die README-Status-Sektion das nicht verspricht.
- **Performance-Regressionen aus Live-Preview (3E-0014)**: das größte funktionale Risiko. Wenn Live-Preview bei größeren Dateien spürbar bremst, muss in 1.0.0 nachoptimiert werden, bevor 1.0.0 ausgerufen wird.
- **Doku-Konsolidierung-Aufwand unterschätzt**: nach sechs Feature-Epics werden README und Hilfe-Dialog deutlich gewachsen sein. Realistisch einplanen, dass dieser Task länger dauert als ein typischer Doku-Task.
- **1.0.0-Erwartungshaltung extern**: ein Major-Sprung weckt Erwartungen (Stabilität, Migrationssicherheit, Roadmap-Klarheit für 1.x). Release-Notes sollten transparent benennen, was 1.0.0 bedeutet (Featurevollständigkeit der 0.x-Roadmap) und was nicht (Cross-Platform, automatisierte Tests, etc.).
- **Versions-Konvention nach 1.0.0**: noch nicht entschieden, ob künftig nach SemVer (Breaking Change = Major, Feature = Minor, Fix = Patch) gearbeitet wird, oder ob 1.x weiterhin als Sammelversionierung läuft. Klärung Richtung Ende des Epics sinnvoll, damit der erste 1.x-Patch konsistent versioniert ist.
