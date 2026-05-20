# 4T-0052 — Hilfe-Dialog um Frontmatter, Aliases und Properties erweitern

**Status**: Offen
**Epic**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md)
**Zielversion**: 0.16.0
**Setzt voraus**: [4T-0049](4T-0049-frontmatter-erkennung.md), [4T-0050](4T-0050-aliases-aufloesung.md), [4T-0051](4T-0051-properties-editor.md)

## Warum

Mit 4T-0049 (Frontmatter), 4T-0050 (Aliases) und 4T-0051 (Properties-Editor) kommen drei neue User-sichtbare Funktionen. Im Hilfe-Dialog müssen sie auftauchen, sonst sind sie schwer entdeckbar.

Konvention dazu steht in [CLAUDE.md, Abschnitt „Hilfe-Dialog bei neuen Funktionen erweitern"](../../CLAUDE.md#hilfe-dialog-bei-neuen-funktionen-erweitern).

## Lösungsansatz

### Funktions-Einträge in `HELP_FEATURE_GROUPS`

Drei neue Einträge in [src/renderer/renderer.js](../../src/renderer/renderer.js), `HELP_FEATURE_GROUPS`:

1. **`help.feature.frontmatter`** in Gruppe „Bearbeitung" (oder „Ansicht", je nach Sicht; Entscheidung beim Task-Start, voraussichtlich „Bearbeitung", weil es das Schreibverhalten betrifft).
   - Beschreibung: Frontmatter-Block am Datei-Anfang wird erkannt und nicht als horizontale Linie gerendert.
2. **`help.feature.aliases`** in Gruppe „Navigation".
   - Beschreibung: `aliases:`-Einträge im Frontmatter machen eine Datei unter mehreren Namen per `[[Alias]]` verlinkbar; Backlinks finden sie über alle Aliases.
3. **`help.feature.properties`** in Gruppe „Bearbeitung".
   - Beschreibung: Form-Editor für Frontmatter-Felder, erreichbar über `Datei → Properties bearbeiten…`.

### Shortcut-Eintrag in `HELP_SHORTCUTS`

Falls 4T-0051 den Properties-Editor mit einem Hotkey ausstattet (Vorschlag `Strg+;`):

- Neuer Eintrag in `HELP_SHORTCUTS` mit `keys: ['Strg+;']` und `descKey: 'help.shortcut.properties'`.
- Neuer i18n-Key `help.shortcut.properties` in allen fünf Sprachen.

Falls 4T-0051 keinen Hotkey festlegt: dieser Punkt entfällt.

### i18n-Keys

Drei neue Funktions-Beschreibungs-Keys in allen fünf Sprachdateien ([src/i18n/de.json](../../src/i18n/de.json), `en.json`, `fr.json`, `es.json`, `it.json`):

- `help.feature.frontmatter`
- `help.feature.aliases`
- `help.feature.properties`

Optional `help.shortcut.properties` (s.o.).

Sprachstil orientiert sich an den bestehenden Einträgen: ein bis zwei Sätze, sachlich, mit dem für die jeweilige Sprache etablierten Vokabular.

### Hilfe-Markdown (SCG-Table-Tab)

Keine Änderung nötig. Der SCG-Table-Tab ist thematisch klar abgegrenzt; Frontmatter, Aliases und Properties sind allgemeine Editor-Funktionen, die im Funktions-Tab ausreichend dokumentiert sind.

### Reihenfolge der Einträge

In Gruppe „Bearbeitung": neue Einträge nach den bestehenden, in der Reihenfolge `frontmatter`, dann `properties`. Aliases steht in „Navigation" passend bei Wiki-Links und Backlinks.

### Akzeptanz-Smoke-Tests

1. Hilfe-Dialog öffnen, Funktions-Tab: Gruppe „Bearbeitung" zeigt zwei neue Einträge (Frontmatter, Properties).
2. Funktions-Tab Gruppe „Navigation" zeigt Aliases-Eintrag.
3. Tastenkürzel-Tab zeigt den Properties-Hotkey (falls in 4T-0051 festgelegt).
4. Sprachwechsel: alle drei (bzw. vier) neuen Strings erscheinen in allen fünf Sprachen.
5. Texte sind sachlich, kurz, ohne Tippfehler, mit korrekten Umlauten.

## Akzeptanzkriterien

- Drei neue Einträge in `HELP_FEATURE_GROUPS` (Frontmatter, Aliases, Properties) in den richtigen Gruppen.
- Optional ein neuer Eintrag in `HELP_SHORTCUTS` für den Properties-Hotkey.
- Drei (bzw. vier) neue i18n-Keys in allen fünf Sprachdateien (DE, EN, FR, ES, IT), inhaltlich korrekt.
- Reihenfolge innerhalb der Gruppen sinnvoll.
- Funktions- und Tastenkürzel-Tab des Hilfe-Dialogs zeigt die neuen Einträge in allen fünf Sprachen.

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — `HELP_FEATURE_GROUPS` und ggf. `HELP_SHORTCUTS` erweitern.
- [src/i18n/de.json](../../src/i18n/de.json), `en.json`, `fr.json`, `es.json`, `it.json` — drei bis vier neue Keys je Sprache.

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
