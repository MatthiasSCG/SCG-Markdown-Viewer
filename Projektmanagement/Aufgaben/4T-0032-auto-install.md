# 4T-0032 — Auto-Download und Auto-Installation des Updates

**Status**: Zurückgestellt
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: nicht 0.11.0 (zurückgestellt bis Code-Signing-Zertifikat vorliegt)

> **Zurückgestellt am 2026-05-19.** Der Auto-Install-Pfad wurde ursprünglich Teil von [4T-0029](4T-0029-auto-update.md) gewesen. Bei der Risikoabwägung wurde entschieden, ihn aus dem 0.11.0-Scope zu nehmen, weil die Auto-Installation einer **nicht code-signierten** Setup-EXE durch electron-updater zu unkontrollierbaren SmartScreen-Reaktionen führen kann (stillschweigend / Warnung / vollständige Blockade je nach Windows-Version und SmartScreen-Konfiguration). Im Fehlerfall wäre die UX deutlich schlechter als beim manuellen Download (4T-0029-Pfad). Voraussetzung für die Umsetzung: ein **Code-Signing-Zertifikat** für die Setup-EXE.

## Warum

Auto-Installation reduziert die Friction beim Update von zwei Klicks (Browser → Doppelklick) auf einen Klick im App-Dialog. Bei häufigeren Releases oder größerem Nutzerkreis ist das ein spürbarer Komfort-Gewinn. Aktuell ist der Nutzwert für den kleinen Nutzerkreis und die niedrige Release-Frequenz allerdings begrenzt, sodass die SmartScreen-Risiken den Komfort-Gewinn überwiegen.

## Voraussetzungen

- **Code-Signing-Zertifikat** für die Setup-EXE. Optionen:
  - **OV-Zertifikat** (~80–200 €/Jahr): SmartScreen vertraut OV-signierten Builds erst nach Reputations-Aufbau (mehrere hundert Downloads, dann automatische Freigabe). Anfangs trotzdem Warnungen.
  - **EV-Zertifikat** (~350–600 €/Jahr): SmartScreen vertraut EV-signierten Builds sofort, keine Warnung.
- `signtool.exe`-Integration in den `electron-builder`-Build (Zertifikat-Pfad und Passwort als Build-Secret).
- [4T-0029](4T-0029-auto-update.md) als Voraussetzung muss umgesetzt sein, weil die Erkennungs-Infrastruktur (electron-updater, latest.yml, GitHub-Provider, Dialog-Struktur) wieder­verwendet wird.

## Lösungsansatz (für späteren Wiederanlauf, nicht für 0.11.0)

### Dialog-Erweiterung

Der Update-Dialog aus 4T-0029 wird um eine vierte Aktion erweitert (oder ersetzt die „Zum Download"-Aktion, wenn die Setup-Variante aktiv ist):

- **„Jetzt installieren"** — startet `autoUpdater.downloadUpdate()`, zeigt Fortschritt in der Statusbar, fragt nach Abschluss „Update bereit, jetzt neu starten?". Nach Bestätigung: `autoUpdater.quitAndInstall()`.
- **„Später erinnern"** wie bisher
- **„Diese Version überspringen"** wie bisher

### Variant-Detection Setup vs. Portable

- Setup-Variante: voller Auto-Install-Flow.
- Portable-Variante: bekommt weiter den „Zum Download"-Pfad aus 4T-0029, weil `electron-updater` das `portable`-Target nicht unterstützt.
- Detection über `process.env.PORTABLE_EXECUTABLE_DIR`, das im Portable-Modus gesetzt ist.

### Statusbar-Fortschritt während Download

- Neuer IPC-Kanal `update:download-progress` (Main → Renderer): liefert `{ percent, transferred, total, bytesPerSecond }` aus `autoUpdater.on('download-progress', …)`.
- Renderer zeigt den Fortschritt über den bestehenden `showStatusbarHint`-Helper an („Update herunterladen … 47 %").
- IPC-Kanal `update:downloaded` (Main → Renderer): Download fertig, Neustart-Dialog wird im Main getriggert.

### Neustart-Dialog

- **Titel**: „Update bereit"
- **Text**: „Version X.Y.Z wurde heruntergeladen. Jetzt neu starten und installieren?"
- **Buttons**:
  - „Jetzt neu starten" — ruft `autoUpdater.quitAndInstall()`.
  - „Später" — setzt `autoUpdater.autoInstallOnAppQuit = true`. Installation läuft beim nächsten normalen Beenden der App.

### Fehler- und Edge-Cases

- **Download bricht ab** (z.B. Netzwerk weg): Fehler-Dialog mit Retry-Option und Hinweis auf manuellen Download als Fallback.
- **SmartScreen blockt nach Download**: das ist genau der Fall, der den Zurückstellungs-Grund bildet. Mit Code-Signing nicht mehr relevant.
- **GitHub-Asset nicht vorhanden** (latest.yml fehlt): Dialog-Fehler.

### Zusätzliche IPC-Kanäle (gegenüber 4T-0029)

- `update:downloadNow` (Renderer → Main): startet den Download nach Klick auf „Jetzt installieren".
- `update:installNow` (Renderer → Main): triggert `quitAndInstall`.
- `update:download-progress` (Main → Renderer).
- `update:downloaded` (Main → Renderer).

### Zusätzliche i18n-Keys

- `update.btnInstallNow`
- `update.statusDownloading`, `update.statusReady`
- `update.restartDialogTitle`, `update.restartDialogText`
- `update.btnRestartNow`, `update.btnRestartLater`
- `update.errorDownload`, `update.errorInstall`

## Akzeptanzkriterien (für späteren Wiederanlauf)

- Bei der Setup-EXE erscheint im Update-Dialog der zusätzliche Button „Jetzt installieren".
- Klick startet Download mit Statusbar-Fortschritt.
- Nach Download erscheint der Neustart-Dialog mit „Jetzt neu starten" oder „Später".
- „Jetzt neu starten" beendet die App, der Installer startet, neue Version läuft danach.
- „Später" installiert beim nächsten normalen Beenden.
- Portable-EXE behält den Verhaltens-Stand aus 4T-0029 (Link zur Download-Seite).
- Bei SmartScreen-Konflikt bleibt der Nutzer informiert (klare Fehler-Meldung mit Workaround-Hinweis manueller Download).

## Bezug zu Dateien (für späteren Wiederanlauf)

- `src/main/main.js` — Erweiterung um `autoUpdater.downloadUpdate()`-Flow, `download-progress`-Listener, Neustart-Dialog.
- `src/main/preload.js` — neue IPC-Bridges für Fortschritt und Install-Trigger.
- `src/renderer/renderer.js` — Statusbar-Fortschrittsanzeige.
- `src/i18n/{de,en,fr,es,it}.json` — zusätzliche Update-Keys.
- `package.json` — `signtool`-Konfiguration im `build.win`-Block, Zertifikat-Pfad.

## Lösung
