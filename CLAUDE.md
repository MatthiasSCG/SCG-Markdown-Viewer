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
- **Smoke-Test bei Änderungen an Preload, Main oder Build-Konfiguration:** Vor der Test-Aufforderung an den Nutzer selbst per Doppelklick die frisch gebaute Portable-EXE starten und prüfen, ob das Fenster erscheint. Bei reinen Renderer-Änderungen genügt der Build-Erfolg. Hintergrund: in 4T-0017 (0.9.0) startete die App nicht, weil ein `webFrame`-Aufruf zur Modul-Lade-Zeit das Preload-Skript abbrechen ließ. Der Build lief sauber durch, der Renderer kam aber nie hoch und das Fenster blieb unsichtbar.

## Abschluss-Sammeltask am Epic-Ende

Jeder Epic-Versionssprung wird durch einen **Abschluss-Sammeltask** abgeschlossen, der alle nachgelagerten Doku- und Release-Arbeiten bündelt. Er wird nicht zu Epic-Beginn angelegt, sondern erst, wenn alle Umsetzungs-Tasks des Epics auf „Test bestanden" stehen — sonst wandern Detail-Entscheidungen aus den Umsetzungs-Tasks vorzeitig in den Sammeltask. Vorbilder im Repo: [4T-0010](Projektmanagement/Aufgaben/4T-0010-changelog-release-060.md) (für 0.6.0), [4T-0026](Projektmanagement/Aufgaben/4T-0026-changelog-release-080.md) (für 0.8.0).

**Standard-Inhalte** des Sammeltasks (Checkliste, in dieser Reihenfolge):

