import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDotIconSvg,
  createPngIcoBuffer,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
} from "everything-dev/ui/metadata";
import sharp from "sharp";

const APP_NAME = "Pizza Pay";
const BRAND_DOT_COLOR = "#c0392b";
const METADATA_IMAGE_ALT = "Pizza Pay — Pizza Boy Billy at Tortorices on Grand Ave";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiDir = path.resolve(__dirname, "..");
const publicDir = path.join(uiDir, "public");

const metadataPath = path.join(publicDir, "metadata.png");

async function main() {
  await mkdir(publicDir, { recursive: true });

  await writeFile(
    path.join(publicDir, "icon.svg"),
    createDotIconSvg({ size: 64, color: BRAND_DOT_COLOR }),
  );
  await writeFile(
    path.join(publicDir, "icon_rev.svg"),
    createDotIconSvg({ size: 64, color: BRAND_DOT_COLOR }),
  );

  const favicon32 = await renderPngBuffer(32, 32);
  await writeFile(path.join(publicDir, "favicon.ico"), createPngIcoBuffer(favicon32, 32, 32));

  await Promise.all([
    renderPng(path.join(publicDir, "favicon-16x16.png"), 16, 16),
    writeFile(path.join(publicDir, "favicon-32x32.png"), favicon32),
    renderPng(path.join(publicDir, "android-chrome-192x192.png"), 192, 192),
    renderPng(path.join(publicDir, "android-chrome-512x512.png"), 512, 512),
    renderPng(path.join(publicDir, "apple-touch-icon.png"), 180, 180),
    renderPng(path.join(publicDir, "logo192.png"), 192, 192),
    renderPng(path.join(publicDir, "logo512.png"), 512, 512),
  ]);

  const metadataSvg = buildMetadataSvg();
  await sharp(Buffer.from(metadataSvg)).png().toFile(metadataPath);
}

function buildMetadataSvg() {
  const W = SOCIAL_IMAGE_WIDTH;
  const H = SOCIAL_IMAGE_HEIGHT;
  const cx = W / 2;
  const cy = H / 2;

  const bgItems = [
    { x: 0.05 * W, y: 0.08 * H, r: 52, rotate: -12 },
    { x: 0.85 * W, y: 0.75 * H, r: 42, rotate:  18 },
    { x: 0.50 * W, y: 0.35 * H, r: 64, rotate:  -6 },
    { x: 0.12 * W, y: 0.88 * H, r: 46, rotate:  22 },
    { x: 0.78 * W, y: 0.60 * H, r: 58, rotate: -28 },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#c0392b"/>
      <stop offset="60%"  stop-color="#922b21"/>
      <stop offset="100%" stop-color="#7b241c"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg-grad)"/>

  ${bgItems.map(({ x, y, r, rotate }) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="0.07" transform="rotate(${rotate} ${x} ${y})"/>`
  ).join("\n  ")}

  <text x="${cx + 3}" y="${cy + 3}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="96" font-weight="600" fill="rgba(0,0,0,0.18)">${APP_NAME}</text>
  <text x="${cx}"     y="${cy}"     text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="96" font-weight="600" fill="#ffffff">${APP_NAME}</text>

  <title>${METADATA_IMAGE_ALT}</title>
</svg>`;
}

async function renderPng(filePath: string, width: number, height: number) {
  await writeFile(filePath, await renderPngBuffer(width, height));
}

async function renderPngBuffer(width: number, height: number) {
  const svg = createDotIconSvg({ size: Math.max(width, height), color: BRAND_DOT_COLOR });
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

await main();
