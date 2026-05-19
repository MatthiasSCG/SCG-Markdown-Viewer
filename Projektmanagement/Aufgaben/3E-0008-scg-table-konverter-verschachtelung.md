# 3E-0008 — SCG Table Stufe 3: HTML-Konverter und verschachtelte Tabellen

**Status**: Erledigt — 2026-05-19, in v0.14.0 ausgeliefert
**Zielversion**: 0.14.0
**Vorgängerversion**: 0.13.0
**Aufsetzend auf**: [3E-0006 — SCG Table Stufe 1](3E-0006-scg-table.md), [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md)
**Release**: [v0.14.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.14.0)

## Ziel

Zwei eigenständige Erweiterungen der scg-table-Funktionalität, die thematisch eng zusammenhängen und in einem Epic gebündelt werden:

1. **Konverter `scg-table` → inline HTML-Tabelle**: optionaler Ausgabe-Pfad für maximale Portabilität in fremden Markdown-Renderern (GitHub, VS Code, andere Editoren).
2. **Verschachtelte scg-tables in Zellen**: rekursiver `renderScgTable`-Aufruf, damit eine Zelle wieder eine eigene scg-table enthalten darf, für komplexe Doku-Strukturen mit ineinander gestapelten Tabellen.

Beide Punkte stehen funktional unabhängig voneinander, werden aber im selben Epic gebündelt, weil sie auf die in Stufe 1 und 2 gelegte Basis aufsetzen und thematisch zur „Vollendung" der scg-table-Funktion gehören.

## Warum

**HTML-Konverter:**

- Stufe 1 hat bewusst auf den eingebetteten Code-Block mit Sprach-Tag `scg-table` gesetzt (Graceful Degradation): in fremden Markdown-Renderern bleibt der Inhalt als regulärer Code-Block lesbar statt als zerschossener Quelltext.
- Wer eine `.md`-Datei extern teilt (GitHub-Issue, Confluence-Import, Wiki-Export), bekommt damit aber den Quellcode angezeigt, nicht die Tabelle. Für die Fälle, wo Portabilität wichtig ist, fehlt eine Lösung.
- Ein optionaler Konverter, der `scg-table`-Blöcke durch inline HTML-Tabellen ersetzt, schließt diese Lücke. Die Original-Datei bleibt unverändert; die konvertierte Variante ist auch in fremden Renderern voll lesbar (HTML-Tabellen sind in CommonMark erlaubt).

**Verschachtelte scg-tables:**

- Komplexe Dokumentationen mit Tabellen, in deren Zellen wiederum Tabellen stehen (z.B. Vergleichsmatrizen mit Unter-Matrizen, Anforderungs-Tabellen mit Detail-Spezifikationen pro Zeile), brauchen das.
- In Stufe 1 bewusst nicht implementiert, weil zunächst die Basis ohne Komplexität stabilisiert werden sollte. Rekursives Markdown-Rendering in Zellen funktioniert seit Stufe 1; aber innerhalb der `renderScgTable`-Funktion ist kein Selbst-Aufruf aufgesetzt.
- Mit Stufe 2 (Spans, Ausrichtung) wird die scg-table-Funktion zur ausdrucksstarken Alternative für komplexere Layouts; Verschachtelung ist die natürliche nächste Stufe.

## Umfang und Abgrenzung

**Voraussichtlich im Umfang:**

