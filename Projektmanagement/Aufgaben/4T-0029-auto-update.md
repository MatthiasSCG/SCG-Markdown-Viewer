# 4T-0029 — Auto-Update mit täglichem Check und GitHub-Releases

**Status**: Offen
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0

## Warum

Heute merken Nutzer ein neues Release der App nur, wenn sie aktiv auf GitHub schauen. Der manuelle Download und das anschließende Setup sind ein Reibungspunkt, der die Verbreitung neuer Versionen verzögert. Eine in die App eingebaute Update-Routine mit klarer Nutzer-Steuerung ist Standard bei Desktop-Apps und schließt diese Lücke.

## Lösungsansatz

### Library und Provider

- **`electron-updater`** als Dependency. Die Bibliothek stammt aus dem `electron-builder`-Umfeld, integriert sich nahtlos in die bestehende Build-Pipeline und ist die De-facto-Standardlösung für Auto-Updates in Electron-Apps.
- **Provider GitHub**. Updates werden gegen GitHub-Releases geprüft. Das passt zum bestehenden Release-Prozess in [CLAUDE.md](../../CLAUDE.md): Tags, Release-Notes und Assets liegen ohnehin auf GitHub.

### Konfiguration in `package.json`

Im `build`-Block wird ergänzt:

```json
"publish": {
  "provider": "github",
  "owner": "MatthiasSCG",
  "repo": "SCG-Markdown"
}
```

`electron-builder` erzeugt damit beim Build zusätzlich die Datei `latest.yml` sowie `*.blockmap`-Dateien neben den EXEs. Diese Dateien müssen mit dem GitHub-Release als Assets hochgeladen werden, sonst meldet `electron-updater` „no published versions on GitHub".

`scripts/archive-build.js` zieht heute nur die EXEs nach `releases/`. Anpassung: Auch `latest.yml` und `SCG Markdown-<version>-Setup.exe.blockmap` mit nach `releases/` archivieren, damit der Release-Prozess sie als Asset hochladen kann. Der Release-Befehl in [CLAUDE.md](../../CLAUDE.md) wird im Abschluss-Sammeltask entsprechend erweitert.

### Setup-EXE vs. Portable-EXE

`electron-updater` unterstützt das `portable`-Target von `electron-builder` nicht. Konsequenz:

- **Setup-EXE**: vollständiger Auto-Update-Flow mit Download und Installation.
- **Portable-EXE**: gleicher Check gegen GitHub, aber bei verfügbarem Update wird nur ein Dialog mit Hinweis und Link zum Release gezeigt. Kein Download, kein Auto-Install, weil Portable nicht überschrieben werden kann.

Variant-Erkennung über die von `electron-builder` gesetzte Umgebungsvariable `process.env.PORTABLE_EXECUTABLE_DIR`. Sie ist im Portable-Modus gesetzt, im Setup-Modus nicht.

### Prüfintervall und Nutzer-Flow

- **Beim App-Start**: einmaliger Check, **45 Sekunden nach dem ersten App-Ready** (`setTimeout` im Main-Prozess). Verzögerung absichtlich, damit der Start nicht durch Netzwerk-Latenz oder Update-Dialog gestört wird; gleichzeitig kurz genug, dass auch kurze Sessions den Check erleben.
- **Im Hintergrund**: zusätzlich alle 24 Stunden ein erneuter Check (Timer via `setInterval` im Main-Prozess). Damit erfüllt die App die Anforderung „täglich prüfen", auch wenn die App tagelang offen bleibt.
- **Manuell**: Menüpunkt `Hilfe → Auf Updates prüfen…` für expliziten Trigger.

### Verhalten bei mehreren Fenstern

Der Update-Dialog erscheint **in jedem geöffneten Fenster**, sobald der Hintergrund-Check einen Treffer hat. Begründung: Der Nutzer kann den Dialog dort beantworten, wo er gerade arbeitet, ohne erst das „richtige" Fenster suchen zu müssen. Sobald in einem Fenster eine Entscheidung getroffen wird (Installieren / Später / Überspringen), werden die Dialoge in den anderen Fenstern automatisch geschlossen, der Zustand wird zentral im Main-Prozess gehalten.

Implementierung: Im Main-Prozess wird der aktuelle Update-Zustand zentral verwaltet (`pendingUpdate = { version, status }`). Bei Update-Verfügbarkeit ruft der Main-Prozess pro Fenster `dialog.showMessageBox(window, …)` auf. Auf die erste Antwort wird reagiert; die übrigen offenen Message-Boxes werden über deren `BrowserWindow`-Referenz programmgesteuert geschlossen (Wrapper um `dialog.showMessageBox` mit Cancel-Token).

### Dialog-Flow bei verfügbarem Update (Setup-EXE)

Beim Auffinden einer neueren Version öffnet sich ein modaler Dialog im Main-Prozess (`dialog.showMessageBox`):

- **Titel**: „Update verfügbar"
- **Text**: „Version X.Y.Z ist verfügbar. Aktuell installiert: A.B.C."
- **Buttons**:
  - „Jetzt installieren" — startet Download, zeigt Fortschritt in der Statusbar, fragt danach „Update bereit, App neu starten?"
  - „Später erinnern" — beim nächsten Start wird erneut geprüft.
  - „Diese Version überspringen" — die Versions-Nummer wird in `electron-store` unter `update.skippedVersion` gespeichert. Diese Version wird nicht erneut angeboten; neuere Versionen schon.

