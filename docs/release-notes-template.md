<!--
Vorlage für GitHub-Release-Notes.

Verwendung:
1. Diese Datei nach z.B. dist/release-notes-{{VERSION}}.md kopieren
   (dist/ ist gitignored, also ist die Arbeitsdatei nicht versionsbehaftet).
2. Alle Platzhalter in doppelten geschweiften Klammern {{...}} ersetzen.
3. Sektionen unter "Was ist neu" passend zur Version umbauen — Reihenfolge,
   Anzahl und Benennung der Unter-Headings sind variabel. Bewährte Headings:
   "{{HAUPTFEATURE}}", "Verbessert", "Geändert", "Behoben", "Bekannte
   Einschränkungen".
4. Im Aufruf von `gh release create` per --notes-file angeben (siehe CLAUDE.md
   im Projekt-Root).
5. Diese Vorlagendatei selbst bleibt unverändert.

Stil:
- Deutsch, Umlaute (ä/ö/ü/ß) konsequent.
- Keine Gedankenstriche als Satzgliederung in vollständigen Fließtextsätzen
  (Komma stattdessen).
- Bullet-Listen für Detail-Aufzählungen; Sub-Bullets nur, wenn echte Hierarchie.
- Erste Zeile nach dem Titel: ein Satz, der die Version charakterisiert.
- Im "Was ist neu"-Block immer "seit v{{VORHERIGE_VERSION}}" formulieren.
-->

{{EIN SATZ, der die Version charakterisiert. Beispiel: „Fünfte Version mit echtem Multi-Window-Betrieb: Tabs lassen sich per Rechtsklick in ein neues Fenster auslagern und auf einen anderen Monitor verschieben."}}

## Download

| Variante | Datei | Beschreibung |
|---|---|---|
| **Installer** | `Markdown Viewer-{{VERSION}}-Setup.exe` | Setup-Assistent mit wählbarem Installationspfad, Start-Menü- und Desktop-Verknüpfung, optionaler Datei-Assoziation für `.md`/`.markdown`/`.mdown`/`.mkd` |
| **Portable** | `Markdown Viewer-{{VERSION}}-Portable.exe` | Einzelne EXE ohne Installation |

## Was ist neu seit v{{VORHERIGE_VERSION}}

### {{HAUPTFEATURE-ODER-THEMA}}

- **{{KURZ-TITEL}}**: {{beschreibender Satz mit konkreten Verhaltensänderungen}}.
- {{weitere Punkte}}

### Verbessert

- **{{KURZ-TITEL}}**: {{Beschreibung}}.

### Geändert

- **{{KURZ-TITEL}}**: {{Beschreibung, inkl. Migrations-/Kompatibilitätshinweis falls relevant}}.

### Behoben

- **{{KURZ-TITEL}}**: {{was war kaputt, wie ist es jetzt}}.

<!-- Optionale Sektion, nur wenn relevant:

### Bekannte Einschränkungen

- {{Punkte, die der Nutzer beim Test/Einsatz wissen sollte}}

-->

## System-Anforderungen

- Windows 11 (Windows 10 sollte auch funktionieren)
- Keine zusätzliche Laufzeitumgebung nötig

## Hinweise

- Die EXEs sind nicht code-signiert. Windows SmartScreen kann beim ersten Start einen Warnhinweis anzeigen („Mehr Informationen" → „Trotzdem ausführen").
- {{Migrations-Hinweis: was passiert mit bestehenden Sitzungen/Settings aus der Vorgängerversion. Bei reinen Bugfix-Releases kann dieser Punkt entfallen.}}

Vollständige Liste der Änderungen: siehe [CHANGELOG.md](https://github.com/MatthiasSCG/SCG-Markdown-Viewer/blob/main/CHANGELOG.md).
