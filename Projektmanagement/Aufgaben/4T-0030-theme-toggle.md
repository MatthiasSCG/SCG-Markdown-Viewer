# 4T-0030 — Theme-Umschalter Hell / Dunkel / System

**Status**: Erledigt
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0
**Release**: [v0.11.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.11.0)

## Warum

Heute folgt das Theme zwingend dem System-Setting über `prefers-color-scheme`. Wer in der App ein anderes Theme will als systemweit, kann das nicht. Manuelle Theme-Wahl ist Standard bei modernen Editoren. Außerdem: Beim verschobenen 4T-0024 (PDF-Export) hat die enge Kopplung an das System-Theme zusätzliche Komplikationen erzeugt, weil der Print-Modus nicht zuverlässig auf Light gezwungen werden konnte. Eine explizite Theme-Quelle erleichtert auch diesen späteren Wiederanlauf.

## Lösungsansatz

### State-Modell

Drei-Wege-Theme-State, persistiert in `electron-store`:

- **`light`**: erzwingt das Light-Theme. `data-theme="light"` am `<html>`-Element. System-Wechsel hat keine Wirkung.
- **`dark`**: erzwingt das Dark-Theme. `data-theme="dark"` am `<html>`-Element.
- **`system`** (Default für Bestandsnutzer und Neuinstallationen): bestehende Logik bleibt, also matchMedia-Listener + Live-Reaktion auf System-Änderungen.

Schlüssel in `electron-store`: `theme`. Default-Wert: `system`.

### IPC und Main-Prozess

- `theme:get` → liefert aktuellen Wert.
- `theme:set` (mit Wert `light` | `dark` | `system`) → persistiert und broadcastet an alle Renderer.
- Main-Prozess synchronisiert `nativeTheme.themeSource` entsprechend, damit System-Dialoge (z.B. Save-Dialog) das passende Theme zeigen. `nativeTheme.themeSource = 'system' | 'light' | 'dark'`.

### Renderer-seitige Anwendung

- Beim Start: Theme aus `electron-store` lesen, anwenden, matchMedia-Listener nur bei `system` aktiv halten.
- Bei `theme:set`-Event vom Main-Prozess: Theme wechseln, matchMedia-Listener entsprechend pausieren oder reaktivieren.

### Auswirkungen auf Render-Subsysteme

- **CodeMirror-Theme** (Editor-Pane) folgt heute schon dem `data-theme`-Attribut über CSS-Variablen. Kein Eingriff nötig, sofern die CSS-Variablen am `:root[data-theme="..."]` ansetzen.
- **highlight.js-Theme** (4T-0023) ist bereits über `data-theme`-Selektoren prefixed. Kein zusätzlicher Eingriff.
- **Mermaid-Diagramme** (4T-0021) werden mit `theme: 'dark'` oder `theme: 'default'` initialisiert. Bei Theme-Wechsel zur Laufzeit müssen alle bestehenden Mermaid-Blöcke neu gerendert werden. Implementierung: Hilfsfunktion `rerenderAllMermaidBlocks(targetTheme)` in [src/renderer/renderer.js](../../src/renderer/renderer.js), aufgerufen nach Theme-Wechsel.

### UI-Trigger 1: Menü `Ansicht → Theme`

Untermenü mit drei Radio-Items in `src/main/menu.js`:

- `Hell` (Radio)
- `Dunkel` (Radio)
- `System` (Radio)

Aktiver Eintrag entsprechend des persistierten Werts. Klick sendet `theme:set` ans Main-Prozess.

### UI-Trigger 2: Icon-Button in der Statusbar

