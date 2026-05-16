# 4T-0005 — Recent Files (10 Einträge, persistent, Menü-Integration)

**Status**: Offen
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Aktuell gibt es einen „Zuletzt"-Button in der Toolbar, der ein Custom-Dropdown öffnet. Mit der Migration auf die native Menüleiste (4T-0001) wandert die Liste in ein Submenü `Datei → Zuletzt`. Gleichzeitig wird die Liste explizit auf **10 Einträge** begrenzt und Persistenz und Verwaltung formalisiert.

## Lösungsansatz

- **Persistenz**: Liste in `electron-store` unter dem Key `recentFiles`. Format: Array von Objekten `{ path, lastOpenedAt }`, sortiert nach `lastOpenedAt` absteigend. Maximal 10 Einträge.
- **Schreibtrigger**: Beim erfolgreichen Öffnen einer Datei (über Datei-Menü, Drag&Drop, Datei-Argument, Recent-Klick, Speichern-unter mit neuem Pfad) wird der Pfad in die Liste eingefügt. Wenn er schon existiert, wird der Eintrag nach oben verschoben (bzw. `lastOpenedAt` aktualisiert). Bei 11 Einträgen fällt der älteste hinten heraus.
- **Lesetrigger**: Beim Aufbau des Menüs (siehe 4T-0001) werden die Einträge ins Submenü `Datei → Zuletzt` eingehängt. Submenü wird bei jeder Listenänderung pro Fenster neu erzeugt.
- **Eintrag-Format im Menü**: Nur Dateiname als Label, voller Pfad als Tooltip. Kein Verzeichnispfad im Label (Menübreite). Bei mehreren Dateien mit gleichem Namen wird der übergeordnete Ordner-Name als Disambiguator angehängt: `README.md (0012_Markdown-Viewer)` vs. `README.md (other-project)`.
- **Klick-Verhalten**: Klick auf einen Recent-Eintrag öffnet die Datei in einem **neuen Fenster** (konsistent mit dem Multi-Window-Modell und „Öffnen erzeugt neues Fenster" aus 4T-0006).
- **Aufräumen**: Wenn beim Öffnen eines Recent-Eintrags die Datei nicht mehr existiert, wird der Eintrag aus der Liste entfernt und der Nutzer per Fehlerdialog informiert.
- **Submenü-Ende**: Nach den 10 Einträgen ein Trenner und ein Eintrag „Liste löschen" (lokalisiert), der die Liste komplett leert (mit Bestätigung).
- **Leere Liste**: Wenn die Liste leer ist, wird im Submenü ein deaktivierter Eintrag „Keine zuletzt geöffneten Dateien" angezeigt.

## Akzeptanzkriterien

- Beim Öffnen einer Datei landet sie an oberster Stelle in Datei → Zuletzt.
- Maximal 10 Einträge in der Liste; älteste fallen heraus.
- Mehrfaches Öffnen derselben Datei erzeugt keine Duplikate, sondern aktualisiert die Position.
- Klick auf einen Recent-Eintrag öffnet die Datei in einem neuen Fenster.
- Pfad-Tooltip zeigt den vollständigen Pfad beim Hover.
- Bei gleichem Dateinamen aus verschiedenen Ordnern wird der Ordnername angehängt (Disambiguator).
- Recent-Eintrag mit nicht mehr existierender Datei: Eintrag wird entfernt, Fehlerdialog erscheint.
- Leere Liste: deaktivierter Eintrag „Keine zuletzt geöffneten Dateien".
- „Liste löschen" am Ende des Submenüs leert die Liste nach Bestätigung.
- Persistenz: Recent-Liste überlebt App-Neustart.

## Bezug zu Dateien

- `src/main/main.js` — Recent-Liste-Verwaltung (Lesen/Schreiben in `electron-store`), Submenü-Aufbau
- `src/main/menu.js` — Submenü-Generator aus Recent-Liste
- `src/main/preload.js` — IPC-Kanal Recent-Klick
- `src/renderer/renderer.js` — Recent-Eintrag-Open-Trigger, alte Recent-Dropdown-Logik entfernen
- `src/renderer/index.html` — alten Recent-Dropdown entfernen (war Teil der Toolbar, fällt mit 4T-0002 ohnehin weg)
- `src/i18n/{de,en,fr,es,it}.json` — `menu.file.recent`, `menu.file.recentEmpty`, `menu.file.recentClear`, `menu.file.recentClearConfirm`, `recent.missingFile`

## Lösung

(Wird nach Umsetzung ausgefüllt.)
