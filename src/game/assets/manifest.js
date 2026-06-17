// ───────────────────────────────────────────────────────────────────────────
// 스프라이트 에셋 매니페스트
//
// SPRITE_ASSETS : 게임이 "실제로 로드"하는 목록.
//   - 여기 등록된 key는 BootScene이 PNG로 로드 → 프로시저럴 텍스처 대신 사용된다.
//   - 아직 안 그린 에셋은 등록하지 말 것 (목록에 없으면 자동으로 프로시저럴 폴백).
//   - 워크플로우: Piskel로 그려서 public/<path>에 저장 → 아래에 한 줄 추가 → 끝.
//   - frames>1 이면 가로 스트립 스프라이트시트로 로드하고 점프 애니(hop-<id>)를 만든다.
//     (프레임0=앉은 모습, 프레임1=뛰는 모습 … 번갈아 = 점프 애니메이션)
//     예) { key:"frog-tree", path:"sprites/frogs/tree.png", w:64, h:56, frames:2 }
//
// PLANNED_SPRITES : "그릴 예정"인 전체 목록(목표 스펙).
//   - 게임은 로드하지 않음. scripts/check-assets.mjs 가 진행도/사이즈/팔레트 검사에 사용.
//   - key는 SPRITE_ASSETS와 동일 규칙. w/h는 프레임 1장 크기, frames는 프레임 수.
//     (스트립 PNG 전체 크기 = w*frames × h)
//
// 경로는 public/ 기준. 예) public/sprites/frogs/tree.png → path:"sprites/frogs/tree.png"
// ───────────────────────────────────────────────────────────────────────────

export const SPRITE_ASSETS = [
  // { key: "frog-tree", path: "sprites/frogs/tree.png", w: 64, h: 56, frames: 2 },
];

// 개구리 8종 — 프레임 1장 64x56, 2프레임(앉음/점프) 권장 → 스트립 128x56.
// (단일 정지 프레임만 그려도 됨: frames:1. 더 작게 32x28로 그려 확대도 가능)
const FROG_W = 64;
const FROG_H = 56;
const frog = (id) => ({
  key: `frog-${id}`,
  path: `sprites/frogs/${id}.png`,
  w: FROG_W,
  h: FROG_H,
  frames: 2,
  group: "frogs",
});

export const PLANNED_SPRITES = [
  frog("tree"),  // 청개구리
  frog("toad"),  // 두꺼비
  frog("maeng"), // 맹꽁이
  frog("rain"),  // 비개구리
  frog("horn"),  // 뿔개구리
  frog("fire"),  // 무당개구리
  frog("claw"),  // 발톱개구리
  frog("wood"),  // 나무개구리
];
