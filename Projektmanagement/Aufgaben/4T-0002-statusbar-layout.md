# 4T-0002 — Statusbar unten mit View-Toggles und Such-Overlay

**Status**: Erledigt
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

Toolbar oben entfernt, Statusbar als `<footer>` unten eingeführt. Die Quick-Toggles wurden so reorganisiert, dass sie inhaltlich gruppiert sind, der Edit-Toggle und der Sprache-Selektor sitzen rechts.

**`src/renderer/index.html`**: `<header class="toolbar">…</header>` komplett entfernt. Neu: `<footer class="statusbar">` direkt nach `</main>` mit zwei Bereichen:
- **Links**: `.source-toggles` (Nummern, Umbruch) und `.view-toggle` (Quellcode, Geteilt, Gerendert) — Nummern/Umbruch links von Quellcode, weil sie sich konkret auf die Quellcode-Pane beziehen (Anordnung auf Wunsch des Nutzers während des Tests).
- **Rechts**: `<button id="btn-edit" class="btn-toggle btn-edit" disabled>` mit Stift-SVG-Icon (Pfad ähnlich Lucide/Feather Edit-Icon), Tooltip „Bearbeiten (Strg+E)" lokalisiert; daneben `<select id="lang-select">`.

**`src/renderer/styles.css`**: Neuer Block `.statusbar`, `.statusbar-left`, `.statusbar-right`, `.btn-edit`, `.btn-edit svg`. Statusbar-Layout: 36 px min-height, dezenter `border-top`, Light/Dark via bestehende `--bg-toolbar`-Variable. `.panes-container` zusätzlich `position: relative`, damit der Empty-State-Overlay (`inset: 0`) sich am Panes-Bereich orientiert und die Statusbar nicht überdeckt. Toter Code entfernt: `.toolbar`, `.toolbar-left/center/right`, `.caret`, `.recent-wrapper`, `.dropdown`/`-item`/`-empty`, `.setting`/`-input`, `.btn-help-icon` — knapp 70 CSS-Zeilen.

**`src/renderer/renderer.js`**:
- DOM-Referenzen `recentMenu` und `restoreCheckbox` entfernt
- In `init()`: `restoreCheckbox.checked = …` entfernt (Setting bleibt persistent, Häkchen liegt jetzt nur im Hilfe-Menü)
- In `bindUi()`: Event-Bindings für `#btn-open`, `#btn-recent`, `#btn-about`, `#btn-help` und die `restoreCheckbox.change`-Logik entfernt
- `mousedown`-Außerhalb-Logik um den `recentMenu`-Zweig bereinigt
- `Esc`-Handler: `recentMenu.hidden = true` entfernt
- `toggleRecentMenu`-Funktion komplett entfernt (~25 Zeilen)
- In `onMenuToggleRestoreSession`: Zeile `restoreCheckbox.checked = …` entfernt

**`src/i18n/{de,en,fr,es,it}.json`**: Neuer Key `statusbar.edit` (Tooltip Edit-Toggle) in allen fünf Sprachen. Tote Keys entfernt: `toolbar.recent`, `settings.restoreSession`, `recent.empty`, `about.button`, `help.button` — die zugehörigen UI-Elemente sind weg, die Menü-Pendants nutzen `menu.file.recent*`, `menu.help.restoreSession`, `menu.help.about`, `menu.help.help`. `toolbar.open` bleibt erhalten, weil der Empty-State-Button (`#btn-open-empty`) den Text noch verwendet.

**Bewusst nicht in dieser Stufe**:
- Edit-Toggle ist `disabled` — Aktivierung kommt in 4T-0003 zusammen mit CodeMirror
- Such-Overlay wurde nicht in die Statusbar-Zeile integriert. Es bleibt `position: fixed; bottom: 0` und überdeckt die Statusbar, solange aktiv. Das entspricht der Architekturentscheidung im Epic („überlagert sie bei Bedarf"), spart Komplexität, und der Nutzer hat das Verhalten beim Test akzeptiert.
- Die zwei Hilfe-Modal-Texte `help.feature.restoreSession` und `help.feature.languages` erwähnen noch die Toolbar, sind aber nach 4T-0002 inhaltlich veraltet. Anpassung in 4T-0009.
