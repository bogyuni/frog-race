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
    resolution: Math.max(window.devicePixelRatio || 1, 1),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [TitleScene, LobbyScene, RaceScene, ResultScene],
  });

document.fonts.ready.then(boot).catch(boot);