Neuer Icon-Button in `statusbar-right`, **eingefügt zwischen `btn-edit` und `lang-select`** (siehe [src/renderer/index.html](../../src/renderer/index.html#L106)):

- Klick schaltet zyklisch durch die drei Zustände: Hell → Dunkel → System → Hell.
- Icon visualisiert den **aktuellen** Modus:
  - `light` → Sonne-Icon
  - `dark` → Mond-Icon
  - `system` → halb-Sonne-halb-Mond-Icon oder Computer-Icon
- Tooltip: aktueller Modus plus Hinweis auf nächsten Zustand. Beispiel: „Theme: Hell. Klicken für Dunkel."

Inline-SVG, konsistent mit dem `btn-edit`-Muster, ohne Library-Dependency.

### i18n-Keys

Neu in allen fünf Sprachen:

- `menu.view.theme` (Untermenü-Titel)
- `menu.view.themeLight`, `menu.view.themeDark`, `menu.view.themeSystem`
- `statusbar.theme.tooltipLight`, `statusbar.theme.tooltipDark`, `statusbar.theme.tooltipSystem`
- `help.feature.themeToggle` (für Hilfe-Dialog im Sammeltask)

## Akzeptanzkriterien

- `Ansicht → Theme → Hell` setzt das Theme dauerhaft auf hell, unabhängig vom System.
- `Ansicht → Theme → Dunkel` setzt dauerhaft auf dunkel.
- `Ansicht → Theme → System` aktiviert die bestehende Auto-Logik. Bei Änderung des System-Themes folgt die App live.
- Klick auf den Statusbar-Theme-Icon-Button schaltet zyklisch Hell → Dunkel → System → Hell.
- Aktiver Eintrag im Menü ist als Radio markiert. Icon in der Statusbar spiegelt den aktuellen Modus.
- Persistenz: Theme bleibt nach App-Neustart erhalten.
- Mermaid-Diagramme und Hljs-Code-Farben passen sich bei Theme-Wechsel ohne Reload an.
- CodeMirror-Editor wechselt synchron, ohne Geister-Farben aus dem vorherigen Theme.
- Save- und Open-Dialoge des Systems folgen dem gewählten Theme (`nativeTheme.themeSource`).
- i18n in allen fünf Sprachen.

## Bezug zu Dateien

- `src/main/main.js` — Theme-Persistenz in `electron-store`, IPC-Handler `theme:get`, `theme:set`, `nativeTheme.themeSource`-Sync, Broadcast an alle Renderer.
- `src/main/menu.js` — neues Untermenü `Ansicht → Theme` mit drei Radio-Items.
- `src/main/preload.js` — IPC-API für Theme im Renderer.
- `src/renderer/renderer.js` — Theme-Anwendung beim Start und bei Event, matchMedia-Listener-Steuerung, `rerenderAllMermaidBlocks`-Aufruf.
- `src/renderer/index.html` — Theme-Icon-Button in `statusbar-right` rechts neben `btn-edit`.
- `src/renderer/styles.css` — ggf. zusätzliche `data-theme`-Selektoren, Theme-Icon-Styles.
- `src/i18n/{de,en,fr,es,it}.json` — Menü-, Tooltip- und Hilfe-Keys.

## Lösung

Umgesetzt am 2026-05-19. Manueller Test durch den Nutzer am selben Tag bestanden (Portable-EXE `SCG Markdown-0.11.0-Portable.exe`, Smoke-Test und volle UI-Prüfung mit den acht im Task definierten Punkten).

### Komponenten-Stand

- **State-Modell**: Schlüssel `themePref` in `electron-store` mit Werten `light` / `dark` / `system`. Default `system`, was dem bisherigen Verhalten entspricht. Persistenz und Migration laufen ohne Sonderbehandlung, weil neuer Schlüssel.
- **Main-Prozess** ([src/main/main.js](../../src/main/main.js)):
  - In `loadStore()` wurde `themePref: 'system'` als Default ergänzt.
  - Beim App-Ready (`app.whenReady`) wird der persistierte Wert vor dem Erzeugen des ersten Fensters auf `nativeTheme.themeSource` gesetzt, damit `backgroundColor` im `createWindow`-Konstruktor direkt korrekt ist und kein Theme-Flash am Start sichtbar wird.
  - Zwei neue IPC-Handler: `theme:getPref` (Lese-Zugriff) und `theme:setPref` (Schreibe-Zugriff). `theme:setPref` setzt zusätzlich `nativeTheme.themeSource`, broadcastet `theme:prefChanged` an alle Renderer (Multi-Window-Sync) und ruft `applyMenuToAllWindows()` auf, damit das Radio-Häkchen im Menü mitspringt.
  - `getMenuState()` liefert `themePref` aus dem Store mit (für die Radio-Markierung im Menü).
  - Bestehender `nativeTheme.on('updated')`-Broadcast (`theme:changed`) bleibt unverändert; er greift jetzt sowohl bei System-Wechseln (Modus `system`) als auch nach einem manuellen `themeSource`-Setzen.
- **Menü** ([src/main/menu.js](../../src/main/menu.js)): Neues Untermenü `Ansicht → Theme` mit drei Radio-Items (Hell, Dunkel, System). Click-Callbacks senden `menu:setTheme` mit dem jeweiligen Wert an den Renderer.
- **Preload** ([src/main/preload.js](../../src/main/preload.js)): Drei neue API-Methoden — `getThemePref()`, `setThemePref(value)`, `onThemePrefChanged(cb)` — plus `onMenuSetTheme(cb)` für den Menü-Trigger.
- **Renderer** ([src/renderer/renderer.js](../../src/renderer/renderer.js)):
  - Modul-Konstanten `THEME_ICON_SVGS`, `THEME_TOOLTIP_KEYS` und `THEME_NEXT` (Cycle-Map Hell → Dunkel → System → Hell).
  - Funktion `applyThemePrefToButton(pref)` setzt das Inline-SVG-Icon des Statusbar-Buttons und aktualisiert sowohl `data-i18n-title` (für späteren Sprach-Wechsel) als auch sofort das `title`-Attribut via `t()` (für direkten Feedback nach Klick).
  - In `bindUi()` Click-Handler auf `#btn-theme`: optimistisches Icon-Update, dann `api.setThemePref(next)`. Main broadcastet zurück und bestätigt.
  - In `init()` wird `themePref` initial geladen, der Button-State angewendet, `onThemePrefChanged` und `onMenuSetTheme` registriert.
  - `state.themePref` neu im State-Objekt.
- **Index** ([src/renderer/index.html](../../src/renderer/index.html)): Neuer `<button id="btn-theme">` in `statusbar-right` zwischen `btn-edit` und `lang-select`. Initial leer (Icon wird via `applyThemePrefToButton` zur Laufzeit gesetzt).
- **Styles** ([src/renderer/styles.css](../../src/renderer/styles.css)): `.btn-theme` mit denselben Maßen wie `.btn-edit` (28×28, flex-zentriert).
- **i18n** in allen fünf Sprachen ([src/i18n/de.json](../../src/i18n/de.json), `en`, `fr`, `es`, `it`): vier Menü-Keys (`menu.view.theme`, `menu.view.themeLight`, `menu.view.themeDark`, `menu.view.themeSystem`), drei Tooltip-Keys (`statusbar.theme.tooltipLight/Dark/System`). Der bestehende `help.feature.theme`-Eintrag wurde um den manuellen Wahlmechanismus erweitert (Hilfe-Dialog).
- **Version-Bump** in `package.json` von `0.10.0` auf `0.11.0` (Entwicklungs-Zielversion gemäß Projekt-Konvention).

### Mermaid-Theme-Sync

Die in 4T-0021 implementierte `rerenderAllMermaidBlocks()`-Funktion wird über den bestehenden `theme:changed`-Broadcast getriggert. Bei manuellem Pref-Wechsel feuert Electron `nativeTheme.on('updated')` automatisch nach dem `themeSource`-Setzen, der Broadcast greift, Mermaid und hljs folgen ohne Reload.

### Hinweis zur Korrektur des Build-Versehens

Während der Implementierung wurde versehentlich mit `package.json`-Version `0.10.0` gebaut, wodurch die offiziellen v0.10.0-EXEs in `releases/` überschrieben wurden. Korrektur: offizielle Assets aus dem GitHub-Release v0.10.0 zurückgeladen, `package.json` korrekt auf `0.11.0` gesetzt, neu gebaut. Lerneffekt: **Version-Bump als allerersten Schritt bei Entwicklungsbeginn einer neuen Version**, bevor irgendein Build läuft.
