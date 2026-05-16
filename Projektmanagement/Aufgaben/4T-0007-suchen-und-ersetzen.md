# 4T-0007 — Suchen und Ersetzen (Strg+H) im Edit-Modus

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Die bestehende Suche (`Strg+F`, seit 0.3.0) ist auf reines Auffinden ausgelegt. Mit dem Edit-Modus brauchen wir auch die Gegenstück-Funktion **Suchen und Ersetzen** (`Strg+H`), wie sie aus VS Code, Sublime, Notepad++, Word bekannt ist. `Strg+F` bleibt unverändert und arbeitet immer (auch in der reinen Ansicht), `Strg+H` ist nur im Edit-Modus aktivierbar.

## Lösungsansatz

- **Trigger**: `Strg+H` öffnet das Such-Overlay (siehe 4T-0002) im „Ersetzen"-Modus, das heißt mit einer zweiten Eingabezeile für den Ersetzungstext. Im Read-Only-Zustand ist `Strg+H` deaktiviert (Such-Overlay öffnet nicht, kein Feedback nötig — alternativ kurzer Toast „Nur im Edit-Modus verfügbar", Detail-Entscheidung in der Umsetzung).
- **UI-Erweiterung des Such-Overlays**: Wenn im Ersetzen-Modus, erscheint unter dem Such-Eingabefeld ein zweites Eingabefeld „Ersetzen durch…" plus zwei Buttons:
  - „Ersetzen" — ersetzt den aktuellen Treffer (den orange hervorgehobenen) durch den Ersetzungstext und springt zum nächsten Treffer
  - „Alle ersetzen" — ersetzt alle Treffer im Dokument, zeigt eine Zahl danach an („17 Ersetzungen")
- **Regex-Unterstützung**: Wenn der `.*`-Modus aktiv ist, dürfen im Ersetzungstext Backreferences (`$1`, `$2`, …) benutzt werden. Bei nicht-Regex sind Backreferences wörtlich.
- **Case-Sensitivity**: Wirkt auch im Ersetzen-Modus auf die Such-Übereinstimmung. Der Ersetzungstext selbst bleibt unverändert (kein Auto-Casing).
- **Undo**: Eine `Alle ersetzen`-Operation ist eine einzelne CodeMirror-Transaktion, sodass `Strg+Z` sie als Ganzes rückgängig macht.
- **Suchbereich**: Im Edit-Modus immer im Quellcode-Buffer. Die bisherige Logik „Such-Bereich abhängig vom View-Modus" (Quellcode/Geteilt im Source, Gerendert in der Vorschau) bleibt für Strg+F bestehen. Für Strg+H gilt: Edit ist nur in Geteilt/Quellcode möglich, daher immer im Source.
- **Persistenz**: Letzter Such- und Ersetzungstext bleiben pro Fenster im Speicher, gehen aber **nicht** in die persistierte Session (zu zustandsabhängig, Datenschutz-Mini-Risiko bei sensiblen Texten).
- **Treffer-Verhalten beim Tippen im Editor**: Wenn der Nutzer während offenem Such-Overlay im Editor tippt, wird die Suche neu ausgeführt. Bestehende Live-Suche-Logik der 0.3.0 deckt das ab.

## Akzeptanzkriterien

- `Strg+H` im Edit-Modus öffnet das Such-Overlay mit zusätzlichem Ersetzen-Feld.
- `Strg+H` im Read-Only-Modus (Ansicht) öffnet **nicht** das Ersetzen-Panel.
- „Ersetzen"-Button ersetzt den aktuellen Treffer und springt zum nächsten.
- „Alle ersetzen"-Button ersetzt alle Treffer, zeigt die Anzahl an.
- Mit aktivem Regex-Modus funktionieren `$1`, `$2` im Ersetzungstext.
- Strg+Z macht ein „Alle ersetzen" mit einer einzelnen Tastenkombination rückgängig.
- Case-Sensitivity-Toggle wirkt auf das Match, nicht auf die Ersetzung.
- `Esc` schließt das Overlay komplett (auch das Ersetzen-Feld).
- Strg+F öffnet weiterhin das normale Such-Overlay ohne Ersetzen-Feld, auch im Edit-Modus (wenn der Nutzer nur suchen will).
- Tab-Wechsel oder View-Wechsel auf „Gerendert" schließt das Ersetzen-Overlay (weil dort kein Editor zum Ersetzen aktiv ist).

## Bezug zu Dateien

- `src/renderer/index.html` — Such-Overlay um Ersetzen-Block erweitern (`<input id="search-replace">`, Buttons `btn-replace`, `btn-replace-all`)
- `src/renderer/styles.css` — Layout des Ersetzen-Blocks innerhalb des Overlays
- `src/renderer/renderer.js` — Strg+H-Handler, Replace-Routine (Single-Match und All-Match), Integration mit CodeMirror-Transaktion
- `src/i18n/{de,en,fr,es,it}.json` — `search.replacePlaceholder`, `search.btnReplace`, `search.btnReplaceAll`, `search.replaceCount`

## Lösung

Such-Architektur in zwei Pfade aufgeteilt: Render-Pane wie bisher mit DOM-`<mark>`-Wraps; Source-Pane neu über CodeMirror-Decorations via StateField. Plus Ersetzen-Block in der Suchleiste, der nur im Edit-Modus über Strg+H aktiviert wird.

