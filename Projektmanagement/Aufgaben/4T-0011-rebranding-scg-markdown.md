# 4T-0011 — Rebranding auf SCG Markdown

**Status**: Offen
**Epic**: [3E-0001 — Edit-Modus, Menüleiste und Layout-Reorganisation](3E-0001-edit-modus-und-menue.md)
**Zielversion**: 0.6.0

## Warum

Mit 0.6.0 entwickelt sich die App vom reinen Viewer zum schlanken Markdown-Editor. Der bisherige Produktname „Markdown Viewer" ist damit irreführend. Zusätzlich soll das Branding der Stumm Consulting GmbH (SCG) durchgängig sichtbar werden — bisher steht „SCG" nur im Repo-Namen, nicht im App-Namen selbst. Neuer Produktname: **SCG Markdown**. Repo-Name analog: **SCG-Markdown** (über GitHub-Web-UI vom Nutzer umzubenennen, GitHub legt automatische Redirects an).

## Lösungsansatz

- **`package.json` anpassen**:
  - `name`: `markdown-viewer` → `scg-markdown`
  - `description`: „Schlanker Markdown-Viewer für Windows 11..." → „Schlanker Markdown-Editor für Windows 11 mit Tabs, geteilter Quellcode-/Render-Ansicht, Auto-Reload und Mehrsprachigkeit."
  - `build.productName`: `Markdown Viewer` → `SCG Markdown`
  - `build.appId`: `net.stumm.markdown-viewer` → `net.stumm.scg-markdown`
  - `build.copyright`: bleibt unverändert
  - `build.nsis.shortcutName`: `Markdown Viewer` → `SCG Markdown`
  - `build.nsis.uninstallDisplayName`: `Markdown Viewer` → `SCG Markdown`
  - `build.nsis.artifactName` und `build.portable.artifactName` nutzen `${productName}` — werden automatisch zu `SCG Markdown-<version>-Setup.exe` und `SCG Markdown-<version>-Portable.exe`
- **Settings-Migration** (electron-store):
  - `electron-store` schreibt unter `<userData>/<productName>/config.json`. Beim Wechsel von `productName` „Markdown Viewer" auf „SCG Markdown" startet die App unter einem neuen Pfad mit leerer Konfiguration.
  - Lösung: Im Main-Prozess vor `new Store(...)` prüfen, ob `<userData>/SCG Markdown/config.json` existiert. Falls **nicht**, prüfen, ob `<userData>/Markdown Viewer/config.json` existiert. Falls ja: Inhalt einlesen, ins neue Verzeichnis kopieren, Hinweis in `console.log` ausgeben („Settings aus Vorgängerinstallation migriert").
  - Den alten Pfad **nicht** löschen — defensiv, damit der Nutzer nichts unwiderruflich verliert. Optional kann ein späterer Release (0.7.x) ein Aufräum-Skript ergänzen.
  - Fehlerfall (z.B. korrupte alte JSON-Datei): kein Abbruch, sondern Default-Settings und Fehler-Log.
- **UI-Strings**:
  - Über-Dialog `<h2 id="about-title">` in `src/renderer/index.html`: `Markdown Viewer` → `SCG Markdown`
  - Fenster-Titel-Template in `src/renderer/renderer.js`: `Markdown Viewer` → `SCG Markdown` (Format weiter `<datei> — SCG Markdown` bzw. `• <datei> — SCG Markdown` bei Dirty)
  - HTML `<title>` in `src/renderer/index.html`: `Markdown Viewer` → `SCG Markdown`
  - Drop-Overlay, Empty-State: enthalten keinen Produktnamen, keine Anpassung nötig (Empty-State-Überschrift ist aktuell „Markdown Viewer" via `data-i18n="empty.title"` — auf `SCG Markdown` umstellen)
  - i18n-Dateien `src/i18n/{de,en,fr,es,it}.json` scannen nach „Markdown Viewer" und auf „SCG Markdown" ändern. Der Eigenname bleibt in allen Sprachen identisch.
- **README.md**: Titel, Beschreibung, Download-Sektion, Screenshots-Beschriftungen an neuen Namen anpassen
- **CHANGELOG.md**: Im 0.6.0-Eintrag in der Sektion **Geändert** das Rebranding dokumentieren mit Hinweis auf Settings-Migration
- **CLAUDE.md** (projekt-lokal): Release-Prozess-Beispiele mit alten EXE-Namen aktualisieren (`Markdown Viewer-X.Y.Z-*.exe` → `SCG Markdown-X.Y.Z-*.exe`)
- **GitHub-Repository**: Umbenennung von `SCG-Markdown-Viewer` zu `SCG-Markdown` durch den Nutzer im GitHub-Web-UI. GitHub legt automatische Redirects an. Verweise in CHANGELOG-Issue-Links (`https://github.com/MatthiasSCG/SCG-Markdown-Viewer/issues/...`) funktionieren über Redirect weiter, müssen nicht zwingend angepasst werden. README- und CLAUDE.md-Repo-Verweise auf neuen Namen aktualisieren.
- **Icon und Assets**: bleiben unverändert (Markdown Mark, CC0)
- **Tag-Konvention** bleibt `v<MAJOR>.<MINOR>.<PATCH>` — kein Schema-Wechsel

## Akzeptanzkriterien

- `package.json` zeigt `name: "scg-markdown"`, `productName: "SCG Markdown"`, `appId: "net.stumm.scg-markdown"`, neue NSIS-Strings.
- Build erzeugt EXEs mit Dateinamen `SCG Markdown-0.6.0-Setup.exe` und `SCG Markdown-0.6.0-Portable.exe` im `releases/`-Ordner.
- Installation legt Startmenü-Eintrag und Desktop-Verknüpfung mit dem Namen „SCG Markdown" an.
- Fenster-Titel zeigt das Format `<datei> — SCG Markdown` (bzw. `• <datei> — SCG Markdown` bei Dirty-State).
- Über-Dialog zeigt „SCG Markdown" als Überschrift.
- Empty-State und HTML-Titel zeigen „SCG Markdown".
- Bei vorhandener Installation von 0.5.x mit Settings unter `<userData>/Markdown Viewer/config.json` startet 0.6.0 mit migrierten Settings (Recent Files, Sprache, Sitzungs-Toggle, View-Optionen, View-Modus, Fenster-Position bleiben erhalten).
- Frische Installation ohne Vorgänger-Settings startet mit Default-Settings, ohne Fehler.
- Korrupte alte JSON-Datei führt nicht zum Absturz; App startet mit Default-Settings und protokolliert den Fehler.
- README und CLAUDE.md (projekt-lokal) verweisen auf den neuen Namen.

## Bezug zu Dateien

- `package.json`
- `src/renderer/index.html` — `<title>`, Über-Dialog
- `src/renderer/renderer.js` — Fenster-Titel-Format
- `src/i18n/{de,en,fr,es,it}.json` — `empty.title` und alle Vorkommen von „Markdown Viewer"
- `src/main/main.js` — Settings-Migrations-Code vor `electron-store`-Initialisierung
- `README.md`
- `CLAUDE.md` (projekt-lokal) — Release-Prozess-EXE-Namen
- `CHANGELOG.md` — 0.6.0-Eintrag in Sektion „Geändert"

## Lösung

(Wird nach Umsetzung ausgefüllt.)
