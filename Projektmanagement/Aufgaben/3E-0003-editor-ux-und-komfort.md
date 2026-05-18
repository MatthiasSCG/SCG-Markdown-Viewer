# 3E-0003 — Editor-UX und -Komfort

**Status**: Offen
**Zielversion**: 0.9.0
**Vorgängerversion**: 0.8.0

## Ziel

Die App bekommt ein Bündel von kleineren, aber im Alltag sichtbaren Verbesserungen am Schreib- und Leseerlebnis:

- **Tab und Shift-Tab in Listen** rücken Listenelemente eine Ebene ein bzw. aus, wie es Markdown-Editoren typischerweise tun.
- **Zoom** für Render- und Editor-Pane per `Strg + +`, `Strg + -`, `Strg + 0`, vergleichbar mit Browsern und IDEs.
- **Konfigurierbare Schriftart und -größe** für Editor und Render-Pane getrennt, persistiert pro Fenster bzw. global.
- **Fokus-Modus**: Tabs und Statusbar ausblenden, optional Vollbild, optional Typewriter-Scroll (Cursor bleibt vertikal zentriert).
- **Markdown-Linter-Light**: dezente Inline-Hinweise auf typische Probleme (bare URLs, leere Links, fehlende Alt-Texte, kaputte Wiki-Links).

Alle fünf Themen sind kleinere Einzel-Features; sie werden in einem Epic gebündelt, weil sie dasselbe Ziel haben: das tägliche Arbeiten in der App angenehmer und qualitativ besser machen.

## Warum

- Tab-Indent in Listen ist Standard in jedem ernstzunehmenden Markdown-Editor und fehlt aktuell schmerzlich.
- Zoom fehlt komplett. Bei wechselnden Monitoren oder im Präsentationsmodus ist das eine merkliche Lücke.
- Schriftart-/größen-Konfiguration ist eine wiederkehrende Anpassung; ohne sie sind alle Nutzer auf den Default angewiesen.
- Fokus-Modus adressiert Schreib-Sessions, in denen UI-Chrome ablenkt.
- Linter-Light verbessert die Qualität der erzeugten Markdown-Dateien proaktiv, ohne aufdringlich zu sein.

## Umfang und Abgrenzung

**Im Umfang:**

- Tab und Shift-Tab in `- `, `* `, `+ `, `1. `, `- [ ] `-Listen für Ein-/Ausrücken
- Auto-Continue von Listen bleibt **nicht** Teil dieses Epics, kann später ergänzt werden (siehe Offene Punkte)
- Zoom-Steuerung per `Strg + +/-/0`, getrennt für Render- und Editor-Pane (oder gemeinsam, zu entscheiden in 4T-0017)
- Settings-Dialog (neu) als zentraler Ort für Schriftart, Schriftgröße und Zoom-Verhalten, da es bisher keinen gab
- Fokus-Modus als Toggle (Tastenkürzel-Vorschlag `F11` oder `Strg+Umschalt+F`), inklusive optionalem Typewriter-Scroll
- Linter-Light mit definiertem Regelset: bare URLs (`http(s)://…` ohne Markdown-Syntax), leere Link-Texte (`[](url)`), fehlende Alt-Texte (`![](pfad)`), kaputte Wiki-Links (Ziel nicht im Suchraum aus 3E-0002 vorhanden)
- Inline-Marker im Editor (z.B. Wellen-Unterstreichung), keine modale Anzeige
- Hilfe-Dialog um die neuen Features und Tastenkürzel erweitern
- i18n-Keys in allen fünf Sprachen
- CHANGELOG-Eintrag, Release-Notes, Version-Bump 0.8.0 → 0.9.0

**Nicht im Umfang (für 0.9.0):**

- Format-Hotkeys (`Strg+B`, `Strg+I`, `Strg+K`) — eigenes Thema
- Auto-Continue von Listen bei Enter — eigenes Thema, hat mit Tab-Indent gemeinsame Mechanik, wird aber bewusst getrennt
- Bilder per Paste/Drop einfügen — eigenes Thema
- Rechtschreibprüfung — eigenes Thema
- Linter-Panel mit Gesamtliste aller Verstöße — nur Inline-Hinweise, kein Panel
- Linter-Regeln über die im Umfang genannten hinaus
- Konfigurierbare Linter-Regeln (Ein-/Ausschalten einzelner Regeln)
- Snippets oder Templates für neue Dokumente

## Untergeordnete Tasks

- [x] [4T-0016 — Tab und Shift-Tab in Listen für Ein-/Ausrücken](4T-0016-tab-indent-listen.md)
- [x] [4T-0017 — Zoom für Editor und Render-Pane (Strg + +/-/0)](4T-0017-zoom-editor-render.md)
- [x] [4T-0018 — Konfigurierbare Schriftart und -größe (Settings-Dialog)](4T-0018-schriftart-konfigurierbar.md)
- [x] [4T-0019 — Fokus-Modus mit optionalem Typewriter-Scroll](4T-0019-fokus-modus.md)
- [x] [4T-0020 — Markdown-Linter-Light (Inline-Hinweise)](4T-0020-linter-light.md)
- [ ] [4T-0027 — Hilfe-Dialog, CHANGELOG, Release-Notes, Tag und GitHub-Release für 0.9.0](4T-0027-changelog-release-090.md)

