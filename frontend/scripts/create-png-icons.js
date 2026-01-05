// PNG 아이콘 생성 스크립트 (의존성 없음)
// 사용법: node scripts/create-png-icons.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC32 계산
function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

// PNG 청크 생성
function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

// 간단한 PNG 생성 (단색 배경 + 그라데이션 효과)
function createPNG(size) {
  // PNG 시그니처
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // IHDR (이미지 헤더)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // 이미지 데이터 생성 (그라데이션)
  const rawData = [];
  const radius = size * 0.2;

  for (let y = 0; y < size; y++) {
    rawData.push(0); // 필터 바이트
    for (let x = 0; x < size; x++) {
      // 그라데이션 색상 (#667eea -> #764ba2)
      const t = (x + y) / (size * 2);
      const r = Math.round(102 + (118 - 102) * t);
      const g = Math.round(126 + (75 - 126) * t);
      const b = Math.round(234 + (162 - 234) * t);

      // 둥근 모서리 체크
      let inRoundedRect = true;

      // 좌상단
      if (x < radius && y < radius) {
        const dx = radius - x;
        const dy = radius - y;
        inRoundedRect = dx * dx + dy * dy <= radius * radius;
      }
      // 우상단
      if (x >= size - radius && y < radius) {
        const dx = x - (size - radius);
        const dy = radius - y;
        inRoundedRect = dx * dx + dy * dy <= radius * radius;
      }
      // 좌하단
      if (x < radius && y >= size - radius) {
        const dx = radius - x;
        const dy = y - (size - radius);
        inRoundedRect = dx * dx + dy * dy <= radius * radius;
      }
      // 우하단
      if (x >= size - radius && y >= size - radius) {
        const dx = x - (size - radius);
        const dy = y - (size - radius);
        inRoundedRect = dx * dx + dy * dy <= radius * radius;
      }

      if (inRoundedRect) {
        rawData.push(r, g, b);
      } else {
        rawData.push(0, 0, 0); // 투명 (검은색)
      }
    }
  }

  // IDAT (압축된 이미지 데이터)
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  // IEND (이미지 끝)
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", iend),
  ]);
}

// 아이콘 생성
const publicDir = path.join(__dirname, "..", "public");

console.log("PWA 아이콘 생성 중...");

// 192x192 아이콘
const icon192 = createPNG(192);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), icon192);
console.log("✓ icon-192.png 생성 완료");

// 512x512 아이콘
const icon512 = createPNG(512);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), icon512);
console.log("✓ icon-512.png 생성 완료");

console.log("");
console.log("모든 PWA 아이콘이 생성되었습니다!");
