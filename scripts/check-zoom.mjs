// 8:2 레이아웃 + 줌 토글 버튼 + 로그 클리핑 검증
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5174";
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

// 빠른 시작
await clickCanvas(240, 484);
await page.waitForTimeout(4200); // 카운트다운 종료 직후
await page.screenshot({ path: "scripts/zoom-1-race-start.png" });

// 줌아웃 토글
await clickCanvas(64, 87);
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/zoom-2-zoomed-out.png" });

// 다시 줌인 토글
await clickCanvas(64, 87);
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/zoom-3-zoomed-in.png" });

// x4 배속으로 로그 채우기
await clickCanvas(49, 57);
await clickCanvas(49, 57);
await page.waitForTimeout(15000);
await page.screenshot({ path: "scripts/zoom-4-log-fill.png" });

await page.waitForTimeout(15000);
await page.screenshot({ path: "scripts/zoom-5-result.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
