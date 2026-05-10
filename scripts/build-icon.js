// Erzeugt icon.ico (Multi-Size) und icon.png (256px) aus markdown-mark.svg.
// Das Original-SVG hat 208x128 — wir rendern es zentriert in einem
// quadratischen Rahmen mit transparentem Hintergrund.
'use strict';

const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('node:fs/promises');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const SVG_PATH = path.join(ASSETS, 'markdown-mark.svg');
const ICO_PATH = path.join(ASSETS, 'icon.ico');
const PNG_PATH = path.join(ASSETS, 'icon.png');

const SOURCE_W = 208;
const SOURCE_H = 128;
const ASPECT = SOURCE_W / SOURCE_H;
const MARGIN = 0.08; // 8 % Rand für optisches Atmen

async function renderSized(svg, size) {
  const inner = size * (1 - 2 * MARGIN);
  let w, h;
  if (ASPECT >= 1) {
    w = Math.round(inner);
    h = Math.round(inner / ASPECT);
  } else {
    h = Math.round(inner);
    w = Math.round(inner * ASPECT);
  }
  const padX = Math.floor((size - w) / 2);
  const padY = Math.floor((size - h) / 2);
  return sharp(svg)
    .resize(w, h)
    .extend({
      top: padY,
      bottom: size - h - padY,
      left: padX,
      right: size - w - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const svg = await fs.readFile(SVG_PATH);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = [];
  for (const s of sizes) {
    pngs.push(await renderSized(svg, s));
  }
  const ico = await toIco(pngs);
  await fs.writeFile(ICO_PATH, ico);
  await fs.writeFile(PNG_PATH, pngs[pngs.length - 1]);
  console.log(`Icon erzeugt: ${ICO_PATH} (${ico.length} Bytes)`);
  console.log(`PNG erzeugt:  ${PNG_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
