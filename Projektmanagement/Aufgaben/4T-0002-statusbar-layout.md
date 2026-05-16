# 4T-0002 — Statusbar unten mit View-Toggles und Such-Overlay

**Status**: Offen
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Die Quick-Toggles für Ansichtsmodus (Gerendert/Geteilt/Quellcode) und Quellcode-Optionen (Nummern/Umbruch) sind häufig genutzt und sollen schnell erreichbar bleiben. Nach der Migration auf die Menüleiste (4T-0001) wäre die alte Toolbar oben fast leer. Statt sie zu behalten, wandern die Quick-Toggles in eine **Statusbar unten**, in derselben Zeile wie das ein- und ausblendbare Such-Overlay. Das entspricht modernen Editor-Layouts (VS Code, Sublime, JetBrains) und schafft oben einen aufgeräumten Eindruck.

## Lösungsansatz

- Die `<header class="toolbar">` aus `index.html` wird **entfernt**. Sprache-Selector, Öffnen-Button, Recent-Dropdown, Über-Button, Hilfe-Button wandern entweder ins Menü (siehe 4T-0001) oder werden ersatzlos gestrichen (Über/Hilfe sind im Hilfe-Menü).
- Sprache-Selector: bleibt als kleines Dropdown rechts in der Statusbar, weil häufig getestet und nicht ins Menü passend (kein klassischer Befehl, sondern Setting).
- Neue Struktur `<footer class="statusbar">` direkt am unteren Rand mit folgenden Bereichen:
  - **Links**: Toggle-Gruppe View-Modus (Quellcode/Geteilt/Gerendert), Trenngruppe, Toggle Nummern/Umbruch
  - **Mitte (initial leer, expandable)**: Such-/Ersetzen-Overlay, eingeblendet nur bei aktivem `Strg+F` oder `Strg+H`, sonst verborgen. Die Position bleibt mittig und schiebt die anderen Elemente nicht weg, sondern überlagert sie bei Bedarf.
  - **Rechts**: Edit-Toggle (Stift-Icon, `Strg+E`), Sprache-Selector
- CSS: Statusbar fix unten, Höhe ca. 32 px, dezenter oberer Border, kompakte Icon-Buttons.
- Such-Overlay wird aus seiner aktuellen Position (`<div id="search-bar">` am Fußende, schwebend) in die Statusbar verlagert und nutzt dieselben Buttons (Aa, .*, ?, ↑, ↓, ✕). Die DOM-Struktur des Such-Overlays bleibt im Wesentlichen unverändert, nur das CSS-Layout passt sich der Statusbar-Geometrie an.
- Edit-Toggle: Stift-Icon (SVG inline), aktiv-Klasse spiegelt Edit-Zustand. Tooltip „Bearbeiten (Strg+E)" lokalisiert. Klick im Modus „Gerendert" wechselt zuerst zu „Geteilt", dann aktiviert Edit (siehe Epic, Architekturentscheidung).
- Empty-State und Drop-Overlay bleiben unverändert.

## Akzeptanzkriterien

- Toolbar oben ist nicht mehr sichtbar.
- Statusbar unten zeigt alle fünf Quick-Toggles (Quellcode/Geteilt/Gerendert, Nummern, Umbruch) in der angegebenen Reihenfolge.
- Edit-Toggle ist rechts in der Statusbar sichtbar, mit Stift-Icon und korrektem aktiv-Zustand.
- Sprache-Selector ist rechts in der Statusbar funktional.
- `Strg+F` blendet das Such-Overlay in der Statusbar ein, `Esc` blendet es aus.
- Such-Overlay überlagert die Quick-Toggles im aktivem Zustand nicht störend, sondern wird in einem dezent abgesetzten Bereich angezeigt (oder die Toggles werden im Such-Modus kurzzeitig kompakt dargestellt — Detail-Entscheidung im CSS).
- Toggles in der Statusbar zeigen aktiven Status synchron mit dem Menü-Häkchen (siehe 4T-0001).
- Im Dark-Theme funktioniert das Statusbar-Styling korrekt.

## Bezug zu Dateien

- `src/renderer/index.html` — `<header class="toolbar">` entfernen, `<footer class="statusbar">` einfügen, Such-Bar dorthin verschieben
- `src/renderer/styles.css` — Statusbar-Layout, Toggle-Buttons-Styling, Edit-Toggle-Icon, Anpassungen am Such-Overlay
- `src/renderer/renderer.js` — Event-Handler-IDs anpassen, Edit-Toggle-Logik (View-Wechsel + Edit-Aktivierung)
- `src/i18n/{de,en,fr,es,it}.json` — Tooltip-Keys für Edit-Toggle (`statusbar.edit`, `statusbar.editTitle`), evtl. weitere
- evtl. neue Asset-Datei: `src/assets/icon-edit.svg` (oder inline SVG)

## Lösung

(Wird nach Umsetzung ausgefüllt.)
