# 4T-0012 — Tab in bestehendes Fenster verschieben oder kopieren

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.7.0

## Warum

Heute kann ein Tab über das Tab-Kontextmenü nur in ein **neues** Fenster verschoben oder kopiert werden. Sobald mehrere Fenster offen sind, fehlt der direkte Weg, einen Tab in ein **bestehendes** anderes Fenster zu übergeben. Der Nutzer muss heute hilfsweise im Quellfenster schliessen und im Zielfenster manuell erneut öffnen, was bei ungespeicherten Änderungen oder beim Kopieren (statt Verschieben) gar nicht funktioniert.

Mit dieser Erweiterung wird das Tab-Kontextmenü um die Auswahl eines beliebigen anderen offenen Fensters als Ziel ergänzt, sowohl für Verschieben als auch für Kopieren. Damit der Nutzer Quell- und Ziel-Fenster eindeutig benennen kann, bekommen alle Fenster im Mehr-Fenster-Fall in der Titelleiste den Suffix `(Fenster N)`. Im Tab-Kontextmenü tragen die Ziel-Einträge dieselbe Bezeichnung `Fenster N`, mit dem Dateinamen des dortigen aktiven Tabs als Tooltip. Der Solo-Fall bleibt unverändert: kein Titel-Suffix, und im Kontextmenü die heutigen direkten flachen Einträge `Verschieben in neues Fenster` / `Kopieren in neues Fenster`.

## Lösungsansatz

### Fenster-Nummerierung (Display-Number)

Jedes Fenster bekommt zur Anzeige eine **Display-Nummer** ab 1, vergeben in der Reihenfolge der Fenster-Erzeugung. Map `windows` im Main behält Insertion-Order, also ist `displayNumber = index + 1` in der Iteration. Die Nummer ist **dynamisch**: wird ein Fenster geschlossen, rücken die anderen lückenlos nach. Im Solo-Fall (nur ein Fenster offen) wird **keine** Nummer angezeigt, der Titel bleibt wie heute.

Bei jedem Open- oder Close-Ereignis sendet der Main an **alle** Fenster ein Event `window:displayInfo` mit `{displayNumber, totalCount}`. Renderer cached den Wert und ruft `updateWindowTitle()` neu auf.

### Titel-Format

Das `updateWindowTitle()` im Renderer baut den Titel:

- `totalCount === 1`: `[• ]<Dateiname> — SCG Markdown` (unverändert)
- `totalCount > 1`: `[• ]<Dateiname> — SCG Markdown (Fenster N)`
- Ohne aktiven Tab und mit `totalCount > 1`: `SCG Markdown (Fenster N)`

Der Suffix wird lokalisiert über einen i18n-Key `window.title.suffix` mit Platzhalter `{n}` aufgebaut.

### UI-Verhalten im Tab-Kontextmenü

Aus den heutigen flachen Einträgen `Verschieben in neues Fenster` und `Kopieren in neues Fenster` werden:

- **Solo-Fall** (nur das aktuelle Fenster offen, kein anderes): unverändert die zwei flachen Einträge wie heute.
- **Mehr-Fenster-Fall** (mindestens ein weiteres Fenster offen): zwei Untermenü-Einträge `Verschieben in ▸` und `Kopieren in ▸`, jeweils mit folgenden Untereinträgen:
  - `Neues Fenster` (= bisheriges Verhalten, Aufruf `moveTabToNewWindow` / `copyTabToNewWindow`).
  - Trennstrich.
  - Ein Eintrag pro anderem offenem Fenster, Label `Fenster N`, wobei N die Display-Nummer des Zielfensters ist. Reihenfolge aufsteigend nach Display-Nummer. Das eigene Fenster wird übersprungen, die Nummerierung bleibt aber die globale (Beispiel: aus Sicht von Fenster 2 mit drei offenen Fenstern enthält das Untermenü `Fenster 1` und `Fenster 3`).
  - Jeder Fenster-Eintrag bekommt einen **Tooltip** (HTML `title`-Attribut) mit dem Dateinamen des dortigen aktiven Tabs. Bei mehreren Tabs im Zielfenster zusätzlich Suffix `(+N weitere)`. Bei Unbenannt-Tab: lokalisierter Unbenannt-Stamm.

Die Fensterliste wird **beim Öffnen des Kontextmenüs** synchron abgefragt, nicht permanent im Renderer gehalten. Damit sind Display-Nummern und Tooltip-Daten immer aktuell.

### Konflikt-Behandlung im Zielfenster

