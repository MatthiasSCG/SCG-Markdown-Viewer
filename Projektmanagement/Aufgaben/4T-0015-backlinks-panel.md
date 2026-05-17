# 4T-0015 — Backlinks-Panel mit Tiefen-begrenzter Indexierung

**Status**: Offen
**Epic**: [3E-0002 — Strukturnavigation: Folding, Outline und Backlinks](3E-0002-strukturnavigation.md)
**Zielversion**: 0.8.0

## Warum

Wiki-Links (`[[Datei]]`) und relative Markdown-Links sind seit 0.4.x unterstützt. Es fehlt aber die Rückkehr-Sicht: welche anderen Dokumente referenzieren die gerade geöffnete Datei? Ohne diese Sicht bleibt das Wiki-Modell halbiert. Mit Backlinks wird sichtbar, wo eine Datei aufgegriffen wird, und Querbezüge in Markdown-Sammlungen werden navigierbar.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Suchraum-Definition

- **Wurzel** ist der Ordner, in dem die aktive Datei liegt.
- **Tiefe** ist fest begrenzt auf zwei zusätzliche Unterordner-Hierarchieebenen unter der Wurzel. Konkret:
  - Ebene 0: Wurzel selbst.
  - Ebene 1: direkte Unterordner.
  - Ebene 2: Unterordner der Unterordner.
  - Ebene 3 und tiefer: werden nicht indiziert.
- Begründung steht im Epic, Variante A ohne Marker-Datei.
- Eine Datei außerhalb dieses Bereichs (z.B. in der Eltern-Ebene) wird nicht als Backlink-Quelle erfasst. Das ist eine bewusste, akzeptierte Limitierung.
- **Hard-Cap**: Wenn die Wurzel (z.B. Laufwerks-Root) potenziell sehr viele Dateien enthält, greift ein Schutzmechanismus (z.B. maximal X Dateien oder eine maximale Index-Größe). Konkretes Limit beim Detail-Design.

### Indexierung

- **Asynchroner Index-Aufbau** beim Tabwechsel auf eine Datei, deren Wurzel noch nicht im Cache liegt. Während des Aufbaus zeigt das Backlinks-Panel einen Hinweis „indexiere…".
- **Cache pro Wurzel** im Main-Prozess, mit `chokidar`-Watcher (`depth: 2`, Filter auf `*.md`-Dateien) zur Live-Aktualisierung. Beim Schließen des letzten Tabs einer Wurzel kann der Watcher abgebaut werden.
- **Index-Format**: Map `dateiUrl → [{ quelldatei, zeile, linkTyp }]`. Aufbau durch Lesen aller `*.md`-Dateien im Suchraum und Parsen von:
  - `[[Dateiname]]` und `[[Dateiname|Anzeigetext]]` (Wiki-Links)
  - `[Text](relativer-pfad.md)` und `[Text](relativer-pfad.md#anker)` (relative Markdown-Links)
  - `[Text](./pfad)`, `[Text](../pfad)` werden ebenfalls erfasst, sofern sie auf `.md`-Dateien zeigen.
- **Auflösung exakt**: Ein Wiki-Link `[[Foo]]` matched eine Datei `Foo.md` im Suchraum (Basename-Match). Relative Links werden gegen das Quelldatei-Verzeichnis aufgelöst und mit dem Pfad der aktiven Datei verglichen.
- Keine Frontmatter-Aliase, keine Heading-Anker-spezifische Auflösung (Anker werden im Link-Treffer mitgespeichert, aber nicht für die Auflösung verwendet).

### UI

- **Position**: zweites Seiten-Panel **pro Spalte**, gemeinsamer linker Sidebar-Container mit dem Outline-Panel aus 4T-0014. Outline oben, Backlinks darunter, beide unabhängig per Toggle kollabierbar. Jede Spalte des Zwei-Spalten-Layouts hat ihre eigene Sidebar.
- **Inhalt**:
  - Kopfzeile mit Datei-Anzeigename und Hinweis auf den aktuellen Suchpfad (Tooltip oder kleine Info-Zeile).
  - Liste der Backlinks gruppiert nach Quelldatei, pro Eintrag: Quelldatei-Name, Zeilennummer, Kontext-Snippet (eine Zeile drumherum), optional Hinweis auf Anker.
  - Klick auf einen Eintrag öffnet die Quelldatei in einem neuen Tab oder aktiviert den vorhandenen Tab, mit Cursor auf der Treffer-Zeile.
