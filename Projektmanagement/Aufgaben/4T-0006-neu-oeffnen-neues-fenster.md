# 4T-0006 — Datei → Neu (neuer Tab im aktiven Fenster)

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Der Befehl **Datei → Neu** soll einen leeren „Unbenannt"-Buffer eröffnen, in dem der Nutzer sofort losschreiben kann. Vereinheitlicht mit **Datei → Öffnen…** und dem Recent-Klick (4T-0005): alle drei Befehle erzeugen einen neuen Tab im **aktiven Fenster**, kein neues Fenster. Der ursprüngliche Konzept-Plan sah neue Fenster vor, wurde aber während der Klärung mit dem Nutzer auf „Tab im aktiven Fenster" revidiert, weil das konsistent zum Recent-Verhalten und zu „Öffnen mit" im Explorer ist.

## Lösungsansatz

- **Neu (Strg+N)**: Erzeugt im aktiven Pane einen neuen Tab mit `path: null`, leerem Buffer, `viewMode: 'split'`, `editMode: true`. Tab-Titel: `Unbenannt 1`, `Unbenannt 2`, … (lokalisiert, lokal pro Fenster hochzählend). Der Editor bekommt nach Erzeugung den Tastatur-Fokus.
- **Öffnen… (Strg+O)**: Bereits seit 4T-0001 funktional — `Datei → Öffnen…` ruft `openDialog()` im Renderer, der den OS-Dialog zeigt und die Auswahl per `openInPane(activePaneIndex, files)` als neue Tabs im aktiven Fenster anlegt. Wenn die Datei in irgendeinem Pane des aktuellen Fensters schon offen ist, wird der bestehende Tab aktiviert (`findTabAcrossPanes`), kein Duplikat.
- **Unbenannt-Counter pro Fenster**: `state.untitledCounter` (Renderer-State, initial 1, hochzählend bei jedem `Datei → Neu`). Wird **nicht** persistiert; bei App-Neustart oder neuem Fenster beginnt der Counter wieder bei 1.
- **Tab-Anzeige**: Neuer Helper `tabDisplayName(tab)` — bei `tab.path` der Basename, bei Unbenannt-Tabs `${t('save.untitled')} ${tab.untitledIndex}`. Bei Sprachwechsel rendert die Tabbar automatisch neu, der Untitled-Stamm folgt der Sprache.
- **Sitzungswiederherstellung**: Unbenannt-Tabs (ohne Pfad) gehen **nicht** in die persistierte Sitzung. `buildPanesSnapshot` filtert Tabs ohne Pfad heraus und rechnet `activeIndex` um. Dirty-Unbenannt werden vor dem Quit über den Schließen-Dialog aus 4T-0004 abgefangen (Speichern unter… oder Verwerfen).
- **Auto-Save bei Unbenannt**: greift nicht, weil `performAutoSave` nur Tabs mit Pfad speichert (bereits in 4T-0004 so umgesetzt). Erst nach erstem manuellen „Speichern unter" wird der Tab auto-save-fähig.
- **Strg+W bei leerem Unbenannt** (dirty=false): schließt ohne Dialog. Sobald getippt (dirty=true): Schließen-Dialog wie bei jedem dirty Tab; bei „Speichern" leitet in Speichern-unter.

## Akzeptanzkriterien

- `Datei → Neu` (Strg+N) erzeugt einen Tab `Unbenannt 1` im aktiven Pane, View „Geteilt", Edit-Modus aktiv, Cursor im Editor.
- Erste Eingabe setzt `•` im Tab- und Fenstertitel; ohne Eingabe ist der Tab nicht dirty.
- Mehrfaches Strg+N im selben Fenster zählt: `Unbenannt 1`, `Unbenannt 2`, …
- Neues Fenster (Tab-Auslagern) hat eigenen Counter, beginnt bei `Unbenannt 1`.
- App-Neustart: Counter resettet.
- Sprachwechsel: Tab- und Fenstertitel-Stamm wechseln (`Unbenannt` ↔ `Untitled` ↔ `Sans titre` ↔ `Sin título` ↔ `Senza titolo`).
- Strg+S in dirtigem Unbenannt-Buffer: leitet in Speichern-unter-Dialog; Default-Filename ist `Unbenannt.md` (lokalisierter Stamm + `.md`).
- Strg+W bei leerem Unbenannt: schließt ohne Dialog. Bei dirty Unbenannt: Schließen-Dialog wie bei normalen Tabs.
- Sitzungswiederherstellung beim Neustart: nur Tabs mit Pfad. Unbenannt-Tabs sind nicht da; Counter beginnt bei 1.
- Auto-Save bei Unbenannt: greift nicht.

