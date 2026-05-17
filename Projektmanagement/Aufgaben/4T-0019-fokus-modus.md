# 4T-0019 — Fokus-Modus mit optionalem Typewriter-Scroll

**Status**: Offen
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Beim konzentrierten Schreiben längerer Markdown-Dokumente lenken Tabs, Statusbar und andere UI-Elemente ab. Ein Fokus-Modus, der das UI-Chrome ausblendet und optional den Cursor vertikal zentriert hält (Typewriter-Scroll), entspricht einem in vielen Markdown-Editoren etablierten Schreib-Modus.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Aktivierung

- Tastenkürzel: `Strg + Umschalt + F` (zu bestätigen, da `F11` typischerweise Vollbild ist und sich vermischen würde).
- Alternative Aktivierung: Menüpunkt `Ansicht → Fokus-Modus` (Toggle mit Häkchen, Multi-Window-synchron).
- Status persistent in den Settings, sodass der Modus nach Quit/Restart erhalten bleibt.

### Verhalten

- Bei Aktivierung werden ausgeblendet:
  - Tab-Leiste (beide Spalten falls Zwei-Spalten-Layout)
  - Statusbar am unteren Rand
  - Sidebar-Panels aus 3E-0002 (Outline, Backlinks), sofern offen
- **Bleiben sichtbar**:
  - Native Menüleiste (erreichbar via `Alt`)
  - Editor- und Render-Pane (je nach View-Modus)
- Optionaler **Vollbild-Modus**: Eintritt in Vollbild bei Aktivierung, Verlassen bei Deaktivierung. Vorschlag: Vollbild standardmäßig **nicht** gleichzeitig aktivieren, sondern als separate Option im Settings-Dialog (Sektion „Darstellung" oder neue Sektion „Schreiben"). Beim ersten Aktivieren also nur UI-Chrome aus, Vollbild bleibt manuell.
- **Verlassen**: erneutes Drücken des Tastenkürzels, erneutes Anklicken des Menüpunkts, oder `Esc` bei aktivem Editor-Fokus.

### Typewriter-Scroll

- Optionale Erweiterung, schaltbar im Settings-Dialog. Default: aus.
- Wenn aktiv: Editor scrollt so, dass die Cursor-Zeile immer auf der vertikalen Bildschirmmitte bleibt, sobald der Cursor bewegt wird.
- Im View-Modus „Gerendert" hat das keine Wirkung.
- Implementierung über CodeMirror-Extension, die nach jeder Selektions- oder Cursor-Änderung den `scrollIntoView` mit `y: "center"` aufruft.

### Multi-Window

- Fokus-Modus pro Fenster, nicht global. Bei Aktivierung in einem Fenster wird das andere nicht beeinflusst.
- Status wird pro Fenster persistent gespeichert, sodass beim nächsten Start dasselbe Fenster wieder im Fokus-Modus startet (sofern Sitzungswiederherstellung aktiv ist).

## Akzeptanzkriterien

- Tastenkürzel und Menüpunkt aktivieren bzw. deaktivieren den Fokus-Modus für das aktive Fenster.
- Im aktiven Fokus-Modus sind Tab-Leiste, Statusbar und Sidebar-Panels nicht mehr sichtbar.
- Menüleiste bleibt über `Alt` erreichbar.
- Esc verlässt den Modus, sofern der Editor-Pane den Fokus hat.
- Der Modus wirkt nur auf das aktivierte Fenster.
- Im Settings-Dialog gibt es eine Option „Typewriter-Scroll", die unabhängig vom Fokus-Modus ein- und ausschaltbar ist.
- Bei aktivem Typewriter-Scroll bleibt der Cursor vertikal zentriert, sobald er bewegt wird.
- Fokus-Modus-Status und Typewriter-Scroll-Status sind persistent über App-Neustart hinweg.
- Sprachwechsel aktualisiert Menüpunkt-Label und Settings-Sektion live.

## Bezug zu Dateien

- `src/renderer/renderer.js` — Toggle-Logik, Tastenkürzel-Handler, Typewriter-Scroll-Extension, Settings-IPC.
- `src/renderer/styles.css` — Klasse `body.focus-mode` mit ausgeblendeten Elementen, Übergangs-Animation falls gewünscht.
- `src/main/menu.js` — neuer Menüpunkt `Ansicht → Fokus-Modus`, Multi-Window-synchroner Häkchen-Stand.
- `src/main/main.js` — Settings-Persistenz für Fokus-Modus und Typewriter-Scroll.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Menü-Label, Settings-Optionen, Tooltip.

## Lösung
