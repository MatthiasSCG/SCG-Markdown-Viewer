# 4T-0009 — Hilfe-Dialog erweitern (neue Features und Shortcuts, i18n)

**Status**: Erledigt
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Der Hilfe-Dialog (`?`-Modal, seit 0.4.0) listet die Funktionen und Tastenkürzel der App. Nach den Erweiterungen in 0.6.0 ist er unvollständig: Edit-Modus, Speichern, Suchen-Ersetzen, neue Shortcuts und die Menüleiste fehlen. Gemäß projekt-lokaler `CLAUDE.md` ist der Hilfe-Dialog bei jeder Funktionserweiterung mitzupflegen.

## Lösungsansatz

- **Neue Funktions-Einträge** in `HELP_FEATURES` in `src/renderer/renderer.js`, jeweils mit neuem i18n-Key in allen fünf Sprachen:
  - `help.feature.editMode` — Bearbeiten von Markdown-Dateien im Quellcode-Bereich
  - `help.feature.save` — Speichern und Speichern unter, Dirty-Marker `•`
  - `help.feature.autoSave` — Automatisches Speichern (optional, im Datei-Menü aktivierbar)
  - `help.feature.searchReplace` — Suchen und Ersetzen im Edit-Modus
  - `help.feature.menuBar` — Menüleiste mit Datei, Ansicht, Hilfe
  - `help.feature.newWindow` — Neu und Öffnen erzeugen neues Fenster
- **Neue Shortcut-Einträge** in `HELP_SHORTCUTS`, mit neuen i18n-Keys:
  - `Strg+N` — `help.shortcut.newWindow`
  - `Strg+O` — `help.shortcut.openFile`
  - `Strg+S` — `help.shortcut.save`
  - `Strg+Umschalt+S` — `help.shortcut.saveAs`
  - `Strg+E` — `help.shortcut.toggleEdit`
  - `Strg+H` — `help.shortcut.searchReplace`
  - `Strg+1` / `Strg+2` / `Strg+3` — `help.shortcut.viewRendered` / `viewSplit` / `viewSource`
  - `F1` — `help.shortcut.openHelp`
  - `Alt` — `help.shortcut.menuBar`
- **Neue Tasten-Labels** in `KEY_LABEL_KEY` (falls noch nicht vorhanden):
  - `F1` — `help.key.f1` in fünf Sprachen
  - Tastatur-Mnemonic-Anzeige (Alt) ggf. neu
- **Wording** in allen fünf Sprachen idiomatisch, nicht 1:1 übersetzt. Vorlage Deutsch, dann Übersetzung en/fr/es/it. Beispiele:
  - DE: „Markdown-Inhalt im Editor bearbeiten (Stift in der Statusbar oder Strg+E)"
  - EN: „Edit Markdown content in the source pane (pencil in the status bar or Ctrl+E)"
- **Reihenfolge** im Modal: Edit-Modus früh in der Liste (wichtigstes neues Feature), Speichern danach, Suchen-Ersetzen nahe der bestehenden Suche, Menüleiste und Neu/Öffnen am Ende der neuen Block.

## Akzeptanzkriterien

- Hilfe-Modal (`?` oder F1) zeigt alle neuen Features und Shortcuts.
- Alle fünf Sprachen haben die neuen Keys, idiomatisch formuliert, mit korrekten Umlauten / Diakritika.
- Tastatur-Labels werden lokalisiert dargestellt (Strg/Ctrl/Maj/Mayús/Maiusc bleibt aus Vorgänger-Version, F1 als neuer Eintrag).
- Bei Sprachwechsel mit offenem Modal aktualisiert sich der Inhalt automatisch (bestehender Mechanismus seit 0.4.0).
- CHANGELOG-Eintrag erwähnt Anzahl der neuen i18n-Keys (siehe 4T-0010).

## Bezug zu Dateien

- `src/renderer/renderer.js` — `HELP_FEATURES` und `HELP_SHORTCUTS` erweitern, ggf. `KEY_LABEL_KEY`
- `src/i18n/de.json` — neue Keys, Deutsch als Master
- `src/i18n/en.json` — Englisch
- `src/i18n/fr.json` — Französisch
- `src/i18n/es.json` — Spanisch
- `src/i18n/it.json` — Italienisch

## Lösung

Hilfe-Dialog um sechs neue Features und sieben neue Tastenkürzel erweitert, plus Korrektur veralteter Wordings und F1-Mapping.

