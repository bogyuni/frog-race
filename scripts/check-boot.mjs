// BootScene 부팅 흐름 + ?assets 미리보기 빠른 검증
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5173";

async function shot(path, query, wait) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url + query, { waitUntil: "networkidle" });
  await page.waitForTimeout(wait);
  await page.screenshot({ path });
  console.log(`${query || "/"} → ${path} · errors:`, errors.length ? errors : "none");
  await browser.close();
}

await shot("scripts/boot-title.png", "", 2800);
await shot("scripts/boot-assets.png", "?assets", 1500);
