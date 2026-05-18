# 4T-0019 — Fokus-Modus mit optionalem Typewriter-Scroll

**Status**: Erledigt
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Beim konzentrierten Schreiben längerer Markdown-Dokumente lenken Tabs, Statusbar und andere UI-Elemente ab. Ein Fokus-Modus, der das UI-Chrome ausblendet und optional den Cursor vertikal zentriert hält (Typewriter-Scroll), entspricht einem in vielen Markdown-Editoren etablierten Schreib-Modus.

## Lösungsansatz

### Getroffene Detail-Entscheidungen (vor Umsetzung)

- **Tastenkürzel Fokus-Modus**: `Ctrl+Shift+F`. `F11` bleibt bewusst für Electron-Default-Vollbild reserviert; Vollbild und Fokus-Modus sind getrennte Konzepte.
- **Vollbild bei Fokus-Modus-Aktivierung**: **nicht** automatisch. Wer Vollbild will, drückt zusätzlich `F11`. Hält die Verantwortung getrennt und vermeidet eine zusätzliche Settings-Option.
- **Typewriter-Scroll-Aktivierung**: zweiter Menüeintrag `Ansicht → Typewriter-Scroll` (Checkbox). Kein Settings-Dialog-Eintrag in 0.9.0 — der Menü-Toggle ist sichtbarer und konsistent zur Fokus-Modus-Aktivierung.
- **Persistenz**: **global** für beide Werte (`focusMode`, `typewriterScroll`). Toggle wirkt sofort auf das aktive Fenster; der gespeicherte Wert ist der zuletzt verwendete Stand und wird beim App-Start neuer Fenster angewendet.
- **Multi-Window-Toggle**: kein Broadcast. Toggle wirkt nur auf das aktive Fenster. Andere offene Fenster bleiben unberührt. Nur die Persistenz ist global.
- **Esc**: deaktiviert den Fokus-Modus **nach** allen anderen Esc-Empfängern (Regex-Hilfe → Suche → Modale → Kontextmenü → erst dann Fokus-Modus).

### Verhalten Fokus-Modus

- Beim Aktivieren wird die CSS-Klasse `focus-mode` am `<body>` gesetzt. Sie blendet aus:
  - Tab-Leisten beider Spalten (`.tabbar`)
  - Statusbar (`.statusbar`)
  - Sidebar-Panels (`.pane-sidebar`)
  - Sidebar-Splitter (`.splitter.sidebar-splitter`)
- Sichtbar bleiben: Editor-Pane, Render-Pane, Inner-Splitter zwischen den Panes, native Menüleiste (über Alt erreichbar).
- Sidebar-State (offen/zu) wird nicht verändert — nur die Sichtbarkeit über CSS. Beim Verlassen erscheinen die Panels wieder im vorherigen Zustand.
- Verlassen: erneuter Toggle (Tastenkürzel, Menü) oder Esc.

### Typewriter-Scroll

- Eigene CodeMirror-Extension `typewriterScroll`, die über ein Compartment zur Laufzeit ein-/ausgeschaltet werden kann.
- Implementierung als `EditorView.updateListener`, der bei `update.selectionSet` (Cursor- oder Selektions-Änderung) den Editor so scrollt, dass die Cursor-Zeile vertikal zentriert ist. Das geschieht über `view.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) })`.
- Wirkt nur im Editor-Pane. Render-Pane bleibt unbeeinflusst.
- Wirkt nur im Edit-Modus — im Read-Only-Modus bewegt sich der Cursor ohnehin nicht aktiv durch den Text.
- Toggle ist unabhängig vom Fokus-Modus: beide Schalter können einzeln oder gemeinsam aktiv sein.

### Renderer-Integration

