# 4T-0017 — Zoom für Editor und Render-Pane (Strg + +/-/0)

**Status**: Erledigt
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Die App hat aktuell keine Zoom-Funktion. Bei wechselnden Monitor-Auflösungen, beim Präsentieren auf externen Bildschirmen oder schlicht aus Komfortgründen ist eine temporäre Vergrößerung des Inhalts wünschenswert. Erwartet wird das aus Browsern und IDEs etablierte Verhalten: `Strg + +` vergrößern, `Strg + -` verkleinern, `Strg + 0` zurück auf Standard.

## Lösungsansatz

### Getroffene Detail-Entscheidungen (vor Umsetzung)

- **Min/Max und Schrittweite**: 0.5 (50 %) bis 3.0 (300 %), Schrittweite 10 %. Weiteres Vergrößern/Verkleinern jenseits der Limits ist No-Op.
- **CSS-Technik**: Chromium-`zoom`-Property direkt auf den Inhalts-Containern `.pane-source-editor` (CodeMirror) und `.markdown-body` (Render-Output) jeder Pane. Skaliert sowohl Schrift als auch Layout-Geometrie inklusive Scrollbars und Klick-Bereichen. CSS `transform: scale()` scheidet aus, weil es Scroll- und Hit-Targets zerlegt.
- **Pro-Pane-Wirksamkeit**: Bei zwei sichtbaren Pane-Gruppen wird der Zoom des jeweils aktiven Tabs jeder Pane gleichzeitig auf deren Inhalt angewendet. Tastenkürzel und Mausrad wirken auf die **fokussierte** Pane (`state.activePaneIndex`). Statusbar-Indikator zeigt den Zoom des Tabs der fokussierten Pane.

### Verhalten

- **Zoom-Speicherung pro Tab**: Neues Feld `tab.zoom` (Number, Default 1.0). Auf `createTab` initialisieren.
- **Tab-Wechsel**: Beim Aktivieren eines Tabs wird `tab.zoom` auf die beiden Inhalts-Container der Pane angewendet. Bei `zoom === 1` wird das Property entfernt (kein Eintrag in `style`).
- **Tastenkürzel** (zusätzlich zu den bisherigen globalen `keydown`-Handlern in `renderer.js`):
  - `Ctrl + +`, `Ctrl + Shift + +`, `Ctrl + Numpad-+`: +10 %
  - `Ctrl + -`, `Ctrl + Numpad--`: −10 %
  - `Ctrl + 0`, `Ctrl + Numpad-0`: Reset auf 1.0
  - Matching über `event.code` (z.B. `NumpadAdd`, `Minus`) und `event.key` (`+`, `-`, `0`), um deutsche und englische Layouts gleichermaßen abzudecken.
- **Mausrad**: `wheel`-Listener auf jeder Pane-Gruppe. Bei `event.ctrlKey === true` → `preventDefault()` + 10 %-Schritt anhand `event.deltaY`-Vorzeichen.
- **Electron-Default-Zoom unterdrücken**: Im Renderer-Init `webFrame.setVisualZoomLevelLimits(1, 1)` und für die obigen Tastenkürzel und das Strg+Wheel-Event konsequent `preventDefault()` rufen, damit Electron nicht zusätzlich `webContents`-Zoom anwendet.
- **Statusbar-Indikator**: Neues `<span id="zoom-indicator">` rechts in der Statusbar (vor dem Edit-Button). Anzeige `Zoom XXX %` bei `tab.zoom !== 1`, sonst `hidden`. Klick → Reset des aktiven Tabs der fokussierten Pane auf 1.0. Tooltip per i18n.
- **Tab-Transfer** ([4T-0012](4T-0012-tab-in-bestehendes-fenster.md)): `buildTabPayload` ergänzt `settings.zoom`; `handleAppendTabFromOtherWindow` liest `settings.zoom` und setzt den Tab-Zoom entsprechend. Verschieben wie Kopieren.
- **Sitzungswiederherstellung**: Der Tab-Snapshot für die Sitzung speichert den Zoom **nicht**. Wiederhergestellte Tabs starten mit `zoom = 1.0`.

### Technische Umsetzung

- `createTab` erweitern um `zoom: settings.zoom ?? 1.0`.
- Helper `applyZoomToPane(paneIdx)` setzt `el.style.zoom = String(zoom)` auf beiden Inhalts-Containern (oder entfernt die Property bei 1.0).
- Helper `setTabZoom(paneIdx, factor)` clampt auf [0.5, 3.0], rundet auf 1 Nachkommastelle (Vermeidung von Floating-Point-Drift bei 10 %-Schritten), schreibt in den Tab und ruft `applyZoomToPane` plus `renderZoomIndicator`.
- Globale `keydown`-Handler im bestehenden Block in `renderer.js` (gleiche Stelle wie z.B. `Ctrl+Shift+B` aus 4T-0015).
- `wheel`-Listener auf `panes-container` mit `passive: false`, damit `preventDefault()` greift.
- `renderZoomIndicator()` wird bei Tab-Wechsel, Pane-Wechsel und Zoom-Änderung aufgerufen; analog zum Pattern der bestehenden Statusbar-Hinweise.

