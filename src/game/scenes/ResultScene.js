import Phaser from "phaser";
import { CSS, FONT, GAME_W, GAME_H, CHARACTERS } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton } from "../ui.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  init(data) {
    this.ranks = data.rankings || [];
    this.players = data.players || [];
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    const winner = this.ranks[0];

    // 좌/우 분할 (좌: 우승 연출+응원 결과, 우: 전체 순위+버튼)
    const leftCx = GAME_W * 0.25; // 320
    const rightCx = GAME_W * 0.75; // 960

    this.add
      .rectangle(GAME_W / 2, GAME_H / 2, 2, GAME_H - 40, 0x1e4a3d)
      .setAlpha(0.6);

    /* ── 좌측: 우승 연출 ── */
    this.add
      .text(leftCx, 46, "🏁 레이스 결과", {
        fontFamily: FONT, fontSize: "24px", color: CSS.dim,
      })
      .setOrigin(0.5);
    this.add
      .text(leftCx, 102, `${winner.name} 우승!`, {
        fontFamily: FONT, fontSize: "38px", color: CSS.firefly, fontStyle: "700",
      })
      .setOrigin(0.5);

    // 시상대 (1~3위)
    const podiumY = 260;
    const podium = [
      { rank: 1, x: leftCx, h: 110 },
      { rank: 2, x: leftCx - 150, h: 75 },
      { rank: 3, x: leftCx + 150, h: 50 },
    ];
    podium.forEach(({ rank, x, h }) => {
      const r = this.ranks[rank - 1];
      if (!r) return;
      this.add
        .rectangle(x, podiumY + 40 - h / 2, 96, h, 0x1e4a3d)
        .setStrokeStyle(1, 0x3e7a64);
      this.add
        .text(x, podiumY + 40 - h + 16, MEDALS[rank - 1], { fontSize: "20px" })
        .setOrigin(0.5);
      const spr = this.add.image(x, podiumY - h + 14, `frog-${r.id}`).setScale(rank === 1 ? 1.2 : 1.0);
      if (rank === 1) {
        this.tweens.add({
          targets: spr, y: spr.y - 10, duration: 480, yoyo: true,
          repeat: -1, ease: "Sine.easeInOut",
        });
      }
      this.add
        .text(x, podiumY + 54, r.name, {
          fontFamily: FONT, fontSize: "16px", color: r.colorCss,
        })
        .setOrigin(0.5);
    });

    // 응원 결과
    const cheerTop = 410;
    if (this.players.length > 0) {
      this.add
        .text(leftCx, cheerTop, "─ 응원 결과 ─", {
          fontFamily: FONT, fontSize: "15px", color: CSS.dim,
        })
        .setOrigin(0.5);
      this.players.forEach((p, i) => {
        const rank = this.ranks.findIndex((r) => r.id === p.frogId) + 1;
        const c = CHARACTERS.find((ch) => ch.id === p.frogId);
        const col = i % 2;
        const row = Math.floor(i / 2);
        const won = rank === 1;
        this.add
          .text(
            leftCx - 150 + col * 300, cheerTop + 36 + row * 30,
            `${p.label} ★${c.name} → ${rank}위 ${won ? "🎉" : ""}`,
            {
              fontFamily: FONT, fontSize: "15px",
              color: won ? CSS.firefly : CSS.cream,
            }
          )
          .setOrigin(0.5, 0);
      });
    } else {
      this.add
        .text(leftCx, cheerTop, "관전 모드", {
          fontFamily: FONT, fontSize: "15px", color: CSS.dim,
        })
        .setOrigin(0.5);
    }

    /* ── 우측: 전체 순위 + 버튼 ── */
    this.add
      .text(rightCx, 46, "최종 순위", {
        fontFamily: FONT, fontSize: "24px", color: CSS.dim,
      })
      .setOrigin(0.5);

    const listLeft = rightCx - 230;
    const listRight = rightCx + 230;
    const rowH = 58;
    const rowTop = 90;
    this.ranks.forEach((r, i) => {
      const y = rowTop + i * rowH;
      if (i % 2 === 0) {
        this.add
          .rectangle(rightCx, y, listRight - listLeft, rowH - 4, 0x16382f)
          .setAlpha(0.6);
      }
      this.add
        .text(listLeft + 4, y, i < 3 ? MEDALS[i] : `${i + 1}위`, {
          fontFamily: FONT, fontSize: "18px", color: CSS.cream,
        })
        .setOrigin(0, 0.5);
      this.add.image(listLeft + 64, y, `frog-${r.id}`).setScale(0.6);
      this.add
        .text(listLeft + 100, y, r.name, {
          fontFamily: FONT, fontSize: "18px", color: r.colorCss, fontStyle: "700",
        })
        .setOrigin(0, 0.5);

      const cheerers = this.players.filter((p) => p.frogId === r.id).map((p) => p.label);
      if (cheerers.length > 0) {
        this.add
          .text(listRight - 4, y, `★ ${cheerers.join(" ")}`, {
            fontFamily: FONT, fontSize: "14px", color: i === 0 ? CSS.firefly : CSS.dim,
          })
          .setOrigin(1, 0.5);
      }
    });

    // 버튼 3개 가로 배치
    const btnY = rowTop + this.ranks.length * rowH + 36;
    const btnW = 180;
    const btnGap = 20;
    const colX = (i) => rightCx - (3 * btnW + 2 * btnGap) / 2 + i * (btnW + btnGap) + btnW / 2;

    makeButton(this, colX(0), btnY, btnW, 56, "🔁 다시!", () => {
      this.scene.start("Race");
    }, { fontSize: "17px" });
    makeButton(this, colX(1), btnY, btnW, 56, "👥 참가자 등록", () => {
      this.scene.start("Lobby");
    }, { ghost: true, fontSize: "15px" });
    makeButton(this, colX(2), btnY, btnW, 56, "처음 화면", () => {
      this.scene.start("Title");
    }, { ghost: true, fontSize: "15px" });
  }
}
