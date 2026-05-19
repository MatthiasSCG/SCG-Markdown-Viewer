// Postbuild-Aufgaben nach `npm run build`:
//   1) Versions-EXEs aus dist/ nach releases/ verschieben (Versions-Archiv).
//   2) latest.yml und Blockmap der aktuellen Version mit nach releases/
//      verschieben, damit der Release-Prozess sie als GitHub-Asset hochladen
//      kann (4T-0029, electron-updater-Erkennung).
//   3) Verwaiste *.blockmap-Dateien aus frueheren Builds aufraeumen.
// dist/ bleibt damit reiner Build-Output von electron-builder mit nur dem
// aktuellen Build; releases/ sammelt EXEs, latest.yml und Blockmaps ueber
// alle Releases hinweg. Beide Ordner sind gitignored.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASES = path.join(ROOT, 'releases');
const CURRENT_VERSION = require(path.join(ROOT, 'package.json')).version;

// SemVer-Versions-Pattern: Major.Minor.Patch plus optionaler Pre-Release-
// Suffix (z.B. -rc1, -dev.0, -alpha.5). Notwendig fuer 4T-0029, weil
// waehrend der Entwicklung mit -dev.0 gebaut wird und Pre-Releases mit
// -rc1 ins releases/-Archiv wandern.
const VERSION_RE = /\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/;
const EXE_PATTERN = new RegExp(
  `^(?:SCG Markdown|Markdown Viewer)-(${VERSION_RE.source})-(Setup|Portable)\\.exe$`,
);
const BLOCKMAP_PATTERN = new RegExp(
  `^(?:SCG Markdown|Markdown Viewer)-(${VERSION_RE.source})-Setup\\.exe\\.blockmap$`,
);

function moveFile(name, label) {
  const from = path.join(DIST, name);
  const to = path.join(RELEASES, name);
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) fs.rmSync(to);
  fs.renameSync(from, to);
  console.log(`archive-build: ${label || name} -> releases/`);
  return true;
}

function moveExesToReleases(entries) {
  const exes = entries.filter((name) => EXE_PATTERN.test(name));
  if (exes.length === 0) {
    console.log('archive-build: keine passenden EXEs in dist/, nichts zu verschieben.');
    return;
  }
  fs.mkdirSync(RELEASES, { recursive: true });
  for (const name of exes) moveFile(name);
}

// 4T-0029: latest.yml ist das Update-Manifest, das electron-updater beim
// GitHub-Release liest. Es hat keinen Versions-Suffix im Dateinamen
// (electron-builder-Konvention). Wir verschieben es als-ist nach releases/,
// damit `gh release create` es als Asset hochladen kann. Beim naechsten
// Build wird es ueberschrieben — das ist OK, weil es immer zum aktuell
// veroeffentlichten Release gehoeren soll.
function moveLatestYmlToReleases() {
  moveFile('latest.yml', 'latest.yml');
}

// 4T-0029: Die Blockmap der aktuellen Version gehoert zum NSIS-Setup-Asset
// im Release. electron-updater nutzt sie fuer differenzielle Patches,
// sobald spaeter ein Auto-Download-Pfad aktiv wird (siehe 4T-0032).
// Aktuell wird sie noch nicht aktiv genutzt, aber sie wird trotzdem mit
// hochgeladen, damit das Asset-Set des Releases vollstaendig ist.
function moveCurrentBlockmapToReleases(entries) {
  const blockmaps = entries.filter((name) => {
    const m = name.match(BLOCKMAP_PATTERN);
    return m && m[1] === CURRENT_VERSION;
  });
  for (const name of blockmaps) moveFile(name);
}

function pruneStaleBlockmaps(entries) {
  // Blockmaps frueherer Versionen sind in dist/ Leichen vorheriger Builds.
  const blockmaps = entries.filter((name) => {
    const m = name.match(BLOCKMAP_PATTERN);
    return m && m[1] !== CURRENT_VERSION;
  });
  for (const name of blockmaps) {
    fs.rmSync(path.join(DIST, name));
    console.log(`archive-build: alte ${name} geloescht.`);
  }
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.log('archive-build: dist/ existiert nicht, nichts zu tun.');
    return;
  }
  const entries = fs.readdirSync(DIST);
  moveExesToReleases(entries);
  // Frische Liste lesen, weil moveExesToReleases dist/ veraendert hat.
  const after = fs.readdirSync(DIST);
  moveLatestYmlToReleases();
  moveCurrentBlockmapToReleases(after);
  pruneStaleBlockmaps(fs.readdirSync(DIST));
}

main();
