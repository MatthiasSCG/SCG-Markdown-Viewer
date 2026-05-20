# 3E-0015 — Konfigurierbare Tastenkürzel

**Status**: Offen
**Zielversion**: 0.21.0
**Vorgängerversion**: 0.20.0
**Reihenfolge im Meta-Plan**: Epic 6 von 6 (B → C → D → E → A → F)
**Aufsetzend auf**: alle vorangegangenen Epics. Bewusst zuletzt platziert, damit die volle Liste der Kommandos aus 3E-0010 bis 3E-0014 bereits existiert und durch dieses Epic von Anfang an konfigurierbar wird.
**Quelle**: Lückenanalyse gegen Obsidian-Standard-Editor (Gespräch vom 2026-05-20), Punkt 19

## Ziel

Die in der App vorhandenen Tastenkürzel von hart kodierten Bindings zu konfigurierbaren Kommando-Bindings umbauen. Nutzer können im Einstellungs-Dialog jedes Kommando neu binden, Konflikte werden erkannt, und die Defaults sind weiterhin sinnvoll vorbelegt. Die Hilfe-Dialog-Shortcut-Tabelle wird dynamisch aus der Kommando-Registry generiert statt wie aktuell aus `HELP_SHORTCUTS` in [src/renderer/renderer.js](../../src/renderer/renderer.js) hart bestückt.

## Warum

Aktuell sind alle Tastenkürzel an drei Stellen hart kodiert: Menü-Accelerator in [src/main/menu.js](../../src/main/menu.js), Renderer-Tastatur-Handler in [src/renderer/renderer.js](../../src/renderer/renderer.js) und Hilfe-Dialog-Tabelle in `HELP_SHORTCUTS`. Das ist konsistent für die App selbst, schließt aber Anpassbarkeit aus. Ergonomische Wünsche (z.B. `Strg+B` für Bold statt Standard-Browser-Bookmark, `Strg+P` als Command-Palette-Kandidat, Wechsel zwischen QWERTY- und QWERTZ-Bindings für Sonderzeichen) lassen sich heute nicht ohne Code-Änderung umsetzen.

