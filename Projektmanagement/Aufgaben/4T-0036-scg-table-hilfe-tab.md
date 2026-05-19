# 4T-0036 — Hilfe-Tab „SCG Table" mit ausführlicher Doku

**Status**: Offen
**Epic**: [3E-0006 — SCG Table](3E-0006-scg-table.md)
**Zielversion**: 0.12.0

## Warum

scg-table ist eine projekt-spezifische Syntax, die in keinem anderen Markdown-Renderer existiert. Ein einzelner Funktions-Eintrag in der Hilfe-Dialog-Liste reicht für die Erklärung nicht aus. Der Nutzer braucht eine echte Syntax-Referenz mit Beispielen, Tipps zur Vier-Backtick-Konvention für eingeschachtelte Code-Blöcke und einem Hinweis zur Portabilität.

Die Lösung: ein dritter Tab im bestehenden Hilfe-Dialog, neben „Funktionen" und „Tastenkürzel". Inhalt als Markdown, der durch die markdown-it-Instanz des Viewers gerendert wird. Damit funktionieren scg-table-Beispiele direkt im Hilfe-Tab und demonstrieren die Funktion an sich selbst.

## Lösungsansatz

### Tab-Struktur

Der bestehende Hilfe-Dialog (seit 0.9.0) hat zwei Tabs „Funktionen" und „Tastenkürzel". Wird um einen dritten Tab „SCG Table" erweitert. Tab-Label kommt aus dem neuen i18n-Key `help.tab.scgTable`.

### Inhalt als Markdown pro Sprache

Neuer Unterordner `src/i18n/help/` mit fünf Dateien:

- `src/i18n/help/scg-table.de.md`
- `src/i18n/help/scg-table.en.md`
- `src/i18n/help/scg-table.fr.md`
- `src/i18n/help/scg-table.es.md`
- `src/i18n/help/scg-table.it.md`

Inhaltsgliederung (in allen Sprachen identisch strukturiert):

1. **Einleitung** — Was ist scg-table, warum existiert es, wann nutzt man es. Hinweis, dass es eine Erweiterung des Markdown-Standards für mehrzeilige Block-Zellen ist.
2. **Grundsyntax** — Übersichtstabelle der Sonderzeichen:
   - `{|` — Tabellen-Anfang
   - `|+` — Caption
   - `|-` — Zeilen-Trenner
   - `|` — Datenzelle
   - `!` — Header-Zelle
   - `|}` — Tabellen-Ende
3. **Minimales Beispiel** — Quelltext-Block (mit syntax-highlight) plus die direkt darunter gerendete Tabelle.
4. **Erweitertes Beispiel** — mit geschachtelter Liste, nummerierter Liste, mehrzeiliger Zelle und einem Code-Block in der Zelle. Demonstriert die Vier-Backtick-Konvention.
5. **Tipps** — als Liste:
   - Vier-Backtick-Außenfence, sobald die Zelle einen Code-Block enthält.
   - Eine Zelle pro Quellzeile-Anfang. Folgezeilen ohne Sonderzeichen gehören zur laufenden Zelle.
   - Whitespace am Anfang und Ende einer Zelle wird gestrippt.
   - Inline-Formatierung, Wiki-Links und Bilder funktionieren in Zellen wie sonst auch.
6. **Portabilität** — Hinweis, dass die `.md`-Datei in fremden Markdown-Renderern (GitHub, VS Code etc.) den scg-table-Block als regulären Code-Block anzeigt. Das ist bewusste Designentscheidung, kein Bug.
7. **Ausblick** — Kurz erwähnen, dass Stufe 2 (`colspan`, `rowspan`, Ausrichtung) und Stufe 3 (HTML-Konverter für maximale Portabilität) als Folge-Epics geplant sind.

### Inhalt-Laden zur Laufzeit

Da die Markdown-Dateien Teil des Bundles sind und der Renderer keinen direkten Dateisystem-Zugriff hat, braucht es einen IPC-Endpunkt:

- **Main**: neuer Handler `ipcMain.handle('help:getScgTableContent', (event, locale) => …)` in [src/main/main.js](../../src/main/main.js). Liest die passende Datei aus `src/i18n/help/scg-table.<locale>.md`. Fallback auf Englisch, wenn die Datei für die aktive Locale fehlt.
- **Preload**: neue API in [src/main/preload.js](../../src/main/preload.js): `getScgTableHelpContent: (locale) => ipcRenderer.invoke('help:getScgTableContent', locale)`.
- **Renderer**: beim Wechsel auf den scg-table-Tab den Inhalt per `window.api.getScgTableHelpContent(locale)` holen, durch `window.api.renderMarkdown(content)` rendern und in den Tab-Container einsetzen.

### asarUnpack

`src/i18n/**/*` ist bereits in der `asarUnpack`-Konfiguration in `package.json` enthalten. Die neuen `.md`-Dateien im Unterordner `help/` sind damit automatisch entpackt und zur Laufzeit lesbar.

### Tab-UI-Logik im renderer.js

- Bestehende Tab-Struktur in `renderHelpContent()` analysieren, dritten Tab analog hinzufügen.
- Tab-Label aus `t('help.tab.scgTable')` über die bestehende i18n-Funktion.
- Tab-Inhalt-Container leer initialisieren; beim ersten Tab-Klick Inhalt asynchron laden (Lazy Loading) und cachen.
- Sprachwechsel im laufenden Betrieb: gecachten Inhalt verwerfen und neu laden.

### Sicherheits- und Edge-Case-Verhalten

- **Fehlende Datei für eine Locale**: Fallback auf Englisch, kein Crash.
- **Asynchrones Laden**: kurzer Loading-Indikator oder leerer Bereich, bis der Inhalt da ist (in der Praxis im Millisekunden-Bereich).
- **HTML-Sicherheit**: Inhalt wird durch dieselbe markdown-it-Instanz gerendert wie der reguläre Viewer-Inhalt mit `html: false`. Eingebettete `scg-table`-Beispiele werden ihrerseits durch den scg-table-Renderer aus 4T-0034 verarbeitet.

### Akzeptanz-Smoke-Tests

1. Hilfe-Dialog öffnen, dritter Tab „SCG Table" (oder lokalisierter Name) sichtbar.
2. Tab klicken, Inhalt erscheint als gerendetes Markdown.
3. Beispiel-Tabelle im Tab wird als echte HTML-Tabelle gerendert (rekursives scg-table-Rendering in der Hilfe).
4. Beispiel mit eingeschachtelten Code-Block in der Zelle rendert mit Highlight.
5. Sprachwechsel: Tab-Inhalt wechselt in alle fünf Sprachen.
6. Bestehende Tabs „Funktionen" und „Tastenkürzel" unverändert funktional.

## Akzeptanzkriterien

- Hilfe-Dialog hat einen dritten Tab mit Label aus `help.tab.scgTable` in allen fünf Sprachen.
- Tab-Inhalt zeigt ausführliche Doku zur scg-table-Syntax in der aktiven Sprache.
- Inhalt enthält Einleitung, Syntax-Übersicht, mindestens ein gerendetes Beispiel, Tipps und Portabilitäts-Hinweis.
- Alle fünf Sprachen haben jeweils eine eigene Inhaltsdatei.
- Sprachwechsel zur Laufzeit aktualisiert den Tab-Inhalt entsprechend.
- Bestehende Tabs unverändert funktional.

## Bezug zu Dateien

- `src/i18n/help/scg-table.de.md` (neu)
- `src/i18n/help/scg-table.en.md` (neu)
- `src/i18n/help/scg-table.fr.md` (neu)
- `src/i18n/help/scg-table.es.md` (neu)
- `src/i18n/help/scg-table.it.md` (neu)
- [src/i18n/de.json](../../src/i18n/de.json), `en.json`, `fr.json`, `es.json`, `it.json` — neuer i18n-Key `help.tab.scgTable` für das Tab-Label.
- [src/main/main.js](../../src/main/main.js) — neuer IPC-Handler `help:getScgTableContent`.
- [src/main/preload.js](../../src/main/preload.js) — neue API `getScgTableHelpContent` über contextBridge.
- [src/renderer/renderer.js](../../src/renderer/renderer.js) — dritten Tab im Hilfe-Dialog rendern, Lazy-Loading-Logik, Sprachwechsel-Hook.
- Ggf. [src/renderer/styles.css](../../src/renderer/styles.css) — minimale Layout-Anpassung für den Tab-Inhalt-Container (Scroll, Padding).

## Lösung

(wird nach Abschluss der Umsetzung gefüllt)
