// 수정 리스트 검증: 음악 토글(기본 off), 줌아웃 기본 시작, 미니맵 숨김, 나가기 버튼,
// 참가자 등록 모드 인원수만큼 출전, 스킬 변경(청/뿔/무당개구리)
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5180";
const W = 1280;
const H = 720;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

async function clickCanvas(x, y) {
  const canvas = await page.$("canvas");
  const box = await canvas.boundingBox();
  await page.mouse.click(
    box.x + (x / W) * box.width,
    box.y + (y / H) * box.height
  );
}

// ── 1) 타이틀: 음악 토글 기본 off, 클릭 시 on ──
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/upd-1-title.png", clip: { x: W - 200, y: 0, width: 200, height: 50 } });

await clickCanvas(W - 70, 24); // 우측 상단 음악 토글
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/upd-2-music-on.png", clip: { x: W - 200, y: 0, width: 200, height: 50 } });

// ── 2) 빠른 시작: 줌아웃 기본 + 맵 숨김 확인 ──
await clickCanvas(240, 484); // 빠른 시작
await page.waitForTimeout(4200); // 카운트다운 종료 직후
await page.screenshot({ path: "scripts/upd-3-race-zoomedout.png" });

// 줌인 토글 → 맵 노출 확인
await clickCanvas(64, 87);
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/upd-4-zoomin-map.png" });

// 다시 줌아웃 → 맵 숨김 확인
await clickCanvas(64, 87);
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/upd-5-zoomout-nomap.png" });

// ── 3) 나가기 버튼 → 타이틀로 복귀 ──
await clickCanvas(64, 147);
await page.waitForTimeout(1000);
await page.screenshot({ path: "scripts/upd-6-after-exit.png" });

// ── 4) 참가자 등록: 3명 → 3마리만 출전 ──
await clickCanvas(640, 484); // 참가자 등록
await page.waitForTimeout(800);
await clickCanvas(421, 320); // 3명
await page.waitForTimeout(500);
// 3명 모두 첫번째 카드(청개구리) 선택
for (let i = 0; i < 3; i++) {
  await clickCanvas(196, 192);
  await page.waitForTimeout(300);
}
await page.waitForTimeout(500);
await page.screenshot({ path: "scripts/upd-7-summary.png" });
await clickCanvas(640, 630); // 레이스 시작
await page.waitForTimeout(4200);
await page.screenshot({ path: "scripts/upd-8-lobby-race.png" });
await page.screenshot({ path: "scripts/upd-9-side-panel.png", clip: { x: 1024, y: 0, width: 256, height: 720 } });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
