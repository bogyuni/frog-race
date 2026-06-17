import Phaser from "phaser";
import { GAME_W, GAME_H, CSS } from "./game/constants.js";
import { sound } from "./game/sound.js";
import BootScene from "./game/scenes/BootScene.js";
import TitleScene from "./game/scenes/TitleScene.js";
import LobbyScene from "./game/scenes/LobbyScene.js";
import RaceScene from "./game/scenes/RaceScene.js";
import ResultScene from "./game/scenes/ResultScene.js";
import AssetPreviewScene from "./game/scenes/AssetPreviewScene.js";

// 고해상도(레티나/모바일 고DPI) 대응 — 백킹 해상도를 DPR배로 키워 렌더링.
// 좌표계는 각 씬이 카메라 줌(=RS)으로 1280x720 논리 좌표를 유지하므로 코드 좌표는 불변.
//
// ⚠ 성능(2026-06-17): 실기기 18fps 디버깅 중. 우선 슈퍼샘플 해제(RS=1)로
//   픽셀 채움 부담을 제거하고 드로우콜 절감과 함께 원인을 좁힌다.
//   (선명도는 추후 픽셀아트 NEAREST로 해상도 무관하게 확보 예정)
const RS = 1;

// 폰트 로드 후 게임 시작 (실패해도 폴백 폰트로 진행)
const boot = () =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "root",
    width: GAME_W * RS,
    height: GAME_H * RS,
    backgroundColor: CSS.bg,
    // ── 렌더 루프 / 발열 (2026-06-17, v0.2.4) ──
    // 드로우콜 최적화 후 S24는 RAF에서 90~120fps로 돌아 발열이 컸다. 60fps로 상한해
    // 작업량을 ~1/3 줄여 발열을 낮춘다. (드로우콜이 가벼워 60은 항상 안정적으로 달성 → 끊김 없음.
    //  과거 30fps setTimeout의 끊김은 사실 드로우콜 과다로 18fps밖에 못 낸 탓이었음)
    // 더 줄이려면 target을 45/30으로 (이 게임은 느려서 45도 충분히 부드러움).
    fps: { target: 60, forceSetTimeOut: true },
    render: { powerPreference: "low-power" },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, TitleScene, LobbyScene, RaceScene, ResultScene, AssetPreviewScene],
  });

// 앱이 백그라운드로 전환되면 게임 루프(loop.sleep/wake)와 배경음을 일시정지/재개한다
const watchVisibility = (game) => {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.loop.sleep();
      sound.suspend();
    } else {
      game.loop.wake();
      sound.resume();
    }
  });
};

document.fonts.ready.then(boot).catch(boot).then(watchVisibility);
