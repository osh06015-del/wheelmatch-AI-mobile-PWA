// PWA 아이콘 생성기.
//
// 외부 이미지 라이브러리 없이 PNG를 직접 인코딩한다.
// 숫돌을 위에서 본 모양(바깥 원 + 가운데 구멍)을 그린다.
//
//   node scripts/generate-icons.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const BACKGROUND = [15, 23, 42]; // #0F172A
const WHEEL = [34, 197, 94]; // #22C55E
const RIM = [203, 213, 225]; // #CBD5E1

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** RGB 픽셀 배열을 PNG 버퍼로 인코딩한다. */
function encodePNG(size, pixelAt) {
  // 각 스캔라인 앞에 필터 바이트(0 = None)를 붙인다.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixelAt(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const center = size / 2;
  const outer = size * 0.38;
  const rimInner = size * 0.32;
  const hole = size * 0.11;

  return (x, y) => {
    const dx = x + 0.5 - center;
    const dy = y + 0.5 - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= hole) return BACKGROUND;
    if (distance <= rimInner) return WHEEL;
    if (distance <= outer) return RIM;
    return BACKGROUND;
  };
}

const targets = [
  { size: 192, path: join(ROOT, 'public', 'icons', 'icon-192.png') },
  { size: 512, path: join(ROOT, 'public', 'icons', 'icon-512.png') },
  // Next.js App Router는 src/app/icon.png를 파비콘으로 자동 사용한다.
  { size: 192, path: join(ROOT, 'src', 'app', 'icon.png') },
];

for (const target of targets) {
  mkdirSync(dirname(target.path), { recursive: true });
  writeFileSync(target.path, encodePNG(target.size, drawIcon(target.size)));
  console.log(`wrote ${target.path}`);
}
