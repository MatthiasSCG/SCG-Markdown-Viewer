# 4T-0051 — Properties-Editor für Frontmatter-Felder

**Status**: Offen
**Epic**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md)
**Zielversion**: 0.16.0
**Setzt voraus**: [4T-0049 — Frontmatter-Erkennung und Render-Ausschluss](4T-0049-frontmatter-erkennung.md)

## Warum

Der Frontmatter-Parser aus 4T-0049 stellt Frontmatter-Daten zur Verfügung; aktuell muss man YAML-Syntax kennen, um sie zu bearbeiten. Ein Form-Editor mit typisierten Eingabefeldern senkt diese Hürde und ist in Obsidian seit v1.4 Standard. Ein Form-Editor passt auch zur Nutzerrolle im Projekt (Product Owner, Projektmanager, nicht Editor-Power-User), bei der visueller Editier-Komfort wichtiger ist als YAML-Vertrautheit.

## Lösungsansatz

### Platzierung in der UI

Zwei plausible Optionen, Entscheidung beim Task-Start nach kurzer Sichtung der Konsequenzen:

- **Variante A — modaler Dialog**: über Menü `Datei → Properties bearbeiten…` (oder `Strg+Umschalt+P`, falls frei) wird ein Dialog geöffnet, ähnlich dem Einstellungs-Dialog aus 4T-0018. Form-Felder pro Frontmatter-Eintrag plus „Feld hinzufügen" am Ende. OK/Anwenden/Abbrechen.
- **Variante B — eingeklappter Bereich am Render-Pane-Anfang**: kompakte Properties-Box, die per Klick auf einen Edit-Stift in den Edit-Modus wechselt. Inline-Bearbeitung pro Feld.

Empfehlung: **Variante A**. Konsistenter mit dem etablierten Einstellungs-Dialog-Muster, weniger Konflikt mit dem Live-Preview-Konzept aus 3E-0014 (Inline-Editoren würden dort später separat zu lösen sein). Variante B wäre die Obsidian-ähnlichere Lösung, ist aber im aktuellen Split-Modell visuell zwischen Source- und Render-Pane gespannt und damit unklar verortet.

### Form-Felder und Typ-Inferenz

Pro Frontmatter-Schlüssel wird das passende Eingabefeld gerendert. Typ-Inferenz aus dem aktuellen YAML-Wert:

| Typ          | Eingabefeld                                              |
|--------------|----------------------------------------------------------|
| String       | Einzeilige Textbox                                       |
| Multi-String (Liste) | Tag-Pillen-Liste mit Eingabe für neue Werte       |
| Number       | Number-Input                                             |
| Boolean      | Checkbox                                                 |
| Datum (ISO)  | Date-Picker (`<input type="date">`)                      |
| Multiline-String | Mehrzeiliges Textfeld (Textarea)                     |
| Verschachteltes Objekt | (in 0.16.0 nicht editierbar, read-only mit Hinweis) |

Erkennung „Multi-String": YAML-Array von Strings. Beim Schreiben wird die übliche YAML-Listen-Form genutzt.

Typ-Vorbelegung bei neuen Feldern: standardmäßig String. Typ-Wechsel über ein Dropdown neben dem Feld-Namen.

### Feld-Reihenfolge und Standard-Felder

Reihenfolge im Editor entspricht der Reihenfolge im YAML-Dokument. Neue Felder werden ans Ende angefügt.

Häufige Standard-Feldnamen bekommen einen vorgeschlagenen Typ:

- `title`, `description`, `author` → String
- `tags`, `aliases` → Multi-String
- `date`, `created`, `modified`, `due` → Datum
- `draft`, `published` → Boolean

Diese Heuristik wirkt nur bei neu hinzugefügten Feldern, nicht bei bereits vorhandenen (dort gewinnt der erkannte Typ aus dem aktuellen Wert).

### YAML-Schreiben (Round-Trip-Treue)

Beim OK/Anwenden wird der Frontmatter-Block in der Datei ersetzt. Anforderungen:

- Bestehende Kommentare und Reihenfolge nach Möglichkeit erhalten. `js-yaml.dump()` bietet das nicht vollständig; ggf. `yaml`-Library (Eemeli Aro) mit `Document`-API als Alternative. Entscheidung beim Task-Start nach kurzer Eignungsprüfung.
- Einrückung: zwei Leerzeichen (gleicher Stil wie Prettier-Default für JSON in diesem Projekt).
- Felder, die im Editor unverändert blieben, möglichst byte-identisch zurückschreiben. Felder, die geändert wurden, werden neu serialisiert.
- Datei-Ende: Frontmatter-Block plus eine Leerzeile vor dem Markdown-Body, sofern Body vorhanden.

