import Phaser from "phaser";
import { CSS, FONT, GAME_W, GAME_H, CHARACTERS, RULES } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton } from "../ui.js";

// 참가자 등록: 인원 선택 → 순서대로 개구리 선택 → 레이스 시작
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super("Lobby");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    this.players = [];
    this.playerCount = 0;
    this.stepObjects = [];
    this.showCountStep();
  }

  clearStep() {
    this.stepObjects.forEach((o) => o.destroy());
    this.stepObjects = [];
  }

  track(...objs) {
    objs.forEach((o) => {
      if (o.rect) {
        // makeButton 반환 객체
        this.stepObjects.push(o.rect, o.text);
      } else {
        this.stepObjects.push(o);
      }
    });
  }

  /* ── 1단계: 인원 선택 ── */
  showCountStep() {
    this.clearStep();
    const cx = GAME_W / 2;
    this.track(
      this.add
        .text(cx, 70, "참가자 등록", {
          fontFamily: FONT, fontSize: "36px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5),
      this.add
        .text(cx, 116, "몇 명이 참가하나요?", {
          fontFamily: FONT, fontSize: "18px", color: CSS.cream,
        })
        .setOrigin(0.5)
    );

    const size = 130;
    const gap = 16;
    const startX = cx - (RULES.MAX_PLAYERS * size + (RULES.MAX_PLAYERS - 1) * gap) / 2;
    const y = 320;
    for (let n = 1; n <= RULES.MAX_PLAYERS; n++) {
      const x = startX + (n - 1) * (size + gap) + size / 2;
      this.track(
        makeButton(this, x, y, size, size, `${n}명`, () => {
          this.playerCount = n;
          this.showPickStep(0);
        }, { fontSize: "28px" })
      );
    }

    this.track(
      this.add
        .text(cx, 470, "참가자는 각자 응원할 개구리를 고릅니다\n참가자 수만큼의 개구리가 레이스에 참여합니다", {
          fontFamily: FONT, fontSize: "15px", color: CSS.dim,
          align: "center", lineSpacing: 6,
        })
        .setOrigin(0.5),
      makeButton(this, cx, 600, 280, 50, "← 처음으로", () => this.scene.start("Title"), {
        ghost: true, fontSize: "18px",
      })
    );
  }

  /* ── 2단계: 플레이어별 개구리 선택 ── */
  showPickStep(idx) {
    this.clearStep();
    const cx = GAME_W / 2;

    if (idx >= this.playerCount) {
      this.showSummaryStep();
      return;
    }

    this.track(
      this.add
        .text(cx, 36, `P${idx + 1} 차례`, {
          fontFamily: FONT, fontSize: "28px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5),
      this.add
        .text(cx, 70, "응원할 개구리를 선택하세요 (중복 가능)", {
          fontFamily: FONT, fontSize: "14px", color: CSS.dim,
        })
        .setOrigin(0.5)
    );

    const cellW = 280;
    const cellH = 180;
    const gap = 16;
    const gridTop = 102;
    const startX = cx - (4 * cellW + 3 * gap) / 2;
    CHARACTERS.forEach((c, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = startX + col * (cellW + gap) + cellW / 2;
      const y = gridTop + row * (cellH + gap) + cellH / 2;

      const card = this.add
        .rectangle(x, y, cellW, cellH, 0x16382f)
        .setStrokeStyle(2, 0x1e4a3d)
        .setInteractive({ useHandCursor: true });
      card.on("pointerover", () => card.setStrokeStyle(2, 0xffd95e));
      card.on("pointerout", () => card.setStrokeStyle(2, 0x1e4a3d));
      card.on("pointerup", () => {
        this.players.push({ label: `P${idx + 1}`, frogId: c.id });
        this.showPickStep(idx + 1);
      });

      const img = this.add.image(x - cellW / 2 + 40, y - 50, `frog-${c.id}`).setScale(1.1);
      const picks = this.players
        .filter((p) => p.frogId === c.id)
        .map((p) => p.label)
        .join(" ");

      this.track(
        card,
        img,
        this.add.text(x - cellW / 2 + 84, y - 74, c.name, {
          fontFamily: FONT, fontSize: "18px", color: CSS.cream, fontStyle: "700",
        }),
        this.add.text(x - cellW / 2 + 84, y - 48, `${c.skillType === "active" ? "🔶" : "🔷"} ${c.skillName}`, {
          fontFamily: FONT, fontSize: "13px", color: c.colorCss,
        }),
        this.add.text(x - cellW / 2 + 14, y - 18, c.skillDesc, {
          fontFamily: FONT, fontSize: "12px", color: CSS.dim,
          wordWrap: { width: cellW - 28 }, lineSpacing: 3,
        }),
        this.add.text(x - cellW / 2 + 14, y + 60, picks ? `선택: ${picks}` : "", {
          fontFamily: FONT, fontSize: "12px", color: CSS.firefly,
        })
      );
    });

    const gridBottom = gridTop + 2 * cellH + gap;
    this.track(
      makeButton(this, cx, gridBottom + 36, 320, 48, "🎲 남은 인원 랜덤 배정", () => {
        for (let i = idx; i < this.playerCount; i++) {
          const c = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          this.players.push({ label: `P${i + 1}`, frogId: c.id });
        }
        this.showSummaryStep();
      }, { ghost: true, fontSize: "16px" })
    );
  }

  /* ── 3단계: 확인 ── */
  showSummaryStep() {
    this.clearStep();
    const cx = GAME_W / 2;
    this.track(
      this.add
        .text(cx, 56, "출전 준비 완료!", {
          fontFamily: FONT, fontSize: "32px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5)
    );

    this.players.forEach((p, i) => {
      const c = CHARACTERS.find((ch) => ch.id === p.frogId);
      const y = 122 + i * 56;
      this.track(
        this.add
          .rectangle(cx, y, 480, 48, 0x16382f)
          .setStrokeStyle(1, 0x1e4a3d),
        this.add.text(cx - 220, y - 11, p.label, {
          fontFamily: FONT, fontSize: "17px", color: CSS.firefly,
        }),
        this.add.image(cx - 150, y, `frog-${c.id}`).setScale(0.62),
        this.add.text(cx - 116, y - 11, c.name, {
          fontFamily: FONT, fontSize: "17px", color: c.colorCss,
        }),
        this.add
          .text(cx + 220, y - 9, c.skillName, {
            fontFamily: FONT, fontSize: "13px", color: CSS.dim,
          })
          .setOrigin(1, 0)
      );
    });

    this.track(
      makeButton(this, cx, 630, 360, 56, "🚩 레이스 시작!", () => {
        this.registry.set("mode", "lobby");
        this.registry.set("players", this.players);
        this.scene.start("Race");
      }),
      makeButton(this, cx, 690, 360, 40, "다시 등록", () => {
        this.players = [];
        this.showCountStep();
      }, { ghost: true, fontSize: "15px" })
    );
  }
}