- Globaler State in `state.focusMode` (boolean) und `state.typewriterScroll` (boolean), beim Start aus den Settings geladen.
- Helper `setFocusMode(on)` / `toggleFocusMode()` und analog für Typewriter.
- Die Setter setzen die CSS-Klasse bzw. die CodeMirror-Compartment-Konfiguration neu, melden den neuen Stand an das Main-Menü (für die Häkchen) und persistieren über `settings:set`.
- Globaler `keydown`-Handler im bestehenden Block für `Ctrl+Shift+F` (zwischen den bestehenden `Ctrl+Shift+B`/`O`-Bindings).
- Esc-Handler im Reihenfolge-Block für Modale erweitern: nach den anderen Empfängern.

### Menü und Main

- Neue Menüeinträge unter „Ansicht":
  - `Ansicht → Fokus-Modus` (Checkbox, Accelerator `CmdOrCtrl+Shift+F`)
  - `Ansicht → Typewriter-Scroll` (Checkbox, kein Accelerator)
- `getMenuState` im Main liest `state.focusMode` und `state.typewriterScroll` aus dem Settings-Cache und liefert sie als Häkchen-Stand pro Fenster.
- `settings:set` schreibt die Werte in den Store. Bei `focusMode`/`typewriterScroll` wird das Menü des **eigenen** Fensters aktualisiert (kein Cross-Window-Broadcast).
- Da der Toggle auch über das Menü erfolgen kann, gibt es zwei neue Preload-IPC-Bridges: `onMenuToggleFocusMode` und `onMenuToggleTypewriterScroll`.

### i18n

- `menu.view.focusMode`, `menu.view.typewriterScroll` in allen fünf Sprachen.

### Abgrenzung

- Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes folgen im Sammeltask am Epic-Ende (mit der dort vorgesehenen Tab-/Gruppen-Restrukturierung).
- Automatischer Vollbild-Eintritt bei Fokus-Modus → nicht in 0.9.0.
- Typewriter-Scroll im Settings-Dialog → nicht in 0.9.0 (Menü-Toggle reicht).
- Fokus-Modus pro Fenster persistiert → nicht in 0.9.0 (globale Persistenz reicht; Aufwand-Nutzen-Verhältnis).
- Animation/Übergangs-Effekte → nein, sofortige Umschaltung.

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

**Fokus-Modus** in `src/renderer/styles.css`:

- Neue CSS-Klasse `body.focus-mode` blendet `.tabbar`, `.statusbar`, `.pane-sidebar` und `.splitter.sidebar-splitter` per `display: none !important` aus. Editor-Pane, Render-Pane und Inner-Splitter bleiben sichtbar. Native Menüleiste ist nicht im DOM und bleibt damit über Alt erreichbar.

**Renderer-Logik** in `src/renderer/renderer.js`:

- `state.focusMode` und `state.typewriterScroll` als boolesche Flags im globalen `state`. Beim Start aus den Settings (`focusMode`, `typewriterScroll`) geladen und auf das Fenster angewendet, bevor die Pane-Editoren entstehen.
- `setFocusMode(on)` / `toggleFocusMode()` togglen die Body-Klasse, schreiben in den Store und rufen `reportMenuStateNow()` für die Menü-Häkchen.
- `setTypewriterScroll(on)` / `toggleTypewriterScroll()` rekonfigurieren ein neues CodeMirror-Compartment `editorCompartments.typewriter` auf allen aktiven `paneEditors`.
- Globaler Tastenkürzel-Handler erweitert um `Ctrl+Shift+F` (zwischen den `Ctrl+Shift+O/B`-Bindings).
- Esc-Handler erkennt zunächst, ob ein Overlay mit Vorrang offen ist (Kontextmenü, Hilfe, About, Settings); nur wenn keines davon offen war, deaktiviert Esc den Fokus-Modus. Regex-Hilfe und Suchbar haben über das eigene `return` weiterhin Vorrang.

**Typewriter-Scroll-Extension** in `src/renderer/renderer.js`:

- `typewriterScrollExtension` als `EditorView.updateListener.of(...)`. Bei `update.selectionSet` und nicht-read-only-State wird `EditorView.scrollIntoView(head, { y: 'center' })` über `view.dispatch` aufgerufen.
- Compartment `editorCompartments.typewriter` mit initialer Konfiguration aus `state.typewriterScroll` in `createEditorState()`.
- Wirkt nur im Edit-Modus und nur im Editor-Pane.

