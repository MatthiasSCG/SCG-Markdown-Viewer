# 4T-0004 — Dirty-State, Speichern, Speichern unter, Schließen-Dialog

**Status**: Offen
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Sobald Editieren möglich ist (4T-0003), muss klar sichtbar sein, dass ein Buffer ungespeicherte Änderungen hat, der Nutzer muss diese persistieren können (Speichern, Speichern unter), und beim Schließen darf er nicht unbemerkt Arbeit verlieren. Diese drei Aspekte gehören eng zusammen und werden in einem Task gebündelt.

## Lösungsansatz

- **Dirty-State pro Tab**: Beim ersten Doc-Change in CodeMirror wird der Tab als dirty markiert. Beim erfolgreichen Speichern wird das Flag zurückgesetzt. Bei externem Auto-Reload und akzeptiertem Discard (Konflikt-Dialog) ebenfalls.
- **Marker im Titel**: Tab-Titel und Fenster-Titel führend mit `• `. Beispiel: Fenster-Titel `• README.md — Markdown Viewer`, Tab-Titel `• README.md`. Wenn der Tab aktive Auswahl ist, übernimmt der Fenster-Titel den `•`-Stand des aktiven Tabs.
- **Strg+S (Speichern)**:
  - Wenn der Buffer einen Datei-Pfad hat: Inhalt direkt an Main-Prozess per IPC `file:save` schicken, dort schreiben (UTF-8/LF, kein BOM), nach Erfolg Dirty-Flag zurücksetzen.
  - Wenn der Buffer keinen Pfad hat (von „Neu" erzeugt, siehe 4T-0006): automatisch in den „Speichern unter"-Pfad weiterleiten.
  - Wenn `readOnly` aktiv (nicht im Edit-Modus): Aktion ignorieren — Strg+S in der Ansicht ohne Wirkung. (Alternative: Strg+S aktiviert Edit-Modus automatisch — Detail-Entscheidung in der Umsetzung, default Vorschlag: ignorieren.)
- **Strg+Umschalt+S (Speichern unter)**:
  - Öffnet `dialog.showSaveDialog` mit Default-Verzeichnis (zuletzt verwendeter Pfad, sonst Dokumente).
  - Default-Dateiname: aktueller Pfad, sonst `Unbenannt.md`. Filter: `*.md`.
  - Nach erfolgreichem Schreiben wird der Tab-Pfad aktualisiert, Dirty-Flag zurückgesetzt, Recent Files (4T-0005) ergänzt, der File-Watcher auf den neuen Pfad umgeschwenkt.
- **Schließen-Dialog**: Beim Schließen eines Tabs (Tab-X-Klick, Strg+W) oder Fensters (X-Button, Strg+W bei letztem Tab) prüft der Renderer alle Tabs des Fensters auf Dirty-Stand. Für jeden dirtigen Tab ein `dialog.showMessageBox` (im Main-Prozess) mit drei Optionen:
  - **Speichern**: Buffer speichern (in Speichern-Pfad oder Speichern-unter-Dialog), dann fortfahren
  - **Verwerfen**: Buffer-Änderungen verwerfen, fortfahren
  - **Abbrechen**: Schließen abbrechen, Tab/Fenster bleibt offen
  - Default-Button: „Speichern". Cancel-Button: „Abbrechen".
- **Quit-Dialog**: Beim App-Quit (alle Fenster, Cmd+Q, Datei-Beenden) wird derselbe Dialog pro Dirty-Tab gezeigt. Wenn der Nutzer in irgendeinem davon „Abbrechen" wählt, wird der Quit-Prozess gestoppt.
- **Konflikt bei externer Änderung**: Wenn der File-Watcher eine externe Änderung meldet und der Buffer dirty ist, statt direktem Reload den Konflikt-Dialog mit den zwei Optionen aus 4T-0003 zeigen.
- **Sitzungswiederherstellung mit Dirty-Buffern**: Beim Quit werden alle Dirty-Buffer durch den Schließen-Dialog verarbeitet. Wenn der Nutzer „Verwerfen" wählt, geht der Pfad ohne Dirty in die Session. Wenn er „Speichern" wählt, ebenfalls. Ein Dirty-Buffer wandert **niemals** ungespeichert in die persistierte Sitzung — wir speichern keine Buffer-Inhalte in den Settings.
- **Auto-Save (optional, opt-in)**:
  - **Aktivierung**: Toggle-Eintrag im Datei-Menü oberhalb von „Speichern" mit Häkchen (`type: 'checkbox'`). Default: aus. Persistiert in `electron-store` unter `autoSave: boolean`.
  - **Trigger**: Speichern, sobald **eines** der beiden Ereignisse eintritt:
    - 2 Sekunden Inaktivität nach der letzten Tastatureingabe (debounced), oder
    - das Fenster verliert den Fokus (z.B. Wechsel in ein anderes Programm oder anderes App-Fenster).
  - **Voraussetzung**: Buffer hat einen Datei-Pfad. „Unbenannt"-Buffer ohne Pfad werden **nicht** automatisch gespeichert. Auto-Save wird für einen solchen Tab erst nach erstem manuellen „Speichern unter" aktiv.
  - **File-Watcher-Konflikt vermeiden**: Während des Save-Schreibvorgangs wird der Watcher für die Datei kurzzeitig stummgeschaltet, damit das Eigen-Schreiben kein Reload-Event auslöst.
  - **UI-Feedback**: In der Statusbar erscheint rechts neben dem Edit-Toggle für genau 1 Sekunde der lokalisierte Text „Gespeichert" mit dezenter Hervorhebung, danach verblasst der Hinweis automatisch.
  - **Edge-Cases**:
    - Auto-Save während Schließen- oder Konflikt-Dialog: nicht triggern, bis der Dialog aufgelöst ist.
    - Schreibfehler (z.B. Datei schreibgeschützt): Statusbar-Hinweis „Speichern fehlgeschlagen" für 3 Sekunden, Dirty-Marker bleibt.

## Akzeptanzkriterien

- Bei erster Tastatureingabe in einem Buffer erscheint `•` im Fenster- und Tab-Titel.
- Strg+S in einem dirtigen Buffer mit Pfad schreibt die Datei und entfernt `•`.
- Strg+S in einem dirtigen „Unbenannt"-Buffer öffnet den Speichern-unter-Dialog.
- Strg+Umschalt+S öffnet immer den Speichern-unter-Dialog.
- Nach „Speichern unter": Tab-Titel wechselt auf neuen Dateinamen, File-Watcher auf neuen Pfad, Eintrag in Recent Files.
- Tab schließen mit Dirty-Buffer: Dialog mit drei Optionen erscheint, Verhalten korrekt.
- Fenster schließen mit mehreren Dirty-Tabs: Dialog pro Tab nacheinander.
- App quit mit Dirty-Tabs in mehreren Fenstern: Dialoge pro Fenster und Tab; bei „Abbrechen" wird Quit gestoppt.
- Externe Dateiänderung bei dirty Buffer: Konflikt-Dialog erscheint, keine stillen Überschreibungen.
- Gespeicherte Datei: UTF-8, LF-Zeilenenden, kein BOM.
- Auto-Save-Toggle im Datei-Menü oberhalb von „Speichern", mit Häkchen, persistiert über App-Neustart.
- Bei aktivem Auto-Save speichert die App 2 s nach letzter Eingabe und beim Fenster-Fokusverlust automatisch, sofern der Buffer einen Pfad hat.
- „Unbenannt"-Buffer wird auch bei aktivem Auto-Save nicht automatisch gespeichert.
- Nach Auto-Save erscheint in der Statusbar für 1 Sekunde der lokalisierte Hinweis „Gespeichert".
- File-Watcher reagiert nicht auf das Eigen-Schreiben (kein selbstausgelöster Reload-Loop).
- Schreibfehler beim Auto-Save: Statusbar-Hinweis „Speichern fehlgeschlagen" für 3 Sekunden, Dirty-Marker bleibt.

## Bezug zu Dateien

- `src/main/main.js` — IPC-Handler `file:save`, `file:saveAs`, `dialog:confirmClose`, Quit-Hook
- `src/main/preload.js` — neue IPC-Kanäle
- `src/renderer/renderer.js` — Dirty-Flag pro Tab, Editor-Listener für Doc-Change, Title-Update, Strg+S/Umschalt+S-Handler, Tab-Close-Logik
- `src/i18n/{de,en,fr,es,it}.json` — Dialog-Texte (`save.unsavedTitle`, `save.unsavedMessage`, `save.btnSave`, `save.btnDiscard`, `save.btnCancel`, `save.conflictTitle`, `save.conflictKeepOurs`, `save.conflictReload`, `menu.file.autoSave`, `statusbar.saved`, `statusbar.saveFailed`)
- `src/renderer/styles.css` — Save-Indicator-Animation in der Statusbar
- `src/main/menu.js` — Auto-Save-Toggle-Eintrag im Datei-Menü (siehe 4T-0001)

## Lösung

(Wird nach Umsetzung ausgefüllt.)
