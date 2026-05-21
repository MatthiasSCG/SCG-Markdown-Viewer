# 4T-0065 — Hilfe-Dialog um Callouts, Highlight und Footnotes erweitern

**Status**: Offen
**Epic**: [3E-0012 — Markdown-Syntax-Erweiterungen](3E-0012-markdown-syntax-erweiterungen.md)
**Zielversion**: 0.18.0
**Setzt voraus**: [4T-0061](4T-0061-callouts.md), [4T-0062](4T-0062-highlight.md), [4T-0063](4T-0063-footnotes.md), [4T-0064](4T-0064-block-embed-ast.md)

## Warum

Mit den vier Code-Tasks 4T-0061 bis 4T-0064 kommen neue User-sichtbare Funktionen dazu, die im Hilfe-Dialog dokumentiert sein müssen. Konvention dazu in [CLAUDE.md, Abschnitt „Hilfe-Dialog bei neuen Funktionen erweitern"](../../CLAUDE.md#hilfe-dialog-bei-neuen-funktionen-erweitern).

## Lösungsansatz

### Funktions-Einträge in `HELP_FEATURE_GROUPS`

Voraussichtliche neue Einträge in [src/renderer/renderer.js](../../src/renderer/renderer.js), Gruppe **Bearbeitung**:

- `help.feature.callouts` — Callout-Boxen mit `> [!type]`-Syntax (10 Typen, klappbar).
- `help.feature.highlight` — Text-Hervorhebung mit `==Text==`.
- `help.feature.footnotes` — Fußnoten mit `[^1]` und inline `^[Text]`.

Block-Embed-Erweiterung (4T-0064) verfeinert ein bereits dokumentiertes Feature (Wiki-Embeds aus 4T-0055) und braucht voraussichtlich keinen neuen Funktions-Eintrag, eventuell aber eine Anpassung der bestehenden Wiki-Embed-Beschreibung in `help.feature.wikiEmbeds`. Entscheidung am Ende des Epics.

### Shortcut-Einträge in `HELP_SHORTCUTS`

Voraussichtlich keine neuen Shortcuts, weil alle drei Markdown-Syntax-Erweiterungen rein über Markdown-Eingabe wirken. Falls bei der Umsetzung von 4T-0061/0062/0063 Hotkeys hinzukommen, hier ergänzen.

### i18n-Keys

Drei (bis vier) neue Keys `help.feature.<name>` in allen fünf Sprachdateien (`src/i18n/de.json`, `en.json`, `fr.json`, `es.json`, `it.json`). Beschreibung pro Eintrag: ein Satz, was das Feature tut.

### Hilfe-Markdown-Beispiele

Bei Bedarf wird eine vorhandene Hilfe-Markdown-Datei (falls vorhanden, z.B. `docs/help/de.md`) um Code-Beispiele für die drei neuen Syntaxen erweitert. Entscheidung am Ende des Epics, abhängig vom aktuellen Doku-Stand.

## Akzeptanzkriterien

- Drei neue Funktions-Einträge im Hilfe-Dialog (Gruppe Bearbeitung), in allen fünf Sprachen.
- Beschreibung pro Eintrag ist ein verständlicher Satz, der dem Test-Nutzer klar macht, wofür das Feature dient.
- Bei Block-Embed-Erweiterung: ggf. Update der bestehenden Wiki-Embed-Beschreibung.
- JSON-Validierung der fünf i18n-Dateien erfolgreich (siehe [CLAUDE.md, „Anführungszeichen in i18n-Strings"](../../CLAUDE.md#anführungszeichen-in-i18n-strings)).

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — `HELP_FEATURE_GROUPS`-Erweiterung.
- [src/i18n/de.json](../../src/i18n/de.json), [en.json](../../src/i18n/en.json), [fr.json](../../src/i18n/fr.json), [es.json](../../src/i18n/es.json), [it.json](../../src/i18n/it.json) — neue Keys.
- ggf. `docs/help/<lang>.md` — Beispiel-Blöcke.

## Reihenfolge im Epic

Vorletzter Task, nach den vier Code-Tasks und vor dem Sammeltask [4T-0066](4T-0066-changelog-release-0180.md).