Der einkommende Tab wird im Zielfenster **immer als neuer Tab in der aktiven Pane angefügt und aktiviert**. Es gibt keine Speichern-Abfrage, kein Überschreiben des aktuellen Tabs, kein Splitten der Pane. Falls der gleiche Pfad im Zielfenster bereits in irgendeiner Pane offen ist, wird stattdessen der bestehende Tab aktiviert (Analogie zu `findTabAcrossPanes` beim normalen Öffnen), keine Duplikate.

### Verschieben vs. Kopieren

- **Kopieren**: Tab-Snapshot wird per IPC ans Zielfenster übergeben, dort als neuer Tab angefügt. Im Quellfenster passiert nichts. Bei dirty State: der dirty Inhalt des Editors wird mitübergeben (`buffer`-Inhalt aus dem aktuellen CodeMirror-State, nicht nur der Disk-Inhalt), sonst gingen lokale Änderungen verloren.
- **Verschieben**: erst Kopier-Übergabe ans Zielfenster, **nach erfolgreicher Bestätigung** des Zielfensters wird der Quell-Tab mit `skipDirtyCheck: true` geschlossen — analog zur heutigen `moveTabToNewWindow`-Logik. Damit verhindert ein scheiternder Transfer (z.B. Zielfenster gerade geschlossen worden), dass der Quell-Tab verschwindet.

### Main-Prozess-Erweiterungen

- **Title-/Tab-Cache `windowMeta: Map<id, {activeTabName, tabCount}>`** parallel zu `windows`. Renderer meldet bei jedem `updateWindowTitle` einen Event `window:metaChanged` mit `{activeTabName, tabCount}` an Main, Main aktualisiert den Cache. `activeTabName` ist der Dateiname-Anteil (ohne `•`-Marker, ohne ` — SCG Markdown`-Suffix, ohne `(Fenster N)`-Suffix), wie ihn `tabDisplayName(tab)` für den aktiven Tab liefert.
- **Neuer IPC-Handler `window:list`** in `src/main/main.js`: gibt für den aufrufenden Renderer ein Array `[{id, displayNumber, activeTabName, tabCount}]` **aller** Fenster zurück (inklusive sich selbst, der Renderer filtert sich heraus). Reihenfolge aufsteigend nach `displayNumber`.
- **Display-Number-Broadcast**: Nach jedem `windows.set(...)` (Open) und jedem `windows.delete(...)` (Close) iteriert Main alle `windows.values()` und sendet jedem Fenster individuell `window:displayInfo` mit `{displayNumber: index+1, totalCount: windows.size}`.
- **Neuer IPC-Handler `tab:appendToWindow`** mit Parametern `{targetWindowId, tabPayload}`. `tabPayload` enthält Pfad, Dirty-Buffer, Tab-Settings (View-Mode, Edit-Mode), evtl. Cursor-Position. Main routet per `webContents.send('tab:appendFromOtherWindow', tabPayload)` an das Zielfenster. Wenn das Zielfenster nicht (mehr) existiert: Rückgabe `{ok: false, reason: 'window-gone'}`, Renderer zeigt einen kurzen Status-Hinweis und führt den Move-Cleanup **nicht** durch.

### Renderer-Erweiterungen (Quell-Fenster)

- Neuer State `state.displayNumber` und `state.totalWindowCount`, initial `1` / `1`. Listener `api.onWindowDisplayInfo(({displayNumber, totalCount}) => ...)` aktualisiert diese Werte und ruft `updateWindowTitle()` auf.
- `updateWindowTitle()` erweitert: hängt bei `totalWindowCount > 1` den Suffix ` (${t('window.title.suffix', {n: displayNumber})})` an. Bei jedem Aufruf wird zusätzlich `api.notifyWindowMetaChanged({activeTabName, tabCount})` an Main gesendet, damit der Cache dort frisch bleibt.
- Im Tab-Kontextmenü-Builder `showTabContextMenu` ([src/renderer/renderer.js:1513](src/renderer/renderer.js:1513)): vor dem Aufbau `await api.listWindows()`. Die zurückgegebene Liste wird um den eigenen Eintrag (gleiche `webContents.id`) gekürzt. Wenn die gekürzte Liste leer ist → flache Einträge wie heute. Sonst Untermenüs mit `Fenster N` als Label und Tooltip aus `activeTabName` (+ Suffix bei `tabCount > 1`).
- Zwei neue Funktionen `moveTabToWindow(targetWindowId, paneIdx, tabIdx)` und `copyTabToWindow(targetWindowId, paneIdx, tabIdx)`. Bauen den Tab-Snapshot analog zu `singlePaneSnapshotFromTab`, rufen `api.appendTabToWindow(...)` auf, und bei Move zusätzlich `closeTab(paneIdx, tabIdx, {skipDirtyCheck: true})` nach Erfolgs-Bestätigung des Main-Handlers.

