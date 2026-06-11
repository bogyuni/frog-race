// 모바일 UI 개선 검증: 텍스트 크기/사이드패널/중앙 배너/반투명 컨트롤
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5175";
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
await page.waitForTimeout(3500); // 카운트다운 종료 직후

// 첫 선택 이벤트가 뜰 때까지 대기 후 중앙 배너 캡처
await page.waitForTimeout(700);
await page.screenshot({ path: "scripts/mobile-1-banner.png" });

await page.waitForTimeout(2000);
await page.screenshot({ path: "scripts/mobile-2-side-panel.png" });

// 줌아웃 토글 (좌측 상단 컨트롤 반투명 확인)
await clickCanvas(64, 109);
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/mobile-3-zoomed-out.png" });

console.log("console errors:", errors.length ? errors : "none");
await browser.close();
