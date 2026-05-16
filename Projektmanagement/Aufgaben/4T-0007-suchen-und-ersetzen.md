# 4T-0007 — Suchen und Ersetzen (Strg+H) im Edit-Modus

**Status**: Offen
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

(Wird nach Umsetzung ausgefüllt.)
