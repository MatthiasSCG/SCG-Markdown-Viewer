# 4T-0027 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.9.0

**Status**: In Arbeit
**Epic**: [3E-0003 — Editor-UX und -Komfort](3E-0003-editor-ux-und-komfort.md)
**Zielversion**: 0.9.0

## Warum

Abschluss-Task für 0.9.0. Die fünf Umsetzungs-Tasks 4T-0016 bis 4T-0020 sind durch; jetzt müssen Hilfe-Dialog, CHANGELOG und Release-Notes auf den neuen Stand gebracht, das Tag gesetzt und das GitHub-Release angelegt werden. Konsequent zum Release-Prozess aus der projekt-lokalen `CLAUDE.md` und zu den Vorbildern 4T-0010 (für 0.6.0) und 4T-0026 (für 0.8.0).

Zusätzlich wird in diesem Sammeltask die im Epic dokumentierte **Hilfe-Dialog-Restrukturierung** umgesetzt: zwei Tabs (Funktionen / Tastenkürzel) und gruppierte Funktionen nach Oberbegriffen.

## Lösungsansatz

### Hilfe-Dialog-Restrukturierung

Bisher rendert der Hilfe-Dialog Funktionen und Tastenkürzel untereinander auf einer einzigen Seite. Mit jedem Epic wächst die Liste — bei 0.9.0 sind die Funktionen über 25 Einträge, der Dialog wird länger als ein Bildschirm.

**Struktur ab 0.9.0:**

- **Zwei Reiter** im Modal: `Funktionen` und `Tastenkürzel`. Beim Öffnen startet der Dialog auf `Funktionen`. Tab-Wechsel persistiert nicht (jede neue Öffnung startet wieder auf `Funktionen`).
- **Funktionen-Tab** mit fünf Gruppen-Überschriften:
  1. **Datei und Sitzung** — `openFiles`, `newTab`, `save`, `autoSave`, `autoReload`, `restoreSession`, `windowState`
  2. **Bearbeitung** — `editMode`, `tabIndent` (neu), `search`, `searchReplace`, `linter` (neu)
  3. **Ansicht** — `viewModes`, `sourceToggles`, `foldGutter`, `zoom` (neu), `settings` (neu), `focusMode` (neu), `typewriterScroll` (neu)
  4. **Navigation** — `tabs`, `multiWindow`, `outline`, `backlinks`, `anchorLinks`, `links`
  5. **Allgemein** — `theme`, `languages`, `menuBar`
- **Tastenkürzel-Tab** behält die einzige Tabelle bei (vorerst keine Untergliederung — die kompakte Form bleibt übersichtlich).
- **Renderer-Datenmodell**: `HELP_FEATURES` wechselt von einer flachen Liste zu einer Struktur mit Gruppen: `[{ groupKey, features: [...] }]`. `HELP_SHORTCUTS` bleibt flach.
- **HTML**: Tab-Leiste oben im Modal, zwei Panels darunter (eines pro Tab). Aktiver Tab über `aria-selected` und CSS-Klasse markiert.
- **CSS**: schlanke Tab-Leiste, Aktiv-Indikator als untere Border. Keep-it-simple, kein eigenes Framework.

### Hilfe-Dialog-Inhalte für 0.9.0

**Neue Funktionen** (Einträge in den Gruppen):

- `help.feature.tabIndent` (4T-0016) — Tab/Shift+Tab rückt Listenelemente ein bzw. aus
- `help.feature.zoom` (4T-0017) — Inhalt pro Tab unabhängig zoomen
- `help.feature.settings` (4T-0018) — Einstellungen-Dialog für Schriftart und -größe
- `help.feature.focusMode` (4T-0019) — UI-Chrome ausblenden für ablenkungsfreies Schreiben
- `help.feature.typewriterScroll` (4T-0019) — Cursor-Zeile vertikal zentriert
- `help.feature.linter` (4T-0020) — Inline-Hinweise zu typischen Markdown-Mängeln

**Neue Tastenkürzel:**

- `Strg + +` / `Strg + -` / `Strg + 0` — Zoom (4T-0017)
- `Strg + Mausrad` — Zoom per Mausrad (4T-0017)
- `Strg + ,` — Einstellungen öffnen (4T-0018)
- `Strg + Umschalt + F` — Fokus-Modus (4T-0019)

i18n-Keys neu pro Sprache: 6 neue Feature-Keys, 4 neue Shortcut-Keys, 5 Gruppen-Keys, 2 Tab-Keys (`help.tabFeatures`, `help.tabShortcuts`). Insgesamt 17 Keys pro Sprache, also 85 Keys über alle fünf Sprachen.

### CHANGELOG.md

Neuer Abschnitt `## [0.9.0] - JJJJ-MM-TT — Editor-UX und -Komfort` am Anfang des CHANGELOG. Verweis auf Epic 3E-0003 im Untertitel-Absatz.

Subsektionen:

