// v3 검증: 고해상도(dpr2) + 단일 개구리 모드 + 점프/원근 레이스
import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:5173";
const W = 1280, H = 720;

async function clickFactory(page) {
  return async (x, y) => {
    const c = await page.$("canvas");
    const b = await c.boundingBox();
    await page.mouse.click(b.x + (x / W) * b.width, b.y + (y / H) * b.height);
  };
}

// 1) 고해상도(dpr2)에서 타이틀/레이스 레이아웃 정상 + 콘솔 에러 없음
async function hidpi() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const click = await clickFactory(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: "scripts/v3-hidpi-title.png" });
  await click(330, 526); // 빠른 시작
  await page.waitForTimeout(4200);
  await page.screenshot({ path: "scripts/v3-hidpi-race.png" });
  console.log("[hidpi dpr2] errors:", errors.length ? errors : "none");
  await browser.close();
}

// 2) 단일 개구리 모드: 모드선택 → 단일 → 시작 → 레이스(같은 종 여러 마리)
async function solo() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  const click = await clickFactory(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await click(640, 526); // 참가자 등록 → 로비(모드 선택)
  await page.waitForTimeout(700);
  await page.screenshot({ path: "scripts/v3-mode.png" });
  await click(640, 470); // 단일 개구리 모드
  await page.waitForTimeout(700);
  await page.screenshot({ path: "scripts/v3-solo-pick.png" });
  await click(808, 152); // 우측 그리드 첫 칸(청개구리) 포커스
  await page.waitForTimeout(400);
  // 시작 버튼 (RIGHT_X+RIGHT_W/2=960, CONTENT_BOTTOM+100=660)
  await click(960, 660);
  await page.waitForTimeout(4200);
  await page.screenshot({ path: "scripts/v3-solo-race.png" });
  console.log("[solo] errors:", errors.length ? errors : "none");
  await browser.close();
}

await hidpi();
await solo();
