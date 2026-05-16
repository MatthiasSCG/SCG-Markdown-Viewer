# 4T-0009 — Hilfe-Dialog erweitern (neue Features und Shortcuts, i18n)

**Status**: Offen
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

(Wird nach Umsetzung ausgefüllt.)
