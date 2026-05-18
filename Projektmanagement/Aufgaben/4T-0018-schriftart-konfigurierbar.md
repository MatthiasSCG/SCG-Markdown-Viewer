# 4T-0018 — Konfigurierbare Schriftart und -größe (Settings-Dialog)

**Status**: Erledigt
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Heute ist die Schriftart im Editor (CodeMirror-Default) und im Render-Pane (CSS-Default) fest. Nutzer mit Vorlieben für bestimmte Code- oder Lese-Schriften können das nicht anpassen, ebensowenig die Schriftgröße als persistenten Default. Da bisher kein zentraler Konfigurations-Ort existiert, wird mit diesem Task der **Settings-Dialog** neu eingeführt, der ab 0.9.0 als Sammelpunkt für nicht-triviale Einstellungen dient.

## Lösungsansatz

### Getroffene Detail-Entscheidungen (vor Umsetzung)

- **Font-Auswahl-Mechanik**: `<input list="...">` mit `<datalist>` als Quelle. Nutzer kann aus einer kuratierten Liste wählen **oder** einen beliebigen Familiennamen eingeben. Damit kein `queryLocalFonts`-Permission-Prompt (intrusiv) und kein Electron-Hack für System-Font-Erkennung nötig.
- **Kuratierte Listen** (Windows-typisch):
  - Monospace: `Consolas` (Default), `Cascadia Code`, `Cascadia Mono`, `JetBrains Mono`, `Fira Code`, `Source Code Pro`, `Courier New`
  - Proportional: `Segoe UI` (Default), `Calibri`, `Arial`, `Helvetica`, `Georgia`, `Times New Roman`, `Verdana`
- **Default-Größen**: Editor 14 pt, Render 15 pt (etwas größer für besseren Lesefluss bei Fließtext).
- **Größen-Limits**: 8 bis 32 pt, Schrittweite 1.
- **Code-Block-Schriftart im Render-Pane**: nicht separat konfigurierbar in 0.9.0. Code-Blöcke nutzen die Editor-Schriftart per CSS-Variable. Ein eigener Schalter kann später ergänzt werden.
- **Dialog-Form**: modaler Dialog im aktuellen Fenster (Pattern wie `#help-modal`/`#about-modal`). In 0.9.0 nur eine Sektion „Darstellung" — die im Skelett vorgesehene Sektions-Navigation links wird bei einer einzigen Sektion nicht angezeigt; der Markup-Aufbau bleibt offen für spätere Sektionen.
- **Buttons**: `OK` / `Anwenden` / `Abbrechen`. Live-Vorschau ja: bei Eingabe sofort CSS-Variablen setzen. Bei `Abbrechen` wird der Pre-Dialog-Zustand wiederhergestellt.
- **Eintritt**: `Datei → Einstellungen…` zwischen `Speichern unter…` und der Trennlinie vor `Beenden`. Tastenkürzel `Strg + ,`.

### Anwendung auf die Panes

- CSS-Variablen auf `:root`:
  - `--editor-font-family`, `--editor-font-size`
  - `--render-font-family`, `--render-font-size`
- Verwendung:
  - CodeMirror-Theme greift `--editor-font-family` und `--editor-font-size` (CSS-Override für `.cm-editor`-Schrift).
  - `.markdown-body` setzt `font-family` und `font-size` aus den Render-Variablen.
  - `.markdown-body code`, `.markdown-body pre code` greifen `--editor-font-family` (Code-Blöcke = Editor-Schriftart).
- Schriftart wird mit Fallback-Kette gesetzt, z.B. `var(--editor-font-family), Consolas, monospace`. Damit greift bei nicht installierten Familien automatisch der System-Default ohne sichtbaren Defekt.
- Zoom (4T-0017) wirkt multiplikativ über das Chromium-`zoom`-Property auf den Inhalts-Containern; Schriftgröße bleibt der persistente Basis-Wert. Beispiel: Editor 14 pt + Zoom 120 % → effektiv 16.8 px.

### Persistenz und Multi-Window-Broadcast

- `electron-store`-Schlüssel:
  - `appearance.editorFont` (String)
  - `appearance.editorSize` (Number, pt)
  - `appearance.renderFont` (String)
  - `appearance.renderSize` (Number, pt)