## Bezug zu Dateien

- `src/main/main.js` — neue Action `actions.newTab`; im `file:saveAs`-Handler Default-Pfad mit `.md`-Suffix aus `save.untitled`-Stamm zusammenbauen
- `src/main/menu.js` — `Datei → Neu` enabled mit Click-Handler `actions.newTab`
- `src/main/preload.js` — `onMenuNew`-Listener
- `src/renderer/renderer.js` — `state.untitledCounter`, `tabDisplayName`, `createTab` mit `untitledIndex`, neue Funktion `newUntitledTab()`, `buildPanesSnapshot` mit null-Filter, `renderTabbar`/`updateWindowTitle` über Helper, Menu-Listener `onMenuNew`
- `src/i18n/{de,en,fr,es,it}.json` — `save.untitled` umgestellt von `<X>.md` auf nur `<X>` (Stamm-Wort für Tab-Label und als Basis für den Save-As-Default-Filename)

## Lösung

Umgesetzt wie im Lösungsansatz beschrieben. Spec-Revision während der Klärung: aus „neues Fenster" wurde „neuer Tab im aktiven Fenster", weil das konsistent zum Recent-Verhalten ist und ungespeicherte Buffer-Übergänge zwischen Fenstern vermeidet. Code-Aufwand entsprechend deutlich geringer als ursprünglich geschätzt — `Datei → Öffnen…` brauchte gar keine Änderung (war seit 4T-0001 bereits korrekt), nur `Datei → Neu` und die Untitled-Tab-Mechanik kamen neu hinzu.

**Hauptpunkte der Umsetzung**:

- **i18n-Wert `save.untitled` umgestellt** in allen fünf Sprachen: vom kompletten Dateinamen (`Unbenannt.md` / `Untitled.md` / `Sans titre.md` / `Sin título.md` / `Senza titolo.md`) auf den Stamm (`Unbenannt` / `Untitled` / `Sans titre` / `Sin título` / `Senza titolo`). Der Speichern-unter-Default-Filename hängt im Main-Handler `.md` an.
- **`createTab` um `untitledIndex`** erweitert. Bei normalen Tabs `null`, bei `Datei → Neu` wird `state.untitledCounter++` zugewiesen.
- **`tabDisplayName(tab)` als zentraler Helper**: bei Pfad der Basename, sonst `${t('save.untitled')} ${tab.untitledIndex}`. Wird in `renderTabbar`, `updateWindowTitle`, `closeTab`-Dialog-Detail und im Window-Close-Schleifen-Detail genutzt — Sprachwechsel propagiert automatisch.
- **`newUntitledTab()`**: legt im aktiven Pane einen Tab mit `path: null`, `viewMode: 'split'`, `editMode: true` an, aktiviert ihn, fokussiert den CodeMirror-Editor per `setTimeout(view.focus, 0)`.
- **`buildPanesSnapshot` filtert null-Pfade**: `paths` und `tabSettings` werden auf indices mit `tab.path` reduziert, `activeIndex` umgerechnet. Unbenannt-Tabs sind damit aus dem persistierten Stand draußen.
- **Menü-Integration**: `Datei → Neu` (Strg+N) ist enabled und feuert `menu:new` per IPC. Renderer bindet `api.onMenuNew(() => newUntitledTab())`. `actions.newTab` als Bezeichner (statt `new`, weil JS-Keyword-Risiko).