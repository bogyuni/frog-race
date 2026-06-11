// 캐릭터별 개구리 텍스처 생성 — 종별 체형/눈/무늬 차별화 (에셋 없이 프로시저럴)
import Phaser from "phaser";

export const FROG_W = 64;
export const FROG_H = 56;

const CX = 32; // 중심 x

function colorObj(int) {
  return Phaser.Display.Color.IntegerToColor(int);
}

/* 종별 형태 파라미터 */
const TRAITS = {
  tree: {
    // 청개구리: 날씬한 몸, 큰 눈, 흰 배
    body: { w: 38, h: 26, y: 34 },
    eye: { r: 8, white: 5.5, gapX: 11, y: 15 },
    belly: 0xf2efe0,
    toePads: true,
  },
  toad: {
    // 두꺼비: 묵직하고 넓은 몸, 사마귀 돌기, 처진 눈
    body: { w: 48, h: 30, y: 34 },
    eye: { r: 6.5, white: 4.5, gapX: 13, y: 18 },
    warts: true,
    grumpy: true,
  },
  maeng: {
    // 맹꽁이: 동글동글 풍선 몸, 아주 작은 머리/눈, 줄무늬
    body: { w: 44, h: 34, y: 32 },
    eye: { r: 5, white: 3.5, gapX: 9, y: 14 },
    stripes: true,
  },
  rain: {
    // 비개구리: 매끈한 몸, 등에 물방울 무늬
    body: { w: 40, h: 27, y: 34 },
    eye: { r: 7, white: 5, gapX: 11, y: 15 },
    droplets: true,
  },
  horn: {
    // 뿔개구리: 넓적한 큰 입, 눈 위 뿔
    body: { w: 50, h: 30, y: 34 },
    eye: { r: 6.5, white: 4.5, gapX: 14, y: 16 },
    horns: true,
    bigMouth: true,
  },
  fire: {
    // 무당개구리: 검은 점박이 등, 주홍빛 배
    body: { w: 40, h: 27, y: 34 },
    eye: { r: 7, white: 5, gapX: 11, y: 15 },
    spots: true,
    belly: 0xff6b4a,
  },
  claw: {
    // 발톱개구리: 매끈하고 납작, 위로 몰린 작은 눈, 앞발 발톱
    body: { w: 44, h: 24, y: 36 },
    eye: { r: 5, white: 3.5, gapX: 7, y: 13 },
    claws: true,
  },
  wood: {
    // 나무개구리: 큰 발판(토패드), 눈을 가로지르는 마스크 무늬
    body: { w: 38, h: 26, y: 34 },
    eye: { r: 7.5, white: 5, gapX: 11, y: 15 },
    mask: true,
    toePads: true,
    bigPads: true,
  },
};

