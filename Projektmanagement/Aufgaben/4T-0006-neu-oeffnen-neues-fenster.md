# 4T-0006 — Datei Neu und Öffnen erzeugen neues Fenster

**Status**: Offen
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Konsistent mit dem Multi-Window-Modell seit 0.5.0 (Tab-Auslagern) sollen die Befehle **Datei → Neu** und **Datei → Öffnen…** jeweils ein **neues Fenster** erzeugen, statt den Inhalt des aktuellen Fensters zu ersetzen. So gibt es nie die Situation, dass der Nutzer unbeabsichtigt eine offene Datei aus dem Blickfeld verliert oder Dirty-Zustände abreißt. Außerdem unterstützt es die Arbeitsweise, mehrere Dateien parallel auf mehreren Monitoren zu sehen.

## Lösungsansatz

- **Neu**: Erzeugt ein neues `BrowserWindow` mit einem einzelnen Tab, der einen leeren Buffer hat (kein Datei-Pfad, Inhalt leer). Fenster-Titel: `• Unbenannt — Markdown Viewer` (Dirty-Marker initial nicht gesetzt, weil der Buffer noch keinen Change-Event gesehen hat; das `•` erscheint erst bei der ersten Eingabe). Tab-Titel: `Unbenannt 1` (bei weiteren ungespeicherten Buffern hochgezählt pro App-Lebenszyklus). Edit-Modus startet aktiv (sonst kann man nicht tippen), View-Modus default „Geteilt".
- **Öffnen…**: Öffnet einen `dialog.showOpenDialog` mit Filter `*.md`, Default-Verzeichnis: zuletzt verwendeter Pfad. Nach Auswahl: neues `BrowserWindow` mit der gewählten Datei als initialem Tab. Wenn die Datei bereits in einem anderen Fenster offen ist, geht trotzdem ein neues Fenster auf (bewusste Entscheidung, kein „Fokussiere bestehendes Fenster" — sonst irritierend, wenn man absichtlich zwei Ansichten parallel haben will).
- **Single-Instance-Lock**: Bleibt unverändert. Beide Befehle laufen innerhalb der bestehenden App-Instanz und erzeugen `BrowserWindow`-Objekte direkt im Main-Prozess, also kein Konflikt mit dem `app.requestSingleInstanceLock`-Mechanismus.
- **Fenster-Position**: Neues Fenster startet leicht versetzt zum aktuell fokussierten Fenster (+30 px x/y, analog zum Verhalten beim Tab-Auslagern in 0.5.0). Wenn kein Fenster offen ist (z.B. von einer externen Verknüpfung), Standardposition.
- **Sitzungswiederherstellung**: Neue Fenster gehen wie alle anderen in die persistierte Session, sofern sie beim Quit noch offen sind. „Unbenannt"-Buffer ohne Speicherung verschwinden mit dem Quit (Dirty-Dialog erzwingt entweder Save oder Discard, siehe 4T-0004).
- **Strg+W / Tab-Schließen** in einem Fenster mit nur einem leeren „Unbenannt"-Buffer schließt das Fenster (Verhalten wie heute mit dem letzten Tab).

## Akzeptanzkriterien

- `Datei → Neu` (oder Strg+N) öffnet ein neues Fenster mit einem leeren Buffer, Edit-Modus aktiv, View „Geteilt".
- Fenster-Titel: `Unbenannt — Markdown Viewer`. Bei erster Eingabe: `• Unbenannt — Markdown Viewer`.
- Mehrfaches Strg+N in derselben Session erzeugt `Unbenannt 1`, `Unbenannt 2`, … in den jeweiligen Fenstern.
- `Datei → Öffnen…` (oder Strg+O) öffnet den OS-Datei-Dialog. Nach Auswahl: neues Fenster mit der Datei.
- Wenn die Datei bereits in einem anderen Fenster offen ist, geht trotzdem ein neues Fenster auf (keine Fokus-Umleitung).
- Aktuelles Fenster bleibt unverändert (Inhalt, Tabs, View-Modus).
- Position des neuen Fensters: +30 px x/y zum aktuell fokussierten Fenster.
- Strg+S in einem leeren „Unbenannt"-Buffer (ungespeichert) leitet in Speichern-unter-Dialog (siehe 4T-0004).

## Bezug zu Dateien

- `src/main/main.js` — IPC-Handler `file:new` und `file:open`, Fenster-Factory-Aufruf
- `src/main/menu.js` — Menü-Einträge `Datei → Neu` und `Datei → Öffnen…` lösen die Handler aus
- `src/main/preload.js` — IPC-Kanäle
- `src/renderer/renderer.js` — Initialisierung leerer Buffer in „Neu"-Fenstern, Pfad-Übernahme in „Öffnen"-Fenstern
- `src/i18n/{de,en,fr,es,it}.json` — `menu.file.new`, `menu.file.open`, `tab.untitled` (Label „Unbenannt" / „Untitled" / „Sans titre" / „Sin título" / „Senza titolo")

## Lösung

(Wird nach Umsetzung ausgefüllt.)