### i18n-Keys (neu)

- `statusbar.zoom` mit Platzhalter `{percent}` (z.B. `"Zoom {percent} %"`)
- `statusbar.zoomResetTitle` als Tooltip für Klick-zum-Reset (z.B. `"Klicken, um auf 100 % zurückzusetzen"`)

Beide in allen fünf Sprachen.

### Abgrenzung

- Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes folgen im Sammeltask am Epic-Ende.
- Schriftgröße (persistent, aus [4T-0018](4T-0018-schriftart-konfigurierbar.md)) ist davon unabhängig und bleibt unangetastet.

## Akzeptanzkriterien

**Steuerung:**

- `Strg + +` / `Strg + Numpad-+` und `Strg + Mausrad-hoch` vergrößern den Inhalt des aktiven Tabs um 10 %.
- `Strg + -` / `Strg + Numpad--` und `Strg + Mausrad-runter` verkleinern um 10 %.
- `Strg + 0` / `Strg + Numpad-0` setzen den Faktor des aktiven Tabs auf 1.0 zurück.
- Min- und Max-Limits werden eingehalten; weiteres Vergrößern oder Verkleinern darüber hinaus ist No-Op.
- Zoom-Faktor wirkt nur auf den Content-Bereich (Editor- und Render-Pane); Statusbar, Tab-Leiste, Sidebar-Panels (Outline/Backlinks) und Menüleiste bleiben in Standardgröße.
- Zoom funktioniert in allen drei View-Modi (Quellcode, Geteilt, Gerendert) und überlebt View-Wechsel innerhalb desselben Tabs.

**Pro-Tab-Verhalten:**

- Jeder Tab hat seinen eigenen Zoom-Faktor. In demselben Fenster kann Tab A bei 130 % und Tab B bei 80 % sein.
- Beim Tab-Wechsel wird der Faktor des neu aktivierten Tabs angewendet und der Statusbar-Indikator entsprechend aktualisiert.
- Neu angelegte Tabs starten immer mit Zoom 1.0.
- Beim Verschieben oder Kopieren eines Tabs in ein anderes Fenster ([4T-0012](4T-0012-tab-in-bestehendes-fenster.md)) wandert der Zoom-Faktor mit, analog zu View-Modus und Edit-Mode.

**Indikator:**

