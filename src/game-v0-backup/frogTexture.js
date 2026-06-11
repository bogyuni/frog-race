// 캐릭터별 개구리 텍스처를 Graphics로 생성 (에셋 없이 프로시저럴)
import Phaser from "phaser";

export const FROG_W = 52;
export const FROG_H = 46;

export function ensureFrogTextures(scene, characters) {
  characters.forEach((c) => {
    const key = `frog-${c.id}`;
    if (scene.textures.exists(key)) return;

    const base = Phaser.Display.Color.IntegerToColor(c.color);
    const light = base.clone().lighten(22).color;
    const darkC = base.clone().darken(18).color;

    const g = scene.add.graphics();

    // 뒷다리
    g.fillStyle(darkC, 1);
    g.fillEllipse(10, 36, 16, 12);
    g.fillEllipse(42, 36, 16, 12);

    // 몸통
    g.fillStyle(c.color, 1);
    g.fillEllipse(26, 28, 36, 26);

    // 배
    g.fillStyle(light, 1);
    g.fillEllipse(26, 33, 24, 13);

    // 눈 (흰자 + 눈동자)
    g.fillStyle(c.color, 1);
    g.fillCircle(16, 13, 9);
    g.fillCircle(36, 13, 9);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 12, 6);
    g.fillCircle(36, 12, 6);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(17, 12, 2.6);
    g.fillCircle(37, 12, 2.6);

    // 입
    g.lineStyle(2, darkC, 1);
    g.beginPath();
    g.arc(26, 27, 7, 0.25 * Math.PI, 0.75 * Math.PI);
    g.strokePath();

    // 볼터치
    g.fillStyle(0xff8fa3, 0.55);
    g.fillCircle(10, 24, 3);
    g.fillCircle(42, 24, 3);

    g.generateTexture(key, FROG_W, FROG_H);
    g.destroy();
  });
}
