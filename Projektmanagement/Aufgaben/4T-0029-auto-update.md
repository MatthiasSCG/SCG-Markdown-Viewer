# 4T-0029 — Update-Erkennung und Benachrichtigung mit Link

**Status**: Offen
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0

> **Scope-Reduktion (2026-05-19):** Ursprünglich war dieser Task umfassender mit Auto-Download und Auto-Installation geplant. Aufgrund der SmartScreen-Risiken bei unsigniertem Installer wurde der Auto-Install-Teil in [4T-0032](4T-0032-auto-install.md) ausgelagert und auf den Zeitpunkt nach Einführung eines Code-Signing-Zertifikats zurückgestellt. 4T-0029 deckt jetzt nur noch Update-**Erkennung** und **Benachrichtigung mit Link** zur GitHub-Release-Seite ab.

## Warum

Heute merken Nutzer ein neues Release der App nur, wenn sie aktiv auf GitHub schauen. Selbst wenn ein neues Release vorliegt, läuft die installierte Version weiter, ohne zu wissen, dass sie veraltet ist. Eine in die App eingebaute Update-Routine, die täglich gegen GitHub prüft und bei verfügbarem Update einen Hinweis mit Link gibt, schließt diese Lücke ohne die Risiken eines Auto-Install auf einer nicht signierten Setup-EXE.

## Lösungsansatz

### Library und Provider

- **`electron-updater`** als Dependency. Auch wenn wir vorerst keinen Auto-Download nutzen, ist die Bibliothek der Standard für Update-Erkennung in Electron-Apps und integriert sich nahtlos in `electron-builder`. Sie liefert die Versions-Prüfung, das `latest.yml`-Parsen, die GitHub-API-Anbindung und das Caching out-of-the-box. Eine eigene Implementierung würde dasselbe nachbauen.
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

`electron-builder` erzeugt damit beim Build zusätzlich die Datei `latest.yml` sowie `*.blockmap`-Dateien neben den EXEs. **`latest.yml`** muss mit dem GitHub-Release als Asset hochgeladen werden, sonst meldet `electron-updater` „no published versions on GitHub". Die `*.blockmap`-Datei ist nur für differenzielle Updates relevant; für unseren Erkennungs-Pfad ohne Auto-Download nicht zwingend, wird aber der Vollständigkeit halber mit hochgeladen.

`scripts/archive-build.js` zieht heute nur die EXEs nach `releases/`. Anpassung: Auch `latest.yml` und `SCG Markdown-<version>-Setup.exe.blockmap` mit nach `releases/` archivieren, damit der Release-Prozess sie als Asset hochladen kann. Der Release-Befehl in [CLAUDE.md](../../CLAUDE.md) wird im Abschluss-Sammeltask entsprechend erweitert.

### Setup-EXE und Portable-EXE einheitlich

Da kein Auto-Download stattfindet, ist der Dialog für beide Varianten **identisch**. Beide Varianten zeigen denselben Dialog mit dem Link zur GitHub-Release-Seite. Der Nutzer entscheidet manuell, ob er die Setup- oder Portable-Variante herunterlädt. Die in der ursprünglichen Planung vorgesehene `process.env.PORTABLE_EXECUTABLE_DIR`-Detection wird nicht benötigt.

### Prüfintervall und Trigger

- **Beim App-Start**: einmaliger Check, **45 Sekunden nach dem ersten App-Ready** (`setTimeout` im Main-Prozess). Verzögerung absichtlich, damit der Start nicht durch Netzwerk-Latenz oder Update-Dialog gestört wird.
- **Im Hintergrund**: zusätzlich alle 24 Stunden ein erneuter Check (`setInterval` im Main-Prozess). Damit erfüllt die App die Anforderung „täglich prüfen", auch wenn die App tagelang offen bleibt.
- **Manuell**: Menüpunkt `Hilfe → Auf Updates prüfen…` für expliziten Trigger.

### Dialog bei verfügbarem Update

Bei Treffer öffnet sich ein modaler Dialog im Main-Prozess (`dialog.showMessageBox`):

- **Titel**: „Update verfügbar"
- **Text**: „Version X.Y.Z ist verfügbar. Aktuell installiert: A.B.C."
- **Buttons**:
  - **„Zum Download öffnen"** — öffnet die GitHub-Release-URL im Standard-Browser über `shell.openExternal`. Nutzer lädt die passende EXE manuell.
  - **„Später erinnern"** — beim nächsten Hintergrund-Check (24 h) oder beim nächsten App-Start wird erneut geprüft.
  - **„Diese Version überspringen"** — die Versions-Nummer wird in `electron-store` unter `update.skippedVersion` gespeichert. Diese Version wird nicht erneut angeboten, neuere Versionen schon.

### Verhalten bei mehreren Fenstern

