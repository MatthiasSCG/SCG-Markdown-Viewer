# 4T-0008 — Sitzungswiederherstellung als Toggle ins Hilfe-Menü

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Die Checkbox „Sitzung wiederherstellen" steht heute in der Toolbar rechts oben. Mit dem Umbau in 4T-0001 und 4T-0002 wird die Toolbar entfernt. Die Einstellung ist außerdem keine Aktion, sondern eine Präferenz, die selten umgeschaltet wird — sie gehört nicht in eine Statusbar voller Quick-Toggles. Logischer Ort: **Hilfe-Menü als Toggle-Eintrag mit Häkchen** (Pattern „check menu item").

## Lösungsansatz

- Aus `index.html` wird `<label class="setting">` mit der Checkbox `chk-restore-session` entfernt (ist Teil der Toolbar, die in 4T-0002 ohnehin entfällt).
- Im Hilfe-Menü (siehe 4T-0001) wird nach „Über…" und einem Trenner ein Eintrag `Sitzung wiederherstellen` als `type: 'checkbox'` mit `checked: <aktueller Wert>` eingefügt.
- Beim Klick wird der Wert in `electron-store` unter `restoreSession` umgeschaltet (Key existiert bereits) und das Menü pro Fenster neu erzeugt, damit alle Fenster denselben Haken-Stand zeigen.
- Optional kurze Erklärung im Hilfe-Modal ergänzen (siehe 4T-0009, dort als Feature-Eintrag bereits vorhanden, ggf. Wording überprüfen).
- Beim App-Quit wird wie bisher der Wert geprüft: Wenn `true`, persistiert die App alle Fenster-Stände; wenn `false`, wird der gespeicherte Stand beim nächsten Start verworfen.
- **Synchronisation über Fenster**: Setzt der Nutzer den Haken in Fenster A, müssen Fenster B, C den neuen Stand sofort sehen. Wird durch das per-Fenster-Neu-Setzen der Menüs erreicht (Main-Prozess iteriert über alle offenen `BrowserWindow`s).

## Akzeptanzkriterien

- Toolbar-Checkbox „Sitzung wiederherstellen" ist nicht mehr sichtbar (verschwindet mit 4T-0002 ohnehin, hier explizit als Akzeptanzkriterium festgehalten).
- Hilfe-Menü zeigt nach „Über…" und einem Trenner einen Toggle-Eintrag „Sitzung wiederherstellen" mit korrekt gesetztem Häkchen (entsprechend des gespeicherten Werts).
- Klick auf den Eintrag toggelt den Haken sichtbar.
- Persistenz unverändert: Beim nächsten App-Start wird der Wert korrekt geladen.
- Sitzungswiederherstellung-Verhalten beim Quit/Start: unverändert zu 0.5.x.
- In Multi-Window-Setup zeigen alle Fenster denselben Haken-Stand nach Umschalten in einem Fenster.

## Bezug zu Dateien

- `src/main/menu.js` — Toggle-Eintrag im Hilfe-Menü
- `src/main/main.js` — Klick-Handler, Broadcast an alle Fenster für Menü-Update
- `src/renderer/index.html` — `<label class="setting">` entfernen
- `src/renderer/renderer.js` — Event-Listener für die alte Checkbox entfernen
- `src/i18n/{de,en,fr,es,it}.json` — `menu.help.restoreSession` (Beschriftung im Menü). Der alte Key `settings.restoreSession` kann entfernt oder als Alias auf den neuen Key umgebogen werden, falls noch anderswo referenziert.

## Lösung

Die Migration wurde **gleitend** über 4T-0001 und 4T-0002 hinweg umgesetzt — kein eigener Code-Commit für 4T-0008 nötig.

**In [4T-0001](4T-0001-native-menueleiste.md) bereits erledigt:**

- Toggle-Eintrag `Sitzung wiederherstellen` im Hilfe-Menü als `type: 'checkbox'`, Häkchen aus `store.get('restoreSession')` (Quelle der Wahrheit) abgeleitet (`src/main/menu.js`).
- Klick schickt `menu:toggleRestoreSession` an den Renderer; der Renderer toggelt den State, schreibt `restoreSession` zurück in die Settings (`src/renderer/renderer.js`, `bindUi`).
- Multi-Window-Synchronisation: `ipcMain.handle('settings:set', …)` ruft bei Key `restoreSession` `applyMenuToAllWindows()` auf, sodass das Häkchen in allen offenen Fenstern sofort aktualisiert wird (`src/main/main.js`).
- Neuer i18n-Key `menu.help.restoreSession` in allen fünf Sprachen.

**In [4T-0002](4T-0002-statusbar-layout.md) bereits erledigt:**

- Toolbar-Checkbox `<label class="setting"><input id="chk-restore-session">` aus `src/renderer/index.html` entfernt (mit dem ganzen `<header class="toolbar">`-Block).
- DOM-Referenz `restoreCheckbox` aus `src/renderer/renderer.js` entfernt; alte `restoreCheckbox.addEventListener('change', …)`-Logik und `restoreCheckbox.checked = …`-Zeilen entfernt.
- Alter i18n-Key `settings.restoreSession` aus allen fünf Sprachen entfernt (der neue Key `menu.help.restoreSession` deckt den Anwendungsfall vollständig ab).

**Persistenz und Sitzungs-Verhalten** beim Quit/Start sind unverändert zu 0.5.x — der Main-Code in `app.whenReady` liest `store.get('restoreSession')` und entscheidet entsprechend.

Manuelle Verifikation der Akzeptanzkriterien (Toolbar-Checkbox weg, Häkchen im Menü, Klick toggelt, Multi-Window-Synchronisation, Persistenz über Neustart) lief im Rahmen der Tests von 4T-0001 und 4T-0002 mit.