### Dialog-Flow bei verfügbarem Update (Portable-EXE)

- **Titel**: „Update verfügbar"
- **Text**: „Version X.Y.Z ist verfügbar. Die Portable-Variante kann nicht automatisch aktualisiert werden."
- **Buttons**:
  - „Zum Download öffnen" — öffnet die GitHub-Release-URL im Standard-Browser.
  - „Später erinnern"
  - „Diese Version überspringen"

### Manueller Trigger

Über `Hilfe → Auf Updates prüfen…` löst der Nutzer einen Check aus, der unabhängig vom Hintergrund-Timer läuft. Rückmeldung:

- Update verfügbar → derselbe Dialog wie oben.
- App ist aktuell → kurze Info-Box „Sie verwenden bereits die aktuelle Version A.B.C."
- Fehler (z.B. offline) → Info-Box mit Fehlertext und Link zur Release-Seite.

### Statusbar-Fortschritt während Download

Beim Klick auf „Jetzt installieren" lädt `electron-updater` die neue Setup-EXE im Hintergrund. Fortschritts-Events (`download-progress`) werden per IPC an den Renderer geleitet und über den vorhandenen `showStatusbarHint`-Helper als „Update herunterladen … 47 %" angezeigt. Nach Abschluss erscheint der Neustart-Dialog. „Neu starten" ruft `autoUpdater.quitAndInstall()` auf. „Später" verzögert die Installation bis zum nächsten regulären Beenden der App (`autoUpdater.autoInstallOnAppQuit = true`).

### Fehler- und Offline-Handling

- **Hintergrund-Check schlägt fehl** (z.B. offline): Fehler wird stillschweigend ins Log geschrieben, kein Nutzer-Dialog. Nächster Check beim nächsten Start oder nach 24 Stunden.
- **Manueller Check schlägt fehl**: Info-Box mit Fehlerbeschreibung.
- **Download schlägt fehl**: Statusbar-Hinweis in Rot, Dialog mit Retry-Option und Link auf Release-Seite.

### IPC-Vertrag

- `update:check` (Renderer → Main, manuell): startet Check, antwortet mit `{ status: 'available' | 'not-available' | 'error', version?, error? }`.
- `update:download-progress` (Main → Renderer): Fortschrittsereignisse während Download.
- `update:downloaded` (Main → Renderer): Download fertig, Neustart-Dialog wird im Main getriggert.

### i18n-Keys

Neu in allen fünf Sprachen:

- `menu.help.checkForUpdates`
- `update.dialogTitle`, `update.dialogTextSetup`, `update.dialogTextPortable`
- `update.btnInstallNow`, `update.btnRemindLater`, `update.btnSkipVersion`, `update.btnOpenRelease`
- `update.restartDialogTitle`, `update.restartDialogText`, `update.btnRestartNow`, `update.btnRestartLater`
- `update.statusUpToDate`, `update.statusDownloading`, `update.statusReady`
- `update.errorOffline`, `update.errorGeneric`

## Akzeptanzkriterien

- Beim Start der Setup-EXE läuft ein einmaliger Update-Check. Bei keinem Treffer gibt es kein UI-Feedback.
- Im Hintergrund wird alle 24 Stunden erneut geprüft.
- Bei verfügbarem Update erscheint der Dialog mit den drei Optionen, in **allen** geöffneten Fenstern. Eine Entscheidung in einem Fenster schließt die Dialoge in den anderen automatisch.
- „Jetzt installieren" lädt herunter, zeigt Fortschritt in der Statusbar, fragt nach Abschluss nach Neustart.
- „Später erinnern" setzt den Zustand zurück; nächster Check beim nächsten Start.
- „Diese Version überspringen" speichert die Version persistent. Diese Version wird nicht erneut angeboten. Eine noch neuere Version wird beim nächsten Check wieder angeboten.
- Der Menüpunkt `Hilfe → Auf Updates prüfen…` funktioniert und liefert Rückmeldung „Aktuell" oder „Update verfügbar" oder „Fehler".
- Die Portable-EXE führt denselben Check aus, zeigt aber den Portable-Dialog mit Link auf das GitHub-Release.
- Offline-Verhalten: stille Behandlung beim Hintergrund-Check, Fehler-Dialog beim manuellen Trigger.
- i18n in allen fünf Sprachen.

## Bezug zu Dateien

- `src/main/main.js` — `electron-updater`-Integration, Check-Trigger beim Start, 24-Stunden-Timer, Dialog-Steuerung, Variant-Erkennung Setup vs. Portable.
- `src/main/menu.js` — Menüpunkt `Hilfe → Auf Updates prüfen…`.
- `src/main/preload.js` — IPC-API für Renderer (Fortschritt empfangen).
- `src/renderer/renderer.js` — Statusbar-Fortschrittsanzeige während Download.
- `src/i18n/{de,en,fr,es,it}.json` — neue Update-bezogene Keys (siehe oben).
- `package.json` — `electron-updater` als Dependency, `publish`-Block im `build`, Version 0.10.0 → 0.11.0.
- `scripts/archive-build.js` — `latest.yml` und `*.blockmap` mit ins `releases/`-Archiv ziehen.
- `CLAUDE.md` — Release-Prozess-Schritt 3 (`gh release create`) um die zusätzlichen Asset-Dateien ergänzen (im Abschluss-Sammeltask).

## Lösung
