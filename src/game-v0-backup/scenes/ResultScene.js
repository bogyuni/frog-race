import Phaser from "phaser";
import { CSS, FONT, GAME_W, CHARACTERS, GOAL } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton } from "../ui.js";

const MEDALS = ["🥇", "🥈", "🥉", "🎗️"];

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  init(data) {
    this.ranks = data.rankings || [];
    this.playerId = data.playerId;
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    const cx = GAME_W / 2;
    const myRank = this.ranks.findIndex((r) => r.id === this.playerId) + 1;
    const winner = this.ranks[0];

    this.add
      .text(cx, 90, MEDALS[0], { fontSize: "60px" })
      .setOrigin(0.5);
    this.add
      .text(cx, 165, `${winner.name} 우승!`, {
        fontFamily: FONT, fontSize: "36px", color: CSS.firefly,
      })
      .setOrigin(0.5);

    const winSpr = this.add.image(cx, 240, `frog-${winner.id}`).setScale(1.4);
    this.tweens.add({
      targets: winSpr, y: 228, duration: 500, yoyo: true, repeat: -1,
      ease: "Sine.easeInOut",
    });

    const msg =
      myRank === 1
        ? "내 개구리가 우승했다!! 🎉"
        : `내 개구리는 ${myRank}위... 다음 기회에!`;
    this.add
      .text(cx, 310, msg, {
        fontFamily: FONT, fontSize: "18px",
        color: myRank === 1 ? CSS.firefly : CSS.dim,
      })
      .setOrigin(0.5);

    // 순위표
    const top = 360;
    this.add
      .rectangle(cx, top + 100, 400, 200, 0x16382f)
      .setStrokeStyle(1, 0x1e4a3d);
    this.ranks.forEach((r, i) => {
      const y = top + 30 + i * 46;
      const mine = r.id === this.playerId;
      this.add.text(46, y - 12, `${MEDALS[i] || ""} ${i + 1}위`, {
        fontFamily: FONT, fontSize: "17px", color: CSS.cream,
      });
      this.add.image(150, y, `frog-${r.id}`).setScale(0.6);
      this.add.text(180, y - 12, `${r.name}${mine ? " ★" : ""}`, {
        fontFamily: FONT, fontSize: "17px",
        color: mine ? CSS.firefly : r.colorCss,
      });
      this.add
        .text(GAME_W - 50, y - 10, `${Math.min(r.pos, GOAL)}칸`, {
          fontFamily: FONT, fontSize: "14px", color: CSS.dim,
        })
        .setOrigin(1, 0);
    });

    makeButton(this, cx, 660, 300, 56, "🔁 다시 레이스!", () => {
      const playerId =
        CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
      this.registry.set("playerId", playerId);
      this.scene.start("Race");
    });
    makeButton(
      this, cx, 736, 300, 50, "처음 화면으로",
      () => this.scene.start("Title"),
      { ghost: true, fontSize: "18px" }
    );
  }
}
