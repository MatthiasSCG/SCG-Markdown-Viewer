# 3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation

**Status**: Offen
**Zielversion**: 0.6.0
**Vorgängerversion**: 0.5.1

## Ziel

Markdown-Viewer um eine vollwertige **Edit-Komponente** erweitern und die UI-Bedienung in Richtung moderner Editor-Layouts umbauen:

- Standard bleibt der Ansichtsmodus. Per Toggle und Tastatur (`Strg+E`) wechselt der Quellcode-Bereich in einen vollwertigen Editor. Edit ist nur in den Modi „Quellcode" und „Geteilt" möglich, niemals in der reinen Render-Ansicht.
- Die wachsende Toolbar oben wird durch eine **native Electron-Menüleiste** mit den Menüs **Datei**, **Ansicht** und **Hilfe** ersetzt.
- Die häufig genutzten Quick-Toggles **Gerendert / Geteilt / Quellcode / Nummern / Umbruch** wandern nach unten in eine **Statusbar**, in derselben Zeile wie das ein- und ausblendbare Such-Overlay.
- Im Edit-Modus zusätzlich **Suchen und Ersetzen** (`Strg+H`).
- Dateioperationen über das Datei-Menü: Neu, Öffnen, Zuletzt (10 Einträge), Speichern, Speichern unter.
- Ungespeicherte Änderungen werden mit `•` im Fenster- und Tab-Titel markiert, beim Schließen erscheint ein Bestätigungsdialog.
- Sitzungswiederherstellung wandert vom Toolbar-Haken ins Hilfe-Menü als Toggle-Eintrag mit Häkchen.

## Warum

- Der Markdown-Viewer ist seit 0.5.1 als reiner Reader stabil. Der natürliche nächste Schritt ist die Bearbeitung, womit die App vom Konsumenten zum schlanken Markdown-Editor wird, ohne die Reader-Qualität zu verlieren.
- Die Toolbar oben ist über die Versionen 0.1 bis 0.5 stark gewachsen (Öffnen, Zuletzt, Umbruch, Nummern, Quellcode, Geteilt, Gerendert, Sitzungs-Haken, Sprache, Über, Hilfe). Weitere Einträge in 0.6.0 (Edit, Speichern, Speichern unter) würden sie endgültig überladen.
- Eine native Menüleiste ist Windows-konform (ALT-Aktivierung, Mnemonics, automatische Shortcut-Anzeige) und entlastet die Toolbar.
- Quick-Toggles in einer Statusbar unten entsprechen modernen Editor-Layouts (VS Code, JetBrains, Sublime). Suche im selben Streifen vereinfacht die mentale Geographie.

## Umfang und Abgrenzung

**Im Umfang:**

- Native Electron-Menüleiste mit Datei, Ansicht, Hilfe, dynamisch aus den fünf Sprachdateien aufgebaut, mit Häkchen für Toggle-Zustände
- Statusbar unten mit View-Toggles (Gerendert/Geteilt/Quellcode), Quellcode-Optionen (Nummern/Umbruch), Edit-Toggle und ein-/ausblendbarem Such-Overlay
- Editor-Engine für den Quellcode-Bereich (CodeMirror 6 mit Markdown-Sprachpaket)
- Dirty-State mit `•`-Markierung in Fenster- und Tab-Titel
- Speichern (Strg+S), Speichern unter (Strg+Umschalt+S), Schließen-Dialog bei ungespeicherten Änderungen mit drei Optionen (Speichern / Verwerfen / Abbrechen)
- Recent Files (10 Einträge, persistent in `userData`)
- „Neu" und „Öffnen…" erzeugen jeweils ein **neues Fenster**, nicht Ersatz des aktuellen Inhalts
- Suchen und Ersetzen (`Strg+H`) im Edit-Modus, nur dort aktivierbar
- Sitzungswiederherstellung als Toggle-Menüeintrag mit Häkchen im Hilfe-Menü, Toolbar-Checkbox entfernt
- **Auto-Save als optionales Feature** (opt-in): Toggle im Datei-Menü, speichert 2 s nach Inaktivität oder bei Fenster-Fokusverlust, nur für Buffer mit Pfad, 1-Sekunden-Statusbar-Hinweis nach jedem Save
- **Rebranding** der App von „Markdown Viewer" zu **„SCG Markdown"** inkl. Settings-Migration aus altem Pfad
- Hilfe-Dialog um neue Features (Edit-Modus, Suchen-Ersetzen, Dirty-State, Auto-Save) und Shortcuts (Strg+E, Strg+S, Strg+Umschalt+S, Strg+H, Strg+N, Strg+1/2/3, F1) ergänzen
- CHANGELOG-Eintrag, Release-Notes, Version-Bump 0.5.1 → 0.6.0

**Nicht im Umfang (für 0.6.0):**

