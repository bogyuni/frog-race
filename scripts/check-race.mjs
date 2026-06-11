// 16:9(1280x720) 가로 레이아웃 플로우 헤드리스 검증: 타이틀 → 로비 → 레이스(카메라/미니맵) → 결과
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5173";
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

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/shot-1-title.png" });

// 참가자 등록 (P1, P2)
await clickCanvas(640, 484); // 👥 참가자 등록
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/shot-2-lobby-count.png" });

await clickCanvas(275, 320); // 2명
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/shot-3-lobby-pick-p1.png" });

await clickCanvas(196, 192); // P1: 1번 카드 (청개구리)
await page.waitForTimeout(600);
await page.screenshot({ path: "scripts/shot-4-lobby-pick-p2.png" });

await clickCanvas(492, 192); // P2: 2번 카드 (두꺼비)
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/shot-5-lobby-summary.png" });

await clickCanvas(640, 630); // 🚩 레이스 시작!
await page.waitForTimeout(4200); // 카운트다운 종료 직후
await page.screenshot({ path: "scripts/shot-6-race-start.png" });

// 배속 x4 (속도버튼: 좌측 상단, 날씨 아래)
await clickCanvas(49, 57);
await clickCanvas(49, 57);
await page.waitForTimeout(8000);
await page.screenshot({ path: "scripts/shot-7-race-mid.png" });

await page.waitForTimeout(8000);
await page.screenshot({ path: "scripts/shot-8-race-spotlight.png" });

await page.waitForTimeout(15000);
await page.screenshot({ path: "scripts/shot-9-race-late.png" });

await page.waitForTimeout(15000);
await page.screenshot({ path: "scripts/shot-10-result.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