Der Update-Dialog erscheint **in jedem geöffneten Fenster**, sobald der Hintergrund-Check einen Treffer hat. Sobald in einem Fenster eine Entscheidung getroffen wird, werden die Dialoge in den anderen Fenstern automatisch geschlossen, der Zustand wird zentral im Main-Prozess gehalten (`pendingUpdate`-State).

### Manueller Trigger

Über `Hilfe → Auf Updates prüfen…` löst der Nutzer einen Check aus, der unabhängig vom Hintergrund-Timer läuft. Rückmeldung:

- Update verfügbar → derselbe Dialog wie oben.
- App ist aktuell → kurze Info-Box „Sie verwenden bereits die aktuelle Version A.B.C.".
- Fehler (z.B. offline) → Info-Box mit Fehlertext und Hinweis, später erneut zu prüfen.

### Fehler- und Offline-Handling

- **Hintergrund-Check schlägt fehl** (z.B. offline): Fehler wird stillschweigend ins Log geschrieben, kein Nutzer-Dialog. Nächster Check beim nächsten Start oder nach 24 h.
- **Manueller Check schlägt fehl**: Info-Box mit Fehlerbeschreibung.

### IPC-Vertrag

- `update:check` (Renderer → Main, manuell): startet Check, antwortet mit `{ status: 'available' | 'not-available' | 'error', version?, error? }`.
- Kein `update:download-progress`, kein `update:downloaded` (gehört zu 4T-0032).

### i18n-Keys

Neu in allen fünf Sprachen:

- `menu.help.checkForUpdates`
- `update.dialogTitle`, `update.dialogText`
- `update.btnOpenRelease`, `update.btnRemindLater`, `update.btnSkipVersion`
- `update.statusUpToDate`, `update.statusUpToDateMessage`
- `update.errorTitle`, `update.errorOffline`, `update.errorGeneric`

### Test-Strategie: Pre-Release als Update-Ziel

Während der Entwicklung wird auf GitHub ein **Pre-Release** `v0.11.0-rc1` erstellt (mit den aktuellen 0.11.0-EXEs vom Stand 4T-0030+4T-0031). Markiert als Pre-Release, **nicht als „latest"**. Die lokale Entwicklungs-App trägt während 4T-0029 die Version `0.11.0-dev.0` in `package.json`. semver-Vergleich: `0.11.0-dev.0 < 0.11.0-rc1`, daher wird das Pre-Release als Update erkannt.

`electron-updater` wird mit `allowPrerelease: true` während der Entwicklung konfiguriert. Vor dem finalen v0.11.0-Release wird die Option zurückgenommen, sodass die Live-App nur stabile Releases vorschlägt.

## Akzeptanzkriterien

- Beim Start der App läuft 45 Sekunden nach App-Ready ein einmaliger Update-Check. Bei keinem Treffer gibt es kein UI-Feedback.
- Im Hintergrund wird alle 24 h erneut geprüft.
- Bei verfügbarem Update erscheint der Dialog mit den drei Optionen in **jedem** geöffneten Fenster. Eine Entscheidung in einem Fenster schließt die Dialoge in den anderen automatisch.
- „Zum Download öffnen" öffnet die GitHub-Release-Seite des verfügbaren Updates im Standard-Browser.
- „Später erinnern" schließt den Dialog ohne Persistenz; nächster Check beim nächsten Start oder nach 24 h.
- „Diese Version überspringen" speichert die Version dauerhaft. Diese Version wird nicht erneut angeboten. Eine noch neuere Version wird beim nächsten Check wieder angeboten.
- Der Menüpunkt `Hilfe → Auf Updates prüfen…` funktioniert und liefert Rückmeldung „Aktuell" oder „Update verfügbar" oder „Fehler".
- Offline-Verhalten: stille Behandlung beim Hintergrund-Check, Fehler-Dialog beim manuellen Trigger.
- Setup-EXE und Portable-EXE zeigen denselben Dialog.
- i18n in allen fünf Sprachen.

## Bezug zu Dateien

- `src/main/main.js` — `electron-updater`-Integration, 45-s-Timer beim Start, 24-h-Background-Timer, Dialog-Steuerung, Multi-Window-Sync, IPC-Handler.
- `src/main/menu.js` — Menüpunkt `Hilfe → Auf Updates prüfen…`.
- `src/main/preload.js` — IPC-API für den manuellen Trigger aus dem Renderer.
- `src/i18n/{de,en,fr,es,it}.json` — neue Update-bezogene Keys (siehe oben).
- `package.json` — `electron-updater` als Dependency, `publish`-Block im `build`, Version-Bump auf `0.11.0-dev.0` während der Entwicklung, vor Release wieder auf `0.11.0`.
- `scripts/archive-build.js` — `latest.yml` und `*.blockmap` mit ins `releases/`-Archiv ziehen.
- `CLAUDE.md` — Release-Prozess-Schritt 3 (`gh release create`) um die zusätzlichen Asset-Dateien ergänzen (im Abschluss-Sammeltask).

## Lösung
