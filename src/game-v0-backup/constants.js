// 개굴더비 — 공통 상수 / 캐릭터 정의

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
};

export const GAME_W = 480;
export const GAME_H = 854;

export const FONT = "'Jua', 'Gowun Dodum', sans-serif";

// 레이스 규칙
export const GOAL = 10;          // 10칸 도달 시 우승
export const MID = 5;            // 중간 지점 (스킬 발동 기준)
export const BACK_EVERY = 3;     // 후진 페이즈 진입 후, N번째 뽑기마다 후진 뽑기

// 캐릭터 4종
export const CHARACTERS = [
  {
    id: "tree",
    name: "청개구리",
    color: 0x6fbf73,
    colorCss: "#6FBF73",
    skillName: "더블 점프",
    skillDesc: "중간 지점 통과 후 처음 뽑히면 두 칸 이동 (1회)",
  },
  {
    id: "toad",
    name: "두꺼비",
    color: 0xb08850,
    colorCss: "#B08850",
    skillName: "묵직한 뚝심",
    skillDesc: "중간 지점 통과 후 후진 뽑기에 면역",
  },
  {
    id: "maeng",
    name: "맹꽁이",
    color: 0xffd95e,
    colorCss: "#FFD95E",
    skillName: "방해 울음",
    skillDesc: "중간 지점 통과 시 다음에 이동할 개구리를 1회 봉쇄 (자신 포함)",
  },
  {
    id: "rain",
    name: "레인프록",
    color: 0x3e8e9e,
    colorCss: "#3E8E9E",
    skillName: "빗물 타기",
    skillDesc: "중간 지점 통과 후 다른 개구리가 이동할 때 함께 한 칸 전진 (1회)",
  },
];
