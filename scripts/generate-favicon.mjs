/**
 * Rasterizes the Aegis favicon design to PNG (32×32 + 180×180 apple-touch)
 * with zero dependencies — supersampled scanline renderer + manual PNG encode.
 *   node scripts/generate-favicon.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// --- palette ---
const BG = [5, 10, 7];
const LIME = [184, 255, 46];

// --- geometry (64×64 design space) ---
const shieldPoly = [
  [32, 9], [51, 16.5], [51, 32], [50, 44], [42, 52], [32, 57.5],
  [22, 52], [14, 44], [13, 32], [13, 16.5],
];
const edges = shieldPoly.map((p, i) => [p, shieldPoly[(i + 1) % shieldPoly.length]]);
const nodes = [
  [32, 23],
  [25, 40],
  [39, 40],
];
const meshLines = [
  [[32, 23], [25, 40]],
  [[32, 23], [39, 40]],
  [[25, 40], [39, 40]],
];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Coverage [0..1] of lime ink at design-space point (x, y). */
function ink(x, y) {
  let cov = 0;
  // shield stroke (width 4 → half 2)
  for (const [a, b] of edges) {
    const d = distToSegment(x, y, a, b);
    cov = Math.max(cov, Math.min(1, Math.max(0, 2.2 - d) / 1.8));
  }
  // mesh lines (width 2.2 → half 1.1)
  for (const [a, b] of meshLines) {
    const d = distToSegment(x, y, a, b);
    cov = Math.max(cov, Math.min(1, Math.max(0, 1.5 - d) / 1.2));
  }
  // nodes (r 3.4)
  for (const [cx, cy] of nodes) {
    const d = Math.hypot(x - cx, y - cy);
    cov = Math.max(cov, Math.min(1, Math.max(0, 3.9 - d) / 1.6));
  }
  return cov;
}

/** Renders one RGBA frame at `size` px with SS× supersampling. */
function render(size, ss) {
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, cov = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((px * ss + sx + 0.5) / (size * ss)) * 64;
          const y = ((py * ss + sy + 0.5) / (size * ss)) * 64;
          // rounded-rect tile mask (rx 14)
          const rx = Math.min(x, 64 - x), ry = Math.min(y, 64 - y);
          let inside = true;
          if (rx < 14 && ry < 14) {
            const dx = rx - 14, dy = ry - 14;
            inside = dx * dx + dy * dy <= 14 * 14;
          }
          const c = inside ? ink(x, y) : 0;
          r += BG[0]; g += BG[1]; b += BG[2]; cov += c;
        }
      }
      const n = ss * ss;
      cov /= n;
      const i = (py * size + px) * 4;
      buf[i] = Math.round(BG[0] * (1 - cov) + LIME[0] * cov);
      buf[i + 1] = Math.round(BG[1] * (1 - cov) + LIME[1] * cov);
      buf[i + 2] = Math.round(BG[2] * (1 - cov) + LIME[2] * cov);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
writeFileSync(here + '../public/favicon-32.png', encodePNG(32, render(32, 8)));
writeFileSync(here + '../public/apple-touch-icon.png', encodePNG(180, render(180, 2)));
console.log('favicon PNGs written: public/favicon-32.png, public/apple-touch-icon.png');
