# 4T-0015 — Backlinks-Panel mit Tiefen-begrenzter Indexierung

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Wiki-Links (`[[Datei]]`) und relative Markdown-Links sind seit 0.4.x unterstützt. Es fehlt aber die Rückkehr-Sicht: welche anderen Dokumente referenzieren die gerade geöffnete Datei? Ohne diese Sicht bleibt das Wiki-Modell halbiert. Mit Backlinks wird sichtbar, wo eine Datei aufgegriffen wird, und Querbezüge in Markdown-Sammlungen werden navigierbar.

## Lösungsansatz

### Suchraum-Definition (aus 3E-0002 übernommen)

- **Wurzel** ist der Ordner, in dem die aktive Datei liegt.
- **Tiefe** ist fest begrenzt auf zwei zusätzliche Unterordner-Hierarchieebenen unter der Wurzel:
  - Ebene 0: Wurzel selbst.
  - Ebene 1: direkte Unterordner.
  - Ebene 2: Unterordner der Unterordner.
  - Ebene 3 und tiefer: werden nicht indiziert.
- Eine Datei in der Eltern-Ebene oder höher wird nicht als Backlink-Quelle erfasst (akzeptierter blinder Fleck nach oben, dokumentiert im Epic).
- **„Unbenannt"-Tabs** ohne Pfad haben keinen bestimmbaren Suchraum. Das Backlinks-Panel zeigt dann den Empty-State „Backlinks erst nach dem Speichern verfügbar".

### Hard-Cap

Wenn ein Suchraum entweder

- **mehr als 2.000 Markdown-Dateien** enthält, oder
- **mehr als 50 MB Gesamtgröße** der Markdown-Dateien im Suchraum überschreitet,

wird der Index für diese Wurzel **nicht aufgebaut**. Das Backlinks-Panel zeigt einen lokalisierten Hinweis „Suchraum zu groß, Backlinks deaktiviert" mit dem konkreten Wert (z.B. „2.350 Dateien, Limit 2.000" oder „62 MB, Limit 50 MB"). Begründung: Schutzmechanismus für Pathologie-Fälle, z.B. wenn die aktive Datei direkt im Laufwerks-Root liegt oder in einem Ordner mit sehr vielen Sub-Verzeichnissen.

### Indexierung (im Main-Prozess)

- **Zentrale Index-Verwaltung im Main**: `Map<wurzelPfad, BacklinkIndex>`. Ein Index pro Wurzel.
- **Index-Struktur**: Pro indizierter Quelldatei eine Liste extrahierter Link-Treffer. Aufbau aus den `*.md`-Dateien im Suchraum mit Erkennung von:
  - `[[Dateiname]]` und `[[Dateiname|Anzeigetext]]` (Wiki-Links).
  - `[Text](relativer-pfad.md)` und `[Text](relativer-pfad.md#anker)` (relative Markdown-Links).
  - `[Text](./pfad.md)`, `[Text](../pfad.md)` werden ebenfalls erfasst, sofern sie auf `*.md`-Dateien zeigen.
- **Pro Treffer gespeichert**: `{ quelldatei, zeile, linkTyp, anker?, snippet }`. `snippet` ist die Quellzeile (mit Ellipsen bei Überlänge, Detail-Wert siehe Implementierungs-Recherche).
- **Markdown-Filter** für die zu indizierenden Dateien analog zur bestehenden Datei-Assoziation: `*.md`, `*.markdown`, `*.mdown`, `*.mkd`.

#### Auflösung

- **Wiki-Link** `[[Foo]]` matched alle Dateien mit Basename `Foo.md` im Suchraum.
- **Namens-Konflikte**: Wenn `a/Foo.md` und `b/Foo.md` beide im Suchraum existieren und ein Link `[[Foo]]` lautet, werden **beide Treffer beiden Zieldateien zugeordnet**. Begründung: Backlinks listet ohnehin alle eingehenden Referenzen; das ist transparenter als ein automatisches Erraten der Auflösung.
- **Relative Markdown-Links** werden gegen das Quelldatei-Verzeichnis aufgelöst und mit dem absoluten Pfad der aktiven Datei verglichen.
- **Eigen-Referenz**: Eine Datei, die sich selbst referenziert, wird **nicht** als eigener Backlink gelistet.
- **Anker**: Aus `[Text](datei.md#anker)` wird der Anker-Teil mit erfasst, fließt aber nicht in die Ziel-Auflösung ein. Der Anker wird im UI im Treffer-Eintrag angezeigt (siehe UI).