- **Empty State**: lokalisierter Hinweistext „Keine Backlinks im aktuellen Suchpfad" mit Sub-Text, der den Suchpfad und die Tiefenbegrenzung kurz erklärt.
- **Sichtbar machen der Tiefenbegrenzung**: kleines Info-Symbol mit Tooltip „Suche im Ordner `…/Wurzel/` und bis zu zwei Unterordner-Ebenen darunter".

### Watcher und Performance

- `chokidar.watch(wurzel, { depth: 2, ignoreInitial: false })` für die initiale Erfassung und Live-Updates.
- Updates (Add/Change/Unlink) lösen einen inkrementellen Re-Parse der betroffenen Datei aus, nicht einen vollständigen Neuaufbau.
- Beim Quit des Fensters werden alle Watcher der Wurzeln dieses Fensters abgebaut.

### IPC

- Main hält die Indizes und Watcher, Renderer fragt per IPC ab und abonniert Live-Updates.
- Neue IPC-Kanäle (vorläufige Namen, Detail-Design): `backlinks:requestFor`, `backlinks:resultsFor`, `backlinks:invalidated`.

## Akzeptanzkriterien

**Suchraum:**

- Backlinks erfasst genau den Ordner der aktiven Datei plus alle Unterordner bis zur zweiten Hierarchieebene. Dateien in der dritten Ebene oder tiefer tauchen nicht als Backlink-Quelle auf.
- Backlinks in übergeordneten Ordnern werden nicht erfasst (akzeptierter blinder Fleck).
- Im Tooltip oder einer Info-Zeile ist der genaue Suchpfad sichtbar.

**Auflösung:**

- `[[Aktive-Datei]]` in einer beliebigen Datei im Suchraum führt zu einem Backlink-Eintrag.
- `[Text](relativer/pfad/zur-aktiven-datei.md)` in einer beliebigen Datei im Suchraum führt ebenfalls zu einem Eintrag, sofern der relative Pfad korrekt auf die aktive Datei zeigt.
- Eine Datei, die sich selbst referenziert, taucht **nicht** als eigener Backlink auf.
- Eine Datei mit Backlinks aus mehreren Quellen zeigt alle Quellen, gruppiert pro Quelldatei.

**UI und Performance:**

- Das Backlinks-Panel lässt sich **pro Spalte** unabhängig ein- und ausblenden, Status persistent über App-Neustart hinweg.
- Beim Tabwechsel auf eine neue Wurzel zeigt das Panel einen kurzen Indexier-Hinweis, danach die Ergebnisliste.
- Live-Update: Wird in einer Datei im Suchraum ein neuer Link auf die aktive Datei gespeichert, erscheint der Backlink innerhalb weniger Sekunden ohne weiteres Zutun.
- Klick auf einen Eintrag öffnet die Quelldatei (oder aktiviert den bestehenden Tab) mit Cursor auf der Treffer-Zeile.

**Robustheit:**

- Bei sehr großen Suchräumen greift der Hard-Cap, Panel zeigt einen Hinweis „Suchraum zu groß, Backlinks deaktiviert" mit Begründung.
- Beim Schließen des Tabs werden ungenutzte Watcher abgebaut.

## Bezug zu Dateien

- `src/main/main.js` — Index-Aufbau, Watcher-Verwaltung, IPC-Handler.
- `src/main/preload.js` — API für Backlinks-Abruf und Live-Updates.
- `src/renderer/renderer.js` — Backlinks-Panel-Logik, Render der Ergebnisliste, Klick-Handler, Live-Update-Listener.
- `src/renderer/index.html` — Container für das Backlinks-Panel, Statusbar-Toggle.
- `src/renderer/styles.css` — Layout, Liste, Gruppen-Header, Empty-State.
- `src/i18n/{de,en,fr,es,it}.json` — Keys für Panel-Titel, Empty-State, Suchpfad-Tooltip, Hard-Cap-Hinweis, Indexier-Hinweis.
- `package.json` — keine neuen Dependencies (chokidar ist bereits drin).

## Lösung
