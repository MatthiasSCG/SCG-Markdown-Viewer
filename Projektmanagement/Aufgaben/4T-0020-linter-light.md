# 4T-0020 — Markdown-Linter-Light (Inline-Hinweise)

**Status**: Erledigt
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

### Getroffene Detail-Entscheidungen (vor Umsetzung)

- **Erkennung Regeln 1–3** per Regex auf den Dokument-Text mit `syntaxTree`-Schutz gegen `FencedCode`/`CodeBlock`/`InlineCode`. Auto-Links (`<https://…>`) sind durch den Markdown-Parser als eigener `Autolink`-Knoten markiert und werden automatisch ausgenommen.
- **Erkennung Regel 4** per Wiki-Link-Regex + **Batch-IPC** an den Main: pro Lint-Lauf ein Roundtrip mit allen im Dokument enthaltenen Basenames, Main liefert das Set der existierenden zurück. Status `indexing` oder kein Suchraum → Regel 4 wird in diesem Durchlauf unterdrückt.
- **Decoration-Mechanik**: eigenes `StateField<DecorationSet>` mit `Decoration.mark`, eine Marker-Klasse pro Regel. Doc-Change triggert 300-ms-Debounce, async Lint-Lauf, fertige Decorations werden via `StateEffect` ins Feld dispatcht. Vollscan, kein inkrementelles Update.
- **Tooltip** via CodeMirror-`hoverTooltip`-Extension (statt Browser-`title`): lokalisierter Text, stylebar, ohne Browser-Verzögerung.
- **CSS**: `text-decoration: underline wavy var(--linter-warn)` mit eigener `--linter-warn`-Variable, Light/Dark-Themes setzen die Farbe.
- **Backlinks-Modul-Erweiterung**: neue exportierte Funktion `existingWikiTargets(filePath, basenames)` mit Antwort `{ status, existing }`. Im Main als IPC-Handler `linter:resolveWikiTargets` freigegeben. Im Preload als `resolveWikiTargets(filePath, basenames)`.

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

**Regex und Erkennungs-Helper** in `src/renderer/renderer.js`:

- `LINT_BARE_URL_RE`, `LINT_EMPTY_LINK_RE`, `LINT_WIKI_RE` als globale Konstanten.
- `lintIsInCodeContext(state, pos)` und `lintIsInLinkContext(state, pos)` laufen die `syntaxTree`-Parent-Kette hoch und erkennen `FencedCode`/`CodeBlock`/`InlineCode` bzw. `Link`/`Autolink`/`URL`. Damit werden bare URLs in Code-Blöcken, in Inline-Code und innerhalb von Markdown-Link- oder Autolink-Knoten korrekt ausgenommen.

**CodeMirror-StateField** in `src/renderer/renderer.js`:

- `setLintDecorations` als `StateEffect.define()`.
- `lintField` als `StateField<DecorationSet>`: bei `tr.docChanged` setzt das Feld zunächst auf `Decoration.none` (vermeidet verrutschte Marker beim Tab-Wechsel, der den Doc komplett ersetzt). Trifft ein `setLintDecorations`-Effect ein, wird der mitgelieferte DecorationSet übernommen.
- Vier `Decoration.mark`-Builder pro Regel; `data-lint-rule`-Attribut auf jedem Marker für den Hover-Tooltip-Lookup.

**Async Lint-Lauf** in `src/renderer/renderer.js`:

- `scheduleLint(view)` setzt einen 300-ms-Timer (`WeakMap<EditorView, timeoutId>`); bei aufeinanderfolgenden Doc-Changes wird der Vorgänger via `clearTimeout` verworfen.
- `runLint(view)` läuft asynchron: sammelt Ranges für Regeln 1–3 sofort aus dem Dokument, anschließend einen einzigen IPC-Aufruf `api.resolveWikiTargets(filePath, basenames)` mit allen Wiki-Link-Basenames des Dokuments. Antwort-Status entscheidet, ob Regel 4 in diesem Lauf greift (`ready`) oder unterdrückt wird (`indexing`/`unavailable`).
- **Stale-Check** vor dem Dispatch: wenn die Dokument-Länge zwischen Start des Lauf und Eintreffen des IPC-Resultats verändert wurde, wird das Ergebnis verworfen — ein neuer Lauf läuft bereits.
- `lintUpdateListener` (CodeMirror `EditorView.updateListener`) triggert `scheduleLint` bei jedem `docChanged`.

