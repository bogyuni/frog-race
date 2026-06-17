// 작업 완료 알림 — Discord 웹훅으로 메시지 전송
//
// 설정(둘 중 하나):
//   1) 프로젝트 루트에 .notify.json 생성 (git 무시됨):
//        { "discordWebhook": "https://discord.com/api/webhooks/xxx/yyy" }
//   2) 환경변수: DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
//
// 웹훅 만드는 법: Discord 서버 → 서버 설정 → 연동(Integrations) → 웹후크 →
//   새 웹후크 → 채널 선택 → "웹후크 URL 복사".
//
// 사용: node scripts/notify.mjs "메시지 내용"
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const msg = process.argv.slice(2).join(" ") || "✅ 프로그레이스 작업 완료";

let url = process.env.DISCORD_WEBHOOK;
const cfgPath = join(__dirname, "..", ".notify.json");
if (!url && existsSync(cfgPath)) {
  try { url = JSON.parse(readFileSync(cfgPath, "utf8")).discordWebhook; } catch { /* ignore */ }
}
if (!url) {
  console.error("웹훅 미설정: .notify.json({\"discordWebhook\":\"...\"}) 또는 DISCORD_WEBHOOK 환경변수를 설정하세요.");
  process.exit(1);
}

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "프로그레이스 빌드", content: msg }),
});
if (res.ok) console.log("알림 전송 완료");
else { console.error(`전송 실패 (HTTP ${res.status})`); process.exit(1); }
