# 4T-0017 — Zoom für Editor und Render-Pane (Strg + +/-/0)

**Status**: Offen
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Die App hat aktuell keine Zoom-Funktion. Bei wechselnden Monitor-Auflösungen, beim Präsentieren auf externen Bildschirmen oder schlicht aus Komfortgründen ist eine temporäre Vergrößerung des Inhalts wünschenswert. Erwartet wird das aus Browsern und IDEs etablierte Verhalten: `Strg + +` vergrößern, `Strg + -` verkleinern, `Strg + 0` zurück auf Standard.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

- **Zoom-Faktor pro Tab**, gehalten im Tab-State im Renderer. Default 1.0 für jeden neu erzeugten Tab. Schrittweite 10 %, Min 0.5, Max 3.0 (Min/Max im Detail-Design zu bestätigen).
- **Geltung**: Der Zoom-Faktor eines Tabs gilt gleichzeitig für Editor- und Render-Pane dieses Tabs (gemeinsamer Multiplikator, nicht pro Pane getrennt).
- **Tab-Wechsel**: Beim Wechsel des aktiven Tabs wird der jeweilige Zoom-Faktor angewendet und der Statusbar-Indikator aktualisiert. So kann ein Tab dauerhaft 130 % zeigen, ein anderer Tab im selben Fenster 80 %.
- **Tab-Transfer in anderes Fenster** (siehe [4T-0012](4T-0012-tab-in-bestehendes-fenster.md)): Der Zoom-Faktor wandert mit dem Tab, analog zu View-Modus, Edit-Modus und Dirty-Buffer. Sowohl beim Verschieben als auch beim Kopieren.
- **Tastenkürzel und Mausrad** (alle drei wirken auf den aktiven Tab):
  - `Strg + +` bzw. `Strg + Numpad-+`: vergrößern um eine Stufe (10 %)
  - `Strg + -` bzw. `Strg + Numpad--`: verkleinern um eine Stufe (10 %)
  - `Strg + 0` bzw. `Strg + Numpad-0`: Reset auf 1.0
  - `Strg + Mausrad-hoch` / `Strg + Mausrad-runter`: vergrößern/verkleinern, ebenfalls 10 % pro Tick
- **Anzeige des aktuellen Zoom-Faktors**: kleiner Indikator rechts in der Statusbar (z.B. „Zoom 120 %"), sichtbar nur wenn der Faktor des aktiven Tabs != 1.0. Klick auf den Indikator setzt den aktiven Tab zurück auf 1.0.
- **Persistenz**: Zoom ist rein flüchtig. Beim Schließen des Fensters geht er verloren, ebenso bei der Sitzungswiederherstellung (wiederhergestellte Tabs starten immer mit Zoom 1.0). Die Schriftgröße aus [4T-0018](4T-0018-schriftart-konfigurierbar.md) ist davon unabhängig und bleibt persistent.
- **Implementierung**: Statt `webFrame.setZoomFactor` (zoomt das gesamte Fenster inklusive Statusbar und Menü) wird eine CSS-Variable `--zoom` auf den Content-Container des aktiven Tabs angewendet, sodass nur Editor- und Render-Pane skaliert werden. Statusbar, Tabs, Sidebar (Outline/Backlinks) und Menüleiste bleiben unverändert.

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
