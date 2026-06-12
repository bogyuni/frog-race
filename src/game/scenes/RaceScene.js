import Phaser from "phaser";
import {
  CSS, COLORS, FONT, GAME_W, GAME_H, TRACK_PANEL_W, SIDE_PANEL_W,
  CHARACTERS, RULES,
} from "../constants.js";
import {
  createRace, tick, selectionEvent, currentRanking, rankings,
} from "../RaceEngine.js";
import { ensureFrogTextures } from "../frogTexture.js";
import { sound } from "../sound.js";
import { makeMusicToggle } from "../ui.js";

/* ── 좌측 트랙 패널 레이아웃 (TRACK_PANEL_W x GAME_H, 카메라 줌/추적 대상) ──
   상단에 가로 컨트롤 바(날씨/속도/줌/음악/나가기) 공간을 확보해, 출전 개구리 수가
   적어 레인이 두꺼워질 때(예: 2명 등록)도 출발 위치(좌측 끝) 개구리가
   컨트롤 버튼과 겹치지 않도록 한다 */
const TRACK_TOP = 54;
const TRACK_BOTTOM = 16;
const TRACK_H = GAME_H - TRACK_TOP - TRACK_BOTTOM; // 650 — 레인 수와 무관하게 트랙 전체 높이
const TRACK_L = 26;
const TRACK_R = TRACK_PANEL_W - 56; // 840
const MEDAL = ["🥇", "🥈", "🥉"];

const xFor = (pos) => TRACK_L + (pos / RULES.TRACK) * (TRACK_R - TRACK_L);

// 참가자 등록 모드: 선택된(중복 제외) 개구리 + 부족분은 랜덤으로 채워 "참가자 수" 만큼 출전
function buildRoster(players) {
  const ids = [];
  for (const p of players) {
    if (!ids.includes(p.frogId)) ids.push(p.frogId);
  }
  if (ids.length < players.length) {
    const remaining = CHARACTERS.filter((c) => !ids.includes(c.id))
      .sort(() => Math.random() - 0.5);
    while (ids.length < players.length && remaining.length) {
      ids.push(remaining.pop().id);
    }
  }
  return ids.map((id) => CHARACTERS.find((c) => c.id === id));
}

/* ── 카메라 연출 ── */
const ZOOM_BASE = 1.15;
const ZOOM_SPOTLIGHT = 1.6;
const ZOOM_OUT = 0.95; // 줌아웃: 트랙 전체 조망
const CAM_LERP = 0.06;
const SPOTLIGHT_MS = 950;
const LOOKAHEAD = 70; // 선두 앞쪽 여유 (px)

/* ── 우측 사이드 패널 레이아웃 (SIDE_PANEL_W x GAME_H, 고정 UI) ──
   8마리를 2열 x 4행 카드 그리드로 표시 — 1열 x 8행 대비 카드 폭/높이를
   넉넉히 확보해 모바일에서도 이름/순위/게이지 폰트를 크게 쓸 수 있다 */
