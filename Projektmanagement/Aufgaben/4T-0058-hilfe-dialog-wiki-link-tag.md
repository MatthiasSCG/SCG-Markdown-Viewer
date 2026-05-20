# 4T-0058 — Hilfe-Dialog um Wiki-Link-Ausbau und Tag-System erweitern

**Status**: Erledigt — 2026-05-20, Test bestanden
**Epic**: [3E-0011 — Wiki-Link-Ausbau und Tag-System](3E-0011-wiki-link-ausbau-und-tag-system.md)
**Zielversion**: 0.17.0
**Setzt voraus**: [4T-0054](4T-0054-wiki-link-heading-block-anker.md), [4T-0055](4T-0055-wiki-embeds.md), [4T-0056](4T-0056-tag-system.md), [4T-0057](4T-0057-autocomplete-framework.md)

## Warum

Mit den vier Code-Tasks 4T-0054 bis 4T-0057 kommen mehrere User-sichtbare Funktionen dazu, die im Hilfe-Dialog dokumentiert sein müssen. Konvention dazu in [CLAUDE.md, Abschnitt „Hilfe-Dialog bei neuen Funktionen erweitern"](../../CLAUDE.md#hilfe-dialog-bei-neuen-funktionen-erweitern).

## Lösungsansatz

### Funktions-Einträge in `HELP_FEATURE_GROUPS`

Drei bis vier neue Einträge in [src/renderer/renderer.js](../../src/renderer/renderer.js):

- **Gruppe Navigation**:
  - `help.feature.wikiLinkAnchors` — Heading- und Block-Anker in Wiki-Links (`[[Datei#Heading]]`, `[[Datei#^id]]`).
  - `help.feature.tags` — Tag-System mit Tag-Sidebar und hierarchischen Tags.
- **Gruppe Bearbeitung**:
  - `help.feature.wikiEmbeds` — `![[Datei]]`-Embeds für Bilder, Markdown, PDF.
  - `help.feature.autocomplete` — Autocomplete für `[[` und `#`.

Exakte Gruppenwahl beim Task-Start, je nach inhaltlicher Nähe.

### Shortcut-Einträge in `HELP_SHORTCUTS`

- `help.shortcut.toggleTags` (vermutlich `Strg+Umschalt+T`) für Tag-Sidebar — Hotkey-Belegung kommt aus 4T-0056.
- Autocomplete hat keinen eigenen Hotkey, daher kein Eintrag.

### Block-Anker `^id`

Da Block-Anker auch eine Schreib-Syntax ist (nicht nur Wiki-Link-Ziel), könnte ein eigener Funktions-Eintrag sinnvoll sein:

- `help.feature.blockAnchors` — `^id` am Zeilenende setzt einen Anker auf den umschließenden Block.

Oder zusammengefasst mit `wikiLinkAnchors`. Entscheidung beim Task-Start.

### i18n-Keys

Drei bis fünf neue Beschreibungs-Keys plus ein Shortcut-Key in allen fünf Sprachdateien. Sprachstil orientiert sich an den bestehenden Einträgen (1 bis 2 Sätze, sachlich, mit etablierten Vokabular).

### Akzeptanz-Smoke-Tests

1. Hilfe-Dialog → Funktionen-Tab: neue Einträge in den richtigen Gruppen.
2. Tastenkürzel-Tab: Strg+Umschalt+T für Tag-Sidebar.
3. Sprachwechsel: alle neuen Strings korrekt in allen fünf Sprachen.
4. Theme-Wechsel: lesbar.

## Akzeptanzkriterien

- Mindestens drei neue Funktions-Einträge in `HELP_FEATURE_GROUPS`.
- Mindestens ein neuer Shortcut-Eintrag in `HELP_SHORTCUTS`.
- Neue i18n-Keys in allen fünf Sprachen (DE, EN, FR, ES, IT).
- Reihenfolge innerhalb der Gruppen thematisch sinnvoll.

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — `HELP_FEATURE_GROUPS` und `HELP_SHORTCUTS` erweitern.
- [src/i18n/de.json](../../src/i18n/de.json), `en.json`, `fr.json`, `es.json`, `it.json` — neue Keys je Sprache.

## Lösung

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/renderer/renderer.js](../../src/renderer/renderer.js)** — `HELP_FEATURE_GROUPS` um fünf Einträge erweitert, `HELP_SHORTCUTS` um einen Eintrag:
  - Gruppe **Bearbeitung** (nach `properties`): `help.feature.blockAnchors`, `help.feature.autocomplete`.
  - Gruppe **Navigation** (nach `aliases`): `help.feature.wikiLinkAnchors`, `help.feature.wikiEmbeds`, `help.feature.tags`.
  - Shortcuts (nach `toggleProperties`): `help.shortcut.toggleTags` mit Tasten-Kombination `Strg+Umschalt+T`.
- **i18n (DE/EN/FR/ES/IT)**: sechs neue Keys pro Sprache (5 Funktions-Texte, 1 Shortcut-Text), in Summe 30 neue Einträge. Sprachstil orientiert sich an den bestehenden Help-Einträgen, 1 bis 2 Sätze mit Code-Snippets in Backticks für die Syntax-Beispiele.

### Entscheidung zur Gruppenwahl

- **Bearbeitung**: Block-Anker und Autocomplete sind Schreibhilfen am Cursor. Passt zu Linter, Tab-Indent und Properties in derselben Gruppe.
- **Navigation**: Wiki-Link-Anker, Wiki-Embeds und Tags gehören zur Vernetzungs-Mechanik. Tags sind dabei doppelt sichtbar (Sidebar plus Klick-Filter), bleiben aber thematisch nahe an Backlinks und Aliases.
- Eine eigene neue Gruppe nur für „Wiki-Link-Ausbau" wurde verworfen, weil die fünf Funktionen sich sauber auf die zwei bestehenden Gruppen verteilen lassen.

### Smoke-Test (2026-05-20)

Nutzer-Verifikation mit der Portable-EXE: Funktions-Tab mit korrekter Einsortierung, Tastenkürzel-Tab mit `Strg+Umschalt+T`, Sprachwechsel über alle fünf Sprachen, Theme-Wechsel hell/dunkel.
