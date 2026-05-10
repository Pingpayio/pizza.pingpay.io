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

function pizzaSlicePath(cx: number, cy: number, r: number) {
  const sliceAngle = Math.PI / 3;
  const startAngle = -Math.PI / 2 - sliceAngle / 2;
  const endAngle = -Math.PI / 2 + sliceAngle / 2;
  const crustR = r;
  const tipX = cx;
  const tipY = cy + r * 0.55;
  const arcX1 = cx + crustR * Math.cos(startAngle);
  const arcY1 = cy + crustR * Math.sin(startAngle);
  const arcX2 = cx + crustR * Math.cos(endAngle);
  const arcY2 = cy + crustR * Math.sin(endAngle);
  return `M ${tipX} ${tipY} L ${arcX1} ${arcY1} A ${crustR} ${crustR} 0 0 1 ${arcX2} ${arcY2} Z`;
}

function buildMetadataSvg() {
  const cx = SOCIAL_IMAGE_WIDTH / 2;
  const cy = SOCIAL_IMAGE_HEIGHT / 2;

  const sliceR = 110;
  const sliceCx = cx;
  const sliceCy = cy - 60;
  const slicePath = pizzaSlicePath(sliceCx, sliceCy, sliceR);

  const crustStartAngle = -Math.PI / 2 - Math.PI / 3 / 2;
  const crustEndAngle = -Math.PI / 2 + Math.PI / 3 / 2;
  const crustInner = sliceR - 16;
  const crustOuter = sliceR;
  const ci1x = sliceCx + crustInner * Math.cos(crustStartAngle);
  const ci1y = sliceCy + crustInner * Math.sin(crustStartAngle);
  const co1x = sliceCx + crustOuter * Math.cos(crustStartAngle);
  const co1y = sliceCy + crustOuter * Math.sin(crustStartAngle);
  const ci2x = sliceCx + crustInner * Math.cos(crustEndAngle);
  const ci2y = sliceCy + crustInner * Math.sin(crustEndAngle);
  const co2x = sliceCx + crustOuter * Math.cos(crustEndAngle);
  const co2y = sliceCy + crustOuter * Math.sin(crustEndAngle);
  const crustPath = `M ${co1x} ${co1y} A ${crustOuter} ${crustOuter} 0 0 1 ${co2x} ${co2y} L ${ci2x} ${ci2y} A ${crustInner} ${crustInner} 0 0 0 ${ci1x} ${ci1y} Z`;

  const bgItems = [
    { cx: 90,  cy: 80,  r: 52, rotate: -12 },
    { cx: SOCIAL_IMAGE_WIDTH - 80, cy: SOCIAL_IMAGE_HEIGHT - 90, r: 44, rotate: 18 },
    { cx: 60,  cy: SOCIAL_IMAGE_HEIGHT - 70, r: 38, rotate: 22 },
    { cx: SOCIAL_IMAGE_WIDTH - 60, cy: 90, r: 36, rotate: -20 },
    { cx: SOCIAL_IMAGE_WIDTH / 2 - 280, cy: SOCIAL_IMAGE_HEIGHT / 2 + 40, r: 30, rotate: 8 },
    { cx: SOCIAL_IMAGE_WIDTH / 2 + 310, cy: SOCIAL_IMAGE_HEIGHT / 2 - 30, r: 34, rotate: -8 },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_IMAGE_WIDTH}" height="${SOCIAL_IMAGE_HEIGHT}" viewBox="0 0 ${SOCIAL_IMAGE_WIDTH} ${SOCIAL_IMAGE_HEIGHT}">
  <defs>
    <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c0392b"/>
      <stop offset="55%" stop-color="#922b21"/>
      <stop offset="100%" stop-color="#7b241c"/>
    </linearGradient>
    <filter id="slice-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg-grad)"/>

  ${bgItems.map(({ cx: bx, cy: by, r, rotate }) => {
    const sp = pizzaSlicePath(bx, by, r);
    const tipX = bx;
    const tipY = by + r * 0.55;
    return `<g transform="rotate(${rotate} ${tipX} ${tipY})" opacity="0.07">
    <path d="${sp}" fill="#f39c12"/>
    </g>`;
  }).join("\n  ")}

  <g filter="url(#slice-shadow)">
    <path d="${slicePath}" fill="#f39c12"/>
    <path d="${crustPath}" fill="#e67e22"/>
    <circle cx="${sliceCx - 18}" cy="${sliceCy + 10}" r="7" fill="#c0392b" opacity="0.85"/>
    <circle cx="${sliceCx + 22}" cy="${sliceCy + 20}" r="5.5" fill="#c0392b" opacity="0.85"/>
    <circle cx="${sliceCx}"     cy="${sliceCy + 38}" r="6" fill="#c0392b" opacity="0.85"/>
    <circle cx="${sliceCx - 30}" cy="${sliceCy + 32}" r="4.5" fill="#27ae60" opacity="0.7"/>
    <circle cx="${sliceCx + 30}" cy="${sliceCy + 5}"  r="4" fill="#27ae60" opacity="0.7"/>
    <circle cx="${sliceCx - 8}"  cy="${sliceCy - 10}" r="3.5" fill="#27ae60" opacity="0.7"/>
  </g>

  <text x="${cx + 2}" y="${sliceCy + sliceR + 80 + 2}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="80" font-weight="700" fill="rgba(0,0,0,0.15)">${APP_NAME}</text>
  <text x="${cx}" y="${sliceCy + sliceR + 80}" text-anchor="middle" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="80" font-weight="700" fill="#ffffff">${APP_NAME}</text>

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