export function ensureFrogTextures(scene, characters) {
  characters.forEach((c) => {
    const key = `frog-${c.id}`;
    if (scene.textures.exists(key)) return;

    const t = TRAITS[c.id] || TRAITS.tree;
    const base = colorObj(c.color);
    const light = base.clone().lighten(24).color;
    const dark = base.clone().darken(22).color;
    const darker = base.clone().darken(40).color;
    const bellyColor = t.belly ?? light;

    const g = scene.add.graphics();
    const { w: bw, h: bh, y: by } = t.body;
    const eyeY = t.eye.y;
    const eyeGap = t.eye.gapX;

    /* ── 뒷다리 (몸 뒤) ── */
    g.fillStyle(dark, 1);
    g.fillEllipse(CX - bw / 2 + 3, by + 8, 18, 13);
    g.fillEllipse(CX + bw / 2 - 3, by + 8, 18, 13);
    // 뒷발
    g.fillEllipse(CX - bw / 2 - 2, by + 14, 14, 5);
    g.fillEllipse(CX + bw / 2 + 2, by + 14, 14, 5);

    /* ── 몸통 ── */
    g.fillStyle(c.color, 1);
    g.fillEllipse(CX, by, bw, bh);
    // 머리(상단) 살짝 겹치는 타원
    g.fillEllipse(CX, by - bh / 2 + 4, bw * 0.72, bh * 0.62);

    /* ── 배 ── */
    g.fillStyle(bellyColor, 1);
    g.fillEllipse(CX, by + 5, bw * 0.58, bh * 0.5);

    /* ── 무늬 ── */
    if (t.warts) {
      g.fillStyle(darker, 0.7);
      [[-14, -6], [13, -8], [-7, -13], [8, -14], [17, -2], [-18, -1]].forEach(
        ([dx, dy]) => g.fillCircle(CX + dx, by + dy, 1.8)
      );
    }
    if (t.spots) {
      g.fillStyle(0x1f2a1f, 0.85);
      [[-12, -7], [11, -9], [-4, -13], [15, -3], [-17, -2]].forEach(
        ([dx, dy]) => g.fillEllipse(CX + dx, by + dy, 5, 4)
      );
    }
    if (t.droplets) {
      g.fillStyle(0xcfeefa, 0.9);
      [[-11, -8], [9, -11], [0, -5], [16, -4]].forEach(([dx, dy]) => {
        g.fillCircle(CX + dx, by + dy, 2.4);
        g.fillTriangle(
          CX + dx - 2.2, by + dy - 1,
          CX + dx + 2.2, by + dy - 1,
          CX + dx, by + dy - 5.5
        );
      });
    }
    if (t.stripes) {
      g.lineStyle(2.4, darker, 0.55);
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.arc(CX + i * 8, by - bh / 2 + 2, 10, 0.25 * Math.PI, 0.75 * Math.PI);
        g.strokePath();
      }
    }

    /* ── 눈 ── */
    const { r: eyeR, white: eyeW } = t.eye;
    // 눈두덩
    g.fillStyle(c.color, 1);
    g.fillCircle(CX - eyeGap, eyeY, eyeR);
    g.fillCircle(CX + eyeGap, eyeY, eyeR);
    if (t.mask) {
      // 눈 마스크 무늬
      g.fillStyle(darker, 0.8);
      g.fillEllipse(CX, eyeY + 2, eyeGap * 2 + eyeR * 2, eyeR * 0.9);
    }
    if (t.horns) {
      g.fillStyle(dark, 1);
      g.fillTriangle(
        CX - eyeGap - 5, eyeY - 3, CX - eyeGap + 4, eyeY - 5,
        CX - eyeGap - 2, eyeY - 14
      );
      g.fillTriangle(
        CX + eyeGap + 5, eyeY - 3, CX + eyeGap - 4, eyeY - 5,
        CX + eyeGap + 2, eyeY - 14
      );
    }
    // 흰자/눈동자
    g.fillStyle(0xffffff, 1);
    const wy = t.grumpy ? eyeY + 1 : eyeY - 1;
    g.fillCircle(CX - eyeGap, wy, eyeW);
    g.fillCircle(CX + eyeGap, wy, eyeW);
    if (t.grumpy) {
      // 반쯤 감긴 눈꺼풀
      g.fillStyle(c.color, 1);
      g.fillRect(CX - eyeGap - eyeW, wy - eyeW, eyeW * 2, eyeW * 0.8);
      g.fillRect(CX + eyeGap - eyeW, wy - eyeW, eyeW * 2, eyeW * 0.8);
    }
    g.fillStyle(0x1a1a1a, 1);
    const pupilR = Math.max(1.8, eyeW * 0.45);
    g.fillCircle(CX - eyeGap + 1, wy + (t.grumpy ? 0.5 : 0), pupilR);
    g.fillCircle(CX + eyeGap + 1, wy + (t.grumpy ? 0.5 : 0), pupilR);
    // 눈 하이라이트
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(CX - eyeGap + 2, wy - 1.4, 0.9);
    g.fillCircle(CX + eyeGap + 2, wy - 1.4, 0.9);

    /* ── 입 / 콧구멍 ── */
    g.lineStyle(2, darker, 0.9);
    g.beginPath();
    const mouthR = t.bigMouth ? 13 : 7;
    const mouthY = by - bh / 2 + (t.bigMouth ? 6 : 7);
    g.arc(CX, mouthY, mouthR, 0.2 * Math.PI, 0.8 * Math.PI);
    g.strokePath();
    g.fillStyle(darker, 0.8);
    g.fillCircle(CX - 3, eyeY + 7, 0.9);
    g.fillCircle(CX + 3, eyeY + 7, 0.9);

    /* ── 볼터치 ── */
    g.fillStyle(0xff8fa3, 0.4);
    g.fillCircle(CX - bw / 2 + 7, by - 2, 3);
    g.fillCircle(CX + bw / 2 - 7, by - 2, 3);

    /* ── 앞발 ── */
    g.fillStyle(dark, 1);
    g.fillEllipse(CX - bw * 0.22, by + bh / 2 - 1, 9, 6);
    g.fillEllipse(CX + bw * 0.22, by + bh / 2 - 1, 9, 6);
    if (t.toePads) {
      const padR = t.bigPads ? 2.6 : 1.8;
      g.fillStyle(light, 1);
      [-1, 0, 1].forEach((i) => {
        g.fillCircle(CX - bw * 0.22 + i * 4, by + bh / 2 + 2, padR);
        g.fillCircle(CX + bw * 0.22 + i * 4, by + bh / 2 + 2, padR);
      });
    }
    if (t.claws) {
      g.lineStyle(1.6, 0xf2efe0, 1);
      [-1, 0, 1].forEach((i) => {
        g.lineBetween(
          CX - bw * 0.22 + i * 3.4, by + bh / 2 + 1,
          CX - bw * 0.22 + i * 3.4 - 1, by + bh / 2 + 6
        );
        g.lineBetween(
          CX + bw * 0.22 + i * 3.4, by + bh / 2 + 1,
          CX + bw * 0.22 + i * 3.4 + 1, by + bh / 2 + 6
        );
      });
    }

    /* ── 윤기 하이라이트 ── */
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(CX - bw * 0.18, by - bh * 0.28, bw * 0.4, bh * 0.3);

    g.generateTexture(key, FROG_W, FROG_H);
    g.destroy();
  });
}
