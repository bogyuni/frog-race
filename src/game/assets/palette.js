// ───────────────────────────────────────────────────────────────────────────
// 프로그레이스 16비트 레트로 팔레트 (단일 진실 소스 / Single Source of Truth)
//
// 모든 픽셀아트 에셋은 여기 정의된 색만 사용한다. (SNES 마리오카트 같은 제한 팔레트)
//   - 게임 코드 / 프로시저럴 텍스처도 점진적으로 이 색을 참조
//   - scripts/gen-palette.mjs : 이 파일 → .gpl(Piskel/Aseprite import) / .png / .md 생성
//   - scripts/check-assets.mjs : 그린 PNG가 이 팔레트만 썼는지 검사
//
// 색을 추가/변경하려면 여기만 고치고 `node scripts/gen-palette.mjs` 재실행.
// ───────────────────────────────────────────────────────────────────────────

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toRGB = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) =>
  "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("").toUpperCase();

// 흰색 쪽으로 섞어 밝게 / 검정 쪽으로 곱해 어둡게 — 프로시저럴 텍스처와 동일한 음영 의도
const lighten = (h, t) => toHex(toRGB(h).map((v) => v + (255 - v) * t));
const darken = (h, t) => toHex(toRGB(h).map((v) => v * (1 - t)));

// 개구리 8종: 기본색(캐릭터 정체성) + 라이트/다크/다커 4단 램프
//   픽셀아트 음영용 — 캐릭터별로 이 4색을 기본으로 쓰면 종 정체성이 유지된다
const FROG_BASE = {
  tree: "#4ECB5F",
  toad: "#A87B4F",
  maeng: "#D9C95A",
  rain: "#4FA8C9",
  horn: "#C9743F",
  fire: "#5F9E4E",
  claw: "#C9A8A0",
  wood: "#8FBF4F",
};

function ramp(base) {
  return {
    darker: darken(base, 0.42),
    dark: darken(base, 0.24),
    base,
    light: lighten(base, 0.28),
  };
}

export const FROG_RAMPS = Object.fromEntries(
  Object.entries(FROG_BASE).map(([id, base]) => [id, ramp(base)])
);

// 환경 / 트랙 / UI / 공통 — 디자인 토큰(연못 테마) + 16비트 보정
export const ENV = {
  // 공통
  outline: "#14140F", // 스프라이트 외곽선 (거의 검정)
  ink: "#1A1A1A",     // 눈동자/짙은 디테일
  white: "#FFFFFF",   // 눈/하이라이트
  cream: "#F2EFE0",   // 배(belly)/밝은 면
  // 연못/배경
  bgDeep: "#0A1F1A",
  bg: "#0E2A24",
  panel: "#16382F",
  panelLight: "#1E4A3D",
  // 물 (라인 4단)
  waterDark: "#256570",
  water: "#3E8E9E",
  waterLight: "#6FC0CE",
  waterFoam: "#CFEEFA",
  // 식물/연잎
  lilyDark: "#3E7A64",
  lily: "#6FBF73",
  lilyLight: "#9FE060",
  // 흙/트랙 가장자리
  dirtDark: "#6B4A2E",
  dirt: "#9A6B3E",
  dirtLight: "#C79A5E",
  // 포인트
  firefly: "#FFD95E", // 반딧불 노랑
  gold: "#E0A93A",
  pink: "#FF8FA3",
  ember: "#FF6B4A", // 무당개구리 배/불꽃
  dim: "#9DB8A8",
};

// 검증/생성용 평탄화 — 그룹/이름 보존 (중복 hex는 첫 항목 이름으로 dedupe)
function buildFlat() {
  const seen = new Map();
  const push = (name, hex) => {
    const H = hex.toUpperCase();
    if (!seen.has(H)) seen.set(H, name);
  };
  for (const [id, r] of Object.entries(FROG_RAMPS)) {
    push(`${id}-darker`, r.darker);
    push(`${id}-dark`, r.dark);
    push(`${id}-base`, r.base);
    push(`${id}-light`, r.light);
  }
  for (const [name, hex] of Object.entries(ENV)) push(`env-${name}`, hex);
  return [...seen.entries()].map(([hex, name]) => ({ name, hex }));
}

export const PALETTE = buildFlat();
export const PALETTE_HEXES = new Set(PALETTE.map((p) => p.hex));
