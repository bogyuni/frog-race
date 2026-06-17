// Excitebike 스타일 레이스 뷰 검증 — 빠른 시작 후 여러 시점 캡처 (1280x720 + 844x390)
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5173";
const W = 1280, H = 720;

async function run(viewport, prefix) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  async function click(x, y) {
    const c = await page.$("canvas");
    const b = await c.boundingBox();
    await page.mouse.click(b.x + (x / W) * b.width, b.y + (y / H) * b.height);
  }

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await click(330, 526);          // 빠른 시작
  await page.waitForTimeout(4200); // 카운트다운
  await page.screenshot({ path: `scripts/${prefix}-1-start.png` });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `scripts/${prefix}-2-mid.png` });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `scripts/${prefix}-3-late.png` });
  console.log(`[${prefix}] errors:`, errors.length ? errors : "none");
  await browser.close();
}

await run({ width: W, height: H }, "rv2-1280");
await run({ width: 844, height: 390 }, "rv2-844");
