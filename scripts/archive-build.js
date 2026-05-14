// Postbuild-Aufgaben nach `npm run build`:
//   1) Versions-EXEs aus dist/ nach releases/ verschieben (Versions-Archiv).
//   2) Verwaiste *.blockmap-Dateien aus frueheren Builds in dist/ wegraeumen.
// dist/ bleibt damit reiner Build-Output von electron-builder mit nur dem
// aktuellen Build; releases/ sammelt die EXEs ueber alle Releases hinweg.
// Beide Ordner sind gitignored.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASES = path.join(ROOT, 'releases');
const CURRENT_VERSION = require(path.join(ROOT, 'package.json')).version;

// Versions-EXEs erkennen — Suffix Setup oder Portable.
const EXE_PATTERN = /^Markdown Viewer-(\d+\.\d+\.\d+)-(Setup|Portable)\.exe$/;
// Blockmaps werden von electron-builder nur fuer den NSIS-Installer erzeugt
// (Setup), nicht fuer Portable.
const BLOCKMAP_PATTERN = /^Markdown Viewer-(\d+\.\d+\.\d+)-Setup\.exe\.blockmap$/;

function moveExesToReleases(entries) {
  const exes = entries.filter((name) => EXE_PATTERN.test(name));
  if (exes.length === 0) {
    console.log('archive-build: keine passenden EXEs in dist/, nichts zu verschieben.');
    return;
  }
  fs.mkdirSync(RELEASES, { recursive: true });
  for (const name of exes) {
    const from = path.join(DIST, name);
    const to = path.join(RELEASES, name);
    // Auf Windows kann ein gleichnamiges Ziel von einem vorherigen Build
    // existieren. fs.renameSync ueberschreibt nicht zuverlaessig — daher
    // erst Ziel entfernen, falls vorhanden.
    if (fs.existsSync(to)) {
      fs.rmSync(to);
    }
    fs.renameSync(from, to);
    console.log(`archive-build: ${name} -> releases/`);
  }
}

function pruneStaleBlockmaps(entries) {
  // Blockmaps gehoeren zum electron-updater-Auto-Update, das im Projekt nicht
  // konfiguriert ist. Die zur aktuellen Version bleibt im dist/ als Teil des
  // frischen Builds; aeltere Versionen sind Leichen und werden geloescht.
  const blockmaps = entries.filter((name) => BLOCKMAP_PATTERN.test(name));
  for (const name of blockmaps) {
    const match = name.match(BLOCKMAP_PATTERN);
    const version = match && match[1];
    if (version !== CURRENT_VERSION) {
      fs.rmSync(path.join(DIST, name));
      console.log(`archive-build: alte ${name} geloescht.`);
    }
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
  pruneStaleBlockmaps(fs.readdirSync(DIST));
}

main();