### Renderer-Erweiterungen (Ziel-Fenster)

- Neuer IPC-Listener `api.onAppendTabFromOtherWindow(handler)` in `src/main/preload.js`. Handler im Renderer fügt den Tab in die aktive Pane an: wenn Pfad bereits offen → bestehenden Tab aktivieren; sonst neuen Tab anlegen mit den übergebenen Settings und ggf. dirty Buffer, Fenster nach vorne holen (`win.focus()` aus Main als Convenience nach dem Send).

### i18n

Neue Keys in allen fünf Sprachdateien (`src/i18n/{de,en,fr,es,it}.json`):

- `window.title.suffix` — Titel-Suffix mit Platzhalter `{n}`, z.B. de `Fenster {n}`, en `Window {n}`, fr `Fenêtre {n}`, es `Ventana {n}`, it `Finestra {n}`. Wird im Titel als ` (…)` umschlossen.
- `tab.menu.moveToSubmenu` — Label für Submenü „Verschieben in" (Mehr-Fenster-Fall).
- `tab.menu.copyToSubmenu` — Label für Submenü „Kopieren in".
- `tab.menu.targetNewWindow` — Untermenü-Eintrag „Neues Fenster".
- `tab.menu.targetWindowLabel` — Eintrag-Label mit Platzhalter `{n}`, z.B. de `Fenster {n}` (kann i.d.R. denselben Text wie `window.title.suffix` haben, ist aber als eigener Key geführt, falls UI-Kontexte später divergieren sollen).
- `tab.menu.tooltipMoreTabsSuffix` — Tooltip-Suffix `(+{n} weitere)` mit Platzhalter, lokalisiert.

Die bestehenden Keys für die heutigen flachen Einträge bleiben unverändert und werden im Solo-Fall weiterverwendet.

### Hilfe-Dialog