**Menü-Einträge** in `src/main/menu.js`, alle unter „Ansicht":

- `Bearbeiten` als Checkbox direkt nach den View-Modi (Quellcode / Geteilt / Gerendert) mit eigenem Trenner-Block. Accelerator `CmdOrCtrl+E`. Aktiv nur bei vorhandenem aktiven Tab. **Ersetzt** den bisherigen Renderer-only-Tastenkürzel `Strg+E` — der manuelle Handler im `keydown`-Block wurde entfernt, das Menü übernimmt das Routing über IPC.
- `Fokus-Modus` als Checkbox mit Accelerator `CmdOrCtrl+Shift+F`. Nach dem `Zeilenumbruch`-Eintrag mit Trenner-Block.
- `Typewriter-Scroll` als Checkbox ohne Accelerator, direkt unter Fokus-Modus.

**Main-Process** in `src/main/main.js`:

- `getMenuState` reicht die drei neuen Flags `editMode`, `focusMode`, `typewriterScroll` aus dem Renderer-Report-State durch. Initialwerte des Menüs (vor dem ersten Renderer-Report) sind `false`; sobald `window:reportMenuState` reinkommt, baut der Main das Menü mit den korrekten Häkchen neu.

**Preload-IPC-Bridges** in `src/main/preload.js`:

- `onMenuToggleFocusMode(cb)`, `onMenuToggleTypewriterScroll(cb)`, `onMenuToggleEdit(cb)`.

**Menu-State-Report** in `src/renderer/renderer.js`:

- `reportMenuStateNow()` liefert zusätzlich `focusMode`, `typewriterScroll` (aus dem globalen State) und `editMode` (aus dem aktiven Tab).

**Persistenz**:

- `electron-store`-Schlüssel `focusMode` und `typewriterScroll`, global (nicht pro Fenster). Toggle wirkt nur auf das aktive Fenster; der gespeicherte Wert ist der zuletzt verwendete Stand und wird beim Start eines neuen Fensters angewendet. Damit kein Multi-Window-Broadcast nötig.
- `editMode` bleibt pro Tab im Renderer-State, nicht persistiert (war auch vor 4T-0019 schon so).

**i18n** in allen fünf Sprachen:

- `menu.view.edit`, `menu.view.focusMode`, `menu.view.typewriterScroll`.

**Ergänzung Bearbeiten-Toggle im Menü** (nach Test-Feedback):

- Während des Tests fiel auf, dass im Fokus-Modus die einzige Möglichkeit, zwischen Edit- und Anzeige-Modus zu wechseln, der Toolbar-Button in der Statusbar war — und der ist im Fokus-Modus ausgeblendet. Tastenkürzel `Strg+E` allein reichte für die UX nicht.
- Lösung: Der Edit-Modus bekommt einen eigenen Menü-Eintrag `Ansicht → Bearbeiten` mit Accelerator `CmdOrCtrl+E`. Der bisherige Renderer-only-Tastenkürzel-Handler entfällt; das Menü übernimmt das Routing. Damit ist der Modus auch im Fokus-Modus jederzeit erreichbar.

**Bewusst nicht in 4T-0019:**

- Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes folgen im Sammeltask am Epic-Ende.
- Automatischer Vollbild-Eintritt bei Fokus-Modus → nicht in 0.9.0. Wer Vollbild will, drückt zusätzlich F11.
- Fokus-Modus-Persistenz pro Fenster → nicht in 0.9.0. Globale Persistenz reicht; Aufwand-Nutzen-Verhältnis spricht dagegen.
- Typewriter-Scroll im Settings-Dialog → nicht in 0.9.0. Menü-Toggle ist sichtbarer und konsistent.
- Animation oder weiche Übergänge beim Fokus-Modus-Wechsel → nein, sofortige Umschaltung ist klarer.
