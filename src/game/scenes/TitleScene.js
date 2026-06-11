import Phaser from "phaser";
import { CSS, FONT, GAME_W, GAME_H, CHARACTERS, RULES } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton, makeMusicToggle } from "../ui.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    const cx = GAME_W / 2;

    // 배경 연잎
    [
      [50, 60], [GAME_W - 50, 50], [60, GAME_H - 40], [GAME_W - 60, GAME_H - 50], [cx, GAME_H - 20],
    ].forEach(([x, y]) => {
      this.add.text(x, y, "🪷", { fontSize: "26px" }).setOrigin(0.5).setAlpha(0.22);
    });

    this.add
      .text(cx, 40, "프로그레이스", {
        fontFamily: FONT, fontSize: "46px", color: CSS.firefly, fontStyle: "700",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 78, `FROG RACE · ${RULES.TRACK}칸 랜덤 레이스`, {
        fontFamily: FONT, fontSize: "14px", color: CSS.dim,
      })
      .setOrigin(0.5);

    makeMusicToggle(this, GAME_W - 140, 14);

    // 출전 개구리 8종 쇼케이스 (4열 × 2행)
    const cellW = 290;
    const cellH = 148;
    const gap = 10;
    const gridTop = 110;
    const startX = cx - (4 * cellW + 3 * gap) / 2;
    CHARACTERS.forEach((c, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * (cellW + gap) + cellW / 2;
      const y = gridTop + row * (cellH + gap) + cellH / 2;

      this.add
        .rectangle(x, y, cellW, cellH, 0x16382f)
        .setStrokeStyle(1, 0x1e4a3d);
      const frog = this.add.image(x - cellW / 2 + 38, y - 8, `frog-${c.id}`).setScale(1.05);
      this.tweens.add({
        targets: frog, y: y - 16,
        duration: 550 + (i % 4) * 110,
        yoyo: true, repeat: -1, ease: "Sine.easeInOut",
      });
      this.add.text(x - cellW / 2 + 76, y - 50, c.name, {
        fontFamily: FONT, fontSize: "18px", color: CSS.cream, fontStyle: "700",
      });
      this.add.text(x - cellW / 2 + 76, y - 24, `${c.skillType === "active" ? "🔶" : "🔷"} ${c.skillName}`, {
        fontFamily: FONT, fontSize: "13px", color: c.colorCss,
      });
      this.add.text(x - cellW / 2 + 14, y + 6, c.skillDesc, {
        fontFamily: FONT, fontSize: "12px", color: CSS.dim,
        wordWrap: { width: cellW - 28 }, lineSpacing: 3,
      });
    });

    const legendY = gridTop + 2 * cellH + gap + 18;
    this.add
      .text(cx, legendY, "🔶 액티브: 게이지 5 모은 뒤 선택되면 발동  ·  🔷 패시브: 상시 적용", {
        fontFamily: FONT, fontSize: "13px", color: CSS.dim,
      })
      .setOrigin(0.5);

    // 버튼 3개 가로 배치
    const btnY = legendY + 50;
    const btnW = 380;
    const btnGap = 20;
    const colX = (i) => cx - (3 * btnW + 2 * btnGap) / 2 + i * (btnW + btnGap) + btnW / 2;

    makeButton(this, colX(0), btnY, btnW, 70, "🚩 빠른 시작 (혼자 관전)", () => {
      const frogId = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      this.registry.set("mode", "quick");
      this.registry.set("players", [{ label: "P1", frogId }]);
      this.scene.start("Race");
    }, { fontSize: "22px" });

    makeButton(
      this, colX(1), btnY, btnW, 70, "👥 참가자 등록 (1~8명)",
      () => this.scene.start("Lobby"),
      { ghost: true, fontSize: "20px" }
    );

    makeButton(
      this, colX(2), btnY, btnW, 70, "🧪 프로토타입 (육성 버전)",
      () => {
        import("../../prototypeLauncher.jsx").then((m) => {
          setTimeout(() => {
            this.game.destroy(true);
            m.mountPrototype();
          }, 0);
        });
      },
      { ghost: true, fontSize: "16px" }
    );
  }
}
