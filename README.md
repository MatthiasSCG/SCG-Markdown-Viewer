# Markdown Viewer

Ein schlanker, lokaler Markdown-Viewer fuer Windows 11 mit Tab-Bedienung,
umschaltbarer Quellcode-/Render-Ansicht und Auto-Reload.

## Konzept

Diese Datei dokumentiert das vereinbarte Konzept und den Funktionsumfang.
Aenderungen am Code werden in der [CHANGELOG.md](./CHANGELOG.md) festgehalten.

## Funktionsumfang

### Anzeige

- **Quellcode-Ansicht**: zeigt das rohe Markdown
- **Render-Ansicht**: zeigt die formatierte Darstellung
- **Geteilte Ansicht (Split)**: beide nebeneinander, per Maus verschiebbar
- Umschaltbar ueber die Toolbar; die zuletzt gewaehlte Ansicht wird gespeichert

### Tabs

- Beliebig viele Markdown-Dateien koennen gleichzeitig geoeffnet sein
- Jede Datei laeuft in einem eigenen Tab; Tabs lassen sich schliessen
- Klick auf einen `[Text](datei.md)`-Link oeffnet die Zieldatei in einem neuen Tab
- Ist die Zieldatei bereits in einem Tab geoeffnet, wird zu diesem Tab gesprungen
- Pro Tab werden Scroll-Positionen (Quellcode und Render) separat gemerkt

### Datei oeffnen

Drei Wege:

1. **Datei-Dialog** ueber den Button "Oeffnen"
2. **Drag & Drop** einer oder mehrerer Dateien ins Fenster
3. **"Oeffnen mit"** im Datei-Explorer (Datei-Assoziation, beim Build aktivierbar)

Zusaetzlich speichert die Anwendung eine Liste der **zuletzt geoeffneten Dateien**
(maximal 15), erreichbar ueber den Button "Zuletzt".

### Auto-Reload

Geoeffnete Dateien werden ueberwacht. Aendert sich eine Datei extern (z.B.
durch einen Editor), wird der Tab-Inhalt automatisch aktualisiert. Wird die
Datei geloescht, wird der Tab-Titel durchgestrichen markiert.

### Bilder

Relative Bildpfade in Markdown (`![Alt](bilder/foo.png)`) werden gegen den
Pfad des aktuellen Dokuments aufgeloest und als Base64-Data-URI eingebettet.

### Links

| Link-Art                    | Verhalten                              |
|-----------------------------|----------------------------------------|
| `https://...`, `http://...` | im Standard-Browser oeffnen            |
| `mailto:...`                | im Standard-Mail-Programm oeffnen      |
| `#anker`                    | im Dokument scrollen                   |
| `relative/datei.md`         | in neuem Tab oeffnen                   |
| Andere relative Dateien     | werden ignoriert (vorerst)             |

### Sprachen

Die Oberflaeche ist in fuenf Sprachen verfuegbar:

- Deutsch
- English
- Francais
- Espanol
- Italiano

Beim ersten Start wird die Sprache aus der Windows-Locale erkannt
(Fallback: Englisch). Sie kann jederzeit ueber die Toolbar gewechselt werden.

### Theme

Light/Dark folgt dem Windows-System-Theme automatisch und wechselt mit, wenn
das System-Theme zur Laufzeit umgestellt wird.

### Sitzung

Die Einstellung **"Sitzung wiederherstellen"** (Toolbar) entscheidet, ob beim
naechsten Start die zuletzt geoeffneten Tabs erneut geoeffnet werden.

### Markdown-Umfang

GitHub Flavored Markdown (GFM):

- Tabellen
- Task-Listen (`- [ ]` / `- [x]`)
- Strikethrough (`~~Text~~`)
- Auto-Links
- Code-Bloecke mit Sprachangabe (Syntax-Highlighting folgt spaeter)

Zusaetzlich:

- **Wiki-Links** im Stil von Obsidian/Logseq:
  - `[[Datei]]` — Link zu `Datei.md` im selben Verzeichnis
  - `[[Datei|Anzeigetext]]` — Link mit eigenem Text
  - Hat das Ziel bereits eine Endung (z. B. `[[bild.png]]`), wird sie nicht durch `.md` ersetzt

Mermaid-Diagramme, KaTeX-Mathe und Syntax-Highlighting sind **fuer eine
spaetere Phase** vorgesehen.

### Read-only

Der Viewer bearbeitet keine Dateien. Es gibt keine Speichern-Funktion.

## Technik-Stack

- **Electron** als Anwendungsrahmen
- **markdown-it** + **markdown-it-task-lists** fuer GFM-Rendering
- **chokidar** fuer File-Watching
- **electron-store** fuer persistente Einstellungen

## Projektstruktur

```
0012_Markdown-Viewer/
├── README.md            (diese Datei)
├── CHANGELOG.md         (Aenderungs-Historie)
├── package.json
├── scripts/
│   └── build-icon.js    (SVG -> ICO/PNG-Konverter)
└── src/
    ├── main/
    │   ├── main.js      (Electron Main-Prozess)
    │   └── preload.js   (Bruecke + Markdown-Rendering)
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

# Icon aus SVG neu erzeugen (selten noetig)
npm run build:icon
```

Build-Ergebnisse landen unter `dist/`:

- `Markdown Viewer-0.1.0-Setup.exe` — klassischer Setup-Assistent (NSIS), Installation per Benutzer (`%LOCALAPPDATA%\Programs\Markdown Viewer`), Start-Menue- und Desktop-Verknuepfung, sauberer Uninstaller
- `Markdown Viewer-0.1.0-Portable.exe` — laeuft ohne Installation, kein Eintrag im System

> **Datei-Assoziation:** Bewusst nicht aktiviert. Wer den Viewer als Standardprogramm fuer `.md` setzen moechte, macht das manuell ueber Windows-Einstellungen → Apps → Standard-Apps.

### Tastenkuerzel

| Tastenkombination     | Aktion                          |
|-----------------------|---------------------------------|
| `Strg + O`            | Datei oeffnen                   |
| `Strg + W`            | Aktiven Tab schliessen          |
| `Strg + Tab`          | Naechster Tab                   |
| `Strg + Shift + Tab`  | Vorheriger Tab                  |

## Icon

Das App-Icon basiert auf dem **Markdown Mark** von Dustin Curtis
([dcurtis/markdown-mark](https://github.com/dcurtis/markdown-mark)),
freigegeben unter **CC0** (Public Domain). Das Quell-SVG liegt unter
`src/assets/markdown-mark.svg`; aus ihm werden via `npm run build:icon`
die Multi-Resolution-`icon.ico` (16/24/32/48/64/128/256 px) und
`icon.png` (256 px) erzeugt.

## Status

Version `0.1.0` — funktional vollstaendig fuer den vereinbarten
Mindestumfang, inklusive Windows-Build (Installer + Portable).