- WYSIWYG-Bearbeitung in der gerenderten Vorschau
- Auto-Save als Default (Auto-Save ist opt-in, aktiv nur nach manueller Aktivierung — siehe oben)
- Encoding-Optionen (UTF-8/LF fest, kein BOM, keine Auswahl)
- Plugin- oder Erweiterungs-API für den Editor
- Markdown-Linter oder -Formatter
- Tabellen-Editor oder andere strukturelle Edit-Helfer

## Untergeordnete Tasks

- [x] [4T-0001 — Native Menüleiste mit Datei/Ansicht/Hilfe einführen](4T-0001-native-menueleiste.md)
- [x] [4T-0002 — Statusbar unten mit View-Toggles und Such-Overlay](4T-0002-statusbar-layout.md)
- [ ] [4T-0003 — Editor-Engine: CodeMirror 6 einbauen, readOnly toggelbar](4T-0003-editor-codemirror.md)
- [ ] [4T-0004 — Dirty-State, Speichern, Speichern unter, Schließen-Dialog](4T-0004-dirty-state-speichern.md)
- [ ] [4T-0005 — Recent Files (10 Einträge, persistent, Menü-Integration)](4T-0005-recent-files.md)
- [ ] [4T-0006 — Datei Neu und Öffnen erzeugen neues Fenster](4T-0006-neu-oeffnen-neues-fenster.md)
- [ ] [4T-0007 — Suchen und Ersetzen (Strg+H) im Edit-Modus](4T-0007-suchen-und-ersetzen.md)
- [x] [4T-0008 — Sitzungswiederherstellung als Toggle ins Hilfe-Menü](4T-0008-sitzungswiederherstellung-menue.md)
- [ ] [4T-0009 — Hilfe-Dialog erweitern (neue Features und Shortcuts, i18n)](4T-0009-hilfe-dialog-erweitern.md)
- [ ] [4T-0011 — Rebranding auf SCG Markdown (Name, AppId, Settings-Migration)](4T-0011-rebranding-scg-markdown.md)
- [ ] [4T-0010 — CHANGELOG, Release-Notes, Version-Bump auf 0.6.0](4T-0010-changelog-release-060.md)

## Architekturentscheidungen

- **Native Electron-Menüleiste pro Fenster** (über `BrowserWindow.setMenu`), nicht Custom-HTML-Dropdown. Begründung: Windows-konform (ALT/Mnemonics), Shortcuts erscheinen automatisch rechts im Menü, weniger Renderer-Code, robust für die seit 0.5.0 bestehende Multi-Window-Architektur. Custom-Dropdowns würden Multi-Window-Sync verkomplizieren.
- **CodeMirror 6** als Editor-Engine, keine Eigenentwicklung, kein Monaco. Begründung: leichtgewichtig (~150 KB statt mehrere MB), modulare Imports, gutes Markdown-Sprachpaket, MIT-Lizenz, aktiv gepflegt. Monaco wäre Overkill für eine Reader-orientierte App.
- **UTF-8/LF, kein BOM** als festes Speicherformat. Begründung: Markdown-Standard, keine Konfigurations-Last für den Nutzer, kompatibel mit Git-Konfiguration des Projekts (`.gitattributes` erzwingt ohnehin LF).
- **Edit nur in Quellcode- oder geteilter Ansicht.** Klick auf den Edit-Toggle in der Render-Ansicht wechselt automatisch zu „Geteilt" und aktiviert dann Edit. Begründung: Bearbeitung der Render-Vorschau wäre WYSIWYG und ist nicht im Umfang. Auto-Wechsel statt Disabled-Button spart einen Klick.
- **Neu und Öffnen erzeugen neues Fenster**, niemals Ersatz des aktuellen Inhalts. Begründung: Konsistent mit dem Multi-Window-Modell seit 0.5.0, kein Risiko, ungespeicherte Änderungen zu verlieren.
- **Dirty-Marker** als führendes `•` im Fenster- und Tab-Titel (z.B. `• README.md — Markdown Viewer`). Begründung: platzsparender als `*`, in vielen modernen Editoren etabliert, kein Plattform-Problem (App ist Windows-only).
- **Auto-Save bewusst opt-in, kein Default.** Begründung: Auto-Save kann zu unerwartetem Überschreiben führen, gerade bei Markdown-Dateien, die unter Git-Versionskontrolle stehen und bewusst commit-fertig sein sollen. Der Nutzer aktiviert es bewusst über das Datei-Menü und akzeptiert damit das Verhalten.
- **Rebranding auf „SCG Markdown" mit Settings-Migration.** Begründung: „Viewer" passt nicht mehr zu einer App mit Editor-Funktion. Beim ersten Start unter dem neuen `productName` migriert die App Settings aus dem alten Pfad (`<userData>/Markdown Viewer/config.json`), damit Recent Files, Sprache, Sitzungs-Toggle und View-Einstellungen erhalten bleiben. Alter Pfad wird defensiv nicht gelöscht.
- **Konflikt-Strategie bei externer Dateiänderung im Edit-Modus**: Wenn Buffer dirty ist, Reload abblocken und Nutzer fragen (Vorschlag: Modal mit „Vom Datenträger neu laden und Änderungen verwerfen" / „Eigene Version behalten"). Wenn Buffer nicht dirty, normaler Auto-Reload. Konkrete Implementierung in 4T-0003/4T-0004.

