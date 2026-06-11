// 공용 UI 헬퍼
import { CSS, FONT } from "./constants.js";

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
    onClick();
  });
  rect.on("pointerout", () => {
    rect.setScale(1);
    text.setScale(1);
  });
  return { rect, text };
}
