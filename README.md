# Markdown Viewer

Ein schlanker, lokaler Markdown-Viewer für Windows 11 mit Tab-Bedienung,
umschaltbarer Quellcode-/Render-Ansicht und Auto-Reload.

## Konzept

Diese Datei dokumentiert das vereinbarte Konzept und den Funktionsumfang.
Änderungen am Code werden in der [CHANGELOG.md](./CHANGELOG.md) festgehalten.

## Funktionsumfang

### Anzeige

- **Quellcode-Ansicht**: zeigt das rohe Markdown
- **Render-Ansicht**: zeigt die formatierte Darstellung
- **Geteilte Ansicht (Split)**: beide nebeneinander, per Maus verschiebbar
- Umschaltbar über die Toolbar; die zuletzt gewählte Ansicht wird gespeichert

### Tabs

- Beliebig viele Markdown-Dateien können gleichzeitig geöffnet sein
- Jede Datei läuft in einem eigenen Tab; Tabs lassen sich schließen
- Tabs können **per Drag & Drop** umsortiert oder zwischen den Spalten verschoben werden
- **Rechtsklick** auf einen Tab öffnet ein Kontextmenü mit "Nach links/rechts verschieben" und "Schließen"
- Klick auf einen `[Text](datei.md)`-Link öffnet die Zieldatei in einem neuen Tab
- Ist die Zieldatei in **irgendeiner** Spalte bereits offen, wird dorthin gesprungen (kein Duplikat)
- Pro Tab werden Scroll-Positionen (Quellcode und Render) separat gemerkt

### Zwei-Spalten-Layout

- Tabs können in eine **zweite Spalte** rechts daneben verschoben werden — beide Spalten haben eigene Tab-Leisten und unabhängige Inhalte
- Die Aktivierung erfolgt automatisch, sobald ein Tab nach rechts verschoben wird (per Drag, Kontextmenü oder `Strg + Alt + →`)
- Jede Spalte hat ihren **eigenen View-Modus** (Quellcode/Geteilt/Gerendert); die Toolbar wirkt auf die zuletzt angeklickte Spalte
- Wenn die letzte Datei einer Spalte geschlossen wird, klappt das Layout automatisch auf eine Spalte zusammen
- Die Splitter-Position zwischen den Spalten ist mit der Maus verschiebbar

### Datei öffnen

Drei Wege:

1. **Datei-Dialog** über den Button "Öffnen"
2. **Drag & Drop** einer oder mehrerer Dateien ins Fenster
3. **"Öffnen mit"** im Datei-Explorer (Datei-Assoziation, beim Build aktivierbar)

Zusätzlich speichert die Anwendung eine Liste der **zuletzt geöffneten Dateien**
(maximal 15), erreichbar über den Button "Zuletzt".

### Auto-Reload

Geöffnete Dateien werden überwacht. Ändert sich eine Datei extern (z. B.
durch einen Editor), wird der Tab-Inhalt automatisch aktualisiert. Wird die
Datei gelöscht, wird der Tab-Titel durchgestrichen markiert.

### Bilder

Relative Bildpfade in Markdown (`![Alt](bilder/foo.png)`) werden gegen den
Pfad des aktuellen Dokuments aufgelöst und als Base64-Data-URI eingebettet.

### Links

| Link-Art                    | Verhalten                              |
|-----------------------------|----------------------------------------|
| `https://...`, `http://...` | im Standard-Browser öffnen             |
| `mailto:...`                | im Standard-Mail-Programm öffnen       |
| `#anker`                    | im Dokument scrollen                   |
| `relative/datei.md`         | in neuem Tab öffnen                    |
| Andere relative Dateien     | werden ignoriert (vorerst)             |

### Sprachen

Die Oberfläche ist in fünf Sprachen verfügbar:

- Deutsch
- English
- Français
- Español
- Italiano

Beim ersten Start wird die Sprache aus der Windows-Locale erkannt
(Fallback: Englisch). Sie kann jederzeit über die Toolbar gewechselt werden.

### Theme

Light/Dark folgt dem Windows-System-Theme automatisch und wechselt mit, wenn
das System-Theme zur Laufzeit umgestellt wird.

### Sitzung

Die Einstellung **"Sitzung wiederherstellen"** (Toolbar) entscheidet, ob beim
nächsten Start die zuletzt geöffneten Tabs erneut geöffnet werden.

### Über-Dialog

Toolbar-Button **"Über"** (ganz rechts) oder Tastenkürzel **F1** öffnet
einen kleinen Dialog mit App-Name, Versionsnummer (dynamisch aus
`package.json`) und Credits. Schließen via Esc, Klick außerhalb oder OK.

### Markdown-Umfang

GitHub Flavored Markdown (GFM):

- Tabellen
- Task-Listen (`- [ ]` / `- [x]`)
- Strikethrough (`~~Text~~`)
- Auto-Links
- Code-Blöcke mit Sprachangabe (Syntax-Highlighting folgt später)

Zusätzlich:

- **Wiki-Links** im Stil von Obsidian/Logseq:
  - `[[Datei]]` — Link zu `Datei.md` im selben Verzeichnis
  - `[[Datei|Anzeigetext]]` — Link mit eigenem Text
  - Hat das Ziel bereits eine Endung (z. B. `[[bild.png]]`), wird sie nicht durch `.md` ersetzt

Mermaid-Diagramme, KaTeX-Mathe und Syntax-Highlighting sind **für eine
spätere Phase** vorgesehen.

### Read-only

Der Viewer bearbeitet keine Dateien. Es gibt keine Speichern-Funktion.

## Technik-Stack

- **Electron** als Anwendungsrahmen
- **markdown-it** + **markdown-it-task-lists** für GFM-Rendering
- **chokidar** für File-Watching
- **electron-store** für persistente Einstellungen

## Projektstruktur

```
0012_Markdown-Viewer/
├── README.md            (diese Datei)
├── CHANGELOG.md         (Änderungs-Historie)
├── package.json
├── build/
│   └── installer.nsh    (NSIS Custom-Hooks: Datei-Assoziations-Seite)
├── scripts/
│   └── build-icon.js    (SVG -> ICO/PNG-Konverter)
└── src/
    ├── main/
    │   ├── main.js      (Electron Main-Prozess)
    │   └── preload.js   (Brücke + Markdown-Rendering)
    ├── renderer/
    │   ├── index.html
    │   ├── styles.css
    │   ├── renderer.js  (UI-Logik, Tabs, Drag&Drop)
    │   └── i18n.js
    ├── i18n/
    │   ├── de.json
    │   ├── en.json
    │   ├── fr.json
    │   ├── es.json
    │   └── it.json
    └── assets/
        ├── markdown-mark.svg  (Quell-Logo, CC0)
        ├── icon.ico           (generiert)
        └── icon.png           (generiert)
```

## Entwicklung

### Voraussetzungen

- Node.js >= 20
- npm

### Setup

```bash
npm install
```

### Start (Entwicklungsmodus)

```bash
npm start
```

### Build (Windows)

```bash
# Beide Targets bauen (Installer + Portable)
npm run build

# Nur NSIS-Installer
npm run build:installer

# Nur Portable
npm run build:portable

# Icon aus SVG neu erzeugen (selten nötig)
npm run build:icon
```

Build-Ergebnisse landen unter `dist/`:

- `Markdown Viewer-0.2.0-Setup.exe` — klassischer Setup-Assistent (NSIS), Installation pro Benutzer (`%LOCALAPPDATA%\Programs\Markdown Viewer`), Start-Menü- und Desktop-Verknüpfung, sauberer Uninstaller. Eine Setup-Seite bietet die **optionale Datei-Assoziation** für `.md`, `.markdown`, `.mdown`, `.mkd` (Default: aktiviert, abwählbar)
- `Markdown Viewer-0.2.0-Portable.exe` — läuft ohne Installation, kein Eintrag im System; Datei-Assoziation ist hier technisch nicht möglich

> **Datei-Assoziation deaktivieren oder später ändern:** Windows-Einstellungen → Apps → Standard-Apps → Markdown Viewer (oder Endung `.md` suchen). Beim Deinstallieren werden eigene Registry-Einträge automatisch entfernt.

### Tastenkürzel

| Tastenkombination     | Aktion                                       |
|-----------------------|----------------------------------------------|
| `Strg + O`            | Datei öffnen                                 |
| `Strg + W`            | Aktiven Tab schließen                        |
| `Strg + Tab`          | Nächster Tab in aktiver Spalte               |
| `Strg + Shift + Tab`  | Vorheriger Tab in aktiver Spalte             |
| `Strg + Alt + →`      | Aktiven Tab in die rechte Spalte verschieben |
| `Strg + Alt + ←`      | Aktiven Tab in die linke Spalte verschieben  |
| Mittlere Maustaste    | Tab schließen                                |
| `F1`                  | Über-Dialog öffnen                           |
| `Esc`                 | Offene Menüs / About-Dialog schließen        |

## Icon

Das App-Icon basiert auf dem **Markdown Mark** von Dustin Curtis
([dcurtis/markdown-mark](https://github.com/dcurtis/markdown-mark)),
freigegeben unter **CC0** (Public Domain). Das Quell-SVG liegt unter
`src/assets/markdown-mark.svg`; aus ihm werden via `npm run build:icon`
die Multi-Resolution-`icon.ico` (16/24/32/48/64/128/256 px) und
`icon.png` (256 px) erzeugt.

## Status

Version `0.2.0` — funktional vollständig für den vereinbarten
Mindestumfang, inklusive Windows-Build (Installer + Portable).

## Lizenz

Dieser Code steht unter der [MIT-Lizenz](./LICENSE).

Copyright © 2026 Matthias Stumm. Nutzung, Modifikation, Verbreitung und
kommerzielle Weiterverwendung sind erlaubt, sofern die ursprüngliche
Lizenz- und Copyright-Notice in abgeleiteten Werken erhalten bleibt.

Das verwendete App-Icon basiert auf dem
[Markdown Mark](https://github.com/dcurtis/markdown-mark) von Dustin Curtis,
welches separat unter **CC0 1.0 (Public Domain)** veröffentlicht ist.
