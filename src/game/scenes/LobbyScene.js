import Phaser from "phaser";
import { CSS, FONT, GAME_W, CHARACTERS, RULES } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { makeButton, applyHiDPI } from "../ui.js";
import { sound } from "../sound.js";

// 로비: 모드 선택 → (A) 참가자 등록(각자 응원) 또는 (B) 단일 개구리 레이스
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super("Lobby");
  }

  create() {
    applyHiDPI(this);
    ensureFrogTextures(this, CHARACTERS);
    this.players = [];
    this.playerCount = 0;
    this.soloCount = 5;
    this.stepObjects = [];
    this.showModeStep();
  }

  /* ── 0단계: 모드 선택 ── */
  showModeStep() {
    this.clearStep();
    const cx = GAME_W / 2;
    this.track(
      this.add.text(cx, 86, "레이스 모드 선택", {
        fontFamily: FONT, fontSize: "42px", color: CSS.firefly, fontStyle: "700",
      }).setOrigin(0.5),
      makeButton(this, cx, 300, 580, 104, "👥 참가자 등록 — 각자 다른 개구리 응원", () => {
        this.players = [];
        this.showCountStep();
      }, { fontSize: "26px" }),
      this.add.text(cx, 364, "여러 명이 각자 개구리를 골라 응원합니다 (참가자 수만큼 출전)", {
        fontFamily: FONT, fontSize: "16px", color: CSS.dim,
      }).setOrigin(0.5),
      makeButton(this, cx, 470, 580, 104, "🐸 단일 개구리 — 같은 종 여러 마리 레이스", () => {
        this.focusedId = CHARACTERS[0].id;
        this.showSoloStep();
      }, { ghost: true, fontSize: "26px" }),
      this.add.text(cx, 534, "개구리 1종을 골라 같은 종 여러 마리가 달립니다 (예: 청개구리 5마리)", {
        fontFamily: FONT, fontSize: "16px", color: CSS.dim,
      }).setOrigin(0.5),
      makeButton(this, cx, 632, 280, 56, "← 처음으로", () => this.scene.start("Title"), {
        ghost: true, fontSize: "22px",
      })
    );
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
      makeButton(this, cx, 600, 280, 56, "← 모드 선택", () => this.showModeStep(), {
        ghost: true, fontSize: "22px",
      })
    );
  }

  /* ── 단일 개구리 모드: 개구리 1종 + 마리 수 선택 ──
     좌: 포커스된 개구리 큰 미리보기 / 우: 2x4 종류 선택 그리드
     하단: 마리 수(2~8) + 시작 */
  showSoloStep() {
    this.clearStep();
    if (!this.focusedId) this.focusedId = CHARACTERS[0].id;
    const focused = CHARACTERS.find((c) => c.id === this.focusedId);

    const LEFT_CX = GAME_W * 0.25;
    const RIGHT_X = GAME_W / 2;
    const RIGHT_W = GAME_W / 2;
    const CONTENT_TOP = 88;
    const CONTENT_BOTTOM = 560;

    this.track(
      this.add.text(GAME_W / 2, 32, "단일 개구리 레이스 — 종류와 마리 수를 고르세요", {
        fontFamily: FONT, fontSize: "26px", color: CSS.firefly, fontStyle: "700",
      }).setOrigin(0.5),
      this.add.text(GAME_W / 2, 62, "같은 종 여러 마리가 레인을 나눠 달립니다 (서는 순서는 랜덤)", {
        fontFamily: FONT, fontSize: "16px", color: CSS.dim,
      }).setOrigin(0.5)
    );

    // 좌측 미리보기
    this.track(
      this.add.rectangle(LEFT_CX, (CONTENT_TOP + CONTENT_BOTTOM) / 2, GAME_W / 2 - 24, CONTENT_BOTTOM - CONTENT_TOP, 0x16382f).setStrokeStyle(2, 0x1e4a3d),
      this.add.image(LEFT_CX, CONTENT_TOP + 120, `frog-${focused.id}`).setScale(3.0),
      this.add.text(LEFT_CX, CONTENT_TOP + 230, focused.name, { fontFamily: FONT, fontSize: "38px", color: focused.colorCss, fontStyle: "700" }).setOrigin(0.5),
      this.add.text(LEFT_CX, CONTENT_TOP + 280, `${focused.skillType === "active" ? "🔶" : "🔷"} ${focused.skillName}`, { fontFamily: FONT, fontSize: "22px", color: CSS.cream }).setOrigin(0.5),
      this.add.text(LEFT_CX, CONTENT_TOP + 322, focused.skillDesc, { fontFamily: FONT, fontSize: "20px", color: CSS.dim, align: "center", wordWrap: { width: GAME_W / 2 - 80 }, lineSpacing: 8 }).setOrigin(0.5, 0)
    );

    // 우측 2x4 종류 선택
    const GRID_PAD = 24, GRID_GAP = 14;
    const cellW = (RIGHT_W - GRID_PAD * 2 - GRID_GAP) / 2;
    const cellH = (CONTENT_BOTTOM - CONTENT_TOP - GRID_GAP * 3) / 4;
    CHARACTERS.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x0 = RIGHT_X + GRID_PAD + col * (cellW + GRID_GAP);
      const y0 = CONTENT_TOP + row * (cellH + GRID_GAP);
      const isFocused = c.id === this.focusedId;
      const card = this.add.rectangle(x0 + cellW / 2, y0 + cellH / 2, cellW, cellH, isFocused ? 0x1e4a3d : 0x16382f).setStrokeStyle(isFocused ? 3 : 2, isFocused ? 0xffd95e : 0x1e4a3d).setInteractive({ useHandCursor: true });
      card.on("pointerup", () => { sound.click(); this.focusedId = c.id; this.showSoloStep(); });
      this.track(
        card,
        this.add.text(x0 + 16, y0 + 12, c.name, { fontFamily: FONT, fontSize: "26px", fontStyle: "700", color: isFocused ? CSS.firefly : CSS.cream }),
        this.add.text(x0 + 16, y0 + cellH - 34, `${c.skillType === "active" ? "🔶" : "🔷"} ${c.skillName}`, { fontFamily: FONT, fontSize: "15px", color: c.colorCss })
      );
    });

    // 하단: 마리 수 + 시작/뒤로
    const counts = [2, 3, 4, 5, 6, 7, 8];
    const bSize = 56, bGap = 10;
    const startX = LEFT_CX - (counts.length * bSize + (counts.length - 1) * bGap) / 2 + bSize / 2;
    this.track(this.add.text(LEFT_CX, CONTENT_BOTTOM + 24, "마리 수", { fontFamily: FONT, fontSize: "18px", color: CSS.cream }).setOrigin(0.5));
    counts.forEach((k, i) => {
      const sel = this.soloCount === k;
      this.track(makeButton(this, startX + i * (bSize + bGap), CONTENT_BOTTOM + 70, bSize, bSize, `${k}`, () => {
        this.soloCount = k;
        this.showSoloStep();
      }, { fontSize: "24px", ghost: !sel }));
    });

    this.track(
      makeButton(this, RIGHT_X + RIGHT_W / 2, CONTENT_BOTTOM + 100, 460, 64, `🚩 ${focused.name} ${this.soloCount}마리 레이스 시작`, () => {
        this.registry.set("mode", "solo");
        this.registry.set("soloFrog", this.focusedId);
        this.registry.set("soloCount", this.soloCount);
        this.registry.set("players", []);
        this.scene.start("Race");
      }, { fontSize: "24px" }),
      makeButton(this, LEFT_CX, CONTENT_BOTTOM + 130, 240, 50, "← 모드 선택", () => this.showModeStep(), { ghost: true, fontSize: "18px" })
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
        this.showModeStep();
      }, { ghost: true, fontSize: "18px" })
    );
  }
}
