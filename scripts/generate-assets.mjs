/**
 * Generates every launcher/splash asset from one vector mark.
 *
 * Run with `npm run assets` after changing the mark or the brand colours.
 * Committing the PNGs as well as this script means a clone doesn't need
 * sharp installed just to build the app.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');

const VOID = '#0A0B0D';
const ACCENT = '#C7FF3C';

/**
 * The KNIGHT monogram: a vertical stem and a chevron, drawn as strokes so the
 * weight stays even at every size. Coordinates are on a 1024 grid.
 *
 * @param {{ color?: string, scale?: number }} options
 */
function mark({ color = ACCENT, scale = 1 } = {}) {
  const stroke = 78 * scale;
  const cx = 512;
  const cy = 512;

  // Scale each point about the centre so the mark can shrink into Android's
  // adaptive-icon safe zone without redrawing it.
  const p = (x, y) => `${cx + (x - cx) * scale} ${cy + (y - cy) * scale}`;

  return `
    <g stroke="${color}" stroke-width="${stroke}" fill="none"
       stroke-linecap="square" stroke-linejoin="miter">
      <path d="M ${p(366, 296)} L ${p(366, 728)}" />
      <path d="M ${p(682, 296)} L ${p(414, 512)} L ${p(682, 728)}" />
    </g>`;
}

/** @param {{ background?: string, color?: string, scale?: number }} options */
function icon({ background, color = ACCENT, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}
    ${mark({ color, scale })}
  </svg>`;
}

const files = [
  // Store / iOS icon: full bleed, no transparency allowed.
  { name: 'icon.png', svg: icon({ background: VOID }), size: 1024 },
  // Android masks the foreground to a circle/squircle, so the mark is pulled
  // in to roughly 62% to survive every mask shape.
  { name: 'android-icon-foreground.png', svg: icon({ scale: 0.62 }), size: 1024 },
  { name: 'android-icon-background.png', svg: icon({ background: VOID, color: 'none' }), size: 1024 },
  { name: 'android-icon-monochrome.png', svg: icon({ color: '#FFFFFF', scale: 0.62 }), size: 1024 },
  { name: 'splash-icon.png', svg: icon({ scale: 0.9 }), size: 512 },
  { name: 'favicon.png', svg: icon({ background: VOID }), size: 64 },
];

await mkdir(assets, { recursive: true });

for (const file of files) {
  const png = await sharp(Buffer.from(file.svg))
    .resize(file.size, file.size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(assets, file.name), png);
  console.log(`${file.name}  ${file.size}x${file.size}  ${(png.length / 1024).toFixed(1)}KB`);
}

// Kept alongside the PNGs so the mark can be reused for the web or print
// without re-deriving it from a raster.
await writeFile(join(assets, 'knight-mark.svg'), icon({ background: VOID }));
console.log('knight-mark.svg');
