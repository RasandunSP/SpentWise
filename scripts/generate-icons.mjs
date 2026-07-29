/*
 * Renders the SpentWise app icons from an inline SVG.
 *
 *   node scripts/generate-icons.mjs
 *
 * Uses sharp, which ships with Next.js, so there's nothing extra to install.
 * Re-run this if the mark or the brand colour ever changes.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public", "icons");

const PRIMARY = "#1a58b7";
const SURFACE = "#f8f9ff";

/**
 * A wallet mark on the brand blue.
 * `inset` shrinks the glyph so Android's maskable crop can't clip it —
 * the safe zone is the middle 80% of the canvas.
 */
function svg({ size, inset = 0.68, radius = 0.22, background = PRIMARY }) {
  const glyph = size * inset;
  const offset = (size - glyph) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${background}"/>
  <g transform="translate(${offset} ${offset}) scale(${glyph / 24})">
    <path fill="${SURFACE}" d="M21 7.28V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72M20 9v6h-7V9zM5 19V5h14v2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6v2z"/>
    <circle cx="16" cy="12" r="1.5" fill="${SURFACE}"/>
  </g>
</svg>`;
}

const TARGETS = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: {} },
  // iOS masks the corners itself, so ship a full-bleed square.
  { file: "apple-touch-icon.png", size: 180, options: { radius: 0 } },
  // Android adaptive icons crop to a circle — pad the glyph well inside.
  { file: "icon-maskable-512.png", size: 512, options: { radius: 0, inset: 0.5 } },
];

await mkdir(OUT, { recursive: true });

for (const { file, size, options } of TARGETS) {
  const markup = svg({ size, ...options });
  const png = await sharp(Buffer.from(markup)).png().toBuffer();
  await writeFile(path.join(OUT, file), png);
  console.log(`  ✓ ${file}  (${size}×${size})`);
}

// A favicon for desktop browsers, same mark at 32px.
const favicon = await sharp(Buffer.from(svg({ size: 32, radius: 0.2 })))
  .png()
  .toBuffer();
await writeFile(path.join(process.cwd(), "public", "favicon.png"), favicon);
console.log("  ✓ favicon.png  (32×32)");
