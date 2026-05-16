// Bundlet src/renderer/renderer.js samt allen Imports (eigene ES-Module wie
// i18n.js und externe Pakete wie CodeMirror) zu src/renderer/renderer.bundle.js.
// Wird vor jedem Electron-Start (npm start/dev) und vor jedem electron-builder-
// Lauf (npm run build) automatisch ausgefuehrt.
'use strict';

const esbuild = require('esbuild');
const path = require('node:path');

const root = path.join(__dirname, '..');
const entry = path.join(root, 'src', 'renderer', 'renderer.js');
const outfile = path.join(root, 'src', 'renderer', 'renderer.bundle.js');

const args = process.argv.slice(2);
const watch = args.includes('--watch');

const buildOptions = {
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: 'esm',
  target: ['chrome120'],
  sourcemap: false,
  legalComments: 'none',
  minify: false,
  logLevel: 'info',
};

if (watch) {
  (async () => {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('build-renderer: watching for changes…');
  })();
} else {
  esbuild.build(buildOptions).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