- Bei Faktor != 1.0 des aktiven Tabs erscheint ein kleiner Indikator rechts in der Statusbar (z.B. „Zoom 120 %"); Klick darauf setzt den aktiven Tab auf 1.0 zurück.
- Bei Faktor 1.0 ist der Indikator unsichtbar.

**Persistenz:**

- Beim Schließen des Fensters geht der Zoom verloren. Beim nächsten Start (auch via Sitzungswiederherstellung) starten alle Tabs mit Zoom 1.0.
- Die konfigurierte Schriftgröße aus [4T-0018](4T-0018-schriftart-konfigurierbar.md) ist davon nicht betroffen und bleibt persistent.

## Bezug zu Dateien

- `src/renderer/renderer.js` — Zoom-Logik, Tastenkürzel-Handler, Statusbar-Indikator.
- `src/renderer/styles.css` — CSS-Variable `--zoom`, Anwendung auf Content-Container.
- `src/renderer/index.html` — Statusbar-Indikator-Element.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Zoom-Indikator und Hilfe-Texte am Epic-Ende.

## Lösung

**Zoom-Speicherung pro Tab** in `src/renderer/renderer.js`:

- Tab-Objekt erweitert um `zoom` (Number, Default 1.0). Initialisierung in `createTab` über `clampZoom(settings.zoom ?? DEFAULT_ZOOM)`.
- Konstanten `DEFAULT_ZOOM = 1.0`, `ZOOM_MIN = 0.5`, `ZOOM_MAX = 3.0`, `ZOOM_STEP = 0.1`. Helper `clampZoom` rundet zusätzlich auf eine Nachkommastelle, damit wiederholte 0.1-Schritte keine Floating-Point-Drift erzeugen.

**CSS-Technik**:

- Chromium-`zoom`-Property direkt auf `.pane-source-editor` und `.markdown-body` der jeweiligen Pane. Skaliert sowohl Schrift als auch Layout-Geometrie inklusive Scrollbars und Klick-Bereiche.
- Bei Faktor 1.0 wird das Property auf leer gesetzt (Default-Stack), nicht auf den Wert `1`. So bleibt das Inline-Style sauber.

**Zentrale Helper**:

- `applyZoomToPane(paneIdx)` setzt den Zoom des aktiven Tabs auf die Inhalts-Container der Pane. Aufruf in `renderPaneContent` (wirkt bei jedem Tab-Wechsel).
- `renderZoomIndicator()` aktualisiert den Statusbar-Indikator anhand des Zooms des fokussierten Tabs. Aufruf in `activateTab` und `activatePane` (Tab-/Pane-Wechsel) sowie beim Sprachwechsel (i18n-Platzhalter `{percent}`).
- `adjustTabZoom(paneIdx, deltaSteps)` und `resetTabZoom(paneIdx)` kapseln Schritt- und Reset-Logik; beide schreiben nur, wenn sich der Wert tatsächlich ändert.

**Tastenkürzel** im bestehenden globalen `keydown`-Handler:

- `Ctrl + +` / `Ctrl + -` / `Ctrl + 0`, jeweils auch in Numpad-Form. Matching über `e.key === '+'/'-'/'0'`, deckt damit deutsche Tastatur (Shift+'+'-Taste), englische Tastatur (Shift+'='-Taste) und Numpad gleichermaßen ab. `preventDefault()` verhindert konkurrierende Default-Aktionen.

**Mausrad**:

- `wheel`-Listener auf `panes-container` mit `{ passive: false }`, damit `preventDefault()` greift. Bei `e.ctrlKey === true` wird +1 oder −1 Schritt je nach Vorzeichen von `deltaY` angewendet.

**Statusbar-Indikator** in `src/renderer/index.html` und `src/renderer/styles.css`:

- Neues `<button id="zoom-indicator">` rechts in der Statusbar vor dem Edit-Button. Versteckt bei Zoom 100 %, sonst sichtbar mit Text `Zoom XXX %` und Tooltip. Klick → Reset auf 100 % über `resetTabZoom`.
- Eigene `.zoom-indicator`-Styles in `styles.css` mit dezenter Border und Hover-Highlight.

**i18n** in allen fünf Sprachen:

- `statusbar.zoom` (Platzhalter `{percent}`), `statusbar.zoomResetTitle`.

**Tab-Transfer** ([4T-0012](4T-0012-tab-in-bestehendes-fenster.md)):

- `buildTabPayload` ergänzt `settings.zoom`. Der Empfangs-Pfad nutzt `createTab(..., settings)`, der den Zoom über `settings.zoom ?? DEFAULT_ZOOM` übernimmt. Damit wandert der Zoom-Faktor beim Verschieben wie beim Kopieren mit.
- Wenn der Pfad im Zielfenster bereits offen ist, behält der bestehende Tab seinen Zoom (analog zu anderen Settings, die in diesem Existing-Pfad nicht übernommen werden).

**Sitzungswiederherstellung**:

- `restorePanes` reicht die persistierten `tabSettings` an `createTab` weiter, die kein `zoom`-Feld enthalten — wiederhergestellte Tabs starten damit automatisch mit 1.0. Der Sitzungs-Snapshot speichert den Zoom bewusst nicht.

**Electron-Default-Zoom unterdrücken** in `src/main/preload.js`:

- `webFrame.setVisualZoomLevelLimits(1, 1)` deaktiviert die Standard-Bindings von Strg+Plus/Minus/Mausrad auf der WebContents-Ebene, sodass nicht doppelt skaliert wird.
- **Wichtig**: Der Aufruf läuft in einem `DOMContentLoaded`-Handler und ist in `try/catch` geklammert. Ein Top-Level-Aufruf direkt nach `require('electron')` warf in der laufenden Electron-Version eine Exception zur Modul-Lade-Zeit; das Preload-Skript brach ab, der Renderer kam nicht hoch und `ready-to-show` triggerte nicht — das Fenster blieb unsichtbar trotz laufender Prozesse im Task Manager. Der defensive Pfad fängt das ab.

**Bewusst nicht in 4T-0017:**

- Hilfe-Dialog-Erweiterung, CHANGELOG-Eintrag, Release-Notes folgen im Sammeltask am Epic-Ende.
- Konfigurierbare Schriftgröße (persistent) — eigener Task [4T-0018](4T-0018-schriftart-konfigurierbar.md).
- `=`-Taste ohne Shift als Zoom-In-Variante (in einigen Browsern üblich): `e.key === '+'` ist robust und matched für deutsche wie englische Tastatur, ohne dass eine zweite Variante nötig wäre.
