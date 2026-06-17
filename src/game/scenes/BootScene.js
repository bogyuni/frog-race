import Phaser from "phaser";
import { SPRITE_ASSETS } from "../assets/manifest.js";

// 부팅 씬: 등록된 PNG 스프라이트를 먼저 로드한 뒤 본 게임으로 진입한다.
//   - frames>1 이면 스프라이트시트(가로 스트립)로 로드 + 점프 애니(hop-<id>) 생성
//     (프레임0=앉은 모습 / 프레임1=뛰는 모습 … 번갈아 = 점프 애니메이션)
//   - 단일 프레임이면 일반 이미지. 미등록 key는 frogTexture 프로시저럴 폴백.
//   - 로드된 텍스처는 NEAREST 필터(픽셀아트 또렷)
//   - URL ?assets → 에셋 미리보기 씬
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    SPRITE_ASSETS.forEach((a) => {
      if (a.frames && a.frames > 1) {
        this.load.spritesheet(a.key, a.path, { frameWidth: a.w, frameHeight: a.h });
      } else {
        this.load.image(a.key, a.path);
      }
    });
    this.load.on("loaderror", () => {}); // 누락 파일은 무시(프로시저럴 폴백)
  }

  create() {
    SPRITE_ASSETS.forEach((a) => {
      if (!this.textures.exists(a.key)) return;
      this.textures.get(a.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (a.frames && a.frames > 1) {
        const cid = a.key.replace(/^frog-/, "");
        const animKey = `hop-${cid}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(a.key, { start: 0, end: a.frames - 1 }),
            frameRate: a.frameRate || 6,
            repeat: -1,
          });
        }
      }
    });

    const wantPreview = typeof window !== "undefined" && /[?&]assets\b/.test(window.location.search);
    this.scene.start(wantPreview ? "AssetPreview" : "Title");
  }
}