**`HELP_FEATURES` (`src/renderer/renderer.js`)** — 6 neue Einträge in logischer Reihenfolge eingefügt:
- `help.feature.newTab` (Datei → Neu / Strg+N)
- `help.feature.editMode` (Edit-Modus)
- `help.feature.save` (Speichern + Dirty-Marker + Konflikt-Dialog)
- `help.feature.autoSave` (opt-in Auto-Save)
- `help.feature.searchReplace` (Suchen-und-Ersetzen mit Backreferences)
- `help.feature.menuBar` (Native Menüleiste mit Mnemonics)

Reihenfolge im Modal: erst Datei-Operationen, dann View/Edit, dann Save/Auto-Save, dann Suche/Ersetzen, dann die bestehenden Einträge, ganz am Ende die Menüleiste.

**`HELP_SHORTCUTS`** — 7 neue Shortcut-Einträge plus Umbenennung des F1-Eintrags:
- `Strg+N` → `help.shortcut.newTab`
- `Strg+S` → `help.shortcut.save`
- `Strg+Umschalt+S` → `help.shortcut.saveAs`
- `Strg+E` → `help.shortcut.toggleEdit`
- `Strg+1 / Strg+2 / Strg+3` → `help.shortcut.viewModes` (gemeinsamer Eintrag)
- `Strg+H` → `help.shortcut.searchReplace`
- `Alt` → `help.shortcut.menuBar`
- F1: bisheriger `help.shortcut.about`-Eintrag in `help.shortcut.openHelp` umgemappt — passt zum geänderten F1-Verhalten seit 4T-0001 (F1 öffnet jetzt das Hilfe-Modal statt den Über-Dialog).

**Korrigiertes Wording** in bestehenden Feature-Texten:
- `help.feature.restoreSession`: „...optional in der Toolbar" → „...optional im Hilfe-Menü" (seit 4T-0008 ist die Sitzungs-Checkbox im Hilfe-Menü, nicht mehr in der Toolbar).
- `help.feature.languages`: „...über das Sprachmenü in der Toolbar" → „...über den Sprach-Selektor in der Statusbar" (seit 4T-0002 ist der Sprach-Selektor in der Statusbar unten).

**i18n in 5 Sprachen** (`src/i18n/{de,en,fr,es,it}.json`):
- **13 neue Keys** pro Sprache: 6 Feature-Texte (`editMode`, `save`, `autoSave`, `searchReplace`, `menuBar`, `newTab`) und 7 Shortcut-Beschriftungen (`openHelp`, `newTab`, `save`, `saveAs`, `toggleEdit`, `searchReplace`, `viewModes`, `menuBar`) — Korrektur: das sind 8 Shortcut-Keys.
- **2 Korrekturen** pro Sprache: `help.feature.restoreSession` und `help.feature.languages` mit aktualisiertem Wording.
- **1 obsolet** pro Sprache: `help.shortcut.about` entfernt (durch `help.shortcut.openHelp` ersetzt, weil F1 jetzt auf den Hilfe-Eintrag im Menü zeigt).

Insgesamt pro Sprache 14 neue Keys, 2 Wert-Updates, 1 Key-Umbenennung. Übersetzungen idiomatisch in jeder Sprache (deutsche „"-Anführungszeichen, französische «», spanische «», italienische «», englische "").

**Keine neuen Tasten-Labels nötig**: die neuen Tastenkombinationen nutzen die bestehenden Labels in `KEY_LABEL_KEY` (Strg/Ctrl/Maj/Mayús/Maiusc, Umschalt/Shift, Alt). Strg+1/2/3, Strg+E, Strg+H, Strg+N, Strg+S, F1, Alt sind alle entweder bereits abgedeckt oder international ohne Lokalisierung verständlich (F1, Alt, Zahlen).

**Bugfix beim Aufbau**: Beim ersten Build schlug die JSON-Validierung an drei Stellen in `de.json` fehl — ich hatte deutsche öffnende `„`-Anführungszeichen mit Standard-Quotes `"` als schließende kombiniert. Der String-Parser sah das `"` als String-Ende und scheiterte. Korrigiert auf die typographisch korrekte Form `„…"` (U+201E öffnend, U+201C schließend). Lerneffekt: beim Verwenden typographischer Quotes in JSON beide Zeichen konsequent verwenden, nicht mit Standard-Quote mischen.