const SIDE_X = TRACK_PANEL_W;
const SIDE_TITLE_Y = 24;
const GRID_TOP = 58;
const GRID_PAD = 10;
const GRID_GAP = 8;
const GRID_COLS = 2;
const GRID_ROWS = 4;
const CELL_W = (SIDE_PANEL_W - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS; // 156
const CELL_H = 92;
const LOG_Y = GRID_TOP + GRID_ROWS * (CELL_H + GRID_GAP) - GRID_GAP + 12; // 462
const LOG_H = GAME_H - LOG_Y - 12; // 246

/* ── 미니맵 (좌측 패널 우상단, 상단 컨트롤 바 아래, 고정 UI) ── */
const MM_W = 204;
const MM_H = 60;
const MM_X = TRACK_PANEL_W - MM_W - 12;
const MM_Y = TRACK_TOP + 8;
const MM_PAD = 10;

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super("Race");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    this.players = this.registry.get("players") || [];
    const mode = this.registry.get("mode") || "quick";
    const roster = mode === "lobby" ? buildRoster(this.players) : CHARACTERS;
    this.race = createRace(roster);
    this.laneH = TRACK_H / this.race.frogs.length;
    this.spd = 1;
    this.running = false;
    this.eventClock = 0;
    this.rankClock = 0;
    this.logs = [];
    this.disp = {};
    this.race.frogs.forEach((f) => (this.disp[f.id] = 0));

    this.spotlight = null; // { frog, until }
    this.zoomedOut = true; // 기본: 줌아웃 상태로 시작
    this.camFocus = this.zoomedOut
      ? { x: TRACK_PANEL_W / 2, y: TRACK_TOP + TRACK_H / 2 }
      : { x: xFor(0), y: this.laneY(0) };

    this.setupCameras();

    this.buildTrack();
    this.buildRain();
    this.buildTrackUI();
    this.buildSidePanel();

    this.countdown();
  }

  /* ───────── 카메라 3분할 ─────────
     trackCam(main): 좌측 트랙, 줌/추적 대상 (worldObjs)
     trackUiCam:    좌측 패널 위 고정 UI (날씨/속도버튼/미니맵/카운트다운) (uiObjs)
     sideCam:       우측 선택UI/상태 패널, 고정 (sideObjs)                 */
  setupCameras() {
    this.worldObjs = [];
    this.uiObjs = [];
    this.sideObjs = [];

    const trackCam = this.cameras.main;
    trackCam.setViewport(0, 0, TRACK_PANEL_W, GAME_H);
    trackCam.setBounds(0, 0, TRACK_PANEL_W, GAME_H);
    trackCam.setBackgroundColor(COLORS.bg);
    trackCam.setZoom(this.zoomedOut ? ZOOM_OUT : ZOOM_BASE);

    this.trackUiCam = this.cameras.add(0, 0, TRACK_PANEL_W, GAME_H);
    this.sideCam = this.cameras.add(SIDE_X, 0, SIDE_PANEL_W, GAME_H);
    this.sideCam.setScroll(SIDE_X, 0);
    this.sideCam.setBackgroundColor(COLORS.dark);
  }

  addWorld(obj) {
    this.worldObjs.push(obj);
    this.trackUiCam.ignore(obj);
    this.sideCam.ignore(obj);
    return obj;
  }

  addTrackUI(obj) {
    this.uiObjs.push(obj);
    this.cameras.main.ignore(obj);
    this.sideCam.ignore(obj);
    return obj;
  }

  addSide(obj) {
    this.sideObjs.push(obj);
    this.cameras.main.ignore(obj);
    this.trackUiCam.ignore(obj);
    return obj;
  }

  /* 출전 개구리 수에 따라 트랙 전체 높이를 균등 분할한 레인 y좌표 */
  laneY(lane) {
    return TRACK_TOP + lane * this.laneH + this.laneH / 2;
  }

  /* ───────── 좌측: 레이스 트랙 (월드, 카메라 줌/추적) ───────── */

  buildTrack() {
    const h = TRACK_H;

    this.addWorld(
      this.add
        .rectangle(TRACK_PANEL_W / 2, TRACK_TOP + h / 2, TRACK_PANEL_W - 4, h + 10, 0x12383f)
        .setStrokeStyle(2, 0x1e4a3d)
    );

    // 거리 마커 (25/50/75) + 백도 안전선
    [[25, "25"], [50, "50"], [75, "75"]].forEach(([p, label]) => {
      this.addWorld(
        this.add
          .line(0, 0, xFor(p), TRACK_TOP, xFor(p), TRACK_TOP + h, 0x3e7a64, 0.5)
          .setOrigin(0)
      );
      this.addWorld(
        this.add
          .text(xFor(p), TRACK_TOP - 3, label, {
            fontFamily: FONT, fontSize: "11px", color: "#3E7A64",
          })
          .setOrigin(0.5, 1)
      );
    });
    this.addWorld(
      this.add
        .line(0, 0, xFor(RULES.BACKRUN_SAFE), TRACK_TOP, xFor(RULES.BACKRUN_SAFE), TRACK_TOP + h, 0xffd95e, 0.25)
        .setOrigin(0)
    );

    // 결승선
    this.addWorld(
      this.add
        .rectangle(xFor(RULES.TRACK) + 12, TRACK_TOP + h / 2, 8, h, 0xf2efe0)
        .setFillStyle(0xf2efe0, 0.9)
    );
    for (let i = 0; i < Math.floor(h / 8); i += 2) {
      this.addWorld(
        this.add.rectangle(xFor(RULES.TRACK) + 12, TRACK_TOP + 4 + i * 8, 8, 8, 0x222222)
      );
    }

    this.sprites = {};
    this.laneFlash = {};
    this.miniDots = {};

    this.race.frogs.forEach((f) => {
      const ly = this.laneY(f.lane);

      if (f.lane % 2 === 0) {
        this.addWorld(
          this.add
            .rectangle(TRACK_PANEL_W / 2, ly, TRACK_PANEL_W - 8, this.laneH, 0xffffff, 0.025)
            .setDepth(0)
        );
      }
      this.laneFlash[f.id] = this.addWorld(
        this.add
          .rectangle(TRACK_PANEL_W / 2, ly, TRACK_PANEL_W - 8, this.laneH - 2, f.color, 0)
          .setDepth(1)
      );

      // 개구리
      this.sprites[f.id] = this.addWorld(
        this.add
          .image(xFor(0), ly, `frog-${f.id}`)
          .setScale(0.95)
          .setDepth(5)
      );
    });
  }

  buildRain() {
    const h = TRACK_H;
    this.rainOverlay = this.addWorld(
      this.add
        .rectangle(TRACK_PANEL_W / 2, TRACK_TOP + h / 2, TRACK_PANEL_W - 4, h + 10, 0x3e8e9e, 0)
        .setDepth(7)
    );
    this.drops = [];
    for (let i = 0; i < 8; i++) {
      const d = this.addWorld(
        this.add
          .text(40 + i * 100, TRACK_TOP - 20, "💧", { fontSize: "14px" })
          .setAlpha(0)
          .setDepth(8)
      );
      this.drops.push(d);
    }
  }

  setRainVisual(on) {
    this.rainOverlay.setFillStyle(0x3e8e9e, on ? 0.13 : 0);
    this.weatherText.setText(on ? "🌧️ 비!" : "☀️ 맑음");
    this.weatherText.setColor(on ? "#7FD0DE" : CSS.dim);
    const h = TRACK_H;
    this.drops.forEach((d, i) => {
      this.tweens.killTweensOf(d);
      if (on) {
        d.setAlpha(0.8);
        this.tweens.add({
          targets: d,
          y: { from: TRACK_TOP - 10, to: TRACK_TOP + h - 10 },
          x: `+=${10}`,
          duration: 900 + i * 130,
          repeat: -1,
          onRepeat: () => d.setY(TRACK_TOP - 10),
        });
      } else {
        d.setAlpha(0);
        d.setY(TRACK_TOP - 20);
      }
    });
  }

  /* ───────── 좌측: 고정 UI (날씨/속도버튼/미니맵/카운트다운) ───────── */

  /* 상단 가로 컨트롤 바 — 날씨/속도/줌/음악/나가기를 좌측 끝부터 순서대로 배치
     (레인 수가 적어 레인이 두꺼워져도 출발 위치의 개구리와 겹치지 않도록
     세로 스택 대신 가로 1열로 구성) */
  buildTrackUI() {
    const BAR_Y = 27;
    const GAP = 10;
    const BAR_FONT = "22px";
    const BAR_PAD = { x: 12, y: 6 };
    let cx = 14;

    const place = (obj) => {
      obj.setOrigin(0, 0.5).setPosition(cx, BAR_Y);
      cx += obj.width + GAP;
      return this.addTrackUI(obj);
    };

    this.weatherText = place(
      this.add.text(0, 0, "☀️ 맑음", {
        fontFamily: FONT, fontSize: BAR_FONT, color: CSS.dim,
        backgroundColor: CSS.panelTranslucent, padding: BAR_PAD,
      })
    );

    this.speedBtn = place(
      this.add
        .text(0, 0, "▶ x1", {
          fontFamily: FONT, fontSize: BAR_FONT, color: CSS.dim,
          backgroundColor: CSS.panelTranslucent, padding: BAR_PAD,
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          sound.click();
          this.setSpeed(this.spd >= 4 ? 1 : this.spd * 2);
        })
    );

    this.zoomBtn = place(
      this.add
        .text(0, 0, this.zoomedOut ? "🔍 줌인" : "🔍 줌아웃", {
          fontFamily: FONT, fontSize: BAR_FONT, color: this.zoomedOut ? CSS.firefly : CSS.dim,
          backgroundColor: CSS.panelTranslucent, padding: BAR_PAD,
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => this.toggleZoom())
    );

    place(makeMusicToggle(this, 0, 0, { fontSize: BAR_FONT, padding: BAR_PAD }));

    place(
      this.add
        .text(0, 0, "✕ 나가기", {
          fontFamily: FONT, fontSize: BAR_FONT, color: CSS.pink,
          backgroundColor: CSS.panelTranslucent, padding: BAR_PAD,
        })
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          sound.click();
          this.scene.start("Title");
        })
    );

    this.buildCenterBanner();
    this.buildMinimap();
    this.setMinimapVisible(!this.zoomedOut);
  }

  /* 화면 정중앙에 표시되는 선택/이벤트 알림 — 등장 후 일정 시간 뒤 사라지고,
     다음 이벤트 발생 시 다시 등장 */
  buildCenterBanner() {
    this.centerBanner = this.addTrackUI(
      this.add
        .text(GAME_W / 2, GAME_H / 2, "", {
          fontFamily: FONT, fontSize: "48px", color: CSS.cream, fontStyle: "700",
          align: "center", wordWrap: { width: TRACK_PANEL_W - 80 },
          stroke: "#0A1F1A", strokeThickness: 6,
          backgroundColor: "rgba(10, 31, 26, 0.6)", padding: { x: 28, y: 16 },
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(15)
    );
  }

  toggleZoom() {
    sound.click();
    this.zoomedOut = !this.zoomedOut;
    this.zoomBtn.setText(this.zoomedOut ? "🔍 줌인" : "🔍 줌아웃");
    this.zoomBtn.setColor(this.zoomedOut ? CSS.firefly : CSS.dim);
    this.setMinimapVisible(!this.zoomedOut);
  }

  setMinimapVisible(visible) {
    this.minimapObjs.forEach((o) => o.setVisible(visible));
  }

  buildMinimap() {
    this.minimapObjs = [];
    this.minimapObjs.push(
      this.addTrackUI(
        this.add
          .rectangle(MM_X + MM_W / 2, MM_Y + MM_H / 2, MM_W, MM_H, 0x0a1f1a, 0.55)
          .setStrokeStyle(1, 0x3e7a64)
      ),
      this.addTrackUI(
        this.add.text(MM_X + 6, MM_Y + 4, "MAP", {
          fontFamily: FONT, fontSize: "10px", color: CSS.dim,
        })
      )
    );

    const lineY = MM_Y + MM_H - 12;
    this.mmTrackX0 = MM_X + MM_PAD;
    this.mmTrackX1 = MM_X + MM_W - MM_PAD;
    this.minimapObjs.push(
      this.addTrackUI(
        this.add
          .line(0, 0, this.mmTrackX0, lineY, this.mmTrackX1, lineY, 0x3e7a64, 0.8)
          .setOrigin(0)
      ),
      this.addTrackUI(
        this.add
          .line(0, 0, this.mmTrackX1, lineY - 5, this.mmTrackX1, lineY + 5, 0xf2efe0, 0.9)
          .setOrigin(0)
      )
    );

    const top = MM_Y + 16;
    const bottom = lineY - 6;
    const lanes = this.race.frogs.length;
    this.race.frogs.forEach((f) => {
      const t = bottom <= top || lanes <= 1 ? 0.5 : f.lane / (lanes - 1);
      const dy = top + t * (bottom - top);
      this.miniDots[f.id] = this.addTrackUI(
        this.add.circle(this.mmTrackX0, dy, 3, f.color)
      );
      this.minimapObjs.push(this.miniDots[f.id]);
    });
  }

  setSpeed(v) {
    this.spd = v;
    this.speedBtn.setText(`▶ x${v}`);
    this.speedBtn.setColor(v > 1 ? CSS.firefly : CSS.dim);
  }

  countdown() {
    const overlay = this.addTrackUI(
      this.add
        .rectangle(TRACK_PANEL_W / 2, GAME_H / 2, TRACK_PANEL_W, GAME_H, 0x0a1f1a, 0.55)
        .setDepth(20)
    );
    const num = this.addTrackUI(
      this.add
        .text(TRACK_PANEL_W / 2, GAME_H / 2, "3", {
          fontFamily: FONT, fontSize: "104px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5)
        .setDepth(21)
    );
    const seq = ["3", "2", "1", "개굴!"];
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        overlay.destroy();
        num.destroy();
        this.running = true;
        this.banner("🐸 레이스 시작!", CSS.firefly);
        return;
      }
      num.setText(seq[i]).setScale(0.6);
      sound.countdownBeep(i === seq.length - 1);
      this.tweens.add({ targets: num, scale: 1, duration: 180, ease: "Back.easeOut" });
      i += 1;
      this.time.delayedCall(i === seq.length ? 550 : 700, step);
    };
    step();
  }

  /* ───────── 우측: 선택 UI / 현재 상태 패널 ───────── */

  buildSidePanel() {
    this.addSide(
      this.add
        .text(SIDE_X + SIDE_PANEL_W / 2, SIDE_TITLE_Y, `🏆 연못 더비 · ${RULES.TRACK}칸`, {
          fontFamily: FONT, fontSize: "22px", color: CSS.firefly, fontStyle: "700",
        })
        .setOrigin(0.5)
    );

    this.rankTexts = {};
    this.gaugeBoxes = {};
    this.passiveTexts = {};
    this.medalTexts = {};
    this.nameTexts = {};

    const gaugeW = 5 * 15 - 3; // 72 — 12px 박스 + 3px 간격 x4

    this.race.frogs.forEach((f, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx0 = SIDE_X + GRID_PAD + col * (CELL_W + GRID_GAP);
      const cy0 = GRID_TOP + row * (CELL_H + GRID_GAP);

      this.addSide(
        this.add
          .rectangle(cx0 + CELL_W / 2, cy0 + CELL_H / 2, CELL_W, CELL_H, 0xffffff, 0.025)
          .setStrokeStyle(1, 0x1e4a3d)
      );

      const fans = this.players
        .filter((p) => p.frogId === f.id)
        .map((p) => p.label)
        .join("");
      this.nameTexts[f.id] = this.addSide(
        this.add
          .text(cx0 + 10, cy0 + 8, `${f.name}${fans ? ` ★${fans}` : ""}`, {
            fontFamily: FONT, fontSize: "19px", fontStyle: "700",
            color: fans ? CSS.firefly : f.colorCss,
            wordWrap: { width: CELL_W - 20 }, lineSpacing: 2,
          })
      );

      this.rankTexts[f.id] = this.addSide(
        this.add
          .text(cx0 + 10, cy0 + CELL_H - 12, "", {
            fontFamily: FONT, fontSize: "20px", color: CSS.dim, fontStyle: "700",
          })
          .setOrigin(0, 1)
      );

      // 스킬 게이지 (액티브) / 패시브 뱃지 — 카드 우하단
      if (f.skillType === "active") {
        const boxes = [];
        const gaugeX = cx0 + CELL_W - gaugeW - 10;
        for (let g = 0; g < (f.gaugeMax || RULES.GAUGE_MAX); g++) {
          boxes.push(
            this.addSide(
              this.add
                .rectangle(gaugeX + g * 15, cy0 + CELL_H - 17, 12, 12, 0x0a1f1a)
                .setStrokeStyle(1, 0x3e7a64)
            )
          );
        }
        this.gaugeBoxes[f.id] = boxes;
      } else {
        this.passiveTexts[f.id] = this.addSide(
          this.add
            .text(cx0 + CELL_W - 32, cy0 + CELL_H - 28, "🔷", { fontSize: "24px" })
        );
      }

      // 골인 메달 — 카드 우상단
      this.medalTexts[f.id] = this.addSide(
        this.add
          .text(cx0 + CELL_W - 8, cy0 + 8, "", {
            fontFamily: FONT, fontSize: "22px", color: CSS.firefly,
          })
          .setOrigin(1, 0)
      );
    });

    this.buildLog();
  }

  buildLog() {
    this.addSide(
      this.add
        .rectangle(SIDE_X + SIDE_PANEL_W / 2, LOG_Y + LOG_H / 2, SIDE_PANEL_W - 20, LOG_H, 0x0a1f1a)
        .setStrokeStyle(1, 0x1e4a3d)
    );
    this.logText = this.addSide(
      this.add.text(SIDE_X + 18, LOG_Y + 10, "", {
        fontFamily: FONT, fontSize: "20px", color: CSS.cream, lineSpacing: 8,
        wordWrap: { width: SIDE_PANEL_W - 36 },
      })
    );

    // 박스를 벗어난 텍스트는 가려지도록 클리핑 마스크 적용
    const maskShape = this.make.graphics({}, false);
    maskShape.fillRect(SIDE_X + 10, LOG_Y, SIDE_PANEL_W - 20, LOG_H);
    this.logText.setMask(maskShape.createGeometryMask());
  }

  /* ───────── 연출 헬퍼 ───────── */

  // 화면 정중앙 알림: 등장(팝) → 잠시 유지 → 소멸. 다음 호출 시 다시 등장
  banner(msg, color = CSS.cream) {
    const t = this.centerBanner;
    t.setText(msg).setColor(color);
    this.tweens.killTweensOf(t);
    if (this.bannerHideEvent) this.bannerHideEvent.remove(false);

    t.setScale(0.7).setAlpha(1);
    this.tweens.add({
      targets: t, scale: 1, duration: 150, ease: "Back.easeOut",
    });
    this.bannerHideEvent = this.time.delayedCall(1100, () => {
      this.tweens.add({
        targets: t, alpha: 0, scale: 0.85, duration: 250, ease: "Sine.easeIn",
      });
    });
  }

  pushLog(msg) {
    this.logs.unshift(msg);
    this.logs = this.logs.slice(0, 6);
    this.logText.setText(this.logs.join("\n"));
  }

  flashLane(frog, color = null) {
    const rect = this.laneFlash[frog.id];
    rect.setFillStyle(color ?? frog.color, 0.2);
    this.tweens.add({ targets: rect, fillAlpha: 0, duration: 500 });
  }

  floatText(frog, msg, color = CSS.firefly) {
    const spr = this.sprites[frog.id];
    const t = this.addWorld(
      this.add
        .text(spr.x, spr.y - 26, msg, {
          fontFamily: FONT, fontSize: "22px", color,
          stroke: "#0A1F1A", strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(10)
    );
    this.tweens.add({
      targets: t, y: t.y - 20, alpha: 0, duration: 850,
      onComplete: () => t.destroy(),
    });
  }

  spotlightFrog(frog) {
    this.spotlight = { frog, until: this.time.now + SPOTLIGHT_MS };
  }

  updateGauges() {
    this.race.frogs.forEach((f) => {
      const boxes = this.gaugeBoxes[f.id];
      if (!boxes) return;
      boxes.forEach((b, i) => {
        if (i < f.gauge) b.setFillStyle(0xffd95e, 1);
        else b.setFillStyle(0x0a1f1a, 1);
      });
    });
  }

  updateRanks() {
    const ranked = currentRanking(this.race);
    ranked.forEach((f, i) => {
      const t = this.rankTexts[f.id];
      t.setText(`${i + 1}위`);
      t.setColor(i === 0 ? CSS.firefly : i < 3 ? CSS.lily : CSS.dim);
    });
  }

  /* ───────── 이벤트 처리 ───────── */

  handleEvents(events) {
    for (const ev of events) {
      switch (ev.type) {
        case "select":
          sound.select();
          this.banner(`🎲 ${ev.frog.name}!`, ev.frog.colorCss);
          this.flashLane(ev.frog);
          this.spotlightFrog(ev.frog);
          break;
        case "move":
          if (ev.cause === "select")
            this.floatText(ev.frog, `+${Math.round(ev.amount * 10) / 10}`);
          else if (ev.cause === "skill") {
            const amt = Math.round(ev.amount * 10) / 10;
            this.floatText(ev.frog, `${amt > 0 ? "+" : ""}${amt}!`, amt > 0 ? "#7FFFB0" : CSS.pink);
          } else if (ev.cause === "chase")
            this.floatText(ev.frog, `추격 +${Math.round(ev.amount * 10) / 10}!`, "#9FE060");
          else if (ev.cause === "backrun") {
            this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
            this.pushLog(`💀 백도! ${ev.frog.name} ${Math.round(ev.amount)}칸`);
          } else if (ev.cause === "maengCry")
            this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
          else if (ev.cause === "clawCounter" && ev.amount < 0)
            this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
          else if (ev.cause === "clawCounter" && ev.amount > 0)
            this.floatText(ev.frog, `+${Math.round(ev.amount * 10) / 10}!`, "#7FFFB0");
          else if (ev.cause === "hornJump")
            this.floatText(ev.frog, "돌진!", "#FFB060");
          break;
        case "skill": {
          sound.skill();
          this.banner(`✨ ${ev.frog.name} [${ev.frog.skillName}]!`, ev.frog.colorCss);
          this.pushLog(`✨ ${ev.frog.name}의 ${ev.frog.skillName} 발동!`);
          this.flashLane(ev.frog, 0xffd95e);
          this.spotlightFrog(ev.frog);
          break;
        }
        case "chase":
          this.pushLog(`🏃 ${ev.frog.name}이(가) ${ev.target.name}을(를) 추격!`);
          break;
        case "rainStart":
          sound.rain(true);
          this.banner("🌧️ 비가 내린다! 모두 느려진다", "#7FD0DE");
          this.pushLog("🌧️ 비 시작 — 이동량 감소 (비개구리 면역)");
          this.setRainVisual(true);
          break;
        case "rainEnd":
          sound.rain(false);
          this.banner("☀️ 비가 그쳤다!", CSS.firefly);
          this.pushLog("☀️ 비 종료");
          this.setRainVisual(false);
          break;
        case "backrunStart":
          this.banner("⚠️ 후반전! 백도 구간 진입", CSS.pink);
          this.pushLog(`⚠️ 백도 활성화 — 선택 ${RULES.BACKRUN_EVERY}회마다 1회`);
          break;
        case "backrun":
          sound.backrun();
          this.flashLane(ev.frog, 0xff8fa3);
          break;
        case "backrunImmune":
        case "pushImmune":
          this.floatText(ev.frog, "면역!", "#FFD95E");
          this.pushLog(`🛡️ ${ev.frog.name}은(는) 밀리지 않는다!`);
          break;
        case "clawCounter":
          this.banner(`🪝 ${ev.frog.name}의 역습!`, ev.frog.colorCss);
          this.pushLog(`🪝 ${ev.frog.name} 역습! 전원 -5, 자신 +5`);
          break;
        case "finish": {
          const medal = MEDAL[ev.order - 1] || `${ev.order}위`;
          this.medalTexts[ev.frog.id].setText(medal);
          this.pushLog(`🏁 ${ev.frog.name} ${ev.order}위 골인!`);
          if (ev.order === 1) {
            sound.finish();
            this.banner(`🏁 ${ev.frog.name} 우승!!`, CSS.firefly);
            if (this.spd === 1) {
              this.setSpeed(2);
              this.pushLog("⏩ 남은 레이스 자동 2배속");
            }
          }
          break;
        }
        case "allFinished":
          this.running = false;
          this.time.delayedCall(1400, () => {
            this.scene.start("Result", {
              rankings: rankings(this.race).map((f) => ({
                id: f.id, name: f.name, colorCss: f.colorCss,
                finishOrder: f.finishOrder,
              })),
              players: this.players,
            });
          });
          break;
      }
    }
    if (events.length) this.updateGauges();
  }

  /* ───────── 진행 ───────── */

  updateCamera() {
    const cam = this.cameras.main;
    let targetX;
    let targetY;
    let targetZoom;

    if (this.zoomedOut) {
      targetX = TRACK_PANEL_W / 2;
      targetY = TRACK_TOP + TRACK_H / 2;
      targetZoom = ZOOM_OUT;
    } else if (this.spotlight && this.time.now < this.spotlight.until) {
      const f = this.spotlight.frog;
      targetX = xFor(this.disp[f.id]);
      targetY = this.laneY(f.lane);
      targetZoom = ZOOM_SPOTLIGHT;
    } else {
      this.spotlight = null;
      const leader = currentRanking(this.race)[0];
      targetX = xFor(this.disp[leader.id]) + LOOKAHEAD;
      targetY = this.laneY(leader.lane);
      targetZoom = ZOOM_BASE;
    }

    this.camFocus.x += (targetX - this.camFocus.x) * CAM_LERP;
    this.camFocus.y += (targetY - this.camFocus.y) * CAM_LERP;
    cam.zoom += (targetZoom - cam.zoom) * CAM_LERP;
    cam.centerOn(this.camFocus.x, this.camFocus.y);
  }

  updateMinimap() {
    const span = this.mmTrackX1 - this.mmTrackX0;
    this.race.frogs.forEach((f) => {
      const dot = this.miniDots[f.id];
      const t = Math.min(1, this.disp[f.id] / RULES.TRACK);
      dot.x = this.mmTrackX0 + t * span;
    });
  }

  update(time, delta) {
    if (!this.running) return;
    const dt = (delta / 1000) * this.spd;

    // 지속 전진
    this.handleEvents(tick(this.race, dt));

    // 선택 이벤트 주기
    this.eventClock += delta * this.spd;
    if (this.eventClock >= RULES.EVENT_INTERVAL) {
      this.eventClock -= RULES.EVENT_INTERVAL;
      this.handleEvents(selectionEvent(this.race));
    }

    // 렌더링: 표시 위치를 실제 위치로 부드럽게 추적
    for (const f of this.race.frogs) {
      const cur = this.disp[f.id];
      this.disp[f.id] = cur + (f.pos - cur) * Math.min(1, dt * 5);
      const spr = this.sprites[f.id];
      spr.x = xFor(this.disp[f.id]);
      const ly = this.laneY(f.lane);
      spr.y = f.finished
        ? ly
        : ly - Math.abs(Math.sin(time / 180 + f.lane * 1.3)) * 4;
    }

    this.updateMinimap();
    this.updateCamera();

    // 순위 갱신 (250ms 주기)
    this.rankClock += delta;
    if (this.rankClock > 250) {
      this.rankClock = 0;
      this.updateRanks();
    }
  }
}
