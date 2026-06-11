// 타이틀 → 프로토타입 버튼 클릭 → React 프로토타입 마운트 확인
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5173";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 854 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/shot-title-v2.png" });

// 프로토타입 버튼 (캔버스 좌표 240, 768)
const canvas = await page.$("canvas");
const box = await canvas.boundingBox();
await page.mouse.click(
  box.x + (240 / 480) * box.width,
  box.y + (768 / 854) * box.height
);
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/shot-prototype.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
