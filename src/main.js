import Phaser from "phaser";
import { GAME_W, GAME_H, CSS } from "./game/constants.js";
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
    // 고주사율(90/120Hz) 모바일 기기에서 불필요하게 자주 갱신되어 발열이
    // 심해지는 것을 막기 위해 60fps로 제한 + 저전력 GPU 모드 사용
    fps: { limit: 60 },
    render: { powerPreference: "low-power" },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [TitleScene, LobbyScene, RaceScene, ResultScene],
  });

document.fonts.ready.then(boot).catch(boot);
