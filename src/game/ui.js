// 공용 UI 헬퍼
import { CSS, FONT, GAME_W, GAME_H } from "./constants.js";
import { sound } from "./sound.js";

// 고해상도 대응: 단일 카메라 씬에서 호출. 백킹 해상도(GAME_W*RS)에 맞춰
// 메인 카메라를 RS배 줌하고 논리 영역(1280x720)을 중앙에 매핑 → 좌표는 그대로 쓰되 선명하게 렌더.
export function applyHiDPI(scene) {
  const S = scene.scale.width / GAME_W;
  if (S === 1) return;
  const cam = scene.cameras.main;
  cam.setZoom(S);
  cam.centerOn(GAME_W / 2, GAME_H / 2);
}

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
export function makeMusicToggle(scene, x, y, opts = {}) {
  const label = () => (sound.musicEnabled ? "🎵 음악 ON" : "🔇 음악 OFF");
  const text = scene.add
    .text(x, y, label(), {
      fontFamily: FONT, fontSize: opts.fontSize || "26px",
      color: sound.musicEnabled ? CSS.firefly : CSS.dim,
      backgroundColor: CSS.panelTranslucent, padding: opts.padding || { x: 14, y: 8 },
    })
    .setInteractive({ useHandCursor: true })
    .on("pointerup", () => {
      sound.click();
      sound.setMusicEnabled(!sound.musicEnabled);
      text.setText(label()).setColor(sound.musicEnabled ? CSS.firefly : CSS.dim);
    });
  return text;
}
