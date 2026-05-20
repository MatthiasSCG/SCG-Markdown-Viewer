# 4T-0050 — Aliases-Auflösung in Wiki-Links und Backlinks

**Status**: Erledigt — 2026-05-20, Test bestanden
**Epic**: [3E-0010 — Frontmatter, Aliases und Properties](3E-0010-frontmatter-aliases-properties.md)
**Zielversion**: 0.16.0
**Setzt voraus**: [4T-0049 — Frontmatter-Erkennung und Render-Ausschluss](4T-0049-frontmatter-erkennung.md)

## Warum

Mit dem in 4T-0049 gewonnenen Frontmatter-Parser lassen sich `aliases:`-Einträge aus der YAML-Struktur lesen. Eine Datei `Markdown-Viewer.md` mit Frontmatter

```yaml
---
aliases:
  - MV
  - Viewer
---
```

soll dann unter `[[MV]]`, `[[Viewer]]` und `[[Markdown-Viewer]]` gleichermaßen verlinkbar sein. Backlinks auf diese Datei sollen sie unabhängig vom verwendeten Alias finden.

Ohne diese Erweiterung bleibt `aliases:` ein toter Frontmatter-Schlüssel ohne Wirkung. Mit ihr werden Datei-Umbenennungen weniger schmerzhaft (alter Name als Alias eintragen statt überall Links anzupassen), und Begriffe mit Varianten (Abkürzungen, Mehrzahl, englische/deutsche Schreibweise) werden konsistent verknüpfbar.

## Lösungsansatz

### Aliases-Erfassung im Backlinks-Index

In [src/main/backlinks.js](../../src/main/backlinks.js) wird der Index pro Datei um ein optionales `aliases`-Feld ergänzt:

```js
// pro Datei in der Map
{
  path: '...',
  outgoingLinks: [...],
  aliases: ['MV', 'Viewer']  // neu, optional
}
```

Beim Indexieren einer Datei werden die ersten Bytes (analog zu bestehenden Header-Detect-Heuristiken) gegen den Frontmatter-Parser aus 4T-0049 geprüft. Das `aliases:`-Feld wird als Array von Strings übernommen. Akzeptierte YAML-Formen:

- Liste: `aliases: [MV, Viewer]` oder mehrzeilig mit `-`.
- Einzelner String: `aliases: MV` (wird zu `['MV']` normalisiert).
- Leer oder nicht vorhanden: kein Eintrag.

Whitespace wird getrimmt, leere Strings ignoriert.

### Wiki-Link-Auflösung

Die Klick-Handler im Renderer (in [src/renderer/renderer.js](../../src/renderer/renderer.js)), die `[[Datei]]`-Klicks zu `Datei.md` auflösen, prüfen jetzt zusätzlich:

1. Existiert eine Datei mit exaktem Namen `<Ziel>.md`? Dann öffnen.
2. Sonst: existiert im Backlinks-Index eine Datei, die `<Ziel>` als Alias führt? Dann diese öffnen.
3. Sonst: bestehendes Fallback-Verhalten (Linter markiert als broken Wiki-Link gemäß 4T-0020).

Schritt 2 ruft eine neue Hilfsfunktion `findFileByAlias(alias)` im Backlinks-Modul auf, die den Index linear durchsucht. Bei sehr großen Vaults (Cap aus 4T-0015 ist 2000 Dateien) ist das O(n), aber Klicks sind nicht hochfrequent, daher akzeptabel. Optional: zusätzlich eine inverse Map `alias → path` pflegen.

### Backlinks-Index-Treffer-Erkennung

Der Backlinks-Index sucht heute nach Quelldateien, die `[[Zieldatei]]` enthalten. Mit Aliases muss er auch Quelldateien finden, die `[[Alias]]` enthalten, wobei `Alias` zu `Zieldatei` aufgelöst werden muss.

Logik:

- Beim Aufbau des Indexes sammelt der Watcher pro Datei die Liste `outgoingLinks` (Wiki-Link-Ziele) und die `aliases` aus dem eigenen Frontmatter.
- Beim Anfordern der Backlinks für `aktive-Datei.md` wird sowohl nach dem Datei-Namen `aktive-Datei` als auch nach allen Aliases der aktiven Datei in den `outgoingLinks`-Listen anderer Dateien gesucht.

