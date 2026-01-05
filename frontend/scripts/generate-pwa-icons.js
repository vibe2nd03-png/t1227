// PWA 아이콘 생성 스크립트
// 사용법: node scripts/generate-pwa-icons.js

const fs = require('fs');
const path = require('path');

// SVG 템플릿
const createSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.625}" font-size="${size * 0.55}" text-anchor="middle" fill="white">🌡️</text>
</svg>`;

// public 폴더에 SVG 기반 아이콘 저장
const publicDir = path.join(__dirname, '..', 'public');

// icon-192.svg 생성
fs.writeFileSync(
  path.join(publicDir, 'icon-192.svg'),
  createSvg(192)
);

// icon-512.svg 생성
fs.writeFileSync(
  path.join(publicDir, 'icon-512.svg'),
  createSvg(512)
);

console.log('SVG 아이콘 생성 완료!');
console.log('');
console.log('PNG 변환을 위해 다음 중 하나를 사용하세요:');
console.log('1. https://cloudconvert.com/svg-to-png');
console.log('2. npx @aspect-dev/pwa-asset-generator');
console.log('3. 브라우저에서 generate-icons.html 열기');