- Alle global, nicht pro Fenster.
- Defaults werden im Renderer beim Laden über `??`-Fallback gesetzt; der Store enthält nur explizit gespeicherte Werte.
- **Broadcast**: Bestehender `settings:set`-Handler erkennt Schlüssel mit Prefix `appearance.` und sendet anschließend ein `appearance:changed`-Event an alle Fenster mit dem vollständigen aktuellen `appearance`-Bundle. Jedes Fenster setzt die CSS-Variablen daraufhin neu. Damit wirkt eine Änderung sofort in jedem offenen Fenster.

### Renderer-Logik (Dialog-Lebenszyklus)

- Beim Öffnen: aktuelle Werte (aus Settings, mit Default-Fallback) in die Input-Felder schreiben und einen `snapshot` der Werte für den `Abbrechen`-Pfad merken.
- Bei jeder Input-Änderung: sofort die CSS-Variablen auf `:root` setzen (Live-Vorschau).
- `Anwenden`: `settings:set` mit allen vier Werten; Snapshot aktualisieren (damit ein späteres `Abbrechen` nur Änderungen seit dem letzten `Anwenden` verwirft).
- `OK`: wie `Anwenden`, danach Dialog schließen.
- `Abbrechen`: CSS-Variablen auf Snapshot zurücksetzen und Dialog schließen (Store nicht antasten).
- Escape, Backdrop-Klick und das `X` schließen wie `Abbrechen`.

### Abgrenzung

- Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes folgen im Sammeltask am Epic-Ende.
- Theme-Auswahl (Hell/Dunkel), Zeilenabstand, weitere Sektionen → spätere Releases.
- Echte System-Font-Erkennung über `queryLocalFonts` → bewusst nicht in 0.9.0 (Permission-Prompt und Cross-Plattform-Verhalten).

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

**Settings-Dialog** als neues Modal `#settings-modal` in `src/renderer/index.html`:

- Pattern wie `#help-modal` / `#about-modal`: Backdrop + Content-Box mit `role="dialog" aria-modal="true"`.
- Eine Sektion „Darstellung" mit vier Eingabe-Reihen: Editor-Schriftart, Editor-Schriftgröße, Render-Schriftart, Render-Schriftgröße. Side-Nav für weitere Sektionen ist bewusst nicht aufgebaut — wird mit der nächsten Sektion ergänzt.
- Schriftart-Felder als `<input list="...">` mit `<datalist>`-Vorschlägen (kuratierte Listen, freie Eingabe erlaubt). Schriftgrößen-Felder als `<input type="number" min="8" max="32" step="1">`.
- Drei Buttons: `Abbrechen`, `Anwenden`, `OK` (rechtsbündig in einer eigenen Reihe mit Trennlinie).

**CSS-Variablen** in `src/renderer/styles.css`:

- Neue `:root`-Variablen `--editor-font-family`, `--editor-font-size`, `--render-font-family`, `--render-font-size`. Defaults fallen auf die bestehenden `--font-mono` / `--font-ui` zurück, sodass die App ohne explizit gesetzte Settings unverändert aussieht.
- `.pane-source-editor .cm-editor` und `.cm-scroller` nutzen jetzt die Editor-Variablen statt fix `var(--font-mono)` und `13px`.
- `.markdown-body` greift `--render-font-family` und `--render-font-size`.
- `.markdown-body code` greift `--editor-font-family` (Code im Render-Pane = Editor-Schriftart, konsistent).
- Eigener `.settings-modal`-Styles-Block: Backdrop, Content-Box (520 px), Labels, Inputs, Button-Reihe mit Trennlinie.

**Renderer-Logik** in `src/renderer/renderer.js`:

- `APPEARANCE_DEFAULTS = { editorFont: 'Consolas', editorSize: 14, renderFont: 'Segoe UI', renderSize: 15 }`, Limits 8–32.
- `applyAppearanceVars(values)` setzt die vier CSS-Variablen auf `:root` mit Fallback-Kette (`"<wahl>", "Cascadia Code", "Consolas", ..., monospace` bzw. `..., "Segoe UI", system-ui, sans-serif`). Damit greifen bei nicht installierten Familien automatisch System-Fallbacks ohne sichtbaren Defekt.
- `readAppearanceFromStore()` liest die vier `appearance.*`-Schlüssel und kombiniert sie mit Defaults; `clampAppearanceSize` runden und auf [8, 32] beschränken.
- `showSettings` / `applySettings` / `okSettings` / `cancelSettings`: beim Öffnen wird ein `appearanceSnapshot` gespeichert. `Anwenden` schreibt vier `settings:set`-Calls hintereinander und aktualisiert den Snapshot. `Abbrechen` setzt die CSS-Variablen aus dem Snapshot zurück und schließt den Dialog. Escape und Backdrop-Klick verhalten sich wie `Abbrechen`.
- Live-Vorschau über `input`-Listener auf allen vier Feldern: jede Eingabe ruft sofort `applyAppearanceVars(settingsCurrentInputValues())`.
- Initiales Laden in `init()` über `applyAppearanceVars(await readAppearanceFromStore())` direkt nach den Outline-/Backlinks-Settings, sodass die Werte bereits beim ersten Paint greifen.
- Tastenkürzel `Ctrl + ,` öffnet den Dialog (mit `preventDefault()`, exklusiv ohne Shift/Alt).

**Auswahl-Trick für `<datalist>`** in `src/renderer/renderer.js`:

- Chromium filtert die Datalist-Optionen auf Substring-Matches des aktuellen Werts. Bei gefülltem Feld bleibt damit nur ein Eintrag sichtbar (z.B. nur „Consolas").
- Lösung: `mousedown`-Handler auf den beiden Schriftart-Feldern. Wenn das Feld den Fokus noch **nicht** hat und einen Wert trägt, wird der Wert in `dataset.savedValue` zwischengespeichert und das Input visuell auf leer gesetzt. Das Dropdown zeigt anschließend alle Optionen.
- `blur`-Handler: ist das Feld nach dem Verlassen leer geblieben (keine Auswahl getroffen), wird der gemerkte Wert wiederhergestellt. Bei Auswahl bleibt der neue Wert.
- Wichtig: Programmatisches `value`-Setzen löst kein `input`-Event aus. Die Live-Vorschau bleibt damit während der temporären Leerung auf dem letzten guten Stand — der Editor-Pane „flackert" nicht zum Default zurück.

**Multi-Window-Broadcast** in `src/main/main.js`:

- `settings:set`-Handler erkennt Schlüssel mit Prefix `appearance.` und sendet anschließend ein `appearance:changed`-Event mit dem vollständigen `appearance`-Bundle an alle Fenster.
- Jedes Fenster setzt im `onAppearanceChanged`-Hook seine CSS-Variablen über `applyAppearanceVars`. Damit greift eine Änderung in einem Fenster sofort in jedem anderen offenen Fenster.

**Menü-Eintrag** in `src/main/menu.js`:

- `Datei → Einstellungen…` zwischen `Speichern unter…` und dem Trenner vor `Beenden`, Accelerator `CmdOrCtrl+,`, Klick sendet `menu:openSettings` an den Renderer.

**Preload-IPC-Bridges** in `src/main/preload.js`:

- `onMenuOpenSettings(cb)` für den Menü-Hook.
- `onAppearanceChanged(cb)` für den Broadcast-Empfang.

**i18n** in allen fünf Sprachen:

- `menu.file.settings`
- `settings.title`, `settings.appearance`
- `settings.editorFont`, `settings.editorSize`, `settings.renderFont`, `settings.renderSize`
- `settings.ok`, `settings.apply`, `settings.cancel`

**Bewusst nicht in 4T-0018:**

- Hilfe-Dialog-Erweiterung um den Settings-Eintrag, CHANGELOG, Release-Notes — folgen im Sammeltask am Epic-Ende.
- Echte System-Font-Erkennung (`queryLocalFonts`) — Permission-Prompt unerwünscht; kuratierte Liste + freie Eingabe reicht.
- Separater Code-Block-Schrift-Schalter im Render-Pane — nicht in 0.9.0; Code nutzt die Editor-Schriftart.
- Weitere Sektionen (Theme, Zeilenabstand, …) — kommen in späteren Releases.
