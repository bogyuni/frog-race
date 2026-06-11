// 헤드리스 크롬으로 게임 화면 스크린샷 (동작 확인용)
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
await page.screenshot({ path: "scripts/shot-title.png" });

// 캔버스 중앙 하단의 "레이스 시작" 버튼 클릭 (캔버스 좌표 → 화면 좌표)
const canvas = await page.$("canvas");
const box = await canvas.boundingBox();
const scaleX = box.width / 480;
const scaleY = box.height / 854;
await page.mouse.click(box.x + 240 * scaleX, box.y + 700 * scaleY);
await page.waitForTimeout(4000); // 카운트다운 + 첫 뽑기
await page.screenshot({ path: "scripts/shot-race-1.png" });
await page.waitForTimeout(8000);
await page.screenshot({ path: "scripts/shot-race-2.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