### Watcher und Lifecycle

- **`chokidar.watch(wurzel, { depth: 2, ignoreInitial: false })`** mit Markdown-Filter.
- **Inkrementelle Updates**: Add/Change/Unlink-Events lösen Re-Parse nur der betroffenen Quelldatei aus, kein vollständiger Neuaufbau.
- **Reference-Counting** pro Wurzel: Jeder offene Tab, dessen Datei zur Wurzel gehört, zählt als Referenz. Sinkt der Counter auf 0 (letzter Tab in der Wurzel geschlossen), startet ein **60-Sekunden-Soft-Timer**:
  - Wird in dieser Zeit ein Tab in der Wurzel geöffnet (z.B. via Backlink-Klick oder Wiki-Link-Navigation), wird der Timer abgebrochen, der Watcher bleibt warm.
  - Läuft der Timer durch, wird der Watcher abgebaut und der Cache verworfen.
- Bei kaputten Watcher-Events (z.B. plötzliches Verschwinden der Wurzel) wird der Index zurückgesetzt und das Renderer-Panel zeigt den Empty-State, kein Renderer-Absturz.

### IPC-Kanäle

Neue IPC-Schnittstellen zwischen Renderer und Main:

- **`backlinks:requestFor({ filePath })`** (Renderer → Main): Renderer fordert Backlinks für die angegebene Datei an. Main bestimmt die Wurzel, baut den Index ggf. asynchron auf und sendet das Ergebnis zurück.
- **`backlinks:resultsFor({ filePath, status, results, meta })`** (Main → Renderer): `status` ist einer von `indexing`, `ready`, `oversized`, `unavailable`. `meta` enthält bei `ready` den Suchpfad und Dateianzahl, bei `oversized` die konkreten Werte zum Cap.
- **`backlinks:invalidated({ wurzel })`** (Main → Renderer): wird gesendet, wenn der Index aufgrund eines Watcher-Events aktualisiert wurde. Alle Renderer, die gerade einen Tab in dieser Wurzel anzeigen, refreshen ihre Backlinks-Anzeige.

### UI im Renderer

- **Position**: zweite Sektion des linken Sidebar-Containers pro Spalte (Outline aus 4T-0014 oben, Backlinks unten). Beide unabhängig per Toggle kollabierbar.
- **Initial-Sichtbarkeit**: versteckt bei frischer Installation. Status persistent pro Spalte, unabhängig vom Outline-Toggle.
- **Toggle-Quellen**:
  - Statusbar-Button (neues Icon).
  - Menüleisten-Eintrag `Ansicht → Backlinks` als Toggle mit Häkchen.
  - Tastenkürzel `Strg+Umschalt+B` (toggelt das Backlinks-Panel der aktiv fokussierten Spalte).
- **Multi-Window-Synchronisation**: keine, weil pro Spalte (analog Outline).

#### Header

Datei-Anzeigename der aktiven Datei plus kleines Info-Symbol. Hover-Tooltip am Info-Symbol: „Suche in `…/Wurzel/` und Unterordnern bis 2 Ebenen", mit dem konkreten Wurzel-Pfad.

#### Inhalt (status-abhängig)

- **`indexing`**: dezenter Hinweis-Text „indexiere…" mittig im Panel, ggf. mit kleiner Spinner-Animation.
- **`ready` mit Treffern**: Liste, gruppiert pro Quelldatei.
  - **Pro Gruppe** ein Header mit dem Quelldatei-Namen (klickbar = Quelldatei öffnen, Cursor auf der ersten Treffer-Zeile).
  - **Pro Treffer** unter dem Gruppen-Header: Zeilennummer, Anker (falls vorhanden, im Format `, #anker`), Snippet (eine Zeile mit Ellipsen bei Überlänge). Klick öffnet die Quelldatei mit Cursor auf der Treffer-Zeile.
