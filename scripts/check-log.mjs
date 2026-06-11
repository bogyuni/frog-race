// 중계 로그 박스 텍스트 클리핑 검증 (긴 메시지가 박스 밖으로 새지 않는지)
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

await clickCanvas(240, 484); // 빠른 시작
await page.waitForTimeout(4200);

// x2 배속으로 진행, 로그 누적
await clickCanvas(49, 57);
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `scripts/log-${i}.png`, clip: { x: 1024, y: 480, width: 256, height: 240 } });
}

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