**Hover-Tooltip** in `src/renderer/renderer.js`:

- `lintHoverTooltip` als CodeMirror-`hoverTooltip`-Extension. Bei Hover wird im `lintField` nach einer überlappenden Decoration gesucht (`decoSet.between(pos-1, pos+1)`); aus dem `data-lint-rule`-Attribut wird die Regel-ID abgeleitet.
- `buildLintTooltipDom(ruleId, target)` baut den DOM-Inhalt via `textContent` (kein HTML-Injection-Risiko). Für `brokenWikiLink` wird der Platzhalter `{target}` im Tooltip-Text durch den bereinigten Wiki-Link-Basename ersetzt.

**Einbindung in `createEditorState`** in `src/renderer/renderer.js`:

- Drei neue Extensions im State: `lintField`, `lintUpdateListener`, `lintHoverTooltip`. Position nach dem `keymap`-Block, vor `drawSelection`.

**Backlinks-Modul-Erweiterung** in `src/main/backlinks.js`:

- Neue exportierte Funktion `existingWikiTargets(filePath, basenames)`. Sie ruft **nicht** `ensureIndex` auf, sondern nutzt nur einen bereits vorhandenen Index (refCount und Soft-Timer bleiben unberührt). Antwort enthält Status (`ready`/`indexing`/`unavailable`) und das Set der gefundenen Basenames. Damit greift Regel 4 nur dann, wenn der Index ohnehin für das Backlinks-Panel der Pane aktiv ist.

**IPC-Endpunkt** in `src/main/main.js`:

- `linter:resolveWikiTargets` als `ipcMain.handle`, leitet auf `backlinks.existingWikiTargets` durch.

**Preload-Bridge** in `src/main/preload.js`:

- `resolveWikiTargets(filePath, basenames)` mit Batch-Antwort.

**CSS** in `src/renderer/styles.css`:

- Neue Variablen `--linter-warn` (Light: `#c97a00`, Dark: `#e8a544`).
- `.cm-editor .cm-linter-mark` setzt `text-decoration: underline wavy var(--linter-warn)` mit `text-decoration-skip-ink: none` und kleinem `text-underline-offset` für saubere Wellenform.
- `.cm-editor .cm-tooltip` mit theme-konformem Hintergrund (`--bg-alt`), Border (`--border-strong`) und Schatten (`--shadow`). **Wichtig**: Diese Anpassung wurde nach dem ersten Test ergänzt, weil der CodeMirror-Default-Tooltip-Hintergrund im Dark-Theme zu hell war und der Text dadurch kaum lesbar.
- `.cm-linter-tooltip`, `.cm-linter-tooltip-title` (Warn-Farbe für Hervorhebung), `.cm-linter-tooltip-desc`.

**i18n** in allen fünf Sprachen, je acht Keys:

- `linter.bareUrl.short`, `linter.bareUrl.tooltip`
- `linter.emptyLinkText.short`, `linter.emptyLinkText.tooltip`
- `linter.missingAltText.short`, `linter.missingAltText.tooltip`
- `linter.brokenWikiLink.short`, `linter.brokenWikiLink.tooltip` (mit Platzhalter `{target}`)

**Bewusst nicht in 4T-0020:**

- Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes folgen im Sammeltask am Epic-Ende (mit der dort vorgesehenen Tab-/Gruppen-Restrukturierung).
- Statusbar-Anzeige der Anzahl der Hinweise, Linter-Panel, Regel-Ein-/Ausschalten, Quick-Fix-Aktionen — alles nicht in 0.9.0.
- Inkrementelles Update der Decorations bei Doc-Änderungen — Aufwand-Nutzen-Verhältnis spricht dagegen bei nur vier Regeln und Debounce.
- Eigener Index-Aufbau im Linter (ohne offenes Backlinks-Panel) — würde Refcount- und Soft-Timer-Modell verkomplizieren; akzeptiert wird, dass Regel 4 nur bei aktivem Backlinks-Index greift.
- Akzeptiert wird ein potentielles Falsch-Positiv: Wenn das Wiki-Link-Ziel real in Ebene 3 oder tiefer liegt (außerhalb des 2-Ebenen-Suchraums aus 3E-0002), markiert der Linter `broken-wiki-link`. Der Tooltip nennt die Tiefenbegrenzung explizit, sodass der Hinweis als „im Suchraum nicht gefunden" lesbar bleibt.
