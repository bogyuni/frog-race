import Phaser from "phaser";
import { CSS, FONT, GAME_W, GAME_H, CHARACTERS, GOAL } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton } from "../ui.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    const cx = GAME_W / 2;

    // 배경 장식 연잎
    [
      [60, 120], [400, 90], [90, 700], [410, 760], [240, 640],
    ].forEach(([x, y]) => {
      this.add
        .text(x, y, "🪷", { fontSize: "26px" })
        .setOrigin(0.5)
        .setAlpha(0.25);
    });

    this.add
      .text(cx, 150, "개굴더비", {
        fontFamily: FONT,
        fontSize: "58px",
        color: CSS.firefly,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 200, "FROG DERBY · 운명의 연못 레이스", {
        fontFamily: FONT,
        fontSize: "16px",
        color: CSS.dim,
      })
      .setOrigin(0.5);

    // 출전 개구리 4마리 소개
    const startY = 270;
    CHARACTERS.forEach((c, i) => {
      const y = startY + i * 78;
      this.add
        .rectangle(cx, y, 420, 68, 0x16382f)
        .setStrokeStyle(1, 0x1e4a3d);
      const frog = this.add.image(60, y, `frog-${c.id}`);
      this.tweens.add({
        targets: frog,
        y: y - 7,
        duration: 600 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.add.text(100, y - 24, c.name, {
        fontFamily: FONT,
        fontSize: "20px",
        color: CSS.cream,
      });
      this.add.text(200, y - 20, `[${c.skillName}]`, {
        fontFamily: FONT,
        fontSize: "14px",
        color: c.colorCss,
      });
      this.add.text(100, y + 2, c.skillDesc, {
        fontFamily: FONT,
        fontSize: "12px",
        color: CSS.dim,
        wordWrap: { width: 330 },
      });
    });

    this.add
      .text(cx, 620, `매 뽑기마다 한 마리가 전진! 먼저 ${GOAL}칸을 가면 우승\n전원이 첫 칸을 지나면 후진 뽑기가 시작됩니다`, {
        fontFamily: FONT,
        fontSize: "14px",
        color: CSS.dim,
        align: "center",
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    makeButton(this, cx, 700, 300, 58, "🚩 레이스 시작", () => {
      // 임시: 내 응원 개구리를 랜덤 배정
      const playerId =
        CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      this.registry.set("playerId", playerId);
      this.scene.start("Race");
    });

    makeButton(
      this, cx, 768, 300, 46, "🧪 프로토타입 (육성 버전)",
      () => {
        import("../../prototypeLauncher.jsx").then((m) => {
          // 입력 처리 중 destroy하면 Phaser가 에러를 낼 수 있어 다음 틱으로 미룸
          setTimeout(() => {
            this.game.destroy(true);
            m.mountPrototype();
          }, 0);
        });
      },
      { ghost: true, fontSize: "17px" }
    );

    this.add
      .text(cx, GAME_H - 26, "내 개구리는 레이스 시작 시 랜덤으로 배정됩니다 (임시)", {
        fontFamily: FONT,
        fontSize: "12px",
        color: CSS.dim,
      })
      .setOrigin(0.5);
  }
}
