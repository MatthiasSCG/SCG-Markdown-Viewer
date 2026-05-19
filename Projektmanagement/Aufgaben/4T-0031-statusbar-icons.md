# 4T-0031 — Statusbar-Buttons als Icons

**Status**: Offen (Konzept-Phase abgeschlossen, Umsetzung freigegeben)
**Epic**: [3E-0005 — Auto-Update, Theme-Umschalter und Statusbar-Icons](3E-0005-update-theme-statusbar-icons.md)
**Zielversion**: 0.11.0

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
