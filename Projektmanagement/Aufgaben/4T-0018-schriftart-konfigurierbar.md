# 4T-0018 — Konfigurierbare Schriftart und -größe (Settings-Dialog)

**Status**: Offen
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Heute ist die Schriftart im Editor (CodeMirror-Default) und im Render-Pane (CSS-Default) fest. Nutzer mit Vorlieben für bestimmte Code- oder Lese-Schriften können das nicht anpassen, ebensowenig die Schriftgröße als persistenten Default. Da bisher kein zentraler Konfigurations-Ort existiert, wird mit diesem Task der **Settings-Dialog** neu eingeführt, der ab 0.9.0 als Sammelpunkt für nicht-triviale Einstellungen dient.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Settings-Dialog

- **Eintritt**: neuer Menüpunkt im Datei-Menü oder einem neuen Menü „Einstellungen" (Vorschlag: `Datei → Einstellungen…`, Tastenkürzel `Strg + ,` wie in vielen Editoren). Erreichbarkeit über `Datei → Einstellungen…` ist konsistent mit dem bestehenden Menülayout.
- **Form**: modaler Dialog im Fenster (kein eigenes BrowserWindow), Sektionen links als Liste, Inhalte rechts. Initial nur eine Sektion „Darstellung". Erweiterbar für spätere Releases.
- **Buttons**: „OK" speichert und schließt, „Abbrechen" verwirft, „Anwenden" speichert ohne Schließen. Live-Vorschau optional (Empfehlung: ja, weil Schriftart-Wirkung sonst nur über Mehrfach-Öffnen vergleichbar ist).

### Sektion „Darstellung"

- **Editor-Schriftart**: Auswahlliste mit installierten Monospace-Schriften (Detektion über `queryLocalFonts` oder Electron-spezifische API; bei fehlender Verfügbarkeit Fallback auf eine kuratierte Liste mit `Consolas`, `Cascadia Code`, `JetBrains Mono`, `Fira Code`, `Source Code Pro`, `monospace`).
- **Editor-Schriftgröße**: Number-Input mit Pfeil-Tastatur, Bereich 8 bis 32 pt, Default 14.
- **Render-Schriftart**: Auswahlliste mit Proportional-Schriften (analog, Fallback-Liste mit `Segoe UI`, `Arial`, `Helvetica`, `Georgia`, `Times New Roman`, `sans-serif`).
- **Render-Schriftgröße**: analog, Default 14 (zu bestätigen, evtl. 15 für bessere Lesbarkeit).
- **Optional**: Code-Block-Schriftart im Render-Pane (separater Wert, Default = Editor-Schriftart). Im Detail-Design entscheiden, ob das in 0.9.0 nötig ist oder später.

### Persistenz

- `electron-store` mit Schlüsseln unter `appearance.*`. Global, nicht pro Fenster.
- Bei Schriftart-Werten aus dem System-Font-Auswahldialog wird der Familien-Name gespeichert und bei der Anwendung als oberster Eintrag in einer Fallback-Kette gesetzt, damit fehlende Schriften nicht zu unleserlichem Output führen.

### Anwendung

- CSS-Variablen `--editor-font-family`, `--editor-font-size`, `--render-font-family`, `--render-font-size` auf `:root` setzen. CodeMirror-Theme nutzt sie via CSS, Render-Pane-Styles ebenfalls.
- Änderung wirkt sofort in allen offenen Fenstern (IPC-Broadcast).

### Zusammenspiel mit Zoom (4T-0017)

- Effektive Anzeigegröße = konfigurierte Schriftgröße × Zoom-Faktor.
- Beispiel: Editor-Schriftgröße 14, Zoom 120 % → effektiv 16.8 px. Beide Werte sind unabhängig konfigurierbar.

## Akzeptanzkriterien

- `Datei → Einstellungen…` (oder `Strg + ,`) öffnet einen modalen Dialog mit Sektion „Darstellung".
- In der Sektion lassen sich Editor- und Render-Schriftart und -größe getrennt einstellen.
- Schriftart-Auswahllisten zeigen entweder installierte System-Fonts oder eine kuratierte Fallback-Liste.
- „Anwenden" und „OK" schreiben die Einstellungen persistent und wenden sie sofort auf alle offenen Fenster an.
- „Abbrechen" verwirft alle Änderungen seit dem letzten Öffnen des Dialogs.
- Live-Vorschau: Während der Dialog offen ist, sind die gewählten Werte im Hintergrund bereits sichtbar; bei „Abbrechen" wird der vorherige Zustand wiederhergestellt.
- Persistenz überlebt App-Neustart.
- Default-Werte sind sinnvoll und in der App ohne weitere Einstellung gut nutzbar.
- Zoom (aus 4T-0017) wirkt multiplikativ auf die konfigurierte Schriftgröße, nicht ersetzend.
- Bei nicht installierten Schriften greift die Fallback-Kette ohne sichtbaren Defekt.

## Bezug zu Dateien

- `src/renderer/index.html` — Markup für den Settings-Dialog.
- `src/renderer/renderer.js` — Dialog-Logik, Schriftart-Erkennung, Live-Vorschau, IPC-Setter/-Getter.
- `src/renderer/styles.css` — Dialog-Styles, CSS-Variablen für Schriftarten.
- `src/main/main.js` — `electron-store`-Erweiterung um `appearance.*`-Schlüssel, IPC-Handler, Multi-Window-Broadcast bei Änderung.
- `src/main/preload.js` — neue API für Settings-Lesen/Schreiben.
- `src/main/menu.js` — neuer Menüeintrag `Datei → Einstellungen…`.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Dialog-Titel, Sektions-Namen, Labels, Buttons, Tooltips.

## Lösung
