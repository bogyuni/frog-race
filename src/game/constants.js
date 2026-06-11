// 프로그레이스 — 공통 상수 / 캐릭터 정의 (Frog Race Prototype Spec v1.0 기반)

export const COLORS = {
  bg: 0x0e2a24,
  panel: 0x16382f,
  panelLight: 0x1e4a3d,
  lily: 0x6fbf73,
  firefly: 0xffd95e,
  water: 0x3e8e9e,
  pink: 0xff8fa3,
  cream: 0xf2efe0,
  dim: 0x9db8a8,
  dark: 0x0a1f1a,
};

export const CSS = {
  bg: "#0E2A24",
  panel: "#16382F",
  panelLight: "#1E4A3D",
  lily: "#6FBF73",
  firefly: "#FFD95E",
  water: "#3E8E9E",
  pink: "#FF8FA3",
  cream: "#F2EFE0",
  dim: "#9DB8A8",
  dark: "#0A1F1A",
  panelTranslucent: "rgba(22, 56, 47, 0.45)",
};

export const GAME_W = 1280;
export const GAME_H = 720;

/* ── 레이스 화면 레이아웃 (16:9, 좌:우 = 8:2) ── */
export const TRACK_PANEL_W = Math.round(GAME_W * 0.8); // 1024 — 좌측 레이스 트랙
export const SIDE_PANEL_W = GAME_W - TRACK_PANEL_W;    // 256 — 우측 선택UI/상태

export const FONT = "'Noto Sans KR', sans-serif";

/* ── 레이스 규칙 (스펙 v1.0) ── */
export const RULES = {
  TRACK: 100,            // 트랙 길이 (칸)
  BASE_SPEED: 2.0,       // 기본 이동 (칸/초) — 모든 개구리 지속 전진
  SPEED_WOBBLE: 0.15,    // 기본 이동 속도 흔들림 (±비율)
  EVENT_INTERVAL: 2000,  // 선택 이벤트 간격 (ms, 씬 기준)
  SELECT_MOVE: 5,        // 선택 시 전진량
  GAUGE_MAX: 5,          // 스킬 게이지 최대치
  RAIN_CHANCE: 0.15,     // 선택 이벤트 시 비 발생 확률 (스펙 0.2 → 밸런스 조정)
  RAIN_DURATION: 3,      // 비 지속 (선택 이벤트 횟수)
  RAIN_COOLDOWN: 2,      // 비 종료 후 재발생 금지 (선택 이벤트 횟수)
  RAIN_SLOW: 0.6,        // 비 상태 이동량 배율 (감속 효과 40%) — 비개구리 면역 패시브와 겹쳐 과도한 밸런스 붕괴 방지를 위해 원래 수치 유지
  BACKRUN_AT: 50,        // 백도 활성화 (선두 진행률)
  BACKRUN_EVERY: 4,      // 선택 이벤트 N회당 백도 1회
  BACKRUN_MOVE: 5,       // 백도 후퇴량
  BACKRUN_SAFE: 95,      // 이 위치 이상은 백도 대상 제외
  MAX_PLAYERS: 8,
};

/* ── 캐릭터 8종 ──
   skillType: active = 게이지 5 + 선택 시 발동 / passive = 상시 적용 */
export const CHARACTERS = [
  {
    id: "tree",
    name: "청개구리",
    color: 0x4ecb5f,
    colorCss: "#4ECB5F",
    skillType: "active",
    skillName: "더블 점프",
    skillDesc: "발동 시 +10칸 이동",
  },
  {
    id: "toad",
    name: "두꺼비",
    color: 0xa87b4f,
    colorCss: "#A87B4F",
    skillType: "passive",
    skillName: "묵직한 뚝심",
    skillDesc: "백도 효과 무시",
  },
  {
    id: "maeng",
    name: "맹꽁이",
    color: 0xd9c95a,
    colorCss: "#D9C95A",
    skillType: "active",
    skillName: "방해 울음",
    skillDesc: "자신 제외 모든 개구리 -5칸",
  },
  {
    id: "rain",
    name: "비개구리",
    color: 0x4fa8c9,
    colorCss: "#4FA8C9",
    skillType: "passive",
    skillName: "빗물 타기",
    skillDesc: "비 상태 이동 감소 무시",
  },
  {
    id: "horn",
    name: "뿔개구리",
    color: 0xc9743f,
    colorCss: "#C9743F",
    skillType: "active",
    skillName: "분노의 돌진",
    skillDesc: "50% 확률로 자신의 현재 등수 x 3칸 전진",
    gaugeMax: 6, // 다른 액티브보다 게이지 1칸 더 필요 (밸런스 조정)
  },
  {
    id: "fire",
    name: "무당개구리",
    color: 0x5f9e4e,
    colorCss: "#5F9E4E",
    skillType: "active",
    skillName: "현혹의 춤",
    skillDesc: "50% 확률로 +20칸 전진, 실패 시 -20칸 후퇴",
  },
  {
    id: "claw",
    name: "발톱개구리",
    color: 0xc9a8a0,
    colorCss: "#C9A8A0",
    skillType: "passive",
    skillName: "역습의 발톱",
    skillDesc: "백도 대상이 되면 전원 -5칸, 자신 +5칸",
  },
  {
    id: "wood",
    name: "나무개구리",
    color: 0x8fbf4f,
    colorCss: "#8FBF4F",
    skillType: "passive",
    skillName: "끈질긴 추격",
    skillDesc: "선택 시 바로 앞 개구리 위치까지 추격 (최소 +5칸)",
  },
];