- **`ready` ohne Treffer**: Empty-State „Keine Backlinks im aktuellen Suchpfad" (lokalisiert).
- **`oversized`**: Hinweis „Suchraum zu groß, Backlinks deaktiviert" plus konkrete Werte.
- **`unavailable`** (für „Unbenannt"-Tabs): Empty-State „Backlinks erst nach dem Speichern verfügbar".

#### Klick-Verhalten

- Klick auf einen Treffer-Eintrag oder einen Quelldatei-Header:
  - **Wenn die Quelldatei in irgendeiner Spalte oder Pane des aktiven Fensters bereits offen ist**: bestehender Tab wird aktiviert (analog zur Wiki-Link-Klick-Logik, siehe `findTabAcrossPanes` in [src/renderer/renderer.js](src/renderer/renderer.js)).
  - **Wenn nicht offen**: neuer Tab in der aktiven Spalte des aktiven Fensters.
  - **In beiden Fällen** wird der Cursor auf die Treffer-Zeile gesetzt und die Zeile in den sichtbaren Bereich gescrollt.
- Klick auf den Quelldatei-Gruppen-Header verhält sich wie Klick auf den ersten Treffer in der Gruppe.

### Live-Updates

- Bei `backlinks:invalidated` rebuilt der Renderer die Anzeige aus dem aktuellen Index-Stand. Watcher-getriebene Updates erscheinen innerhalb weniger Sekunden ohne weiteres Zutun.
- Bei Tab-Wechsel (aktive Datei ändert sich) sendet der Renderer einen neuen `backlinks:requestFor`. Vorherige Antworten für andere Dateien werden ignoriert (Request-Tagging mit `filePath`).

### Persistenz

- **Sichtbarkeit pro Spalte**: `backlinks.visible.column0` / `backlinks.visible.column1` in den Settings.
- **Sidebar-Breite**: gemeinsam mit dem Outline-Panel aus 4T-0014 verwaltet (`sidebar.width.column0/1`).

## Akzeptanzkriterien

**Suchraum:**

- Backlinks erfasst genau den Ordner der aktiven Datei plus alle Unterordner bis zur zweiten Hierarchieebene. Dateien in der dritten Ebene oder tiefer tauchen nicht als Backlink-Quelle auf.
- Backlinks in übergeordneten Ordnern werden nicht erfasst (akzeptierter blinder Fleck).
- Info-Tooltip im Header zeigt den genauen Wurzel-Pfad und nennt die Tiefen-Begrenzung explizit.

**Hard-Cap:**

- Bei mehr als 2.000 Markdown-Dateien im Suchraum oder mehr als 50 MB Gesamtgröße wird der Index nicht aufgebaut. Das Panel zeigt den lokalisierten Hinweis mit dem konkreten Wert (z.B. „2.350 Dateien, Limit 2.000").

**Auflösung:**

- `[[Aktive-Datei]]` in einer Quelldatei im Suchraum führt zu einem Backlink-Eintrag.
- `[Text](relativer/pfad/zur-aktiven-datei.md)` in einer Quelldatei im Suchraum führt ebenfalls zu einem Eintrag.
- Bei Namens-Konflikten (`a/Foo.md` und `b/Foo.md`) und einem Link `[[Foo]]`: beide Dateien sehen den Backlink in ihrem jeweiligen Panel.
- Eigen-Referenzen werden ausgeschlossen.
- Anker (`#section`) werden mit erfasst und im Treffer-Eintrag angezeigt (z.B. „Zeile 42, #section").
- **Akzeptierter Falsch-Positiv**: Ist das Wiki-Link-Ziel real in Ebene 3 oder tiefer, kann es vom Index nicht erfasst werden; die Quelldatei sieht den Backlink zur tieferen Datei nicht. Konsistent mit dem Suchraum-Modell.

**UI und Bedienung:**

- Backlinks-Panel lässt sich pro Spalte unabhängig ein- und ausblenden, Status persistent.
- Tastenkürzel `Strg+Umschalt+B`, Statusbar-Button oder Menüleisten-Eintrag `Ansicht → Backlinks` toggeln für die aktiv fokussierte Spalte.
- Default bei frischer Installation: versteckt.
- Beim Tabwechsel auf eine neue Wurzel zeigt das Panel kurz „indexiere…", danach die Ergebnisliste.
- Klick auf einen Treffer oder Gruppen-Header öffnet die Quelldatei. Wenn bereits in einer Pane offen: bestehender Tab wird aktiviert, kein Duplikat. Cursor landet in jedem Fall auf der Treffer-Zeile.
- Snippet zeigt eine Zeile rund um den Treffer mit Ellipsen bei Überlänge.
- Sprachwechsel aktualisiert die UI-Texte (Panel-Titel, Empty-States, Tooltips, Indexier-Hinweis) live.

**„Unbenannt"-Tabs:**

- Bei einem Tab ohne Datei-Pfad zeigt das Backlinks-Panel den Empty-State „Backlinks erst nach dem Speichern verfügbar" (lokalisiert).

**Watcher-Lifecycle:**

- Wenn der letzte Tab aus einer Wurzel geschlossen wird, läuft ein 60-Sekunden-Soft-Timer.
- Wird in der Zeit ein neuer Tab in der Wurzel geöffnet, bleibt der Watcher warm.
- Läuft der Timer durch, wird der Watcher abgebaut und der Cache verworfen.

**Live-Updates:**

- Wird in einer Datei im Suchraum ein neuer Link auf die aktive Datei gespeichert, erscheint der Backlink innerhalb weniger Sekunden ohne weiteres Zutun.
- Wird eine Datei im Suchraum gelöscht oder umbenannt, verschwinden ihre Backlinks entsprechend.

**Robustheit:**

- Bei kaputten Watcher-Events (z.B. plötzliches Verschwinden der Wurzel) wird der Index zurückgesetzt und der Empty-State gezeigt, kein Renderer-Absturz.

## Bezug zu Dateien

- `src/main/main.js` — Index-Aufbau und -Verwaltung pro Wurzel; chokidar-Watcher mit `depth: 2`; Reference-Counting mit 60-s-Soft-Timer; Hard-Cap-Prüfung; IPC-Handler `backlinks:requestFor`; Broadcasts `backlinks:resultsFor` und `backlinks:invalidated`.
- `src/main/preload.js` — neue API-Methoden für Backlinks-Anfrage und Live-Update-Listener.
- `src/renderer/renderer.js` — Backlinks-Panel-Logik, Status-abhängige UI (`indexing`/`ready`/`oversized`/`unavailable`), Render der Ergebnisliste gruppiert pro Quelldatei, Klick-Handler mit Tab-Wiederverwendung via `findTabAcrossPanes`, Live-Update-Listener, Request-Tagging für Tab-Wechsel-Races.
- `src/renderer/index.html` — Container für das Backlinks-Panel im Sidebar, Statusbar-Toggle-Button.
- `src/renderer/styles.css` — Layout, Liste, Gruppen-Header, Empty-State, Snippet-Style, Indexier-Spinner, Theme-Anpassungen.
- `src/main/menu.js` — neuer Menüpunkt `Ansicht → Backlinks` als Toggle mit Häkchen, Tastenkürzel `Strg+Umschalt+B` registriert.
- `src/i18n/{de,en,fr,es,it}.json` — Keys: Panel-Titel, drei Empty-States (`keine Treffer`, `zu groß`, `Unbenannt`), Suchpfad-Tooltip mit Tiefen-Erklärung, Indexier-Hinweis, Treffer-Format-Texte. Etwa acht bis zehn neue Keys pro Sprache.
- `package.json` — keine neuen Dependencies (chokidar ist bereits drin seit 0.3.x).

## Implementierungs-Recherche (vor Umsetzungsbeginn)

- `chokidar` mit `depth: 2` und Markdown-Filter auf Windows: Update-Performance und mögliche Plattform-Spezifika verifizieren (Symlinks, Netzwerk-Laufwerke, fs-event-Konsolidierung).
- Markdown-Link-Erkennung: eigene Regex (schnell, simpel) versus markdown-it-Parsing (genauer, aber teurer). Vorschlag Regex, weil performance-kritisch und Markdown-Link-Syntax eindeutig genug.
- Konkreter Wert für die Snippet-Breite (Zeichen-Limit für Ellipsen): während der Umsetzung festlegen, abhängig von der gewählten Sidebar-Breite. Vorschlag ca. 80 Zeichen bei 260 px Sidebar-Default.
- Existenz und Signatur von `findTabAcrossPanes` in `src/renderer/renderer.js` validieren und ggf. um Cursor-Positionierungs-Parameter erweitern, falls die Funktion das heute nicht unterstützt.

## Lösung
