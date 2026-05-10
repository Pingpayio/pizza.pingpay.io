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
  const cx = SOCIAL_IMAGE_WIDTH / 2;
  const cy = SOCIAL_IMAGE_HEIGHT / 2;

  const cardW = 760;
  const cardH = 200;
  const cardX = (SOCIAL_IMAGE_WIDTH - cardW) / 2;
  const cardY = cy - cardH / 2 + 30;
  const cardR = 28;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_IMAGE_WIDTH}" height="${SOCIAL_IMAGE_HEIGHT}" viewBox="0 0 ${SOCIAL_IMAGE_WIDTH} ${SOCIAL_IMAGE_HEIGHT}">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c0392b"/>
      <stop offset="55%" stop-color="#922b21"/>
      <stop offset="100%" stop-color="#7b241c"/>
    </linearGradient>
    <filter id="card-shadow" x="-10%" y="-20%" width="120%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
    <filter id="emoji-shadow">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg-grad)"/>

  <text x="${cx}" y="${cy - 130}" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="96" filter="url(#emoji-shadow)">🍕</text>

  <g filter="url(#card-shadow)">
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${cardR}" ry="${cardR}" fill="#fffde7"/>
  </g>

  <text x="${cx + 3}" y="${cardY + 88 + 3}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="72" font-weight="700" fill="rgba(0,0,0,0.05)">${APP_NAME}</text>
  <text x="${cx}" y="${cardY + 88}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="72" font-weight="700" fill="#c0392b">${APP_NAME}</text>

  <text x="${cx}" y="${cardY + 140}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="26" font-weight="400" fill="rgba(0,0,0,0.45)">Pizza Boy Billy · Tortorices on Grand Ave</text>

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
