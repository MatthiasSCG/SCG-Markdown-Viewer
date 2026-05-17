# 4T-0020 — Markdown-Linter-Light (Inline-Hinweise)

**Status**: Offen
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Beim Schreiben von Markdown schleichen sich typische, leicht behebbare Mängel ein:

- bare URLs ohne Link-Syntax (`Siehe https://example.com` statt `[example.com](https://example.com)`),
- Links mit leerem Text (`[](url)`),
- Bilder ohne Alt-Text (`![](pfad)`),
- Wiki-Links, deren Ziel nicht existiert (`[[Foo]]` ohne `Foo.md` im Suchraum aus 3E-0002).

Ein leichter Linter, der diese Punkte als dezente Inline-Hinweise im Editor markiert, hebt die Qualität der Dokumente, ohne aufdringlich zu sein.

## Lösungsansatz

Skelett, wird vor Umsetzung vertieft.

### Regelset (in 0.9.0 fest)

1. **bare-url**: Eine URL der Form `http(s)://…` oder `mailto:…`, die nicht in Markdown-Link-Syntax steht und nicht in einem Code-Block oder Inline-Code liegt.
2. **empty-link-text**: `[](url)` mit leerem Text-Teil. Auto-Links (`<https://…>`) sind kein Verstoß.
3. **missing-alt-text**: `![](pfad)` mit leerem Alt-Text.
4. **broken-wiki-link**: `[[Ziel]]` oder `[[Ziel|Anzeigetext]]`, wenn `Ziel.md` (bzw. die im Wiki-Link-Verhalten erwartete Auflösung) im Suchraum aus 3E-0002 nicht existiert.

Konfigurierbarkeit (Ein-/Ausschalten einzelner Regeln) ist bewusst **nicht** im Umfang von 0.9.0. Wenn das später nötig wird, eigener Task im Settings-Dialog.

### Erkennung und Darstellung

- **Erkennung** läuft synchron im Renderer, getriggert durch Editor-Änderungen mit Debounce (z.B. 300 ms).
- **Regel 4 (broken-wiki-link)** nutzt den Backlinks-Index aus 4T-0015 via IPC-Lookup: „existiert Datei mit Basename `Ziel` im Suchraum?". Bei nicht verfügbarem Index (z.B. Tab gerade gewechselt, Index noch nicht fertig) wird die Regel temporär unterdrückt, keine falschen Positiv-Meldungen.
- **Akzeptierter Falsch-Positiv durch Tiefenbegrenzung**: Der Suchraum aus 3E-0002 ist auf zwei Unterordner-Ebenen begrenzt. Liegt das tatsächliche Wiki-Link-Ziel in Ebene 3 oder tiefer, kennt der Index die Datei nicht und der Linter meldet `broken-wiki-link`, obwohl die Datei real existiert. Das wird bewusst akzeptiert, weil sonst die Linter-Reichweite vom Backlinks-Modell abweichen würde. Der Tooltip macht den eingeschränkten Suchraum für den Nutzer transparent, sodass die Meldung nicht als allgemeines „existiert nicht" gelesen wird, sondern als „im Suchraum nicht gefunden".
- **Tooltip-Text für Regel 4** (Beispiel-Wording in DE, sinngemäß in den anderen vier Sprachen): „Ziel `Foo` im Suchraum (Datei-Ordner und 2 Unterordner-Ebenen) nicht gefunden."
- **Darstellung im Editor** als CodeMirror-Decoration:
  - Wellen-Unterstreichung in dezenter Warn-Farbe (gelb-orange, Light- und Dark-Theme-Variante).
  - Hover-Tooltip mit Regel-Name und Erklärung, lokalisiert.
- **Keine Marker im Render-Pane**. Linter-Hinweise sind ein Schreibmittel.
- **Keine Status-Anzeige** (kein „X Hinweise"-Badge), keine Liste, kein Panel. Bewusst minimal in 0.9.0.

### Performance

- Lint-Lauf bei jeder Änderung mit 300-ms-Debounce.
- Bei sehr langen Dokumenten: inkrementelle Aktualisierung über CodeMirror-`StateField`, sodass nur geänderte Bereiche neu geprüft werden. Konkretes Design im Detail-Schritt.

### i18n

- Pro Regel ein Key für Kurz-Bezeichnung und ein Key für ausführlichere Tooltip-Beschreibung. Insgesamt acht neue Keys (4 × 2) in allen fünf Sprachen.

## Akzeptanzkriterien

**Erkennung:**

- Eine bare URL im Fließtext (außerhalb von Code-Blöcken und Inline-Code) wird mit Wellen-Unterstreichung markiert; Tooltip nennt die Regel und schlägt vor, Markdown-Link-Syntax zu verwenden.
- `[](https://example.com)` wird markiert mit Tooltip „Link-Text fehlt".
- `![](bild.png)` wird markiert mit Tooltip „Alt-Text fehlt".
- `[[Datei-die-es-nicht-gibt]]` wird markiert, wenn `Datei-die-es-nicht-gibt.md` im Suchraum aus 3E-0002 nicht existiert. Existiert das Ziel, ist keine Markierung sichtbar.
- Wiki-Links mit `|Anzeigetext` werden auf die Ziel-Auflösung geprüft, nicht den Anzeigetext.
- **Akzeptierter Falsch-Positiv**: Liegt das Wiki-Link-Ziel real in Ebene 3 oder tiefer (außerhalb des Suchraums aus 3E-0002), wird der Link als `broken-wiki-link` markiert. Der Tooltip nennt explizit die Tiefenbegrenzung, sodass der Nutzer die Meldung als „im Suchraum nicht gefunden" und nicht als „existiert nirgends" liest.
- Bare URLs in Code-Blöcken und Inline-Code werden **nicht** markiert.
- Auto-Links (`<https://…>`) sind **kein** Verstoß gegen `empty-link-text` und werden nicht markiert.

**Darstellung:**

- Wellen-Unterstreichung sichtbar in Light- und Dark-Theme.
- Hover über die markierte Stelle zeigt einen Tooltip mit lokalisierter Erklärung.
- Keine Marker im Render-Pane.
- Keine Statusbar-Anzeige, kein Linter-Panel.

**Performance:**

- Lint-Update verzögert sich um ca. 300 ms nach letzter Editor-Änderung, nicht spürbar bei normalem Tipp-Tempo.
- Bei Dokumenten mit > 10.000 Zeichen bleibt der Editor responsiv (keine merklichen Hänger).

**Index-Abhängigkeit:**

- Während der Backlinks-Index noch aufgebaut wird (z.B. direkt nach Tab-Wechsel), wird Regel `broken-wiki-link` unterdrückt; die anderen drei Regeln bleiben aktiv.

## Bezug zu Dateien

- `src/renderer/renderer.js` — Linter-Logik, CodeMirror-`StateField` für Decorations, IPC-Anbindung an Backlinks-Index.
- `src/renderer/styles.css` — Wellen-Unterstreichung Light/Dark, Tooltip-Styles.
- `src/main/preload.js` — ggf. Erweiterung des Backlinks-IPC um einen Lookup-Endpunkt „existiert Basename im Suchraum?".
- `src/i18n/{de,en,fr,es,it}.json` — acht neue Keys für die vier Regeln (jeweils Kurz- und Tooltip-Text).

## Lösung