## Architekturentscheidungen

- **Settings-Dialog wird in 4T-0018 neu eingeführt** und ist damit ab 0.9.0 der Ort für Konfigurationen, die nicht als einfache Menü-Toggles passen. Strukturell vorgesehen als eigenes Fenster oder modal mit mehreren Sektionen (initial: Schriftart, Schriftgröße, Zoom-Verhalten, ggf. Linter-Optionen). Erweiterbar für spätere Releases.
- **Zoom und Schriftgröße sind unterschiedliche Konzepte**. Schriftgröße ist die persistente Default-Einstellung, Zoom ist ein temporärer Faktor obendrauf. `Strg + 0` setzt den Zoom auf 1, ändert aber nicht die Default-Schriftgröße. **Zoom wird pro Tab gehalten** (nicht pro Fenster) und überlebt das Schließen des Fensters bzw. die Sitzungswiederherstellung nicht; jeder Tab startet mit Zoom 1.0. Schriftgröße ist global und persistent. Zoom-Steuerung über `Strg + +/-/0` und `Strg + Mausrad` mit jeweils 10 %-Schritten.
- **Zoom wandert mit dem Tab beim Fenster-Transfer.** Verschiebt oder kopiert der Nutzer einen Tab via Kontextmenü in ein anderes Fenster ([4T-0012](4T-0012-tab-in-bestehendes-fenster.md)), wird der Zoom-Faktor mit übergeben, analog zu View-Modus und Edit-Mode.
- **Render-Pane und Editor-Pane getrennt einstellbar**. Begründung: Schriftarten und -größen haben in den beiden Panes unterschiedliche Anforderungen (Monospace vs. Proportional, Lesegröße vs. Code-Größe). Default: Editor Monospace, Render Proportional, beide ca. 14 px. Der Zoom-Faktor gilt dagegen gemeinsam für beide Panes eines Tabs (ein Multiplikator, nicht zwei).
- **Tab/Shift-Tab in Listen nutzt CodeMirror-Erweiterung statt Default-Behavior**. Begründung: Default in CodeMirror wäre Einfügen eines Tab-Zeichens; das muss bei Listen-Kontext-Erkennung überschrieben werden, ohne das Default-Verhalten außerhalb von Listen zu kippen.
- **Linter-Light läuft synchron im Renderer**, nicht im Main-Prozess. Begründung: nur dokumentenintern, keine Datei-übergreifenden Lookups außer „existiert Wiki-Link-Ziel im Backlinks-Index" (was via bestehendem IPC abgefragt werden kann). Performance bei kurzen Dokumenten unkritisch.
- **Linter-Marker im Editor, nicht im Render-Pane**. Begründung: Linter-Hinweise gehören zum Schreibprozess. Im Render-Pane wären sie als Wellen-Unterstreichung optisch störend und für den reinen Leser irrelevant.
- **Fokus-Modus blendet Tabs und Statusbar aus, lässt Menüleiste sichtbar**. Begründung: Menüleiste über `Alt` bleibt erreichbar; Tabs und Statusbar sind die echten Ablenkungs-Elemente.

## Zusätzliche Anforderung für den Abschluss-Sammeltask: Hilfe-Dialog-Restrukturierung

Der bisherige Hilfe-Dialog rendert Funktionen und Tastenkürzel untereinander auf einer einzigen Seite. Mit jeder Version wächst die Liste, und der Dialog wird länger als ein Bildschirm. Im Abschluss-Sammeltask von 3E-0003 wird der Dialog daher strukturell überarbeitet:

- **Zwei Reiter (Tabs) im Modal**: einer für **Funktionen**, einer für **Tastenkürzel**. Standard-Tab beim Öffnen ist „Funktionen". Tab-Wechsel persistiert nicht, jedes Öffnen beginnt auf „Funktionen".
- **Gruppierung der Funktionen** nach sinnvollen Oberbegriffen. Konkret zu entscheiden im Sammeltask, Vorschlag als Startpunkt:
  - Datei und Sitzung (Öffnen, Speichern, Recent, Auto-Save, Sitzungswiederherstellung)
  - Bearbeitung (Tab-Indent in Listen, Suchen, Suchen und Ersetzen, Edit-Modus)
  - Ansicht (View-Modi, Zoom, Schriftart-Konfiguration, Code-Folding, Fokus-Modus)
  - Navigation (Outline, Backlinks, Anker-Links, Tab-Wechsel, Fenster-Transfer)
  - Allgemein (Sprache, Theme, Mehrfenster-Betrieb, Hilfe, Über)
