import Phaser from "phaser";
import { CSS, FONT, GAME_W, CHARACTERS, RULES } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton } from "../ui.js";
import { sound } from "../sound.js";

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
          fontFamily: FONT, fontSize: "40px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5),
      this.add
        .text(cx, 120, "몇 명이 참가하나요?", {
          fontFamily: FONT, fontSize: "22px", color: CSS.cream,
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
          this.focusedId = CHARACTERS[0].id;
          this.showPickStep(0);
        }, { fontSize: "32px" })
      );
    }

    this.track(
      this.add
        .text(cx, 470, "참가자는 각자 응원할 개구리를 고릅니다\n참가자 수만큼의 개구리가 레이스에 참여합니다", {
          fontFamily: FONT, fontSize: "18px", color: CSS.dim,
          align: "center", lineSpacing: 8,
        })
        .setOrigin(0.5),
      makeButton(this, cx, 600, 280, 56, "← 처음으로", () => this.scene.start("Title"), {
        ghost: true, fontSize: "22px",
      })
    );
  }

  /* ── 2단계: 플레이어별 개구리 선택 ──
     좌(50%): 포커스된 개구리의 큰 이미지 + 설명
     우(50%): 2열 x 4행 이름 그리드 (탭하면 포커스만 이동)
     하단: "선택" 버튼으로 포커스된 개구리를 확정 */
  showPickStep(idx) {
    this.clearStep();

    if (idx >= this.playerCount) {
      this.showSummaryStep();
      return;
    }

    if (!this.focusedId) this.focusedId = CHARACTERS[0].id;
    const focused = CHARACTERS.find((c) => c.id === this.focusedId);

    const LEFT_CX = GAME_W * 0.25; // 320
    const RIGHT_X = GAME_W / 2;    // 640 — 우측 패널 시작
    const RIGHT_W = GAME_W / 2;    // 640
    const CONTENT_TOP = 92;
    const CONTENT_BOTTOM = 624;

    this.track(
      this.add
        .text(GAME_W / 2, 34, `P${idx + 1} 차례 — 응원할 개구리를 선택하세요`, {
          fontFamily: FONT, fontSize: "26px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5),
      this.add
        .text(GAME_W / 2, 66, "오른쪽에서 개구리를 고르면 왼쪽에 미리보기가 표시됩니다 (중복 선택 가능)", {
          fontFamily: FONT, fontSize: "16px", color: CSS.dim,
        })
        .setOrigin(0.5)
    );

    /* ── 좌측: 포커스된 개구리 큰 이미지 + 설명 ── */
    this.track(
      this.add
        .rectangle(LEFT_CX, (CONTENT_TOP + CONTENT_BOTTOM) / 2, GAME_W / 2 - 24, CONTENT_BOTTOM - CONTENT_TOP, 0x16382f)
        .setStrokeStyle(2, 0x1e4a3d),
      this.add.image(LEFT_CX, CONTENT_TOP + 130, `frog-${focused.id}`).setScale(3.2),
      this.add
        .text(LEFT_CX, CONTENT_TOP + 250, focused.name, {
          fontFamily: FONT, fontSize: "40px", color: focused.colorCss, fontStyle: "700",
        })
        .setOrigin(0.5),
      this.add
        .text(LEFT_CX, CONTENT_TOP + 302, `${focused.skillType === "active" ? "🔶" : "🔷"} ${focused.skillName}`, {
          fontFamily: FONT, fontSize: "24px", color: CSS.cream,
        })
        .setOrigin(0.5),
      this.add
        .text(LEFT_CX, CONTENT_TOP + 350, focused.skillDesc, {
          fontFamily: FONT, fontSize: "22px", color: CSS.dim,
          align: "center", wordWrap: { width: GAME_W / 2 - 80 }, lineSpacing: 10,
        })
        .setOrigin(0.5, 0)
    );

    /* ── 우측: 2x4 이름 선택 그리드 ── */
    const GRID_PAD = 24;
    const GRID_GAP = 16;
    const cellW = (RIGHT_W - GRID_PAD * 2 - GRID_GAP) / 2; // 288
    const cellH = (CONTENT_BOTTOM - CONTENT_TOP - GRID_GAP * 3) / 4; // 122

    CHARACTERS.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x0 = RIGHT_X + GRID_PAD + col * (cellW + GRID_GAP);
      const y0 = CONTENT_TOP + row * (cellH + GRID_GAP);
      const x = x0 + cellW / 2;
      const y = y0 + cellH / 2;
      const isFocused = c.id === this.focusedId;

      const card = this.add
        .rectangle(x, y, cellW, cellH, isFocused ? 0x1e4a3d : 0x16382f)
        .setStrokeStyle(isFocused ? 3 : 2, isFocused ? 0xffd95e : 0x1e4a3d)
        .setInteractive({ useHandCursor: true });
      card.on("pointerup", () => {
        sound.click();
        this.focusedId = c.id;
        this.showPickStep(idx);
      });

      const picks = this.players
        .filter((p) => p.frogId === c.id)
        .map((p) => p.label)
        .join(" ");

      this.track(
        card,
        this.add
          .text(x0 + 18, y0 + 14, c.name, {
            fontFamily: FONT, fontSize: "28px", fontStyle: "700",
            color: isFocused ? CSS.firefly : CSS.cream,
          }),
        this.add
          .text(x0 + 18, y0 + cellH - 36, `${c.skillType === "active" ? "🔶" : "🔷"} ${c.skillName}`, {
            fontFamily: FONT, fontSize: "16px", color: c.colorCss,
          }),
        this.add
          .text(x0 + cellW - 14, y0 + 12, picks ? `★${picks}` : "", {
            fontFamily: FONT, fontSize: "16px", color: CSS.firefly,
          })
          .setOrigin(1, 0)
      );
    });

    /* ── 하단: 선택 확정 / 랜덤 배정 ── */
    this.track(
      makeButton(this, RIGHT_X + RIGHT_W / 2, 672, 420, 64, `✅ ${focused.name} 선택`, () => {
        this.players.push({ label: `P${idx + 1}`, frogId: this.focusedId });
        this.showPickStep(idx + 1);
      }, { fontSize: "30px" }),
      makeButton(this, LEFT_CX, 672, 360, 52, "🎲 남은 인원 랜덤 배정", () => {
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
          fontFamily: FONT, fontSize: "36px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5)
    );

    this.players.forEach((p, i) => {
      const c = CHARACTERS.find((ch) => ch.id === p.frogId);
      const y = 122 + i * 64;
      this.track(
        this.add
          .rectangle(cx, y, 520, 58, 0x16382f)
          .setStrokeStyle(1, 0x1e4a3d),
        this.add.text(cx - 240, y - 13, p.label, {
          fontFamily: FONT, fontSize: "21px", color: CSS.firefly,
        }),
        this.add.image(cx - 160, y, `frog-${c.id}`).setScale(0.8),
        this.add.text(cx - 120, y - 13, c.name, {
          fontFamily: FONT, fontSize: "21px", color: c.colorCss,
        }),
        this.add
          .text(cx + 240, y - 10, c.skillName, {
            fontFamily: FONT, fontSize: "16px", color: CSS.dim,
          })
          .setOrigin(1, 0)
      );
    });

    this.track(
      makeButton(this, cx, 640, 360, 60, "🚩 레이스 시작!", () => {
        this.registry.set("mode", "lobby");
        this.registry.set("players", this.players);
        this.scene.start("Race");
      }, { fontSize: "26px" }),
      makeButton(this, cx, 698, 360, 44, "다시 등록", () => {
        this.players = [];
        this.focusedId = null;
        this.showCountStep();
      }, { ghost: true, fontSize: "18px" })
    );
  }
}
