# Projektmanagement

Lokale Aufgabenverfolgung für den Markdown-Viewer. Epics und Tasks liegen als Markdown-Dateien im Unterordner `Aufgaben/`. Hintergrund zur Wahl „lokal statt GitHub-Issues" steht in der projekt-lokalen [CLAUDE.md](../CLAUDE.md#aufgabenverfolgung-lokales-pm-statt-github-issues).

## ID-Konventionen

- **Epic**: `3E-NNNN-<slug>.md` (z.B. `3E-0001-edit-modus-und-menue.md`)
- **Task**: `4T-NNNN-<slug>.md` (z.B. `4T-0001-native-menueleiste.md`)
- Nummerierung sequenziell, beginnend bei `0001`, je Typ getrennt
- `<slug>`: ASCII-Kleinbuchstaben, Wörter durch Bindestriche getrennt, Umlaute ausgeschrieben (`ae`, `oe`, `ue`). Diese ASCII-Beschränkung gilt **ausschließlich für Dateinamen**, nicht für Inhalte. Inhalte folgen weiterhin der Umlaut-Regel.
- Ein Task kann zu mehreren Epics gehören. In diesem Fall im Frontmatter-Block alle Epics auflisten.

## Status-Werte

- `Offen` — angelegt, noch nicht begonnen
- `In Umsetzung` — wird gerade bearbeitet
- `Wartet auf Test` — Umsetzung abgeschlossen, Nutzer prüft manuell
- `Erledigt` — vom Nutzer bestätigt und geschlossen
- `Verworfen` — nicht weiterverfolgt, mit Begründung im Dokument

## Struktur einer Epic-Datei

```
# 3E-NNNN — Titel

**Status**: Offen | In Umsetzung | Wartet auf Test | Erledigt | Verworfen
**Zielversion**: x.y.z

## Ziel
## Warum
## Umfang und Abgrenzung
## Untergeordnete Tasks
## Architekturentscheidungen
## Reihenfolge der Umsetzung
## Bezug zu Dateien
## Offene Punkte / Risiken
```

## Struktur einer Task-Datei

```
# 4T-NNNN — Titel

**Status**: Offen | In Umsetzung | Wartet auf Test | Erledigt | Verworfen
**Epic**: [3E-NNNN — Titel](3E-NNNN-<slug>.md)
**Zielversion**: x.y.z

## Warum
## Lösungsansatz
## Akzeptanzkriterien
## Bezug zu Dateien
## Lösung
```

Der Abschnitt **Lösung** bleibt initial leer und wird nach Abschluss der Umsetzung gefüllt — als historische Spur, was tatsächlich umgesetzt wurde (im Gegensatz zum Lösungsansatz, der vor der Umsetzung steht).

## Workflow

Gemäß `~/.claude/project-standards.md`, Abschnitt B:

1. Plan im Task/Epic dokumentieren
2. Freigabe durch den Nutzer einholen
3. Umsetzung
4. Test-Aufforderung an den Nutzer mit konkreter Anleitung
5. Manueller Test durch den Nutzer
6. Commit und Push **nur nach expliziter Freigabe**
7. Übergeordnetes Epic aktualisieren (Checkbox abhaken, ggf. Schließung vorschlagen)
8. Task-Status auf `Erledigt` setzen **nur nach expliziter Freigabe**

Commit, Push und Schließung erfolgen niemals automatisch.

## Bidirektionale Verknüpfung

- Tasks verlinken auf ihr Epic im Frontmatter-Block.
- Epics verlinken alle untergeordneten Tasks im Abschnitt „Untergeordnete Tasks".
- Code-Änderungen verweisen in Commit-Messages auf die zugehörige Task-ID (z.B. `4T-0003: CodeMirror einbauen`).
- Der `CHANGELOG.md` verweist pro Version auf die Epic-ID (z.B. `[3E-0001]`).