- **Tastenkürzel-Tab** bleibt eine einzige Tabelle, optional zusätzlich nach denselben Gruppen sortiert (zu entscheiden im Sammeltask, je nachdem ob die Tabelle dann übersichtlicher oder unruhiger wirkt).
- **Renderer-Datenmodell**: `HELP_FEATURES` wird von einer flachen Liste auf eine Struktur mit Gruppen umgestellt (z.B. `[{ groupKey, features: [...] }]`). `HELP_SHORTCUTS` bleibt vorerst flach.
- **i18n**: neue Keys für Tab-Beschriftungen (`help.tabFeatures`, `help.tabShortcuts`) und für die Gruppen-Überschriften (`help.group.file`, `help.group.editing`, …). In allen fünf Sprachen.
- **CSS**: schlanke Tab-Leiste oben im Modal, Aktiv-Indikator. Keep-it-simple, kein eigenes Framework.

Diese Restrukturierung ist Teil des Abschluss-Sammeltasks für 3E-0003 und ersetzt für dieses Epic den Standard-Punkt „Hilfe-Dialog erweitern" aus der Sammeltask-Vorlage in `CLAUDE.md`. Wenn die Tab-Struktur sich bewährt, kann sie später in die generische Vorlage übernommen werden.

## Reihenfolge der Umsetzung

1. **4T-0016** Tab/Shift-Tab in Listen — klein, isoliert, ohne UI-Änderung. Schneller Einstieg ins Epic.
2. **4T-0017** Zoom — UI-Änderung minimal (keine sichtbaren Steuerelemente, nur Tastenkürzel), aber gute Grundlage für Größen-Diskussionen.
3. **4T-0018** Schriftart-Konfiguration mit Settings-Dialog — strukturell der größte Schritt, weil neuer Dialog. Davor sollten Zoom-Verhalten und Standardgrößen geklärt sein.
4. **4T-0019** Fokus-Modus — baut auf vorhandenem Layout auf, kleine Toggle-Logik.
5. **4T-0020** Linter-Light — abschließendes Feature, profitiert vom Backlinks-Index aus 0.8.0 (für „kaputte Wiki-Links"-Regel).
6. Hilfe-Dialog-Erweiterung, CHANGELOG, Release-Notes und Version-Bump als Sammeltask am Epic-Ende.

## Bezug zu Dateien

- `src/renderer/index.html` — Settings-Dialog-Markup, Fokus-Modus-Layout
- `src/renderer/renderer.js` — Tab-Indent-Extension, Zoom-Logik, Schriftart-Anwendung, Fokus-Toggle, Linter-Routine
- `src/renderer/styles.css` — Fokus-Modus-Styles, Settings-Dialog-Layout, Linter-Marker
- `src/main/main.js` — IPC für persistente Einstellungen via `electron-store`
- `src/main/preload.js` — neue IPC-Kanäle für Settings-Lesen/Schreiben
- `src/i18n/{de,en,fr,es,it}.json` — neue Keys für Settings-Dialog, Fokus-Modus, Linter-Meldungen, Hilfe-Erweiterungen
- `package.json` — Version 0.8.0 → 0.9.0, ggf. neue Dependencies (Linter-Hilfsbibliothek prüfen, ggf. eigene Implementierung)
- `CHANGELOG.md` — Eintrag für 0.9.0
- neu: `docs/release-notes-0.9.0.md` (gitignored)

## Offene Punkte / Risiken

- **Settings-Dialog als Modal oder eigenes Fenster**: in 4T-0018 zu entscheiden. Eigenes Fenster ist konsistenter mit Multi-Window-Architektur, Modal ist konventioneller.
- **Schriftart-Auswahl-Mechanik**: System-Fonts oder eine vordefinierte Liste? System-Fonts erfordern Electron-APIs oder Browser-CSS-Fallback-Ketten, vordefinierte Liste ist einfacher, aber weniger flexibel.
- **Zoom-Granularität**: Schrittweite (z.B. 10 % oder 25 %), Min/Max-Limits. Konkret in 4T-0017.
- **Auto-Continue von Listen** ist bewusst ausgeklammert, aber die Tab/Shift-Tab-Logik aus 4T-0016 schafft die mentale Grundlage. Auto-Continue als möglicher Folge-Task in einem späteren Release.
- **Linter-Performance bei langen Dokumenten**: Vollscan bei jeder Änderung wäre teuer. Debouncing und ggf. inkrementelle Aktualisierung über CodeMirror-Decorations einplanen. Konkret in 4T-0020.
- **Linter-Regel „kaputte Wiki-Links"** setzt den Backlinks-Index aus 3E-0002 voraus. Wenn 3E-0002 nicht ausgeliefert ist, fällt diese Regel weg. Konsequenz: 3E-0003 nicht vor 3E-0002 releasen.
