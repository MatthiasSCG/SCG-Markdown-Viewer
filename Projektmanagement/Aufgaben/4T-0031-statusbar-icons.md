# 4T-0031 — Statusbar-Buttons als Icons

**Status**: Erledigt
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0
**Release**: [v0.11.0](https://github.com/MatthiasSCG/SCG-Markdown/releases/tag/v0.11.0)

> **Konzept-Phase abgeschlossen.** Die Icon-Auswahl ist mit dem Nutzer abgestimmt (siehe Abschnitt „Finale Icon-Auswahl"). Die ursprüngliche Konditionalität ist damit aufgelöst, der Task wird umgesetzt.

## Finale Icon-Auswahl

Alle Icons aus dem Lucide-Set (MIT-Lizenz), als Inline-SVG einzubetten in [src/renderer/index.html](../../src/renderer/index.html). Quelle der SVGs: `lucide-static` aus dem [Lucide-Repository](https://github.com/lucide-icons/lucide), Pfad `icons/<name>.svg`. Keine NPM-Dependency, kein Runtime-CDN.

| Button | Heutige Beschriftung | Gewähltes Icon |
|---|---|---|
| `btn-outline` | Inhalt | `list-tree` |
| `btn-backlinks` | Backlinks | `link-2` |
| `btn-fold-gutter` | Gliederung | `chevrons-down-up` |
| `btn-numbers` | Nummern | `list-ordered` |
| `btn-wrap` | Umbruch | `wrap-text` |
| `view=source` | Quellcode | `code` |
| `view=split` | Geteilt | `columns-2` |
| `view=rendered` | Gerendert | `eye` |

## Warum

Die Statusbar unten links enthält heute acht Wort-Buttons:

- **Toggle-Buttons** (Gruppe `source-toggles`): Inhalt, Backlinks, Gliederung, Nummern, Umbruch
- **Ansichts-Buttons** (Segmented Control `view-toggle`): Quellcode, Geteilt, Gerendert

Bei schmalen Fenstern (kleinere Monitore, Splitscreen-Layouts) belegen die acht Wort-Buttons die ganze Breite unten links und drücken die rechte Statusbar-Sektion ab. Icons sind kompakter und in vielen Editoren etabliert, sofern sie eindeutig erkennbar sind. Bereits vorhanden ist der Icon-Stil bei `btn-edit` ([src/renderer/index.html:106](../../src/renderer/index.html#L106)) als Vorbild.

## Lösungsansatz

### Phase 1: Konzept und Icon-Auswahl

Vor jeder Code-Änderung Icon-Vorschläge erarbeiten und mit dem Nutzer abstimmen. Pro Button **drei Alternativen** in einem visuellen Mockup vorlegen: [Projektmanagement/Mockups/4T-0031-icon-mockup.html](../Mockups/4T-0031-icon-mockup.html). Die Datei ist eigenständig, lädt die Icons aus dem Lucide-CDN, läuft per Doppelklick im Browser, und enthält:

- Pro Button drei Varianten nebeneinander, jeweils im aktiven und inaktiven Zustand.
- Eine zusammenhängende Vorschau-Reihe pro Variante, die das Gesamtbild der Statusbar zeigt.
- Hell- und Dunkel-Theme-Umschalter, damit die Icons in beiden App-Themes geprüft werden können.

Vorschläge basieren auf etablierten Icon-Sets mit kompatibler Lizenz, primär:

- **Lucide** (MIT-Lizenz) — Nachfolger von Feather, große Auswahl, klare Strichstärken.
- **Feather** (MIT-Lizenz) — minimalistisch, sehr ähnlich zum bestehenden Edit-Icon.
- **Tabler Icons** (MIT-Lizenz) — falls Lucide oder Feather keinen passenden Treffer haben.

Keine Library-Dependency in `node_modules`. Stattdessen werden die ausgewählten SVGs **inline** in `index.html` eingebettet, gleicher Stil wie das bestehende Edit-Icon (`stroke="currentColor"`, `stroke-width="2"`, `viewBox="0 0 24 24"`).

**Vorschlags-Stand (zur Konzept-Diskussion mit dem Nutzer, visuell im Mockup):**

| Button | Heutige Beschriftung | Vorschlag 1 | Vorschlag 2 | Vorschlag 3 |
|---|---|---|---|---|
| `btn-outline` | Inhalt | `list-tree` | `align-left` | `text-quote` |
| `btn-backlinks` | Backlinks | `link-2` | `corner-up-left` | `git-branch` |
| `btn-fold-gutter` | Gliederung | `fold-vertical` | `chevrons-down-up` | `unfold-vertical` |
| `btn-numbers` | Nummern | `list-ordered` | `hash` | `whole-word` |
| `btn-wrap` | Umbruch | `wrap-text` | `corner-down-left` | `pilcrow` |
| `view=source` | Quellcode | `code` | `panel-left` | `file-code-2` |
| `view=split` | Geteilt | `columns-2` | `panels-right-bottom` | `square-split-horizontal` |
| `view=rendered` | Gerendert | `eye` | `panel-right` | `file-text` |

Die heikelste Stelle ist die Segmented Control mit drei Ansichten. Hier müssen die drei Icons als zusammengehörige Gruppe wirken und die räumliche Logik (links / mitte / rechts) andeuten. Empfehlung im Vorschlag oben: `panel-left` / `panels-right-left` / `panel-right` — symmetrische Variante, intuitiv lesbar.

**Konzept-Freigabe**: Nutzer wählt pro Button eine Variante aus, lehnt ab, oder verlangt Nachschlag. Erst nach Freigabe **aller acht** Buttons geht es zu Phase 2.

### Phase 2: Umsetzung (nur nach Freigabe)

- **HTML**: In [src/renderer/index.html](../../src/renderer/index.html) die acht Button-Inhalte von Text auf Inline-SVG umstellen. Bestehende `data-i18n`-Attribute (die heute den Text setzen) entfernen, `data-i18n-title` bleibt (Tooltip).
- **i18n**: Die heutigen Labels (`outline.toggle`, `backlinks.toggle`, `source.foldGutter`, `source.numbers`, `source.wrap`, `view.source`, `view.split`, `view.rendered`) werden zu Tooltip-Texten. Die `…Title`-Keys waren ohnehin schon Tooltips; bei Bedarf konsolidieren.
- **CSS**: In [src/renderer/styles.css](../../src/renderer/styles.css) Regeln für `.btn-toggle svg` und `.view-btn svg` ergänzen, Maße 14×14, Padding angepasst (heute basieren die Buttons auf Text-Breite, künftig auf Icon-Breite plus symmetrischem Padding). Active-State-Visualisierung über Hintergrund und Farbe bleibt erhalten.
- **Accessibility**: `aria-label` an jedem Icon-Button mit dem heutigen Text-Label, damit Screenreader weiter sinnvoll vorlesen. `title`-Tooltip ebenfalls.
- **Layout**: Statusbar-Höhe bleibt unverändert. Buttons werden in der Summe schmaler.

### i18n und Hilfe-Dialog

Die Hilfe-Dialog-Funktions-Einträge zur Statusbar (sofern vorhanden) müssen ergänzt werden, dass die Buttons jetzt Icons sind und Tooltips zeigen. Aufgabe des Abschluss-Sammeltasks.

## Akzeptanzkriterien

**Wenn Konzept-Phase freigegeben:**

- Alle acht Statusbar-Buttons unten links sind Icon-Buttons mit Inline-SVG.
- Jedes Icon ist visuell eindeutig auf Anhieb erkennbar (Nutzer-Urteil im Test).
- Jeder Button hat ein `aria-label` und einen `title`-Tooltip in allen fünf Sprachen.
- Aktiver und inaktiver Zustand bleiben visuell unterscheidbar (Hintergrund, Farbe, ggf. Strich-Stärke).
- Statusbar-Höhe ist unverändert; die Buttons-Sektion ist in Summe schmaler als zuvor.
- Kein zusätzliches Icon-Library-Paket in `node_modules`.
- Keyboard-Bedienung (Tab-Reihenfolge, Enter, Space) unverändert.

**Hinweis:** Die ursprünglich vorgesehene Ablehnungs-Option der Konzept-Phase ist durch die finale Auswahl (siehe oben) aufgelöst. Sollte sich während der Umsetzung ein einzelnes Icon im Live-Test als nicht erkennbar erweisen, wird es punktuell durch eine Variante 2 oder 3 aus dem Mockup ersetzt.

## Bezug zu Dateien

- `src/renderer/index.html` — Button-Texte werden auf Inline-SVG umgestellt.
- `src/renderer/styles.css` — Icon-Styling und Active-States für `.btn-toggle` und `.view-btn`.
- `src/i18n/{de,en,fr,es,it}.json` — heutige Labels werden zu Tooltip-Texten, bestehende `…Title`-Keys ggf. konsolidieren.

## Lösung

Umgesetzt am 2026-05-19. Manueller Test durch den Nutzer am selben Tag bestanden (Portable-EXE `SCG Markdown-0.11.0-Portable.exe`, alle neun im Task definierten Punkte plus die vier Sidebar-Kombinationen nach Bugfix).

### Begleitfund während des Tests

Beim manuellen Test fiel ein Pre-existing-Bug aus 4T-0014/4T-0015 auf: Die Sidebar-Sektionen für Inhaltsverzeichnis und Backlinks ließen sich nicht unabhängig ein-/ausblenden, sobald eine von beiden sichtbar war, zeigten sich beide. Ursache: CSS-Spezifitäts-Kollision (`.sidebar-section { display: flex; }` überschrieb den User-Agent-`[hidden]`-Default). Korrigiert in einem separaten Bugfix-Commit (`8f7da17`) vor dem eigentlichen 4T-0031-Commit, damit der Fix dem ursprünglichen Verursacher zuordenbar bleibt.

### Komponenten-Stand

- **Icon-Quelle**: `lucide-static` v1.16.0, ISC-Lizenz. Die acht ausgewählten SVGs wurden einmalig per `Invoke-WebRequest` aus `https://unpkg.com/lucide-static@latest/icons/<name>.svg` heruntergeladen, anschließend kompaktiert und inline in [src/renderer/index.html](../../src/renderer/index.html) eingebettet. **Keine NPM-Dependency**, **kein Runtime-CDN**, keine Netzwerk-Last in der App.
- **Index-HTML** ([src/renderer/index.html](../../src/renderer/index.html)): Die acht Buttons in `statusbar-left` (`btn-outline`, `btn-backlinks`, `btn-fold-gutter`, `btn-numbers`, `btn-wrap`, `view=source`, `view=split`, `view=rendered`) tragen jetzt einen Inline-`<svg>` mit `viewBox="0 0 24 24"`, `width="14"`, `height="14"`, `stroke="currentColor"` und `stroke-width="2"`. Stil identisch zum bestehenden `btn-edit`-Muster.
- **Klassen-Modifier** `.btn-icon` an jedem der acht Buttons. Erlaubt eine gezielte CSS-Regel für die Icon-Variante, ohne den Layout-Stil der textbasierten `btn-toggle`/`view-btn`-Reste (z.B. Recent-Tab-Buttons) zu beeinflussen.
- **Tooltips** über bestehende `data-i18n-title`-Keys; die alten `data-i18n`-Attribute (die den Text-Inhalt setzten) wurden entfernt, weil keine sichtbare Beschriftung mehr nötig ist.
- **Screen-Reader-Labels** über neues `data-i18n-aria-label`-Attribut. Verarbeitet wird das in [src/renderer/i18n.js](../../src/renderer/i18n.js), das um eine zusätzliche `querySelectorAll('[data-i18n-aria-label]')`-Pass erweitert wurde. Falls die i18n-Initialisierung noch nicht gelaufen ist, bleibt der englische Fallback im `aria-label`-Attribut stehen (im HTML als statisches `aria-label="Outline"` etc. hinterlegt).
- **Styles** ([src/renderer/styles.css](../../src/renderer/styles.css)): Eine kombinierte Regel `.btn-toggle.btn-icon, .view-btn.btn-icon` setzt `width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center;`. SVG-Kinder werden auf `display: block` gesetzt, damit kein Baseline-Versatz entsteht.

### Icon-Mapping (final, aus dem Mockup-Konsens)

| Button | Lucide-Icon |
|---|---|
| `btn-outline` (Inhalt) | `list-tree` |
| `btn-backlinks` (Backlinks) | `link-2` |
| `btn-fold-gutter` (Gliederung) | `chevrons-down-up` |
| `btn-numbers` (Nummern) | `list-ordered` |
| `btn-wrap` (Umbruch) | `wrap-text` |
| `view=source` (Quellcode) | `code` |
| `view=split` (Geteilt) | `columns-2` |
| `view=rendered` (Gerendert) | `eye` |

### Auswirkungen

- Statusbar-Reihe links unten ist deutlich schmaler (acht Buttons à 28px statt textabhängig 60–90px). Auf schmalen Fenstern wirkt sich das spürbar aus, weil die rechte Statusbar-Sektion mehr Platz bekommt.
- Active-Markierung über den bestehenden `.active`-Mechanismus mit `var(--accent)`-Hintergrund und Akzent-Stroke des Icons (durch `currentColor`).
- Keyboard-Bedienung (Tab-Reihenfolge, Enter/Space) bleibt unverändert, weil die `<button>`-Elemente erhalten geblieben sind.

### Lizenz-Notiz für die Release-Pflege

Lucide steht unter ISC-Lizenz. Beim Sammeltask im Epic-Ende sollte ein Hinweis im README oder About-Dialog ergänzt werden, dass die Icons aus Lucide stammen (Best-Practice für Drittanbieter-Assets, auch wenn ISC keine Attribution-Pflicht hat).
