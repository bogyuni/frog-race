import Phaser from "phaser";
import { CSS, FONT, GAME_W, GAME_H, CHARACTERS } from "../constants.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { PALETTE } from "../assets/palette.js";
import { PLANNED_SPRITES, SPRITE_ASSETS } from "../assets/manifest.js";
import { applyHiDPI } from "../ui.js";

// 개발용 에셋 컨택트시트 — ?assets 쿼리로 진입.
// 계획된 모든 스프라이트를 1x/2x/3x로 한 화면에 표시하고, PNG인지 프로시저럴 폴백인지 표기.
// 하단에 16비트 팔레트 스와치 스트립을 함께 보여준다.
export default class AssetPreviewScene extends Phaser.Scene {
  constructor() {
    super("AssetPreview");
  }

  create() {
    applyHiDPI(this);
    // 프로시저럴 폴백 텍스처 확보 (PNG 미등록 항목 표시용)
    ensureFrogTextures(this, CHARACTERS);
    this.cameras.main.setBackgroundColor(CSS.bg);

    const loadedKeys = new Set(SPRITE_ASSETS.map((a) => a.key));

    this.add
      .text(20, 16, "에셋 미리보기 (?assets)  ·  PNG = 등록됨 / proc = 프로시저럴 폴백", {
        fontFamily: FONT, fontSize: "20px", color: CSS.firefly, fontStyle: "700",
      });

    const COLS = 4;
    const cellW = 296;
    const cellH = 150;
    const startX = 20;
    const startY = 56;

    PLANNED_SPRITES.forEach((a, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (cellW + 8);
      const y = startY + row * (cellH + 8);
      const isPng = loadedKeys.has(a.key) && this.textures.exists(a.key);

      this.add
        .rectangle(x + cellW / 2, y + cellH / 2, cellW, cellH, 0x16382f)
        .setStrokeStyle(1, isPng ? 0xffd95e : 0x1e4a3d);

      // 1x / 2x / 3x 나란히
      if (this.textures.exists(a.key)) {
        [1, 2, 3].forEach((s, k) => {
          this.add
            .image(x + 56 + k * 70, y + 64, a.key)
            .setScale(s)
            .setOrigin(0.5);
        });
      } else {
        this.add
          .text(x + cellW / 2, y + 64, "(텍스처 없음)", {
            fontFamily: FONT, fontSize: "14px", color: CSS.dim,
          })
          .setOrigin(0.5);
      }

      this.add.text(x + 10, y + 8, a.key, {
        fontFamily: FONT, fontSize: "15px", color: CSS.cream, fontStyle: "700",
      });
      this.add
        .text(x + cellW - 10, y + 8, isPng ? "PNG" : "proc", {
          fontFamily: FONT, fontSize: "14px",
          color: isPng ? CSS.firefly : CSS.dim,
        })
        .setOrigin(1, 0);
      this.add.text(x + 10, y + cellH - 22, `${a.w}×${a.h}`, {
        fontFamily: FONT, fontSize: "13px", color: CSS.dim,
      });
    });

    // ── 팔레트 스와치 스트립 ──
    const palY = startY + Math.ceil(PLANNED_SPRITES.length / COLS) * (cellH + 8) + 12;
    this.add.text(20, palY, `16비트 팔레트 (${PALETTE.length}색)`, {
      fontFamily: FONT, fontSize: "16px", color: CSS.firefly,
    });
    const sw = 26;
    const perRow = Math.floor((GAME_W - 40) / sw);
    PALETTE.forEach((p, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = 20 + col * sw;
      const y = palY + 24 + row * sw;
      const c = Phaser.Display.Color.HexStringToColor(p.hex).color;
      this.add
        .rectangle(x + sw / 2, y + sw / 2, sw - 2, sw - 2, c)
        .setStrokeStyle(1, 0x0a1f1a);
    });

    this.add
      .text(GAME_W - 20, GAME_H - 14, "클릭 시 타이틀로", {
        fontFamily: FONT, fontSize: "14px", color: CSS.dim,
      })
      .setOrigin(1, 1);
    this.input.once("pointerup", () => this.scene.start("Title"));
  }
}