### Anzeige im Backlinks-Panel

Backlinks, die über einen Alias kommen, werden in der bestehenden Backlinks-Sidebar identisch dargestellt. Optional: ein dezentes Hinweis-Tag „über Alias: <Alias>" neben dem Treffer. Entscheidung beim Task-Start, abhängig vom Aufwand.

### Wiki-Link-Linter

Der Linter aus 4T-0020 prüft, ob das Wiki-Link-Ziel existiert. Mit Aliases muss er zusätzlich gegen die Alias-Liste prüfen. Implementierung: `findFileByAlias(ziel)` wird vor der „broken wiki link"-Markierung aufgerufen; ist ein Treffer dabei, gilt der Link als gültig.

### Watcher-Update

Wenn sich der Frontmatter einer Datei ändert (insbesondere `aliases:`), muss der Backlinks-Index aktualisiert werden. Der bestehende `chokidar`-Watcher reagiert bereits auf Datei-Änderungen; die Re-Index-Logik liest die Datei neu und parst den Frontmatter erneut.

### Performance

- Frontmatter-Parsing beim Index-Aufbau ist eine zusätzliche Leselast. Mitigation: nur die ersten 4 KB der Datei lesen reicht für 99% aller Frontmatter-Blöcke. Bei größeren Frontmatter-Blöcken kommt der Standard-Parser zum Einsatz.
- `findFileByAlias` ist O(n). Bei 2000 Dateien akzeptabel; bei Bedarf später eine inverse Map.

### Akzeptanz-Smoke-Tests

1. Datei `Markdown-Viewer.md` mit `aliases: [MV, Viewer]` im Frontmatter. Datei `notiz.md` enthält `[[MV]]`. Klick öffnet `Markdown-Viewer.md`.
2. Backlinks-Sidebar in `Markdown-Viewer.md` zeigt `notiz.md` als Quelle.
3. Mehrere Dateien mit demselben Alias: erste Treffer-Datei wird genommen (oder Hinweis-Dialog, Entscheidung beim Task-Start).
4. Alias-Änderung im Frontmatter: nach kurzer Watcher-Verzögerung passt sich der Index an, Backlinks und Klicks funktionieren mit neuen Aliases.
5. Linter aus 4T-0020 markiert `[[MV]]` nicht mehr als broken Wiki-Link, wenn `MV` als Alias existiert.
6. Aliases mit Sonderzeichen (Umlaute, Bindestrich, Leerzeichen): funktionieren in Wiki-Links wie Datei-Namen.
7. Kein Frontmatter, kein Alias-Eintrag: bestehendes Verhalten unverändert.

## Akzeptanzkriterien

- Backlinks-Index pflegt pro Datei eine optionale `aliases`-Liste.
- `findFileByAlias`-Hilfsfunktion löst Aliases zu Datei-Pfaden auf.
- Wiki-Link-Klicks im Render-Pane berücksichtigen Aliases nach dem direkten Datei-Treffer.
- Backlinks-Sidebar findet Quellen, die per Alias auf die aktive Datei verlinken.
- Linter markiert per Alias gültige Wiki-Links nicht mehr als broken.
- Frontmatter-Änderungen aktualisieren den Index live über den `chokidar`-Watcher.
- Mehrdeutigkeit (mehrere Dateien mit demselben Alias) hat ein definiertes Verhalten (erste gefundene Datei oder Hinweis, beim Task-Start entscheiden).

## Bezug zu Dateien

- [src/main/backlinks.js](../../src/main/backlinks.js) — Index-Erweiterung um `aliases`, `findFileByAlias`, Backlinks-Suche mit Alias-Auflösung.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — Wiki-Link-Klick-Handler nutzt Alias-Auflösung; Linter aus 4T-0020 prüft Alias-Treffer.
- [src/main/preload.js](../../src/main/preload.js) — `extractFrontmatter` (aus 4T-0049) wird in der Index-Pipeline zugänglich gemacht oder als interne Hilfsfunktion bereitgestellt.
- ggf. [src/i18n/de.json](../../src/i18n/de.json) und vier weitere Sprachen — neuer Linter-Tooltip oder Backlinks-Alias-Hinweis-Text, falls Anzeige-Hinweis bei Alias-Treffern gewünscht.

