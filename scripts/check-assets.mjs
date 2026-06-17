// 에셋 검증: 진행도 + 캔버스 크기 + 팔레트 위반 색 점검
//   - PLANNED_SPRITES 를 순회하며 public/<path> 존재 여부 확인
//   - 존재하면 PNG 디코드 → 권장 크기 일치 / 팔레트(palette.js) 외 색 사용 여부 검사
//   - 지원: 8비트 PNG, 컬러타입 2(RGB)/6(RGBA)/3(indexed), non-interlaced (Piskel/Aseprite 기본 출력)
// 실행: node scripts/check-assets.mjs
import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PLANNED_SPRITES, SPRITE_ASSETS } from "../src/game/assets/manifest.js";
import { PALETTE_HEXES } from "../src/game/assets/palette.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// 지원 서브셋 PNG 디코드 → { width, height, colors:Set<hex(불투명만)> } | { unsupported }
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("PNG 시그니처 아님");
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let palette = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }

  if (bitDepth !== 8 || interlace !== 0 || ![2, 6, 3].includes(colorType)) {
    return { width, height, unsupported: true };
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let ip = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[ip++];
    const line = raw.subarray(ip, ip + stride);
    ip += stride;
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[x] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }

  const colors = new Set();
  for (let i = 0; i < width * height; i++) {
    let r, g, b, alpha = 255;
    if (colorType === 6) {
      r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; alpha = out[i * 4 + 3];
    } else if (colorType === 2) {
      r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2];
    } else {
      const idx = out[i];
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
      if (trns && idx < trns.length) alpha = trns[idx];
    }
    if (alpha === 0) continue; // 완전 투명은 무시
    colors.add(toHex(r, g, b));
  }
  return { width, height, colors };
}

const registered = new Set(SPRITE_ASSETS.map((a) => a.key));
let drawn = 0;
let problems = 0;

console.log("에셋 점검\n────────────────────────────────────────");
for (const a of PLANNED_SPRITES) {
  const file = join(PUBLIC, a.path);
  if (!existsSync(file)) {
    console.log(`· ${a.key.padEnd(12)} ⏳ 미작성  (${a.path})`);
    continue;
  }
  drawn++;
  let info;
  try {
    info = decodePNG(readFileSync(file));
  } catch (e) {
    problems++;
    console.log(`✗ ${a.key.padEnd(12)} 디코드 실패: ${e.message}`);
    continue;
  }

  const notes = [];
  const frames = a.frames || 1;
  const expW = a.w * frames;
  if (info.width !== expW || info.height !== a.h) {
    notes.push(`크기 ${info.width}×${info.height} (권장 ${expW}×${a.h}${frames > 1 ? ` = ${a.w}×${a.h} ${frames}프레임` : ""})`);
  }
  if (info.unsupported) {
    notes.push("팔레트 검사 불가(미지원 PNG 형식 — 8bit RGBA/RGB/indexed 권장)");
  } else {
    const bad = [...info.colors].filter((h) => !PALETTE_HEXES.has(h));
    if (bad.length) {
      notes.push(`팔레트 외 ${bad.length}색: ${bad.slice(0, 6).join(" ")}${bad.length > 6 ? " …" : ""}`);
    } else {
      notes.push(`${info.colors.size}색 OK`);
    }
  }
  const reg = registered.has(a.key) ? "" : "  ⚠ manifest 미등록(게임 미반영)";
  const ok = notes.every((n) => n.endsWith("OK")) && !reg;
  if (!ok) problems++;
  console.log(`${ok ? "✓" : "•"} ${a.key.padEnd(12)} ${notes.join(" / ")}${reg}`);
}

console.log("────────────────────────────────────────");
console.log(`진행도: ${drawn}/${PLANNED_SPRITES.length} 작성, 등록 ${registered.size}개`);
if (problems) {
  console.log(`⚠ 확인 필요 ${problems}건`);
  process.exitCode = 1;
} else if (drawn) {
  console.log("문제 없음");
}
