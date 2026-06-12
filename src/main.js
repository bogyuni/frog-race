import Phaser from "phaser";
import { GAME_W, GAME_H, CSS } from "./game/constants.js";
import { sound } from "./game/sound.js";
import TitleScene from "./game/scenes/TitleScene.js";
import LobbyScene from "./game/scenes/LobbyScene.js";
import RaceScene from "./game/scenes/RaceScene.js";
import ResultScene from "./game/scenes/ResultScene.js";

// 폰트 로드 후 게임 시작 (실패해도 폴백 폰트로 진행)
const boot = () =>
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "root",
    width: GAME_W,
    height: GAME_H,
    backgroundColor: CSS.bg,
    // 고주사율(90/120Hz) 모바일 기기에서 RAF가 화면 주사율만큼 과도하게
    // 호출되어 발열이 심해지는 것을 막기 위해 setTimeout 기반 30fps로
    // 고정 + 저전력 GPU 모드 사용
    fps: { target: 30, forceSetTimeOut: true },
    render: { powerPreference: "low-power" },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [TitleScene, LobbyScene, RaceScene, ResultScene],
  });

// forceSetTimeOut 모드는 탭/앱이 백그라운드로 가도 자동으로 멈추지 않으므로,
// 직접 게임 루프(loop.sleep/wake)와 배경음을 일시정지/재개한다
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