Funktions-Eintrag im Hilfe-Dialog ergänzen oder anpassen, sodass klar ist: Tab kann in neues **oder bestehendes** Fenster verschoben/kopiert werden. Zusätzlich kurzer Hinweis darauf, dass die Titelleiste im Mehr-Fenster-Fall den Suffix `(Fenster N)` zeigt. Keine neuen Shortcuts. Vorgehen nach Projekt-Konvention in [CLAUDE.md → Hilfe-Dialog](../../CLAUDE.md#hilfe-dialog-bei-neuen-funktionen-erweitern): neue i18n-Keys in allen fünf Sprachen und Eintrag in `HELP_FEATURES` (bzw. Anpassung des bestehenden Move/Copy-Eintrags).

### Bewusst nicht im Umfang

- **Drag & Drop zwischen Fenstern**: eigene Größenordnung (native Electron-Drag-Quellen/-Ziele über Fenstergrenzen), separat zu erwägen.
- **Tastenkürzel** für „in welches Fenster": kein sinnvoller statischer Default, weil das Ziel dynamisch ist.
- **Speichern-Dialog im Zielfenster**: bewusst weggelassen, weil immer als zusätzlicher Tab angefügt wird.
- **Stabile Fensternummern über Lifecycle**: keine. Beim Schließen rücken die Nummern lückenlos nach. Stabile Nummern wären für den Nutzer überraschend (Lücken in der Liste).
- **MRU-Sortierung der Fensterliste**: nein, Reihenfolge fest nach Erzeugungszeit über die Display-Nummer.

## Akzeptanzkriterien

**Titel-Suffix:**

- Bei **genau einem** offenen Fenster: Titel unverändert `[• ]<Dateiname> — SCG Markdown`. Kein `(Fenster N)`-Suffix.
- Bei **zwei oder mehr** offenen Fenstern: Titel jedes Fensters endet mit ` (Fenster N)`. Das jeweils älteste Fenster trägt `(Fenster 1)`, weitere fortlaufend.
- Schließen eines Fensters: verbleibende Fenster werden lückenlos umnummeriert; sinkt die Gesamtzahl auf 1, verschwindet der Suffix im verbleibenden Fenster sofort.
- Öffnen eines neuen Fensters: bekommt die nächste freie Nummer (z.B. bei drei bestehenden Fenstern wird das neue `Fenster 4`).
- Sprachwechsel: „Fenster" wechselt zur jeweiligen Übersetzung in allen Fenstern.

**Kontextmenü-Verhalten:**

- Bei **genau einem** offenen Fenster zeigt das Tab-Kontextmenü unverändert die flachen Einträge „Verschieben in neues Fenster" und „Kopieren in neues Fenster".
- Bei **zwei oder mehr** offenen Fenstern zeigt das Tab-Kontextmenü die Einträge „Verschieben in ▸" und „Kopieren in ▸" als Untermenüs. Im Untermenü steht oben „Neues Fenster", darunter (durch Trennstrich getrennt) ein Eintrag pro **anderem** Fenster.
- Das eigene Fenster taucht **nicht** in der Liste der Ziel-Fenster auf, die Display-Nummerierung bleibt aber global (Beispiel: aus Fenster 2 von 3 zeigt das Untermenü `Fenster 1` und `Fenster 3`).
- Label eines Ziel-Eintrags ist `Fenster N` mit der globalen Display-Nummer des Zielfensters, lokalisiert in allen fünf Sprachen.
- Tooltip eines Ziel-Eintrags zeigt den Dateinamen des dortigen aktiven Tabs (Basename oder lokalisierter Unbenannt-Stamm). Bei mehr als einem Tab im Zielfenster: zusätzlich Suffix `(+N weitere)`, lokalisiert.

**Transfer-Verhalten:**

- „Kopieren in bestehendes Fenster": Tab erscheint im Ziel-Fenster als neuer aktiver Tab in der aktiven Pane, mit denselben View-/Edit-Mode-Settings wie im Quellfenster. Im Quellfenster bleibt der Original-Tab unverändert offen.
- „Verschieben in bestehendes Fenster": Tab wird im Ziel-Fenster als neuer aktiver Tab angelegt und ist im Quellfenster geschlossen. Auch bei dirty Tab erfolgt **kein** Schließen-Dialog im Quellfenster (`skipDirtyCheck: true`), weil der Inhalt mitwandert.
- Dirty State (ungespeicherter Buffer) wird **mitübergeben**. Das Ziel-Fenster zeigt den Tab als dirty (`•`-Marker), Inhalt des CodeMirror-Editors stimmt mit dem Quell-Stand überein.
- Wenn der Pfad im Zielfenster bereits in irgendeiner Pane offen ist: bestehender Tab dort wird aktiviert, kein Duplikat. Bei „Verschieben" wird der Quell-Tab dennoch geschlossen.
- Wenn das Zielfenster zwischen Menü-Anzeige und Auswahl geschlossen wurde: kurzer Status-Hinweis im Quellfenster, Quell-Tab bleibt unverändert (auch bei „Verschieben").
- Das Ziel-Fenster wird nach dem Anfügen in den Vordergrund geholt (focus).

**Hilfe:**

- Hilfe-Dialog beschreibt, dass Tabs in neues oder bestehendes Fenster verschoben/kopiert werden können und dass der Titel im Mehr-Fenster-Fall einen `(Fenster N)`-Suffix trägt — in allen fünf Sprachen.

## Bezug zu Dateien

- `src/main/main.js` — Cache `windowMeta`, neue IPC-Handler `window:list`, `window:metaChanged` (Eingang) und `tab:appendToWindow`; Broadcast `window:displayInfo` nach jedem Open/Close; Focus-Helper für das Zielfenster nach Append.
- `src/main/preload.js` — neue API-Methoden `listWindows`, `appendTabToWindow`, `onAppendTabFromOtherWindow`, `onWindowDisplayInfo`, `notifyWindowMetaChanged` (Renderer → Main).
- `src/renderer/renderer.js` — neuer State `displayNumber`/`totalWindowCount`; Listener `onWindowDisplayInfo`; `updateWindowTitle` baut Suffix `(Fenster N)` bei `totalWindowCount > 1` und sendet `notifyWindowMetaChanged`; `showTabContextMenu` baut bedingt flach (Solo) oder mit Untermenüs (Mehr-Fenster); neue Funktionen `moveTabToWindow`, `copyTabToWindow`, `buildTabPayload`; Append-Handler `onAppendTabFromOtherWindow`; `HELP_FEATURES`-Eintrag für Move/Copy angepasst, zusätzlich kurzer Hinweis auf Titel-Suffix.
- `src/i18n/{de,en,fr,es,it}.json` — sechs neue Keys: `window.title.suffix`, `tab.menu.moveToSubmenu`, `tab.menu.copyToSubmenu`, `tab.menu.targetNewWindow`, `tab.menu.targetWindowLabel`, `tab.menu.tooltipMoreTabsSuffix`. Plus angepasster Hilfe-Feature-Text.
- `CHANGELOG.md` — Eintrag unter `0.7.0` für Feature (Verschieben/Kopieren in bestehendes Fenster, Titel-Suffix) und Hilfe-Erweiterung.

## Lösung

Umgesetzt wie im Lösungsansatz beschrieben, keine Spec-Revisionen während der Klärung. Verteilung der Logik auf Main, Preload und Renderer wie geplant; das Submenu im Tab-Kontextmenü ist ein DOM-Kind des Wrappers, damit der bestehende Outside-Click-Handler es nicht abwürgt.

**Hauptpunkte der Umsetzung:**

- **Display-Nummer im Main als Map-Reihenfolge**: `windows` ist bereits eine `Map<webContents.id, BrowserWindow>` mit Insertion-Order. Daraus ergibt sich `displayNumber = idx + 1` ohne separates Tracking. Nach jedem Open (nach `did-finish-load`) und Close ruft Main `broadcastDisplayInfo()` auf, das jedem Fenster individuell `{displayNumber, totalCount}` per `window:displayInfo` sendet. Sinkt `totalCount` auf 1, fällt der Titel-Suffix im verbleibenden Fenster sofort weg.
- **Title-Cache `windowMeta` im Main**: Jeder Renderer meldet bei jedem `updateWindowTitle()` Aufruf `{activeTabName, tabCount}` an den Main (neuer IPC `window:metaChanged`). Beim `window:list`-Aufruf eines Tab-Kontextmenüs liefert Main diese Cache-Werte mit aus — kein Renderer-übergreifender Round-Trip beim Menü-Aufbau.
- **`tab:appendToWindow`-Routing**: Quell-Renderer schickt Tab-Payload mit Pfad, dirty Buffer, Settings (`viewMode`, `wrapLines`, `showLineNumbers`, `editMode`) und ggf. `untitledIndex`. Main routet per `webContents.send('tab:appendFromOtherWindow', payload)` ans Ziel-Fenster und gibt `{ok: true}` bzw. `{ok: false, reason: 'window-gone'}` zurück, falls das Zielfenster zwischen Menü-Anzeige und Klick weg ist. Quell-Renderer schließt den Original-Tab erst nach `{ok: true}` (skipDirtyCheck), damit ein gescheiterter Transfer keinen Datenverlust verursacht.
- **Append im Ziel-Fenster** (`handleAppendTabFromOtherWindow`): Bei Pfad-Duplikat wird der bestehende Tab in der jeweiligen Pane aktiviert und der dirty Buffer ggf. in CodeMirror übernommen. Sonst neuer Tab in der aktiven Pane mit `createTab(path, content, settings)`, anschließend `editMode` und dirty-State aus dem Payload nachgesetzt. Für Unbenannt-Tabs vergibt das Ziel einen frischen `untitledIndex` aus seinem lokalen Counter.
- **Solo-/Multi-Verzweigung im Kontextmenü**: `showTabContextMenu` ist jetzt async, ruft `await api.listWindows()` und filtert das eigene Fenster anhand `state.displayNumber` heraus. Bei leerer Restliste flacher Code-Pfad mit den bisherigen Keys `tab.moveToNewWindow` / `tab.copyToNewWindow`; sonst Submenüs mit den neuen Keys. Eigene Display-Nummer fehlt in der Liste, die globale Nummerierung bleibt aber stabil (aus Fenster 2 von 3 sieht man `Fenster 1` und `Fenster 3`).
- **Submenu-Hover-Verhalten**: Submenu ist DOM-Kind des Wrapper-Items, mit `position: absolute; left: 100%; margin-left: -1px` rechtsbündig angesetzt. Hover öffnet sofort, `mouseleave` startet 250 ms Close-Timer; `mouseenter` auf dem Submenu bricht den Timer ab, sodass der Übergang zuverlässig funktioniert.
- **i18n-Format mit Platzhaltern**: Da das bestehende `t()`-Helper keinen Format-Mechanismus hat, wird `{n}` per `.replace('{n}', ...)` in den Aufrufern substituiert (Titel-Suffix, Submenu-Label, Tooltip-Suffix). Schlank gehalten, kein i18n-Refactoring.
- **Pufferung für Race-Bedingungen**: `api.onWindowDisplayInfo` und `api.onAppendTabFromOtherWindow` werden synchron beim Modul-Laden registriert, analog zu `onInitialState` und `onOpenExternal`. Append-Events werden in `pendingAppendPayloads` gepuffert, falls `init()` noch nicht durch ist, und am Ende von `init()` abgearbeitet.
- **Hilfe-Dialog-Eintrag** `help.feature.multiWindow` in allen fünf Sprachen erweitert: Verschieben/Kopieren in **neues oder bestehendes** Fenster, Hinweis auf den `(Fenster N)`-Suffix als Mittel zur eindeutigen Fenster-Benennung.
