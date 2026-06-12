// ResultScene 레이아웃(폰트/간격 확대) 시각 검증 — 빠른 시작 후 4배속으로 결과 화면까지 진행
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

  await clickCanvas(330, 526); // 🚩 빠른 시작 (혼자 관전)
  await page.waitForTimeout(4000); // 카운트다운 대기

  await clickCanvas(160, 27); // ▶ x1 -> x2
  await page.waitForTimeout(300);
  await clickCanvas(160, 27); // x2 -> x4
  await page.waitForTimeout(300);

  await page.waitForTimeout(20000); // 4배속으로 결과 화면 도달 대기
  await page.screenshot({ path: `scripts/${prefix}-result.png` });

  console.log(`[${prefix}] console errors:`, errors.length ? errors : "none");
  await browser.close();
}

await run({ width: W, height: H }, "mres-1280");
await run({ width: 844, height: 390 }, "mres-844");
