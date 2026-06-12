// 모바일 UI 재설계 검증
// 1) 1280x720(설계 해상도, scale=1) — 새 사이드패널/로비 픽 화면 레이아웃 확인
// 2) 844x390(iPhone14 가로, FIT 축소 시 실제 표시 크기) — 실기기 가독성 확인
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5180";
const W = 1280;
const H = 720;

async function run(viewport, prefix) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });

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
  await page.screenshot({ path: `scripts/${prefix}-1-title.png` });

  await clickCanvas(640, 526); // 👥 참가자 등록
  await page.waitForTimeout(800);
  await page.screenshot({ path: `scripts/${prefix}-2-lobby-count.png` });

  await clickCanvas(275, 320); // 2명
  await page.waitForTimeout(800);
  await page.screenshot({ path: `scripts/${prefix}-3-lobby-pick-p1.png` });

  await clickCanvas(1112, 152); // P1: 우측 그리드 2번째(두꺼비) 포커스
  await page.waitForTimeout(500);
  await page.screenshot({ path: `scripts/${prefix}-4-lobby-pick-focus.png` });

  await clickCanvas(960, 672); // 선택 확정 (P1 -> 두꺼비)
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/${prefix}-5-lobby-pick-p2.png` });

  await clickCanvas(808, 152); // P2: 1번째(청개구리) 포커스
  await page.waitForTimeout(400);
  await clickCanvas(960, 672); // 선택 확정 (P2 -> 청개구리)
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/${prefix}-6-lobby-summary.png` });

  await clickCanvas(640, 640); // 🚩 레이스 시작!
  await page.waitForTimeout(4200);
  await page.screenshot({ path: `scripts/${prefix}-7-race-start.png` });

  await page.waitForTimeout(5000);
  await page.screenshot({ path: `scripts/${prefix}-8-race-mid.png` });

  console.log(`[${prefix}] console errors:`, errors.length ? errors : "none");
  await browser.close();
}

await run({ width: W, height: H }, "m2-1280");
await run({ width: 844, height: 390 }, "m2-844");