## Reihenfolge der Umsetzung

1. **4T-0001** Menüleiste-Fundament — alles weitere hängt davon ab
2. **4T-0002** Statusbar-Layout, alte Toolbar entkernen — danach ist die UI-Grundstruktur stabil
3. **4T-0008** Sitzungswiederherstellung migrieren — kleiner Schritt, sobald Menüleiste steht
4. **4T-0005** Recent Files — sobald Datei-Menü vorhanden
5. **4T-0006** Neu/Öffnen erzeugen neues Fenster
6. **4T-0003** Editor-Engine CodeMirror einbauen
7. **4T-0004** Dirty-State und Speichern — baut auf 4T-0003 auf
8. **4T-0007** Suchen und Ersetzen — baut auf 4T-0003 auf
9. **4T-0009** Hilfe-Dialog erweitern — sobald alle Features und Shortcuts feststehen
10. **4T-0011** Rebranding auf SCG Markdown — vor dem finalen Build, damit EXEs schon neue Namen tragen
11. **4T-0010** Version-Bump, CHANGELOG, Release-Notes

## Bezug zu Dateien

- `src/renderer/index.html` — Toolbar entkernen, Statusbar hinzufügen, Edit-Toggle, Replace-Overlay
- `src/renderer/renderer.js` — Edit-Toggle-Logik, Dirty-State, Editor-Initialisierung, Such-/Ersetzen-Routine
- `src/renderer/i18n.js` — Helper für dynamischen Menü-Aufbau bei Sprachwechsel
- `src/renderer/styles.css` — Statusbar-Layout, Edit-Cursor, Dirty-Markierung, Replace-Overlay
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys für Menü, Statusbar, Edit, Dirty, Speichern, Ersetzen, Hilfe
- `src/main/main.js` — Menü-Aufbau pro Fenster, IPC für Speichern/Öffnen/Neu, Schließen-Bestätigung
- neu: `src/main/menu.js` — Menü-Factory
- `src/main/preload.js` — neue IPC-Kanäle
- `package.json` — Version 0.5.1 → 0.6.0, `@codemirror/*` als Dependency
- `CHANGELOG.md` — Eintrag für 0.6.0
- neu: `docs/release-notes-0.6.0.md` (gitignored, für `gh release create`)

## Offene Punkte / Risiken

- **CodeMirror-Integration mit File-Watcher**: Auto-Reload extern geänderter Dateien (seit 0.3.x) muss im Edit-Modus mit Dirty-Buffer eine Konflikt-UX bekommen. Konkret in 4T-0003/4T-0004 zu entscheiden.
- **Multi-Window-Persistenz**: Ungespeicherte Buffer dürfen **nicht** in den Sitzungsspeicher wandern. Sitzungswiederherstellung darf bei Dirty-Stand entweder den Pfad ohne Inhalt wiederherstellen (= Datei neu laden) oder den Tab überspringen. Vorschlag: ungespeicherte Buffer werden bei Quit verworfen (mit Dialog), nur gespeicherte Pfade wandern in die Session. Konkret in 4T-0004 und 4T-0008.
- **i18n-Aufwand** für Menüleiste in fünf Sprachen ist erheblich, weil Mnemonics pro Sprache abgestimmt werden müssen (kein Buchstaben-Konflikt innerhalb desselben Menüs).
- **Single-Instance-Lock** seit 0.5.0: „Neu" und „Öffnen" müssen intern ein neues `BrowserWindow` öffnen und korrekt im Persistenz-Modell registrieren, ohne das Single-Instance-Lock zu umgehen. In 4T-0006 detailliert.
- **Settings-Migration beim Rebranding**: Wenn die Migration vom alten `Markdown Viewer`-Settings-Pfad fehlschlägt (z.B. korrupte JSON-Datei), darf die App nicht abbrechen, sondern startet mit Default-Settings und protokolliert den Fehler. Konkret in 4T-0011 abzudecken.
- **Auto-Save und externe Watcher-Loops**: Der File-Watcher-Mute-Mechanismus beim Auto-Save muss zuverlässig sein. Wenn Auto-Save und externer Editor gleichzeitig schreiben, sollte das Konflikt-Verhalten aus 4T-0003 greifen (Dirty-Buffer + externer Change). Konkret in 4T-0004 abzudecken.