## Lösung

Umgesetzt am 2026-05-20, Test bestanden.

### Code-Änderungen

- **[src/main/backlinks.js](../../src/main/backlinks.js)**:
  - `js-yaml`-Import (dieselbe Library wie in `preload.js`, SAFE-Schema).
  - `parseFile(filePath)` liefert jetzt `{ hits, aliases }` statt nur `hits`. Frontmatter wird per gleicher Heuristik wie in `extractFrontmatter` (4T-0049) erkannt; `aliases:`-Feld wird normalisiert. Wiki-Link- und Markdown-Link-Scan überspringt Frontmatter-Zeilen, damit YAML-Inhalte nicht als ausgehende Links indexiert werden.
  - `normalizeAliases(raw)` akzeptiert YAML-Listen (`[a, b]` und mehrzeilige `-`-Form) oder einen einzelnen String. Leere Strings und Nicht-Strings werden gefiltert.
  - Im `entry` zwei neue Maps: `aliasesPerFile: Map<absPath, string[]>` (Original-Casing) und `aliasMap: Map<aliasLowercase, Set<absPath>>` (inverse, case-insensitive Lookup).
  - `addToAliasMap`/`removeFromAliasMap`/`filesByAlias` als Helfer; leere Sets werden aus `aliasMap` entfernt, damit `has()` ein verlässlicher Existenz-Check bleibt.
  - `ensureIndex` und `onWatcherChange` pflegen beide Maps. Bei add/change wird Diff gegen vorherige Aliases gefahren; bei unlink wird sauber aufgeräumt.
  - `collectBacklinksFor` erkennt Alias-Backlinks: wenn ein Wiki-Link in einer Quelldatei den Basename eines Alias der aktiven Datei trägt (case-insensitive) und kein direkter Datei-Treffer existiert, gilt der Link als Backlink und wird mit `viaAlias: '<alias>'` am Treffer markiert.
  - `existingWikiTargets` (für den Linter) zählt Alias-Treffer als „existing", damit `[[MV]]` nicht als broken markiert wird, wenn `MV` ein gültiger Alias ist.
  - Neue Funktion `resolveWikiTargetByAlias(activeFile, basename)`: liefert `{ status, candidates, viaAlias }` für den Renderer-Wiki-Link-Klick-Handler. Bei Mehrdeutigkeit (>1 Kandidat) zeigt der Renderer den Disambiguation-Dialog.
- **[src/main/main.js](../../src/main/main.js)**: neuer IPC-Handler `wikiLink:resolveByAlias`.
- **[src/main/preload.js](../../src/main/preload.js)**: neue API-Methode `resolveWikiTargetByAlias(filePath, basename)`.
- **[src/renderer/renderer.js](../../src/renderer/renderer.js)**:
  - `aliasModal`-Konstante.
  - Promise-basierter `showAliasDialog(alias, candidates) → chosenPath | null`. Dynamisch befüllte Kandidaten-Buttons (Dateiname fett, Verzeichnis klein, gedämpft); Auto-Fokus auf den ersten Button.
  - `resolveAliasDialog` und `cancelAliasDialog`, single-pending-Resolver.
  - In `handleRenderedClick`: bei nicht-existierender Datei und `class="wikilink"` greift der Alias-Fallback via `tryResolveByAlias(activeFilePath, resolvedPath)`. Eindeutiger Treffer öffnet direkt, mehrdeutiger zeigt den Dialog.
  - Esc-Handler erweitert: `aliasModal` zählt zu den Overlays mit Vorrang, Cancel-Resolver liefert null.
  - Event-Listener für Cancel-Button und Backdrop-Klick.
  - In `renderBacklinks`: pro Treffer mit `hit.viaAlias` wird ein `.backlink-via-alias`-Tag mit lokalisiertem Text (`backlinks.viaAlias`) angehängt.
