// Erzeugt icon.ico (Multi-Size) und icon.png (256px) aus markdown-mark.svg.
// Das Original-SVG hat 208x128 — wir wickeln es in eine helle, abgerundete
// Plate mit dezentem Border, damit das Icon auf hellen wie auf dunklen
// System-Themes klar erkennbar ist.
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

// Rand- und Plate-Parameter (in Anteilen der Icon-Größe)
const PLATE_PADDING = 0.12; // 12 % Abstand zwischen Plate-Rand und Logo
const PLATE_RADIUS = 0.18; // Eckradius der Plate
const PLATE_FILL = '#ffffff';
const PLATE_STROKE = '#cccccc';
const PLATE_STROKE_WIDTH = 0.012; // relativ zur Icon-Größe (= 3 px bei 256)
const LOGO_FILL = '#000000';

// Pfad-Daten aus dem Original-SVG extrahieren.
function extractPathD(svgString) {
  const match = svgString.match(/<path[^>]*d="([^"]+)"[^>]*\/?>/);
  if (!match) throw new Error('Kein <path d="..."> im SVG gefunden');
  return match[1];
}

// Baut ein Wrapper-SVG mit heller Plate + zentriertem Logo.
function buildWrappedSvg(pathD, size) {
  const pad = size * PLATE_PADDING;
  const innerW = size - 2 * pad;
  const innerH = innerW / ASPECT;
  const logoX = pad;
  const logoY = (size - innerH) / 2;
  const scale = innerW / SOURCE_W;
  const radius = size * PLATE_RADIUS;
  const strokeW = Math.max(1, size * PLATE_STROKE_WIDTH);
  // Plate etwas verkleinern, damit der Stroke nicht abgeschnitten wird.
  const inset = strokeW / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect x="${inset}" y="${inset}" width="${size - 2 * inset}" height="${size - 2 * inset}" rx="${radius}" ry="${radius}" fill="${PLATE_FILL}" stroke="${PLATE_STROKE}" stroke-width="${strokeW}"/>
  <g transform="translate(${logoX} ${logoY}) scale(${scale})">
    <path d="${pathD}" fill="${LOGO_FILL}"/>
  </g>
</svg>`;
}

async function renderSized(pathD, size) {
  const wrapped = buildWrappedSvg(pathD, size);
  return sharp(Buffer.from(wrapped))
    .resize(size, size)
    .png()
    .toBuffer();
}

async function main() {
  const svg = (await fs.readFile(SVG_PATH)).toString('utf8');
  const pathD = extractPathD(svg);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = [];
  for (const s of sizes) {
    pngs.push(await renderSized(pathD, s));
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