**CodeMirror-Such-Decorations (`src/renderer/renderer.js`)**:
- Neue Imports: `StateField`, `StateEffect` aus `@codemirror/state`; `Decoration` aus `@codemirror/view`.
- `setSearchDecorations` und `clearSearchDecorations` als `StateEffect`s.
- `searchHighlightField` als `StateField` mit eigener `update`-Logik: bei `setSearchDecorations`-Effect wird ein `Decoration.set` mit allen Treffern (Klasse `cm-search-match`, aktiver mit zusätzlicher `cm-search-match-current`) gerendert; bei `clearSearchDecorations` oder `tr.docChanged` werden die Decorations verworfen. Als `provide: EditorView.decorations.from(f)` in die EditorView eingehängt.
- In `createEditorState` als Extension neben den anderen aufgenommen — gilt für alle EditorViews aller Panes.

**Source-Suche (`performSourceSearch`)**:
- Iteriert das Doc per regex, sammelt `{from, to}`-Treffer (max `MAX_MATCHES` = 5000).
- Bestimmt aktiven Index: behalten falls noch gültig (per `keepCurrent`), sonst erster Treffer ab aktueller Scroll-Position (über `view.lineBlockAt`).
- Dispatcht `setSearchDecorations`-Effect mit Treffer-Array und aktivem Index. CodeMirror rendert die Markierungen stabil, auch über Re-Renders hinweg.
- `setCurrentMatch` ist polymorph: bei `scope === 'source'` Effect-Dispatch + `EditorView.scrollIntoView`, sonst DOM-`<mark>`-Pfad wie zuvor.

**`performSearch`** entscheidet anhand `search.scope`: Render-Scope → DOM-Pfad mit `highlightInContainer` (unverändert), Source-Scope → `performSourceSearch`. `clearSearchHighlights` säubert beide Pfade (DOM + alle EditorViews).

**Such-Leiste-Refactor (`src/renderer/index.html`)**:
- `<div id="search-bar">` wickelt zwei `<div class="search-row">` ein:
  - `search-row-find`: Scope-Label, Eingabe, Counter, Toggles, Navigation, Schließen-Button (alle bisherigen Elemente).
  - `search-row-replace`: zweiter Eingabe-Feld `<input id="search-replace">`, zwei Buttons (`btn-search-replace` „↪", `btn-search-replace-all` „↪↪").
- CSS: `.search-bar` ist `flex-direction: column`; Replace-Row ist `display: none` ohne `.replace-mode`-Klasse. Bei Strg+H setzt `openSearchBar({replaceMode: true})` die Klasse, beide Rows werden sichtbar.

**Ersetzen-Logik**:
- `replaceCurrentMatch()`: dispatcht eine Change-Transaktion vom aktiven Treffer durch `computeReplacement(matchText)`. Nach docChange wird das Decoration-Set automatisch geleert (StateField-Logik), `performSearch()` läuft neu, der nächste Treffer wird aktiv. Nur im Source-Scope und Edit-Modus.
- `replaceAllMatches()`: alle Treffer in **einer** Transaktion (Reverse-Order, damit Indizes konsistent). Strg+Z macht die Aktion als Ganzes rückgängig. Statusbar-Hinweis mit Count („1 Ersetzung" / „N Ersetzungen", lokalisiert) für 1.5 s.
- `computeReplacement(matchText)`: bei Nicht-Regex einfach `search.replacement`, bei Regex `matchText.replace(regex, search.replacement)` — damit funktionieren Backreferences `$1`, `$2`, …

**Strg+H** im keydown-Handler: prüft `tab && tab.editMode`. Im Read-Only-Modus wird Strg+H still ignoriert. Strg+F bleibt unverändert (Suche ohne Ersetzen).

**`bindSearchUi`** erweitert: Replace-Input-Handler (`input`, `keydown` mit Enter und Esc), Button-Klick-Handler. Enter im Replace-Feld ersetzt einen Treffer; Umschalt+Enter / Alt+Enter ersetzt alle.

**`openSearchBar({replaceMode})` und `closeSearchBar`**: replaceMode-Klasse setzen/entfernen, search.replaceMode-Flag pflegen.

**`refreshSearchIfVisible` vereinfacht**: ruft `performSearch({ keepCurrent: true })`. Der `prevIdx`-Lookup wird jetzt in `performSearch` selbst gemacht — Helper-Code für die alte Bug-Konstellation entfernt.

**i18n (5 Sprachen)** — 5 neue Keys: `search.replacePlaceholder`, `search.btnReplaceTitle`, `search.btnReplaceAllTitle`, `search.replaceCountOne`, `search.replaceCountMany`. Plural-Form sauber getrennt, damit „1 Ersetzung" / „N Ersetzungen" korrekt steht.

**CSS** (`src/renderer/styles.css`):
- `.search-row` als Flex-Container; `.search-row-replace` per `.search-bar:not(.replace-mode)`-Selector versteckt.
- `.cm-search-match` mit gelbem Hintergrund (Light: rgba 255,235,59 / 0.4; Dark 0.25), `.cm-search-match-current` orange (Light 0.55; Dark 0.45) — analog zu den Render-Pane-Highlights.

**`showStatusbarHint`** erhielt eine `text`-Option, um statt eines i18n-Keys direkt einen vorbereiteten String zu zeigen (für den N-Ersetzungen-Counter).
