# 3E-0008 — SCG Table Stufe 3: HTML-Konverter und verschachtelte Tabellen

**Status**: Offen
**Zielversion**: 0.14.0 (vorläufig — Versions-Zuordnung wird beim Epic-Start fixiert)
**Vorgängerversion**: 0.13.0 (oder die Version, in der Stufe 2 ausgeliefert wird)
**Aufsetzend auf**: [3E-0006 — SCG Table Stufe 1](3E-0006-scg-table.md), [3E-0007 — SCG Table Stufe 2](3E-0007-scg-table-spans-ausrichtung.md)

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

(werden beim Epic-Start angelegt)

## Architekturentscheidungen

(werden beim Epic-Start finalisiert; offene Fragen siehe „Offene Punkte" weiter unten)

Erste Richtungsvorgaben:

- **HTML-Konverter** als Datei-Aktion: neuer Menü-Eintrag „Datei → Exportieren → Portables Markdown…". Schreibt eine neue `.md`-Datei mit Suffix wie `-portable.md` (oder Speichern-unter-Dialog) ins gleiche Verzeichnis. Original bleibt unverändert.
- **Konverter-Implementation** im Main-Prozess als IPC-Handler, der den Markdown-Inhalt als String entgegennimmt, scg-table-Blöcke mit Regex oder Token-Scanning findet, sie durch HTML ersetzt und das Ergebnis zurückgibt. Wiederverwendung der bestehenden `renderScgTable`-Logik mit kleinen Anpassungen für inline-HTML-Ausgabe (z.B. ohne `<thead>`-Struktur, weil viele externe Renderer das anders parsen).
- **Verschachtelte scg-tables**: in `renderScgTable` wird der Zellinhalt durch `md.render(content)` geschickt; weil `md.renderer.rules.fence` bereits den scg-table-Override hat, greift bei einem inneren scg-table-Codeblock automatisch der Renderer rekursiv. Funktional besteht damit die Möglichkeit „kostenlos" — es braucht ggf. nur eine Rekursionstiefen-Begrenzung und Tests.

## Reihenfolge der Umsetzung

(wird beim Epic-Start mit den Tasks festgelegt)

Vorschlag für die Aufteilung:

1. Verschachtelte scg-tables (kleinere Änderung, baut auf Stufe-1-Logik direkt auf).
2. HTML-Konverter (eigene Komponente mit eigenem Menü-Pfad und Datei-Schreib-Logik).
3. Hilfe-Tab-Erweiterung + Abschluss-Sammeltask (CHANGELOG, Release-Notes, Tag, Release).

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

- **UX für den Konverter**: nur Menü-Eintrag, oder zusätzlich Hotkey, oder CLI-Aufruf für Batch-Verarbeitung von Verzeichnissen? Hängt davon ab, wie oft du extern teilen wirst.
- **Suffix-Konvention der konvertierten Datei**: `-portable.md`, `-html-tables.md`, oder Save-As-Dialog mit freier Wahl? Mehr Aufwand für Save-As-Variante, dafür flexibler.
- **HTML-Stil im Output**: nur strukturelles HTML (`<table><tr><td>…`) oder mit Inline-Styles? Inline-Styles erhöhen Portabilität (Darstellung gleich in jedem Renderer), erhöhen aber die Konflikt-Wahrscheinlichkeit mit fremden CSS. Empfehlung: nur strukturell, weil GitHub und VS Code HTML-Tabellen ohne Styles bereits brauchbar darstellen.
- **Stufe-2-Attribute im Konverter-Output**: wie übersetzen wir `colspan`/`rowspan`/Ausrichtung aus Stufe 2 in inline HTML? `colspan="..."`, `rowspan="..."`, `<td align="...">` sind HTML-Standard und sollten 1:1 möglich sein.
- **Rekursionstiefe bei verschachtelten Tabellen**: theoretisch unbegrenzt; praktisch sinnvoll begrenzen (z.B. max. 3 Ebenen)? Bei zu großer Tiefe wird die Lesbarkeit ohnehin problematisch.
- **Fence-Längen-Komplexität**: bei einer doppelt verschachtelten Tabelle mit innerem Code-Block braucht es schon sechs Backticks außen. Doku-Aufwand für klare Kommunikation im Hilfe-Tab.
- **Konverter-Verhalten bei beschädigten scg-table-Blöcken**: wenn der Block bereits in Stufe 1 als regulärer Code-Block degradieren würde (kein `{|`), soll der Konverter ihn unverändert lassen oder trotzdem etwas tun? Vorschlag: unverändert lassen, damit das Konvertierungs-Resultat semantisch konsistent mit dem Viewer-Render ist.