Konfigurierbare Hotkeys sind in Obsidian, VS Code und ähnlichen Tools Standard. Sie sind klein im Feature-Umfang („eine Einstellungs-Tabelle"), aber tiefgreifend in der Architektur, weil die Hotkey-Quelle zentralisiert werden muss. Bewusst als eigenes Epic, weil dieser Architektur-Umbau die korrekte Klammer braucht und nicht in einem Komfort-Epic untergeht.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Kommando-Registry**: zentraler Code-Ort (z.B. `src/main/commands.js` oder `src/renderer/commands.js`), in dem jedes Kommando als Objekt mit ID, Default-Binding, lokalisiertem Anzeigenamen, Kategorie und Handler steht. Alle bisherigen Hotkeys werden in die Registry migriert.
- **Konsumenten der Registry**:
  - Menü-Factory in [src/main/menu.js](../../src/main/menu.js) liest Bindings aus der Registry statt sie hart zu setzen.
  - Renderer-Tastatur-Handler in [src/renderer/renderer.js](../../src/renderer/renderer.js) prüft Tastendrücke gegen die Registry-Map.
  - Hilfe-Dialog-Shortcut-Tabelle wird aus der Registry generiert. `HELP_SHORTCUTS` und `KEY_LABEL_KEY` entfallen oder schrumpfen.
- **Settings-UI**: neue Sektion „Tastenkürzel" im Einstellungs-Dialog (eingeführt in 4T-0018):
  - Tabelle mit allen Kommandos, gruppiert nach Kategorie (Datei und Sitzung, Bearbeitung, Ansicht, Navigation, Allgemein — analog zur Hilfe-Dialog-Gruppierung).
  - Pro Kommando: Anzeigename, aktuelles Binding, Default-Binding, Edit-Button.
  - Hotkey-Capture: Klick auf Edit öffnet einen Eingabezustand, in dem die nächste Tastenkombination erfasst wird. Esc bricht ab, ein zweiter Klick speichert.
  - „Auf Default zurücksetzen" pro Kommando.
  - „Alle auf Default zurücksetzen" als Gesamt-Reset.
- **Konflikt-Erkennung**: beim Setzen eines Bindings prüft die UI, ob die Kombination schon vergeben ist. Konflikt-Warnung mit der Möglichkeit, das andere Kommando freizuräumen oder den Konflikt-Eintrag abzubrechen.
- **Persistenz**: konfigurierte Bindings in `electron-store` unter `hotkeys.{commandId}`. Beim Start werden Defaults plus User-Overrides gemerged.
- **Migration**: bestehende Nutzer-Sitzungen behalten ihre Bindings (alle Defaults), die Settings-UI zeigt sie identisch zur bisherigen App-Erfahrung.
- **Hilfe-Dialog**: neue Funktions- und Shortcut-Einträge, gegebenenfalls ein Hinweis im Tab „Tastenkürzel", dass die Tabelle nun konfigurierbar ist.
- CHANGELOG, Release-Notes, README, Tag, Release über den Standard-Sammeltask.

**Bewusst nicht im Umfang:**

- **Kontext-spezifische Bindings**: in Obsidian kann ein Hotkey im Editor anders belegt sein als in der Sidebar. Hier nur globale Bindings pro Fenster.
- **Sequence-Bindings** (`Strg+K` gefolgt von `B`). Nur einzelne Tastenkombinationen.
- **Maus-Bindings**. Nur Tastatur.
- **Import/Export von Hotkey-Sets**. Persistenz reicht; ein Datei-Export ist später möglich.
- **Beliebige Modifier-Kombinationen** (z.B. `Strg+Alt+Umschalt+Win+X`). Implizit zulässig, aber die UI ermutigt nicht dazu.
- **Plattform-übergreifende Profile** (Mac vs. Windows). Die App ist Windows-only, daher keine Cross-Platform-Hotkey-Logik.

## Untergeordnete Tasks

Werden zu Beginn der Epic-Umsetzung als 4T-Dateien angelegt. Vorgesehene Tasks:

1. **Kommando-Registry und Migration** — Registry aufbauen, alle bestehenden Hotkeys eintragen, Menü-Factory und Renderer-Handler auf Registry umstellen. Hilfe-Dialog-Tabelle generiert sich aus der Registry. Verhalten der App bleibt unverändert.
2. **Settings-UI für Hotkeys** — Tabelle im Einstellungs-Dialog, Hotkey-Capture, Konflikt-Erkennung, Persistenz, Reset-Funktionen.
3. **Abschluss-Sammeltask** — CHANGELOG, Release-Notes, README, Test-Iteration, Tag und GitHub-Release für 0.21.0.

Ob Hilfe-Dialog-Tab-Erweiterung als eigener Task entsteht, wird beim Epic-Start entschieden. Aktuell als Teil von Task 1 vorgesehen.

## Architekturentscheidungen

Werden zu Beginn der Epic-Umsetzung finalisiert. Vorüberlegungen:

- **Registry-Format**: pro Kommando ein Objekt mit `id` (z.B. `file.save`), `defaultBinding` (z.B. `CmdOrCtrl+S`), `categoryKey` (z.B. `help.group.fileAndSession`), `labelKey` (z.B. `menu.file.save`), `handler` (Funktion oder Channel-Name). Format an Electron-Accelerator-Strings ausgerichtet, damit Menü-Factory direkt damit arbeiten kann.
- **Map-Aufbau im Renderer**: aus der Registry wird zur Laufzeit eine Map `keyString → handler` gebaut, anhand der aktiven Bindings. `keyString`-Format normalisiert (z.B. immer `Ctrl+Shift+O`, nicht `Strg+Umschalt+O`), damit Tastendruck-Vergleich konsistent ist.
- **Hotkey-Capture**: kein DOM-Polling, sondern `keydown`-Listener mit `preventDefault` und Modifier-Erkennung. Kombination wird sofort angezeigt; Klick außerhalb oder Esc bricht ab.
- **Konflikt-Erkennung**: vor dem Schreiben in `electron-store` wird die Ziel-Kombination gegen die aktuelle Map geprüft. Konflikt-Dialog bietet zwei Aktionen: „Überschreiben" (anderes Kommando verliert sein Binding) oder „Abbrechen".
- **Locale-Abhängigkeit**: einige Tastenkombinationen funktionieren auf deutscher Tastatur anders als auf englischer (z.B. `Strg+/` vs. `Ctrl+/`). Wir speichern die physische Taste (`code`), nicht das `key`-Zeichen. Anzeige übersetzt zurück über bestehende `KEY_LABEL_KEY`-Logik.
- **Hilfe-Dialog-Generierung**: die bisherige `HELP_SHORTCUTS`-Konstante wird ersetzt durch eine Ableitung aus der Registry. Neue Hotkeys aus späteren Epics tauchen automatisch im Hilfe-Dialog auf.

## Reihenfolge der Umsetzung

1. **Registry-Aufbau und Migration zuerst.** Verhaltens-Identität ist Akzeptanzkriterium: nach Migration muss die App genau so funktionieren wie vorher.
2. **Settings-UI mit Capture und Konfliktlogik** danach. Setzt auf die fertige Registry auf.
3. **Sammeltask** schließt ab.

## Bezug zu Dateien

Voraussichtlich betroffen:

- Neuer Code-Ort `src/main/commands.js` oder `src/renderer/commands.js` (Entscheidung beim Task-Start, voraussichtlich Renderer-seitig, weil die meisten Handler dort sitzen).
- [src/main/menu.js](../../src/main/menu.js) — Menü-Factory liest Bindings aus der Registry.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Tastatur-Handler nutzt die Registry-Map, Settings-UI-Sektion „Tastenkürzel", Hilfe-Dialog-Tabelle aus der Registry.
- [src/renderer/styles.css](../../src/renderer/styles.css) — Settings-Tabelle für Hotkeys, Hotkey-Capture-Modus-Styling.
- [src/main/main.js](../../src/main/main.js) — Persistenz der Hotkey-Overrides über `electron-store`.
- [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neue Strings für Settings-Sektion, Konflikt-Dialog, Hilfe.
- `package.json` — Version-Bump auf 0.21.0, keine neuen Dependencies erwartet.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-0.21.0.md`.

## Offene Punkte / Risiken

- **Migration ohne Verhaltens-Bruch**: das größte Risiko. Alle bestehenden Hotkeys müssen nach der Migration exakt gleich wirken. Akzeptanz-Test: vollständiger Durchgang der Hotkey-Tabelle aus dem Hilfe-Dialog, jeder Eintrag muss funktionieren.
- **Konflikte mit System-Hotkeys**: einige Tastenkombinationen werden vom Betriebssystem oder vom Browser-Layer in Electron abgefangen (z.B. `Strg+Tab` ist OS-Window-Hotkey-Kandidat). Diese kann der Renderer nicht überschreiben. Konflikt-Erkennung sollte das als „nicht setzbar" markieren.
- **Tastatur-Layout-Unterschiede**: Speichern als `code` ist robust gegen Layout-Wechsel, aber die Anzeige muss korrekt lokalisiert sein (auf deutscher Tastatur ist `Strg+Y` oder `Strg+Z` häufig unterschiedlich belegt).
- **Hotkey-Capture vs. Tab-Reihenfolge**: während Capture darf `Tab` nicht den Fokus weiterspringen lassen, sondern muss als zu setzende Taste erfasst werden. UI-Modus-Wechsel ist nötig.
- **Performance der Tastendruck-Auflösung**: die Map-Lookup-Logik wird bei jedem Tastendruck ausgeführt. Sollte O(1) bleiben (Hash-Map), nicht linear über alle Kommandos.
- **Spätere Erweiterung um Sequence-Bindings**: aktuell ausgeschlossen. Falls in einem zukünftigen Release nötig, müssen Registry und Map-Struktur darauf vorbereitet sein. Architektur-Entscheidung beim Task-Start: trennen zwischen `binding` (eine Kombination) und `bindings` (Liste von Kombinationen) bereits jetzt vorsehen, auch wenn die Liste immer Länge 1 hat.
