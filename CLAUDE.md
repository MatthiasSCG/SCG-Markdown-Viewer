# Projektkonventionen für Claude Code

Diese Datei dokumentiert verbindliche Arbeitsabläufe für das Projekt. Sie ergänzt die persönlichen Vorlieben aus `~/.claude/CLAUDE.md` (Deutsch, Umlaute, etc.).

## Release-Prozess: Tag + GitHub-Release bei jedem Versionssprung

Wenn ein Commit eine neue Version setzt (z.B. `package.json` von `0.4.0` auf `0.5.0`), nach `git push` **immer zusätzlich** folgendes durchführen — sonst ist die neue Version nur als Commit, aber nicht als Release auf GitHub sichtbar (und der Hauptmonitor unter „Releases" zeigt weiter die alte Version als „Latest").

### 1. EXEs bauen

```bash
npm run build
```

Erzeugt zunächst die EXEs unter `dist/`. Ein `postbuild`-Hook (`scripts/archive-build.js`) verschiebt anschließend `Markdown Viewer-<version>-Setup.exe` und `Markdown Viewer-<version>-Portable.exe` automatisch in den **Versions-Archiv-Ordner `releases/`**. `dist/` bleibt damit reiner Build-Output und enthält nur das aktuelle Build inklusive Zwischenprodukten (`win-unpacked/`, `*.blockmap`, Uninstaller). Bestehende EXEs älterer Versionen sammeln sich in `releases/`.

Beide Ordner sind gitignored — die EXEs hängen am GitHub-Release.

### 2. Tag anlegen und pushen

```bash
git tag v<MAJOR>.<MINOR>.<PATCH> <commit-sha>
git push origin v<MAJOR>.<MINOR>.<PATCH>
```

Format: immer `v` vorangestellt (z.B. `v0.5.0`).

### 3. GitHub-Release anlegen

```bash
gh release create v0.5.0 \
  --title "v0.5.0 — <Schlagwort>" \
  --notes-file <notes-tempfile.md> \
  --latest \
  "releases/Markdown Viewer-0.5.0-Setup.exe" \
  "releases/Markdown Viewer-0.5.0-Portable.exe"
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