1. **Hilfe-Dialog erweitern** — neue Funktionen und Shortcuts in `HELP_FEATURE_GROUPS` / `HELP_SHORTCUTS` in [src/renderer/renderer.js](src/renderer/renderer.js), zugehörige i18n-Keys in allen fünf Sprachen. Neue Funktions-Einträge in die passende Gruppe (Datei und Sitzung, Bearbeitung, Ansicht, Navigation, Allgemein) einsortieren. Details im Abschnitt [Hilfe-Dialog bei neuen Funktionen erweitern](#hilfe-dialog-bei-neuen-funktionen-erweitern).
2. **CHANGELOG.md** — neuer Block `## [X.Y.Z] - JJJJ-MM-TT — <Untertitel>` ganz oben, Verweis auf das Epic im einleitenden Absatz. Subsektionen wie „Neu", „Geändert", „Behoben", „i18n".
3. **Release-Notes** — `dist/release-notes-X.Y.Z.md` aus `docs/release-notes-template.md` ableiten (gitignored). Auf Deutsch mit Umlauten, sektioniert wie im Template beschrieben.
4. **README.md aktualisieren** — Status-Sektion (vorletztes Kapitel) auf die neue Version und ein bis zwei Sätze über die Schwerpunkte des Releases umschreiben. Funktionsumfang-Subsektionen (`### Markdown-Umfang`, `### Hilfe-Dialog`, ggf. `### Theme`, `### Statusbar` oder andere thematisch passende Stellen) um neue Features oder geänderte Beschreibungen ergänzen — bei reinen Bugfix-Releases entfallend. Insbesondere `### Hilfe-Dialog` muss die Tab-Struktur und die Funktions-Gruppen widerspiegeln; harte Stückzahlen wie „19 Bullets" oder „17 Zeilen Tastenkürzel" sollten vermieden werden, weil sie schnell veralten. Tastenkürzel-Tabelle um die neuen Bindings ergänzen, sofern welche dazugekommen sind. EXE-Dateinamen im Build-Abschnitt sind über den Platzhalter `<version>` versionsfrei gehalten und brauchen keine Pflege.
5. **Test-Iteration mit dem Nutzer** — Portable-EXE bauen und Nutzer prüfen lassen, ob Hilfe-Dialog-Inhalte sitzen, die Release-Notes inhaltlich passen und die README-Status-Sektion stimmt. **Erst nach Freigabe** weiter.
6. **Commit, Tag, GitHub-Release** — siehe Abschnitt [Release-Prozess: Tag + GitHub-Release bei jedem Versionssprung](#release-prozess-tag--github-release-bei-jedem-versionssprung). Der Release-Tag soll auf dem Commit liegen, der den finalen Doku-Stand trägt.
7. **Status-Updates** — alle Umsetzungs-Tasks des Epics, der Sammeltask selbst und das Epic auf `Erledigt`.

**Hinweise zur Reihenfolge:**

- Erst Doku-Texte schreiben (Schritte 1–4), dann Test-Iteration (Schritt 5), **erst danach** Commit + Build + Tag + Release (Schritt 6). So bleibt der finale Doku-Stand am Release-Tag verankert; nachträgliche Doku-Korrekturen würden sonst hinter dem Tag stehen und im Release-Asset fehlen.
- Sammeltask-ID ist die nächste freie 4T-Nummer; sie bezieht sich nicht auf eine fortlaufende Sammeltask-Reihe und ist daher nicht „4T-0010 → 4T-0011" o.ä., sondern folgt einfach der Reihenfolge der angelegten Tasks im Projekt.

## Release-Prozess: Tag + GitHub-Release bei jedem Versionssprung

Dieser technische Ablauf ist Teil des Abschluss-Sammeltasks (Schritt 6, siehe Abschnitt davor) und wird bei jedem Versionssprung in dieser Form durchgeführt.

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
gh release create v0.11.0 \
  --title "v0.11.0 — <Schlagwort>" \
  --notes-file <notes-tempfile.md> \
  --latest \
  "releases/SCG Markdown-0.11.0-Setup.exe" \
  "releases/SCG Markdown-0.11.0-Portable.exe" \
  "releases/SCG Markdown-0.11.0-Setup.exe.blockmap" \
  "releases/latest.yml"
```

- `--latest` setzt die neue Version als „Latest" auf der GitHub-Repo-Seite.
- Bei Bugfix-Tags ohne neue Features (z.B. `--latest=false`) entsprechend nicht setzen.
- **Vier Asset-Dateien ab 0.11.0**: zusätzlich zu Setup- und Portable-EXE werden seit der Einführung der Update-Erkennung in 4T-0029 zwei weitere Dateien als Asset gebraucht:
  - `latest.yml` — Update-Manifest für `electron-updater`. Ohne diese Datei meldet die Update-Prüfung in der installierten App „no published versions on GitHub".
  - `SCG Markdown-<version>-Setup.exe.blockmap` — Blockmap für künftige differenzielle Updates (relevant ab 4T-0032).
  Beide Dateien werden vom `postbuild`-Hook (`scripts/archive-build.js`) automatisch nach `releases/` verschoben.

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

Der Hilfe-Dialog (`F1` oder Hilfe-Menü) hat seit 0.9.0 zwei Reiter — **Funktionen** und **Tastenkürzel**. Die Funktionen sind in fünf Gruppen sortiert: Datei und Sitzung, Bearbeitung, Ansicht, Navigation, Allgemein. Beide Tabs werden dynamisch aus i18n-Keys gerendert (siehe `renderHelpContent()` in `src/renderer/renderer.js`).

Bei jeder neuen Funktionalität, die das Verhalten der App nach außen ändert, ist der Hilfe-Dialog mit zu pflegen — sonst veraltet er.

### Neues Feature → Funktions-Liste erweitern

1. Neuen i18n-Key `help.feature.<name>` in allen **fünf** Sprachdateien (`src/i18n/de.json` / `en.json` / `fr.json` / `es.json` / `it.json`) anlegen. Beschreibung: 1 Satz, was das Feature tut.
2. Den neuen Key in `HELP_FEATURE_GROUPS` in `src/renderer/renderer.js` an passender Stelle einfügen — in die thematisch passende Gruppe, Reihenfolge innerhalb der Gruppe bestimmt die Anzeige im Modal. Falls keine bestehende Gruppe passt, **nicht** spontan eine neue Gruppe erfinden, sondern zuerst überlegen, ob das Feature wirklich neu genug ist oder besser in eine bestehende Gruppe passt.

### Neuer Shortcut → Tastenkürzel-Tabelle erweitern

1. Neuen i18n-Key `help.shortcut.<name>` in allen **fünf** Sprachdateien anlegen.
2. Eintrag in `HELP_SHORTCUTS` in `src/renderer/renderer.js` mit:
   - `keys`: Array von Tasten-Strings, z.B. `['Strg+K']` oder mehrere Varianten wie `['F3', 'Umschalt+F3']`. Einzelne Tasten innerhalb eines Strings sind durch `+` getrennt.
   - `descKey`: der i18n-Key aus Schritt 1.
3. Falls eine neue Taste verwendet wird, die noch nicht in `KEY_LABEL_KEY` (Strg, Umschalt, Alt, Tab, Enter, Esc, Mittlere Maustaste, Mausrad) steht: dort ergänzen und einen neuen `help.key.<name>`-Key in allen fünf Sprachen anlegen, damit die Tastennamen lokalisiert werden (z.B. „Strg" / „Ctrl" / „Maj" / „Mayús" / „Maiusc").

### CHANGELOG-Eintrag

Im `CHANGELOG.md` zur aktuellen Version einen Punkt ergänzen, dass die Hilfe-Inhalte erweitert wurden — inklusive Anzahl der neuen i18n-Keys.

## i18n-Konventionen

### Anführungszeichen in i18n-Strings

In JSON-Strings ist `"` der String-Begrenzer. Innerhalb des Strings darf kein nicht-escaptes ASCII-`"` stehen, sonst terminiert der JSON-Parser den String vorzeitig — auch wenn das Zeichen optisch wie ein Anführungszeichen rund um einen Platzhalter wirken soll.

**Beispiel:** in einem deutschen i18n-Wert soll der Wiki-Link-Name `{target}` in Anführungszeichen gesetzt werden.

- **Falsch** (terminiert JSON-String nach `Ziel „`):
  ```json
  "linter.brokenWikiLink.tooltip": "Ziel „{target}" nicht gefunden."
  ```
- **Richtig** (einfache Quotes):
  ```json
  "linter.brokenWikiLink.tooltip": "Ziel '{target}' nicht gefunden."
  ```
- **Auch richtig** (Unicode-Anführungszeichen, JSON-neutral):
  ```json
  "linter.brokenWikiLink.tooltip": "Ziel «{target}» nicht gefunden."
  ```

Regel: ASCII-`"` ausschließlich als JSON-String-Begrenzer, niemals im Text-Inhalt. Wenn ein typografisches Anführungszeichen gewünscht ist, dann Unicode-Variante verwenden, ansonsten einfache Quotes. Aufgekommen bei 4T-0020 (0.9.0), wo das DE-Linter-Tooltip zunächst mit gemischten Anführungszeichen geschrieben war und nur durch die nachträgliche JSON-Validierung als syntaktisch defekt aufgefallen ist.
