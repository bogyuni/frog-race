// 16비트 팔레트 산출물 생성:
//   palette/frog-race-16bit.gpl  — Piskel/Aseprite/GIMP import용 (단일 진실 소스)
//   palette/frog-race-16bit.png  — 스와치 스트립 (시각 참고 / Piskel "import from image"도 가능)
//   palette/frog-race-16bit.md   — 사람이 읽는 색 표
//
// 단일 진실 소스: src/game/assets/palette.js  →  여기서 읽어 산출물 동기화.
// 실행: node scripts/gen-palette.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PALETTE } from "../src/game/assets/palette.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "palette");
mkdirSync(OUT_DIR, { recursive: true });

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/* ── .gpl (GIMP 팔레트) ── */
function writeGPL() {
  const lines = ["GIMP Palette", "Name: Frog Race 16bit", "Columns: 8", "#"];
  for (const { name, hex } of PALETTE) {
    const [r, g, b] = rgb(hex);
    const pad = (v) => String(v).padStart(3, " ");
    lines.push(`${pad(r)} ${pad(g)} ${pad(b)}\t${name}`);
  }
  writeFileSync(join(OUT_DIR, "frog-race-16bit.gpl"), lines.join("\n") + "\n");
}

/* ── .md (참고용 색 표) ── */
function writeMD() {
  const rows = PALETTE.map(({ name, hex }) => `| \`${hex}\` | ${name} |`);
  const md = [
    "# 프로그레이스 16비트 팔레트",
    "",
    `총 ${PALETTE.length}색. 단일 진실 소스: \`src/game/assets/palette.js\`.`,
    "수정 후 \`node scripts/gen-palette.mjs\` 로 재생성.",
    "",
    "| HEX | 이름 |",
    "|-----|------|",
    ...rows,
    "",
  ].join("\n");
  writeFileSync(join(OUT_DIR, "frog-race-16bit.md"), md);
}

/* ── 최소 PNG 인코더 (RGBA8, filter 0) ── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgbaRows) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // raw: 각 스캔라인 앞에 filter 바이트(0)
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const off = y * (1 + width * 4);
    raw[off] = 0;
    rgbaRows[y].copy(raw, off + 1);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function writePNG() {
  const SW = 24; // 스와치 한 변
  const COLS = 8;
  const rows = Math.ceil(PALETTE.length / COLS);
  const W = COLS * SW;
  const H = rows * SW;
  const rgbaRows = [];
  for (let y = 0; y < H; y++) {
    const line = Buffer.alloc(W * 4);
    for (let x = 0; x < W; x++) {
      const col = Math.floor(x / SW);
      const row = Math.floor(y / SW);
      const idx = row * COLS + col;
      const p = PALETTE[idx];
      let r = 10, g = 31, b = 26, a = 255; // 빈 칸은 배경색
      if (p) [r, g, b] = rgb(p.hex);
      const o = x * 4;
      line[o] = r; line[o + 1] = g; line[o + 2] = b; line[o + 3] = a;
    }
    rgbaRows.push(line);
  }
  writeFileSync(join(OUT_DIR, "frog-race-16bit.png"), encodePNG(W, H, rgbaRows));
}

writeGPL();
writeMD();
writePNG();
console.log(`팔레트 산출물 생성 완료 (${PALETTE.length}색) → palette/frog-race-16bit.{gpl,png,md}`);
