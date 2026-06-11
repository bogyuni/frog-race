// 공용 UI 헬퍼
import { CSS, FONT } from "./constants.js";
import { sound } from "./sound.js";

export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const bgColor = opts.ghost ? 0x000000 : 0xffd95e;
  const bgAlpha = opts.ghost ? 0 : 1;
  const rect = scene.add
    .rectangle(x, y, w, h, bgColor, bgAlpha)
    .setStrokeStyle(opts.ghost ? 2 : 0, 0x6fbf73)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: opts.fontSize || "22px",
      color: opts.ghost ? CSS.lily : "#3A2E00",
    })
    .setOrigin(0.5);

  rect.on("pointerdown", () => {
    rect.setScale(0.96);
    text.setScale(0.96);
  });
  rect.on("pointerup", () => {
    rect.setScale(1);
    text.setScale(1);
    sound.click();
    onClick();
  });
  rect.on("pointerout", () => {
    rect.setScale(1);
    text.setScale(1);
  });
  return { rect, text };
}

// 음악 on/off 토글 버튼 (기본 off) — 좌측 상단 버튼들과 동일한 스타일
export function makeMusicToggle(scene, x, y) {
  const label = () => (sound.musicEnabled ? "🎵 음악 ON" : "🔇 음악 OFF");
  const text = scene.add
    .text(x, y, label(), {
      fontFamily: FONT, fontSize: "16px",
      color: sound.musicEnabled ? CSS.firefly : CSS.dim,
      backgroundColor: CSS.panel, padding: { x: 10, y: 5 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerup", () => {
      sound.click();
      sound.setMusicEnabled(!sound.musicEnabled);
      text.setText(label()).setColor(sound.musicEnabled ? CSS.firefly : CSS.dim);
    });
  return text;
}