Falls Round-Trip-Treue nicht vollständig leistbar ist: dokumentierte Einschränkung im Hilfe-Tab (Kommentare in `aliases:`-Listen verschwinden, etc.). Im Zweifel User-Warnung beim ersten Editieren einer Datei mit Frontmatter-Kommentaren.

### Auto-Save-Integration

Wenn Auto-Save aktiv ist (4T-0008) und Properties geändert werden:

- Sofortiges Schreiben würde zu Race-Conditions führen.
- Lösung: Property-Änderungen lösen einen Debounce-Schreibvorgang aus (500 ms nach letzter Änderung). Auto-Save-Timer wird übersteuert.
- Der Source-Pane wird nach dem Schreibvorgang automatisch nachgeführt (oder ist es bereits, weil der Schreibvorgang die Datei ändert und der Watcher triggert).

Konflikt-Dialog (analog zur bestehenden externen-Änderung-Logik): wenn der Source-Pane Dirty-State hat und gleichzeitig Properties geändert werden, gewinnen die Properties (mit Hinweis) oder es erscheint ein Konflikt-Dialog. Entscheidung beim Task-Start.

### Menü-Integration

Neuer Menüpunkt `Datei → Properties bearbeiten…` (oder im `Bearbeiten`-Menü, falls vorhanden; aktuell hat die App kein Bearbeiten-Menü, also Datei). Tastenkürzel-Vorschlag: `Strg+;` (frei und mnemonisch nahe an `Strg+,` für Einstellungen).

Disabled, wenn die aktive Datei keinen Frontmatter hat. Klick öffnet den Dialog im Modus „neuer Frontmatter wird angelegt", falls der Nutzer das bestätigt.

### Akzeptanz-Smoke-Tests

1. Datei mit Frontmatter öffnen, Menüpunkt `Datei → Properties bearbeiten…` öffnet den Dialog mit allen Feldern.
2. String-Feld ändern, OK: Datei enthält den neuen Wert, Source-Pane zeigt die Änderung.
3. Multi-String-Feld (`tags`): neuen Tag per Eingabe hinzufügen, alten Tag per X entfernen, OK schreibt die Liste korrekt.
4. Datum-Feld: Date-Picker setzt Datum im ISO-Format.
5. Boolean-Feld: Checkbox-Wechsel schreibt `true`/`false`.
6. Neues Feld hinzufügen: Schlüssel-Eingabe, Typ-Auswahl, Wert-Eingabe, OK.
7. Feld löschen: Eintrag verschwindet aus der Datei.
8. Datei ohne Frontmatter: Menüpunkt erlaubt Anlage eines neuen Blocks.
9. Verschachteltes Objekt im Frontmatter: read-only mit Hinweis, kein Crash.
10. Round-Trip ohne Änderung: Datei-Inhalt nach OK identisch zum Stand vor Editieren (Kommentare und Reihenfolge erhalten).
11. Auto-Save aktiv: Property-Änderung schreibt nach 500 ms; Source-Pane folgt nach.
12. Sprachwechsel: Dialog-Labels in allen fünf Sprachen.

## Akzeptanzkriterien

- Menüpunkt `Datei → Properties bearbeiten…` in allen fünf Sprachen, mit Hotkey-Vorschlag.
- Dialog mit Form-Feldern, typisiert pro Frontmatter-Eintrag.
- Sechs Eingabe-Typen: String, Multi-String, Number, Boolean, Datum, Multiline-String.
- Verschachtelte Objekte read-only.
- Feld hinzufügen, ändern, löschen funktionieren.
- YAML wird beim Speichern zurückgeschrieben; Round-Trip-Treue für unveränderte Felder.
- Auto-Save-Integration ohne Race-Conditions.
- Disabled-State für den Menüpunkt, wenn aktive Datei keinen Frontmatter hat (oder Anlage-Modus, beim Task-Start entscheiden).
- i18n-Strings in allen fünf Sprachen.

## Bezug zu Dateien

- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Properties-Editor-Dialog, Form-Rendering, Typ-Inferenz, IPC zum Schreiben.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Dialog-Styling, Form-Felder, Multi-String-Pillen.
- [src/main/main.js](../../src/main/main.js) — IPC-Handler zum Schreiben der modifizierten Datei.
- [src/main/preload.js](../../src/main/preload.js) — YAML-Schreiben (falls Library-Wechsel nötig); Bridge zur Renderer-Seite.
- [src/main/menu.js](../../src/main/menu.js) — neuer Menüpunkt im Datei-Menü.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — Dialog-Labels, Menüpunkt-Label, Hinweise.
- ggf. `package.json` — Library-Wechsel von `js-yaml` zu `yaml`, falls Round-Trip-Treue es erfordert.

## Lösung

(noch leer, wird nach Abschluss der Umsetzung gefüllt)