- **Neu**:
  - Tab/Shift+Tab rückt Markdown-Listen ein und aus (4T-0016)
  - Zoom pro Tab über `Strg + +/-/0` und `Strg + Mausrad`, Statusbar-Indikator (4T-0017)
  - Einstellungen-Dialog mit konfigurierbarer Schriftart und -größe für Editor und Render-Pane (4T-0018)
  - Fokus-Modus blendet UI-Chrome aus (`Strg + Umschalt + F`); Typewriter-Scroll hält den Cursor vertikal zentriert (4T-0019)
  - Markdown-Linter-Light mit vier Regeln (bare URLs, leere Link-Texte, fehlende Alt-Texte, kaputte Wiki-Links) als Inline-Hinweise im Editor (4T-0020)
  - Bearbeiten-Toggle jetzt auch im Ansicht-Menü erreichbar (4T-0019, Test-Feedback)
  - Hilfe-Dialog mit zwei Tabs und gruppierten Funktionen (4T-0027)
- **Geändert**:
  - Editor- und Render-Pane nutzen jetzt CSS-Variablen `--editor-font-*` und `--render-font-*` (vorher fix). UI-Elemente bleiben unverändert.
  - Standard-Tab-Verhalten im Editor außerhalb von Listen ist unverändert.
- **Behoben**:
  - (kein Bug-Fix in 0.9.0)
- **i18n**: ca. 35 neue Keys über alle fünf Sprachen

### Release-Notes

Datei `dist/release-notes-0.9.0.md` aus `docs/release-notes-template.md` ableiten (gitignored):

- **Untertitel**: ein Satz, was 0.9.0 besonders macht (Vorschlag: „Editor-UX und -Komfort: Listen-Indent, Zoom, Schriftart, Fokus-Modus und Markdown-Linter").
- **Download**: Tabelle mit Setup-EXE und Portable-EXE.
- **Was ist neu seit v0.8.0**: fünf Hauptsektionen (Listen-Indent, Zoom, Schriftart, Fokus-Modus, Linter) plus Hilfe-Dialog-Umbau und kleinere UX-Anpassungen.
- **System-Anforderungen**: unverändert.
- **Hinweise**: SmartScreen-Warnung, keine Migrations-Schritte. Hinweis, dass der Markdown-Linter Regel 4 (broken Wiki-Links) nur greift, wenn das Backlinks-Panel der Pane geöffnet ist (Index muss aktiv sein).
- **Link auf CHANGELOG.md** am Ende.

Stil und Tonalität wie bei den bisherigen Release-Notes.

### Version-Bump

`package.json` zeigt bereits 0.9.0 (gemäß Konvention seit Entwicklungsbeginn der Version). Kein Code-Bump nötig.

### Build und GitHub-Release

Gemäß projekt-lokaler `CLAUDE.md`:

1. `npm run build` — EXEs erzeugen, `postbuild`-Hook verschiebt sie nach `releases/`.
2. Commit des finalen Doku-Stands, push.
3. `git tag v0.9.0 <commit-sha>` auf dem Doku-Commit.
4. `git push origin v0.9.0`.
5. `gh release create v0.9.0 --title "v0.9.0 — Editor-UX und -Komfort" --notes-file dist/release-notes-0.9.0.md --latest "releases/SCG Markdown-0.9.0-Setup.exe" "releases/SCG Markdown-0.9.0-Portable.exe"`.

### Status-Updates

- 4T-0016 bis 4T-0020 sind bereits auf `Erledigt`.
- 4T-0027 nach Release-Erfolg auf `Erledigt`.
- 3E-0003 nach Release-Erfolg auf `Erledigt`.

## Akzeptanzkriterien

- Hilfe-Dialog zeigt zwei Reiter `Funktionen` und `Tastenkürzel`. Beim Öffnen ist `Funktionen` aktiv. Tab-Wechsel funktioniert per Klick und Tastatur (Enter / Leertaste auf dem fokussierten Tab).
- Funktionen-Tab zeigt fünf Gruppen-Überschriften mit den jeweiligen Features darunter, in allen fünf Sprachen.
- Tastenkürzel-Tabelle enthält die vier neuen Bindings (Zoom-Tasten, `Strg + ,`, `Strg + Umschalt + F`).
- `CHANGELOG.md` hat einen vollständigen 0.9.0-Eintrag mit Datum, Untertitel und Verweis auf 3E-0003.
- `dist/release-notes-0.9.0.md` existiert, folgt der Template-Struktur, auf Deutsch mit Umlauten.
- EXEs liegen in `releases/`.
- Git-Tag `v0.9.0` ist gepusht.
- GitHub-Release `v0.9.0` ist erstellt, als `--latest` markiert, mit beiden EXEs als Assets.
- Auf der GitHub-Repo-Seite zeigt „Releases" die neue Version als „Latest".

## Bezug zu Dateien

- `CHANGELOG.md`
- neu: `dist/release-notes-0.9.0.md` (gitignored, taucht nicht im Repo auf)
- `src/renderer/index.html` (Hilfe-Modal-Markup um Tabs erweitern)
- `src/renderer/renderer.js` (Hilfe-Dialog-Datenmodell und Render-Logik)
- `src/renderer/styles.css` (Tab-Leiste und Gruppen-Headings)
- `src/i18n/{de,en,fr,es,it}.json` (neue Hilfe-Keys)
- `package.json` (bereits 0.9.0, nur Verifikation)

## Lösung