- **[src/renderer/index.html](../../src/renderer/index.html)**: neues `#alias-modal`-Skelett vor dem renderer-bundle-Script: Backdrop, Title, Beschreibung (Container, zur Laufzeit befüllt), Kandidaten-Liste (Container), Cancel-Button.
- **[src/renderer/styles.css](../../src/renderer/styles.css)**: Stil-Familie `.alias-modal-*` analog zu `.about-modal-*`, Kandidaten-Buttons mit Hover/Focus-State, `.alias-candidate-name` und `.alias-candidate-dir`. Zusätzlich `.backlink-via-alias`-Tag (klein, italic, dezent gefärbter Hintergrund) in Light und Dark.
- **i18n (DE, EN, FR, ES, IT)**: 4 neue Keys je Sprache: `backlinks.viaAlias`, `alias.dialogTitle`, `alias.dialogDescription`, `alias.cancel`. JSON-Anführungszeichen-Konvention beachtet (einfache Quotes oder Unicode-Guillemets, keine ASCII-`"` im Wert).

### Implementierungsdetails

- **Case-Insensitivität bei Aliases**: Lookup über `alias.trim().toLowerCase()` als Schlüssel in `aliasMap`. Anzeigewert im UI (Tag, Dialog-Titel) bleibt im Original-Casing aus dem YAML, damit Nutzer ihre Schreibweise wiederfindet.
- **Konflikt-Sicherheit Datei vs. Alias**: `collectBacklinksFor` markiert nur dann `viaAlias`, wenn kein direkter Datei-Basename-Treffer existiert. Ein Wiki-Link auf eine existierende Datei wird also nicht zusätzlich als Alias-Backlink doppelt geführt.
- **Frontmatter-Erkennung in backlinks.js dupliziert (bewusst)**: dieselbe Heuristik wie in `preload.js` (erste Zeile genau `---`, Schluss-Zeile `---` oder `...`). Bei einem späteren Refactoring wäre ein gemeinsames Helfer-Modul sinnvoll; im 4T-0050-Scope bleibt es bei der Duplikation, weil Main- und Preload-Kontext unterschiedliche Module-Auflösung haben.
- **Promise-Pattern für den Modal-Dialog**: `showAliasDialog` gibt einen Promise zurück, der vom Klick-Handler awaitet wird. Single-Pending-Resolver verhindert, dass ein paralleler Dialog den vorigen Aufrufer hängen lässt; alter Promise wird mit null aufgelöst.
- **Watcher-Aktualisierung**: `onWatcherChange` ruft `parseFile` neu auf und führt das Alias-Diff: alte Aliases der Datei aus `aliasMap` raus, neue rein. Bei einer Datei, die Aliases verliert (`aliases:` entfernt), wird ihr Eintrag in `aliasesPerFile` gelöscht.
- **Linter-Integration**: dadurch dass `existingWikiTargets` Alias-Treffer mitberücksichtigt, war im Renderer keine Änderung am `runLint`-Code nötig. Die in 4T-0020 etablierte IPC-Schnittstelle bleibt unverändert; nur die Antwort enthält jetzt zusätzliche „existing"-Werte.
- **Performance**: `aliasMap`-Lookup ist O(1) pro Wiki-Link-Klick. `existingWikiTargets`-Aufruf im Linter ruft `filesByAlias` zusätzlich zu `resolveWikiLink` auf; bei 2000 Dateien × wenigen Aliases pro Datei ist das weiterhin akzeptabel.

### Smoke-Test (2026-05-20)

Alle neun in der Test-Anleitung definierten Punkte vom Nutzer geprüft und bestätigt:

1. Eindeutiger Alias-Klick öffnet die Ziel-Datei direkt.
2. Mehrdeutiger Alias-Klick zeigt den Auswahl-Dialog mit zwei Kandidaten; Klick öffnet die gewählte Datei, Esc/Backdrop/Abbrechen schließen ohne Aktion.
3. Backlinks-Sidebar zeigt `via Alias`-Tag bei Alias-Treffern.
4. Linter markiert Wiki-Links auf Aliases nicht als broken.
5. Linter-Regel-Aktivierungslogik aus 4T-0020 unverändert.
6. Alias-Änderung wird über den Watcher live ins Index übertragen.
7. Sprachwechsel: Dialog- und Tag-Strings korrekt in allen fünf Sprachen.
8. Theme-Wechsel: Dialog und Tag bleiben lesbar in Light und Dark.
9. Dateien ohne Aliases: bisheriges Verhalten unverändert.
