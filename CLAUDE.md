# Projektkonventionen für Claude Code

Diese Datei dokumentiert verbindliche Arbeitsabläufe für das Projekt. Sie ergänzt die persönlichen Vorlieben aus `~/.claude/CLAUDE.md` (Deutsch, Umlaute, etc.).

## Aufgabenverfolgung: lokales PM statt GitHub-Issues

**Abweichung von der globalen Regel** in `~/.claude/project-standards.md`: Epics und Tasks werden in diesem Projekt **lokal** im Ordner `Projektmanagement/Aufgaben/` als Markdown-Dateien geführt, nicht über GitHub-Issues. Grund: Die Konzept- und Designphasen erfordern ausführliche Begründungen, Lösungsansätze und Architekturentscheidungen, die als bidirektional verlinkte Markdown-Dokumente lesbarer und einfacher pflegbar sind als GitHub-Issues. Die bisherigen Issues [#1](https://github.com/MatthiasSCG/SCG-Markdown-Viewer/issues/1) und [#2](https://github.com/MatthiasSCG/SCG-Markdown-Viewer/issues/2) bleiben als historische Spur aus der Frühphase erhalten, neue Vorgänge ab Version 0.6.0 werden lokal angelegt.

ID-Konventionen, Datei-Struktur, Status-Werte und Workflow stehen in [Projektmanagement/README.md](Projektmanagement/README.md).

## Test-Phase: EXE-Build vor jeder Test-Aufforderung

Vor jeder Aufforderung an den Nutzer, einen Task manuell zu testen, wird ein vollständiger EXE-Build durchgeführt:

```bash
npm run build
```

Der Nutzer testet ausschließlich mit der frisch gebauten **Portable-EXE** aus `releases/`, nicht mit `npm start`. Grund: Im Dev-Modus und im gepackten Build verhalten sich Pfade, Asar-Bundling und `asarUnpack`-Konfiguration unterschiedlich. Nur die EXE entspricht dem späteren Auslieferungszustand und deckt diese Diskrepanzen ab.

Konventionen:

- **Portable-EXE** als Standard-Test-Variante (`SCG Markdown-<version>-Portable.exe`, vor dem Rebranding mit 4T-0011 hieß sie `Markdown Viewer-<version>-Portable.exe`). Sie braucht keine Installation und überschreibt keine bestehende Installation.
- Die Setup-EXE wird vom selben Build-Lauf mitgeliefert, ist für Task-Tests aber nicht zwingend.
- Während der Entwicklung einer Version trägt `package.json` bereits die **Zielversion** der laufenden Entwicklung (z.B. `0.6.0`, sobald die Arbeit an 0.6.0 beginnt). So überschreiben Test-EXEs nicht die offizielle EXE der Vorgängerversion in `releases/` und sind eindeutig der laufenden Entwicklung zuordenbar. Die offizielle Release-Notes-Veröffentlichung der neuen Version bleibt dennoch der letzte Schritt im Versionssprung (siehe Release-Prozess unten).
- `releases/` ist per `.gitignore` ausgeschlossen, der Build-Output landet nicht im Repo.

## Release-Prozess: Tag + GitHub-Release bei jedem Versionssprung

Wenn ein Commit eine neue Version setzt (z.B. `package.json` von `0.4.0` auf `0.5.0`), nach `git push` **immer zusätzlich** folgendes durchführen — sonst ist die neue Version nur als Commit, aber nicht als Release auf GitHub sichtbar (und der Hauptmonitor unter „Releases" zeigt weiter die alte Version als „Latest").

### 1. EXEs bauen

```bash
npm run build
```

Erzeugt zunächst die EXEs unter `dist/`. Ein `postbuild`-Hook (`scripts/archive-build.js`) verschiebt anschließend `SCG Markdown-<version>-Setup.exe` und `SCG Markdown-<version>-Portable.exe` automatisch in den **Versions-Archiv-Ordner `releases/`** (vor dem Rebranding mit 4T-0011 hießen sie `Markdown Viewer-<version>-*.exe`). `dist/` bleibt damit reiner Build-Output und enthält nur das aktuelle Build inklusive Zwischenprodukten (`win-unpacked/`, `*.blockmap`, Uninstaller). Bestehende EXEs älterer Versionen sammeln sich in `releases/`.

Beide Ordner sind gitignored — die EXEs hängen am GitHub-Release.

### 2. Tag anlegen und pushen

```bash
git tag v<MAJOR>.<MINOR>.<PATCH> <commit-sha>
git push origin v<MAJOR>.<MINOR>.<PATCH>
```

Format: immer `v` vorangestellt (z.B. `v0.5.0`).

### 3. GitHub-Release anlegen

```bash
gh release create v0.6.0 \
  --title "v0.6.0 — <Schlagwort>" \
  --notes-file <notes-tempfile.md> \
  --latest \
  "releases/SCG Markdown-0.6.0-Setup.exe" \
  "releases/SCG Markdown-0.6.0-Portable.exe"
```

- `--latest` setzt die neue Version als „Latest" auf der GitHub-Repo-Seite.
- Bei Bugfix-Tags ohne neue Features (z.B. `--latest=false`) entsprechend nicht setzen.

### Release-Notes-Struktur

**Vorlage**: [docs/release-notes-template.md](docs/release-notes-template.md). Datei kopieren nach `dist/release-notes-<version>.md` (gitignored, taucht im Repo nicht auf), Platzhalter `{{...}}` ersetzen, beim `gh release create` per `--notes-file` referenzieren.

Kurzfassung des Aufbaus (Details in der Vorlage):

1. **Untertitel**: ein Satz, was die Version besonders macht
2. **Download**: Tabelle mit Setup-EXE und Portable-EXE und kurzer Beschreibung
3. **Was ist neu seit v<vorherige Version>**: sektioniert (z.B. „Suche", „Fenster-Status", „Verbessert", „Behoben") mit Bullet-Listen
4. **System-Anforderungen**: Windows 11 (Windows 10 sollte auch funktionieren), keine Laufzeitumgebung nötig
5. **Hinweise**: SmartScreen-Warnung mangels Code-Signing, Migrations-Hinweise
6. **Link zum CHANGELOG.md** am Ende

Notes auf **Deutsch** mit Umlauten, im Stil der bisherigen Releases (`gh release view v0.5.0` als aktuelle Referenz).

## Hilfe-Dialog bei neuen Funktionen erweitern

Der `?`-Knopf rechts neben „Über" in der Toolbar öffnet ein Modal mit zwei Sektionen — **Funktionen** und **Tastenkürzel**. Beide werden dynamisch aus i18n-Keys gerendert (siehe `renderHelpContent()` in `src/renderer/renderer.js`).

Bei jeder neuen Funktionalität, die das Verhalten der App nach außen ändert, ist der Hilfe-Dialog mit zu pflegen — sonst veraltet er.

### Neues Feature → Funktions-Liste erweitern

1. Neuen i18n-Key `help.feature.<name>` in allen **fünf** Sprachdateien (`src/i18n/de.json` / `en.json` / `fr.json` / `es.json` / `it.json`) anlegen. Beschreibung: 1 Satz, was das Feature tut.
2. Den neuen Key in `HELP_FEATURES` in `src/renderer/renderer.js` an passender Stelle einfügen — die Reihenfolge bestimmt die Anzeige im Modal.

### Neuer Shortcut → Tastenkürzel-Tabelle erweitern

1. Neuen i18n-Key `help.shortcut.<name>` in allen **fünf** Sprachdateien anlegen.
2. Eintrag in `HELP_SHORTCUTS` in `src/renderer/renderer.js` mit:
   - `keys`: Array von Tasten-Strings, z.B. `['Strg+K']` oder mehrere Varianten wie `['F3', 'Umschalt+F3']`. Einzelne Tasten innerhalb eines Strings sind durch `+` getrennt.
   - `descKey`: der i18n-Key aus Schritt 1.
3. Falls eine neue Taste verwendet wird, die noch nicht in `KEY_LABEL_KEY` (Strg, Umschalt, Alt, Tab, Enter, Esc, Mittlere Maustaste) steht: dort ergänzen und einen neuen `help.key.<name>`-Key in allen fünf Sprachen anlegen, damit die Tastennamen lokalisiert werden (z.B. „Strg" / „Ctrl" / „Maj" / „Mayús" / „Maiusc").

### CHANGELOG-Eintrag

Im `CHANGELOG.md` zur aktuellen Version einen Punkt ergänzen, dass die Hilfe-Inhalte erweitert wurden — inklusive Anzahl der neuen i18n-Keys.
