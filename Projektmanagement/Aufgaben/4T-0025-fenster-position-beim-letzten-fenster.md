# 4T-0025 — Fenster-Position und -Größe beim Schließen des letzten Fensters merken

**Status**: Erledigt
**Epic**: —
**Zielversion**: 0.7.1

## Warum

Die mit [4T-0008](4T-0008-sitzungswiederherstellung-menue.md) bzw. ursprünglich in 0.4.0 eingeführte Funktion „Fenster-Position und -Größe merken" funktioniert seit dem Multi-Window-Umbau (0.5.0) für den Sonderfall „letztes Fenster" nicht mehr. SCG Markdown startet immer auf dem Hauptmonitor mit Default-Größe (1200×800), unabhängig davon, wo das einzige offene Fenster zuletzt geschlossen wurde. Auf Multi-Monitor-Setups ist das unbequem, weil das Fenster nach jedem Beenden manuell auf den Arbeitsmonitor zurückgezogen werden muss.

## Lösungsansatz

### Ursachenanalyse

Beim Schließen eines Fensters laufen zwei Handler:

1. `win.on('close', ...)` in [src/main/main.js:509](../../src/main/main.js#L509): Dirty-Check über IPC, dann erneuter `win.close()` nach Bestätigung. Räumt Save-Bounds-Timer auf.
2. `win.on('closed', ...)` in [src/main/main.js:526](../../src/main/main.js#L526): `windows.delete(id)` entfernt das Fenster aus der Map. Danach: wenn `!isQuitting` → `persistAllWindows()`.

`persistAllWindows()` iteriert über die `windows`-Map und schreibt das Ergebnis als komplette Liste in `store.windows` (siehe [src/main/main.js:289-302](../../src/main/main.js#L289-L302)):

```js
for (const win of windows.values()) { ... list.push(...) }
store.set('windows', list);
```

Beim Schließen des **letzten** Fensters ist die Map nach `windows.delete(id)` leer. `persistAllWindows()` schreibt dann `store.windows = []` und überschreibt die zuletzt gemerkten Bounds. Anschließend feuert `window-all-closed` → `app.quit()` → `before-quit`, das nochmals `persistAllWindows()` mit ebenfalls leerer Map aufruft.

Beim nächsten Start ist `savedWindows` leer, der else-Zweig in [src/main/main.js:863-864](../../src/main/main.js#L863-L864) greift und erzeugt ein Default-Fenster ohne Bounds.

Für den Multi-Window-Fall (Schließen eines von mehreren Fenstern) ist die Logik dagegen korrekt: die übrigen Fenster werden persistiert, das geschlossene fliegt raus.

### Fix

Zweiteilig:

1. Im `close`-Handler **in der zweiten Iteration** (also nach Bestätigung durch den Renderer-Dirty-Dialog, wo das Fenster noch in der `windows`-Map und nicht destroyed ist) einmal `persistAllWindows()` aufrufen. Dadurch ist der finale Stand inkl. Bounds dieses Fensters sicher im Store, bevor `windows.delete(id)` den Eintrag entfernt.

2. Im `closed`-Handler die Bedingung `if (!isQuitting)` auf `if (!isQuitting && windows.size > 0)` verschärfen. Wenn nach dem `windows.delete(id)` keine Fenster mehr übrig sind, darf nicht mit einer leeren Liste überschrieben werden. Der Display-Info-Broadcast wird in diesem Fall ebenfalls obsolet, weil kein Fenster mehr da ist, das ihn empfangen könnte.

Der Quit-Pfad via Menü „Beenden" / `app.quit()` bleibt korrekt:
- `before-quit` setzt `isQuitting = true` und persistiert alle Fenster (Map ist da noch voll).
- Pro Fenster läuft anschließend der `close`-Handler durch und persistiert nochmal redundant, aber unschädlich (`windows`-Map ist beim ersten Fenster noch voll, schrumpft erst durch `closed`).
- `closed` überspringt wegen `isQuitting = true` jede weitere Persistenz.

### Was nicht abgedeckt wird

Ein Crash-Szenario (Strom weg, Task-Manager-Kill, Bluescreen) führt weiterhin dazu, dass nur die letzten 500 ms vor dem Crash nicht in den Store wandern, weil `move`/`resize` debounced sind. Das ist eine bewusste Akzeptanz, weil eine ungedebouncte Persistenz pro Mausbewegung den Store unnötig belasten würde und der 500-ms-Verlust in der Praxis irrelevant ist.

### Nachtrag: zweite Ursache beim Restore (DPI-Skalierung pro Monitor)

Erster Test mit dem oben beschriebenen Fix zeigte, dass die **Position** korrekt wiederhergestellt wurde, die **Größe** aber um einen Faktor verzerrt erschien (gespeichert 1638×979, dargestellt 1312×784 = exakt Faktor 0,8 = 1/1,25). Verifiziert auf einem Setup mit dem Primärmonitor (Laptop) auf 125% DPI-Skalierung und dem 4K-Sekundärmonitor auf 100%.

Ursache: ein langjähriger Electron-Bug bei Multi-Monitor-Setups mit unterschiedlicher Per-Monitor-DPI ([electron/electron Issues #10862](https://github.com/electron/electron/issues/10862), [#16444](https://github.com/electron/electron/issues/16444), [#31999](https://github.com/electron/electron/issues/31999)). Werden `x, y, width, height` direkt im `BrowserWindow`-Konstruktor gesetzt, interpretiert Electron sie in DIPs des **Primärmonitors**, unabhängig davon, wo das Fenster tatsächlich landet. Wenn der Zielmonitor eine andere Skalierung hat, erscheint die Größe um den Skalierungsfaktor verzerrt. Die Position bleibt zufällig oft korrekt, weil sie in absoluten Screen-Koordinaten liegt, die nicht von der Skalierung des Primärmonitors abhängen.

Workaround: Das Fenster zuerst mit den Default-Optionen (ohne Bounds) erstellen und danach `win.setBounds()` **zweimal** hintereinander mit denselben Ziel-Bounds aufrufen. Hintergrund: der erste Aufruf verschiebt das Fenster auf den Zielmonitor und triggert die DPI-Erkennung (Electron sendet bei jedem Monitor-Wechsel ein `WM_DPICHANGED`-Event und stellt die interne Skalierungs-Referenz um), der zweite Aufruf setzt dann mit der dann aktiven, korrekten Ziel-DPI die Bounds. Ohne den zweiten Aufruf interpretiert Electron `width/height` weiter in DIPs des Primärmonitors und liefert um den Skalierungs-Quotienten verzerrte Werte. Der `show: false`-Flag bleibt aktiv, kein Flackern.

Verifiziert auf einem Test-Setup mit Primärmonitor 125% (DISPLAY1) und Sekundärmonitor 100% (DISPLAY6): gespeicherte Bounds `{x:4000, y:600, width:1500, height:900}` werden physisch korrekt als 1500×900 DIPs auf dem Sekundärmonitor wiederhergestellt (Win32-`GetWindowRect` liefert die physischen Pixel an Position `4512, 600`, was rechnerisch der unified-DIP-Position `4000, 600` entspricht — also exakt der gespeicherte Wert).

Vorhergehende verworfene Workaround-Varianten:

1. Erste Iteration: nur `setBounds()` einmal nach Konstruktor → Größe blieb 0.8× verzerrt (Faktor `1/primary-scale`).
2. Zweite Iteration: x/y im Konstruktor, danach `setSize()` separat → Größe sogar 0.64× verzerrt (Faktor `(1/primary-scale)²`), weil sowohl Konstruktor als auch `setSize()` jeweils Primary-DIPs annahmen und sich die Skalierung verdoppelte.
3. Funktionierende Variante: alle Bounds-Operationen nach Konstruktor in zwei `setBounds()`-Aufrufen — der zweite arbeitet mit der nach dem Monitor-Wechsel korrekt erkannten Ziel-DPI.

Die Änderung ist klein, betrifft denselben Block in `createWindow()` und ergänzt den ursprünglichen Fix.

## Akzeptanzkriterien

1. Bei nur einem offenen Fenster: Fenster auf Monitor 2 verschieben, beliebige Position, dann mit X schließen. Beim nächsten Start öffnet sich SCG Markdown an exakt dieser Position auf Monitor 2.
2. Bei mehreren Fenstern: Wenn Fenster B (nicht das letzte) geschlossen wird, bleibt Fenster A weiter mit seinen aktuellen Bounds persistiert. Beim nächsten Start (bei aktivierter Sitzungswiederherstellung) öffnet nur Fenster A.
3. Maximiert-Status bleibt erhalten: Fenster maximiert auf Monitor 2 schließen → beim nächsten Start maximiert auf Monitor 2.
4. Beenden via Menü „Datei → Beenden" persistiert weiterhin alle offenen Fenster korrekt (Regressions-Test, weil die Quit-Pfad-Logik unverändert bleibt).
5. Wenn der gespeicherte Bereich auf keinem aktiven Display sichtbar ist (Monitor abgesteckt), greift weiterhin der bestehende Fallback auf die Default-Position (Code in [src/main/main.js:249-262](../../src/main/main.js#L249-L262) und [src/main/main.js:442](../../src/main/main.js#L442) bleibt unverändert).

## Bezug zu Dateien

- [src/main/main.js](../../src/main/main.js): `close`- und `closed`-Handler in `createWindow()`.
- [CHANGELOG.md](../../CHANGELOG.md): Eintrag unter `[0.7.1]`.
- [package.json](../../package.json): Versionsbump auf `0.7.1`.

## Lösung

In [src/main/main.js](../../src/main/main.js) wurden vier Stellen geändert:

1. **`close`-Handler in `createWindow()`** (Bestätigungs-Iteration): nach dem Aufräumen des debounced Save-Timers ein einmaliger `persistAllWindows()`-Aufruf, solange `!isQuitting`. Damit ist der finale Stand inklusive der Bounds des gerade zu schließenden Fensters im Store, bevor das Fenster aus der `windows`-Map entfernt wird.

2. **`closed`-Handler in `createWindow()`**: die Bedingung `if (!isQuitting)` wurde verschärft auf `if (!isQuitting && windows.size > 0)`. Wenn nach `windows.delete(id)` keine Fenster mehr übrig sind, wird nicht mehr mit einer leeren Liste über den letzten Stand geschrieben. Der Display-Info-Broadcast entfällt in diesem Fall ebenfalls.

3. **`before-quit`-Handler**: die Persistenz beim App-Quit läuft jetzt nur noch, wenn `windows.size > 0`. Das stellt sicher, dass der Pfad „letztes Fenster mit X schließen → `window-all-closed` → `app.quit()` → `before-quit`" nicht im letzten Schritt wieder eine leere Liste schreibt.

4. **`createWindow()` Konstruktor-Block**: aus Performance-Gründen und wegen des Electron-DPI-Bugs werden `x/y/width/height` nicht mehr im `BrowserWindow`-Konstruktor übergeben. Stattdessen wird das Fenster mit Default-Optionen erstellt und anschließend zweimal `win.setBounds(targetBounds)` mit denselben Ziel-Bounds aufgerufen. Der erste Aufruf bewegt das Fenster auf den Zielmonitor und triggert die DPI-Erkennung (Windows sendet `WM_DPICHANGED`, Electron stellt die interne Skalierungs-Referenz um), der zweite Aufruf setzt die Bounds mit der dann korrekten Ziel-DPI.

Verifikation auf Test-Setup (Primärmonitor 125%, Sekundärmonitor 100%): gespeicherte Bounds `{x:4000, y:600, width:1500, height:900}` werden visuell exakt als 1500×900 auf dem Sekundärmonitor wiederhergestellt. Win32 `GetWindowRect` liefert dabei `pos=4512,600 size=1500x900` (physische Pixel), was rechnerisch der DIP-Position `4000, 600` entspricht.

Vom Nutzer manuell getestet:

- Größe und Position auf Sekundärmonitor merken (Szenario 1): bestanden.
- Maximiert auf Sekundärmonitor (Szenario 2): bestanden.
- Auf dem 125%-Hauptmonitor (Szenario 3): bestanden.
- Quit via Menü „Datei → Beenden" mit zwei Fenstern, eines pro Monitor (Szenario 4): bestanden.

Das Lösungsmuster für den DPI-Bug ist als wiederverwendbarer Tipp dokumentiert in [Projektmanagement/TIPS/electron-multi-monitor-dpi-fenstergroesse.md](../TIPS/electron-multi-monitor-dpi-fenstergroesse.md), inklusive Quellenverweise auf die Electron-Issues.
