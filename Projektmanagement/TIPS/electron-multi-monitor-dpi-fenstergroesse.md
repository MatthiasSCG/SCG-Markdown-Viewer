# Electron — Fenster-Position und -Größe persistieren bei Multi-Monitor mit gemischter DPI-Skalierung

## Problem

Eine Electron-App soll Fenster-Position und -Größe beim Beenden speichern und beim nächsten Start wiederherstellen. Auf einem Single-Monitor-Setup oder auf Setups mit einheitlicher DPI-Skalierung funktioniert das mit dem naheliegenden Ansatz problemlos:

```js
// Naive Loesung (funktioniert nur bei einheitlicher DPI)
function saveBounds(win) {
  store.set('bounds', win.getBounds());
}

function createWindow(opts) {
  const bounds = store.get('bounds');
  return new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    ...
  });
}
```

Auf einem Multi-Monitor-Setup mit **unterschiedlichen DPI-Skalierungen pro Monitor** (z.B. Laptop-Monitor auf 125%, externer 4K-Monitor auf 100%, was unter Windows 11 sehr üblich ist) erscheinen Fenster beim Restore um einen Skalierungsfaktor verzerrt. Beobachtetes Symptom in der Praxis:

- Gespeichert: `{x: 4000, y: 600, width: 1500, height: 900}` auf dem 100%-Monitor.
- Wiederhergestellt: Fenster erscheint in Größe `1050×627` an einer leicht verschobenen Position.
- Verhältnis: exakt `1/primary-scale²`, also `1/1,25² ≈ 0,64`.

Die Position kann je nach Variante korrekt, leicht versetzt oder ebenfalls falsch sein. Maßgeblich für den Verzerrungsfaktor sind die Skalierungs-Quotienten zwischen Primär- und Zielmonitor.

## Diagnose

Es handelt sich um einen langjährig dokumentierten Electron-Bug auf Windows. Die Ursache liegt nicht im Anwendungscode, sondern in der Art, wie Electron beim Erzeugen eines `BrowserWindow` die DPI bestimmt:

- `BrowserWindow.getBounds()` liefert die Werte in „unified DIPs" (DIP-Koordinaten relativ zum Multi-Monitor-Layout). Auf dem Monitor, auf dem das Fenster steht, sind diese DIPs konsistent — das **Speichern** funktioniert also korrekt.
- Der `BrowserWindow`-Konstruktor und der erste `setBounds()`-Aufruf interpretieren `width/height` jedoch in DIPs des **Primärmonitors** bzw. des Monitors, auf dem das Fenster gerade ist. Wenn das Zielfenster anschließend auf einen Monitor mit anderer Skalierung wandert, rechnet Electron die Werte ein zweites Mal um. Die so verzerrte Größe bleibt persistent.

In den ersten Workaround-Versuchen reproduzierten wir die Verzerrung in mehreren Varianten:

| Ansatz | Ergebnis | Verzerrungs-Faktor |
|--------|----------|---------------------|
| `x/y/width/height` im Konstruktor | 1310×783 statt 1638×979 | `1/primary-scale = 0,8` |
| nur `setBounds()` einmal nach Konstruktor | 1310×783 | `1/primary-scale = 0,8` |
| `x/y` im Konstruktor, `setSize()` separat | 1050×627 | `1/primary-scale² ≈ 0,64` |

Der `setSize()`-Ansatz war sogar schlechter, weil sich zwei separat falsch skalierte Schritte multiplizieren.

## Lösung

**Doppelter `setBounds()`-Aufruf** ohne Bounds im Konstruktor. Hintergrund: beim ersten `setBounds()` wandert das Fenster auf den Zielmonitor, Windows sendet ein `WM_DPICHANGED`-Event, Electron stellt seine interne Skalierungs-Referenz um. Der zweite `setBounds()`-Aufruf wendet die Bounds dann mit der nun korrekten Ziel-DPI an.

```js
function createWindow(opts = {}) {
  const useStored = isBoundsVisibleOnAnyDisplay(opts.bounds);

  const options = {
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    // ...
  };

  // Fenster mit Default-Optionen erzeugen. Es landet zunaechst auf dem
  // Primaermonitor. KEIN x/y/width/height im Konstruktor uebergeben — das
  // wuerde den DPI-Bug triggern.
  const win = new BrowserWindow(options);

  if (useStored) {
    const targetBounds = {
      x: opts.bounds.x,
      y: opts.bounds.y,
      width: Math.max(opts.bounds.width, options.minWidth),
      height: Math.max(opts.bounds.height, options.minHeight),
    };
    // Erster setBounds: Fenster wandert auf Zielmonitor, DPI-Erkennung wird
    // getriggert. Zweiter setBounds: setzt die Bounds mit korrekter Ziel-DPI.
    win.setBounds(targetBounds);
    win.setBounds(targetBounds);
    if (opts.maximized) win.maximize();
  }

  win.once('ready-to-show', () => win.show());
  return win;
}
```

Ergänzende Sicherheitsfunktion: vor dem Restore prüfen, ob die gespeicherten Bounds noch auf einem aktiven Display sichtbar sind (Monitor abgesteckt, Auflösung geändert). Sonst Fallback auf Default-Position.

```js
function isBoundsVisibleOnAnyDisplay(bounds) {
  if (!bounds || typeof bounds.x !== 'number') return false;
  if (typeof bounds.width !== 'number' || typeof bounds.height !== 'number') return false;
  const displays = screen.getAllDisplays();
  for (const d of displays) {
    const a = d.bounds;
    const x1 = Math.max(bounds.x, a.x);
    const y1 = Math.max(bounds.y, a.y);
    const x2 = Math.min(bounds.x + bounds.width, a.x + a.width);
    const y2 = Math.min(bounds.y + bounds.height, a.y + a.height);
    if (x2 - x1 > 100 && y2 - y1 > 100) return true; // min. 100x100 Schnitt
  }
  return false;
}
```