- **Konverter scg-table → HTML-Tabelle** als Datei-Aktion (z.B. Menü-Eintrag „Datei → Exportieren → Portables Markdown…"). Schreibt eine neue `.md`-Datei, in der scg-table-Codeblocks durch inline HTML-Tabellen (`<table>`, `<tr>`, `<td>`, `<th>`, `<caption>`) ersetzt sind. Original-Datei bleibt unverändert.
- **Verschachtelte scg-tables** über rekursiven Aufruf der `renderScgTable`-Funktion. Wenn ein Zellinhalt einen scg-table-Codeblock enthält (mit längerer Außenfence), wird er rekursiv geparst.
- **Fence-Längen-Konvention für Verschachtelung dokumentieren**: drei Backticks für inneren Code-Block, vier für Stufe-1-Tabelle, fünf für eingebettete Tabelle in einer Tabellen-Zelle usw.
- **Hilfe-Tab-Inhalt** um Stufe-3-Doku erweitern (Konverter-Bedienung, Verschachtelungs-Syntax mit Beispiel).
- CHANGELOG-Eintrag, Release-Notes, Version-Bump, Tag, GitHub-Release.

**Bewusst nicht im Umfang:**

- **Konvertierung in andere Tabellen-Formate** (Pandoc Grid Tables, AsciiDoc, MediaWiki-Direkt-Syntax). Nur HTML-Tabelle.
- **Bidirektionaler Konverter** (HTML-Tabelle → scg-table). Asymmetrisch nur in eine Richtung.
- **Batch-Konvertierung** ganzer Verzeichnisse (kann bei Bedarf später als separates Feature).
- **In-Place-Konvertierung**: Konverter schreibt immer eine neue Datei, nicht in die Quelldatei.
- **Beliebige Rekursionstiefe** bei Verschachtelung: praktisch sinnvolle Obergrenze (z.B. 3 Ebenen) prüfen.

## Untergeordnete Tasks

- [x] [4T-0040 — Verschachtelte SCG-Tabellen](4T-0040-scg-table-verschachtelung.md) — erledigt, Commit `ef6c746`, gepushed
- [x] [4T-0041 — HTML-Konverter: Export portables Markdown](4T-0041-scg-table-html-konverter.md) — erledigt, Commit `191cfb2`, gepushed
- [x] [4T-0042 — Hilfe-Tab um Verschachtelung und HTML-Export erweitern](4T-0042-scg-table-hilfe-tab-stufe-3.md) — erledigt, Commit `8b4431d`, gepushed
- [x] [4T-0043 — CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.14.0](4T-0043-changelog-release-0140.md) — erledigt, gepushed, v0.14.0 veröffentlicht

## Architekturentscheidungen

Am 2026-05-19 finalisiert (die ursprünglich offenen Detail-Fragen wurden im Zuge der Task-Anlage entschieden):

- **Verschachtelung über bestehende `md.render`-Rekursion** plus expliziten Rekursionstiefen-Schutz. Counter und Konstante `SCG_TABLE_MAX_DEPTH = 3` als Modul-Level-Variablen in [src/main/preload.js](../../src/main/preload.js). Bei Erreichen des Limits gibt `renderScgTable` `null` zurück, der Override fällt auf den Default-Fence-Renderer (Code-Block) zurück.
- **Tiefen-Limit**: max. 3 Ebenen (Counter-Werte 0, 1, 2 beim Eintritt zulässig). 4. Ebene wird zum Code-Block.
- **HTML-Konverter** als Datei-Aktion: Menü-Eintrag „Datei → Exportieren → Portables Markdown…" in fünf Sprachen lokalisiert.
- **Save-Strategie**: Save-As-Dialog mit Vorbelegung `<basename>-portable.md` im gleichen Verzeichnis wie die Quell-Datei. User kann Pfad und Namen frei ändern.
- **Konverter-Implementation im Preload**: `convertMarkdownPortable(text)` als API über contextBridge. Regex-basierter Scanner für `scg-table`-Codeblocks (Pattern `^(`{3,})scg-table…`-Style). Wiederverwendung der Parser-Logik aus `renderScgTable` über eine ausgelagerte `parseScgTableBlock`-Hilfsfunktion (Refactoring).
- **HTML-Output-Stil**: strukturell mit HTML-Standard-Attributen plus Inline-Styles. `colspan`, `rowspan`, `scope` als HTML-Attribute. Ausrichtung als `style="text-align: <left|center|right>; vertical-align: <top|middle|bottom>"`. HTML5-konform. Keine CSS-Klassen im Output, damit die exportierte Datei auch in fremden Renderern ohne unsere CSS-Definitionen funktioniert.
- **Verschachtelte scg-tables im Konverter** werden rekursiv konvertiert (analog zum Viewer-Render mit demselben Tiefen-Limit).
- **Verhalten bei beschädigten Blöcken**: `scg-table`-Codeblocks ohne `{|`-Anfang bleiben vom Konverter unverändert. Semantisch konsistent mit dem Viewer-Render.
- **Stufen-Begriffe in der User-Hilfe**: weiterhin nicht verwendet (etablierte Konvention seit 4T-0038). Die neue Hilfe-Tab-Sektion heißt „Verschachtelte Tabellen und HTML-Export".

## Reihenfolge der Umsetzung

1. **4T-0040 Verschachtelte SCG-Tabellen.** Kleinere, isolierte Änderung in `preload.js` (Rekursionstiefen-Schutz). Baut auf Stufe-1- und Stufe-2-Logik direkt auf.
2. **4T-0041 HTML-Konverter.** Eigene Komponente mit Menü-Eintrag, IPC-Anbindung, Save-As-Dialog und HTML-Output-Logik. Setzt 4T-0040 voraus, damit die Konverter-Rekursion analog zum Renderer arbeitet.
3. **4T-0042 Hilfe-Tab.** Erweiterung der bestehenden fünf Sprachdateien um eine Sektion „Verschachtelte Tabellen und HTML-Export". Setzt 4T-0040 voraus, damit das Verschachtelungs-Beispiel im Tab funktional rendert.
4. **4T-0043 Abschluss-Sammeltask.** CHANGELOG, Release-Notes, README, Test-Iteration, Tag und GitHub-Release für 0.14.0.

## Bezug zu Dateien

Pro Task im jeweiligen Lösungsansatz aufgeführt. Voraussichtlich betroffen:

- [src/main/preload.js](../../src/main/preload.js) — ggf. Rekursionstiefen-Begrenzung in `renderScgTable`, Konverter-API über contextBridge.
- [src/main/main.js](../../src/main/main.js) — IPC-Handler für Konverter-Export, Datei-Schreib-Logik.
- [src/main/menu.js](../../src/main/menu.js) — neuer Menü-Eintrag „Datei → Exportieren → Portables Markdown…".
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — UI-Anbindung des Menü-Eintrags an die Konverter-Aktion.
- [src/i18n/help/scg-table.{de,en,fr,es,it}.md](../../src/i18n/help) — Hilfe-Tab-Inhalt um Stufe-3-Doku erweitern.
- [src/i18n/{de,en,fr,es,it}.json](../../src/i18n) — i18n-Keys für Menü-Eintrag, Dialog-Texte, Hilfe-Eintrag.
- `package.json` — Version-Bump.
- [CHANGELOG.md](../../CHANGELOG.md), [README.md](../../README.md), `dist/release-notes-X.Y.Z.md` — Release-Doku.

## Offene Punkte / Risiken

Die ursprünglich offenen Detail-Fragen wurden am 2026-05-19 entschieden (siehe Architekturentscheidungen):

- **Konverter-UX**: nur Menü-Eintrag. Hotkey/CLI kommen ggf. später.
- **Save-Strategie**: Save-As-Dialog mit Vorbelegung `<basename>-portable.md`.
- **HTML-Stil**: strukturell + HTML-Standard-Attribute + Inline-Styles für Ausrichtung (HTML5-konform).
- **Rekursionstiefe**: max. 3 Ebenen.
- **Verhalten bei beschädigten Blöcken**: unverändert lassen.

Verbleibende Risiken für die Umsetzung:

- **Refactoring der Parser-Logik**: damit `renderScgTable` (Viewer) und `convertMarkdownPortable` (Export) dieselbe Parser-Logik teilen, wird die Zeilen-Parsing-Schleife in eine `parseScgTableBlock`-Hilfsfunktion ausgelagert. Dabei nicht versehentlich Stufe-1- oder Stufe-2-Verhalten ändern (Regression-Risiko). Smoke-Tests aus 4T-0034 und 4T-0037 weiter abdecken.
- **Regex-basierter Scanner für Fence-Längen**: muss alle Backtick-Anzahlen ab 3 erkennen, mit gleicher Anzahl außen (Capture-Group plus Backreference). Edge-Cases prüfen: Codeblock am Datei-Anfang, Codeblock direkt nach einem anderen Codeblock, Codeblock mit Leerzeilen im Inhalt.
- **Verschachtelte Konvertierung im Export**: rekursive Konverter-Aufrufe für innere Tabellen müssen analog zum Viewer-Renderer mit dem Tiefen-Limit arbeiten, damit Konverter und Renderer dasselbe Ergebnis liefern.
- **Fence-Längen-Komplexität in der User-Doku**: bei dreifacher Verschachtelung mit innerem Code-Block braucht es sechs Backticks außen. Beispiel im Hilfe-Tab klar erklären, sonst frustrierender Stolperstein.