Beim Speichern den Maximiert-Status separat halten und nur die Normal-Bounds persistieren, damit nach dem Restore ein gemerktes maximiertes Fenster wieder seine korrekte Restore-Größe hat:

```js
function saveBoundsForWindow(win) {
  if (!win || win.isDestroyed()) return null;
  if (win.isMinimized() || win.isFullScreen()) return null;
  const isMax = win.isMaximized();
  // Wichtig: bei maximierten Fenstern getNormalBounds(), damit die Wieder-
  // herstellungs-Groesse korrekt persistiert wird, nicht die Vollbild-Groesse.
  const bounds = isMax ? win.getNormalBounds() : win.getBounds();
  return { bounds, maximized: isMax };
}
```

## Verifikation

Test-Szenarien zum Absichern der Lösung:

1. **Single-Monitor** (Primärmonitor): Fenster verschieben, Größe ändern, schließen → beim Restart muss Position und Größe exakt stimmen.
2. **Sekundärmonitor mit abweichender DPI**: Fenster auf Sekundärmonitor ziehen, Größe einstellen, schließen → beim Restart Position und Größe auf dem Sekundärmonitor exakt.
3. **Maximiert auf Sekundärmonitor**: Fenster maximiert auf Sekundärmonitor schließen → beim Restart maximiert auf dem richtigen Monitor.
4. **Monitor abgesteckt**: Fenster auf Sekundärmonitor schließen, dann Monitor abstöpseln und neu starten → Fenster muss auf den Primärmonitor zurückfallen, nicht offscreen erscheinen.

Bei der Verifikation hilfreich: `GetWindowRect` per Win32 abfragen, weil das die **physischen Pixel** im Desktop-Koordinatensystem liefert. Diese stimmen nicht direkt mit den DIP-Werten aus der Config überein, sondern hängen über die Skalierungsfaktoren zusammen. Beispiel: gespeicherte DIP-Position `x=4000` auf einem 100%-Sekundärmonitor, der physikalisch bei `2560` startet, ergibt physische Position `2560 + (4000 − Primary-DIP-Breite) × 1,0`. Bei einer Primary-DIP-Breite von 2048 (125% auf 2560 physischen Pixeln) sind das `2560 + 1952 = 4512`.

PowerShell-Snippet zur Größen- und Positionsmessung des laufenden Fensters:

```powershell
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
Get-Process -Name 'AppName' | ForEach-Object {
  $r = New-Object W+RECT
  [W]::GetWindowRect($_.MainWindowHandle, [ref]$r) | Out-Null
  '{0},{1} {2}x{3}' -f $r.Left, $r.Top, ($r.Right - $r.Left), ($r.Bottom - $r.Top)
}
```

DPI pro Monitor auslesen:

```powershell
Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorListedSupportedSourceModes |
  ForEach-Object { $_.MonitorSourceModes | Sort-Object HorizontalActivePixels -Descending |
    Select-Object -First 1 } |
  ForEach-Object { '{0}x{1}' -f $_.HorizontalActivePixels, $_.VerticalActivePixels }
```

Vergleich der nativen mit der von `[System.Windows.Forms.Screen]::AllScreens.Bounds` gemeldeten Breite zeigt die wirksame Skalierung: `nativ / gemeldet = scale`.

## Hinweise

- Der Bug existiert seit mindestens 2017 und ist über mehrere Electron-Major-Versionen unverändert geblieben. Stand Electron 33 (Mai 2026) ist er weiterhin offen.
- Wenn Electron das in einer zukünftigen Version behebt, kann der zweite `setBounds()`-Aufruf entfernt werden. Bis dahin schadet er nicht: bei einheitlicher DPI ist der zweite Aufruf einfach redundant.
- Eine vermeintlich elegantere Variante mit `screen.dipToScreenRect()` / `screen.screenToDipRect()` wurde verworfen, weil sie das Speicherformat hätte ändern müssen und im Zusammenspiel mit dem Konstruktor-Bug weitere Korrekturen nötig gewesen wären.
- Persistenz-Timing: Bounds werden über `move`- und `resize`-Events debounced (500 ms) und zusätzlich beim Close-Event direkt vor dem Schließen persistiert, damit auch das letzte Fenster beim Schließen über das X-Symbol seine Bounds nicht verliert. Siehe Bezug-Task für die zugehörige Map-Logik im Multi-Window-Fall.

## Quellen

- [electron/electron #10862 — Per monitor DPI awareness causes issues with window positioning and sizing](https://github.com/electron/electron/issues/10862)
- [electron/electron #16444 — Moving a BrowserWindow to another display applies the „Scale" of the current](https://github.com/electron/electron/issues/16444)
- [electron/electron #17033 — Windows 10 — BrowserWindow setSize() working incorrectly in dual-display setup with different scaling](https://github.com/electron/electron/issues/17033)
- [electron/electron #20423 — BrowserWindow dimensions and monitor with different DPI and > 100%](https://github.com/electron/electron/issues/20423)
- [electron/electron #27651 — setBounds make BrowserWindows larger every time on Windows](https://github.com/electron/electron/issues/27651)
- [electron/electron #31999 — Wrong initial window size, when using multiple monitors with different resolution and scaling](https://github.com/electron/electron/issues/31999)

## Bezug

- Ursprung im Projekt: Task [4T-0025 — Fenster-Position und -Größe beim Schließen des letzten Fensters merken](../Aufgaben/4T-0025-fenster-position-beim-letzten-fenster.md) in Version 0.7.1.
- Umsetzung: [src/main/main.js](../../src/main/main.js), Funktion `createWindow()`.
