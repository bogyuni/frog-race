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

/* ────────────────────────────────────────────────────────────────────────
   Excitebike 스타일 레이아웃 (2026-06-14)
   - 측면 뷰 + 레인 간 원근감(앞 레인=크고 가깝게 / 뒤 레인=작고 멀게, 간격 좁게)
   - 월드(트랙) 픽셀 길이 2배 — 카메라가 선두 개구리를 따라 가로 스크롤
   - 상단 수평선(하늘/갈대) 패럴랙스 + 개구리 점프 애니메이션 + 물보라 잔효과
   - 레인 순서 랜덤, 단일 개구리(같은 종 복수) 모드 지원 (키는 uid 기준)
   ──────────────────────────────────────────────────────────────────────── */

const TRACK_TOP = 54;
const HORIZON_H = 110;
const TRACK_AREA_TOP = TRACK_TOP + HORIZON_H;
const TRACK_BOTTOM = 14;
const TRACK_AREA_H = GAME_H - TRACK_AREA_TOP - TRACK_BOTTOM;

const WORLD_PAD_L = 70;
const PX_PER_CELL = 17;
const WORLD_LEN = RULES.TRACK * PX_PER_CELL; // 1700
const TRACK_L = WORLD_PAD_L;
const TRACK_R = WORLD_PAD_L + WORLD_LEN;
const WORLD_W = TRACK_R + 130;

// 레인 원근 (간격 더 좁히고 대비 강화 → 원근감↑)
const BACK_SCALE = 0.64;
const FRONT_SCALE = 1.52;
const LANE_FILL = 0.9;            // 레인 묶음이 차지하는 세로 비율(작을수록 모임)
const FROG_BASE = 1.3;

const ZOOM_NORMAL = 1.0;
const ZOOM_WIDE = 0.82;
const LOOKAHEAD = 80;

const MEDAL = ["🥇", "🥈", "🥉"];
const xFor = (pos) => TRACK_L + (pos / RULES.TRACK) * WORLD_LEN;

function buildRoster(players) {
  const ids = [];
  for (const p of players) if (!ids.includes(p.frogId)) ids.push(p.frogId);
  if (ids.length < players.length) {
    const remaining = CHARACTERS.filter((c) => !ids.includes(c.id)).sort(() => Math.random() - 0.5);
    while (ids.length < players.length && remaining.length) ids.push(remaining.pop().id);
  }
  return ids.map((id) => CHARACTERS.find((c) => c.id === id));
}

const lerp = (a, b, t) => a + (b - a) * t;
function lerpColor(c1, c2, t) {
  const a = Phaser.Display.Color.IntegerToColor(c1);
  const b = Phaser.Display.Color.IntegerToColor(c2);
  return Phaser.Display.Color.GetColor(
    Math.round(lerp(a.red, b.red, t)),
    Math.round(lerp(a.green, b.green, t)),
    Math.round(lerp(a.blue, b.blue, t))
  );
}

const SIDE_X = TRACK_PANEL_W;
const SIDE_TITLE_Y = 20;
const ROW_TOP = 46;
const LOG_H = 132;
const LOG_Y = GAME_H - LOG_H - 10;

const MM_W = 230;
const MM_H = 54;
const MM_X = TRACK_PANEL_W - MM_W - 12;
const MM_Y = TRACK_TOP + 6;
const MM_PAD = 10;

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super("Race");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    this.players = this.registry.get("players") || [];
    const mode = this.registry.get("mode") || "quick";

    // ── 로스터 구성 (모드별) ──
    let roster;
    if (mode === "solo") {
      const cid = this.registry.get("soloFrog");
      const k = this.registry.get("soloCount") || 5;
      const ch = CHARACTERS.find((c) => c.id === cid) || CHARACTERS[0];
      roster = Array.from({ length: k }, (_, i) => ({ ...ch, displayName: `${ch.name} ${i + 1}` }));
    } else if (mode === "lobby") {
      roster = buildRoster(this.players).map((c) => ({ ...c, displayName: c.name }));
    } else {
      roster = CHARACTERS.map((c) => ({ ...c, displayName: c.name }));
    }
    // 레인 서는 순서 랜덤
    Phaser.Utils.Array.Shuffle(roster);

    this.race = createRace(roster);
    this.computePerspective(this.race.frogs.length);

    this.spd = 1;
    this.running = false;
    this.eventClock = 0;
    this.rankClock = 0;
    this.trailClock = 0;
    this.logs = [];
    this.disp = {};
    this.race.frogs.forEach((f) => (this.disp[f.uid] = 0));

    this.wideView = false;
    this.camFocusX = xFor(0);

    this.buildTextures();
    this.setupCameras();
    this.buildBackground();
    this.buildTrack();
    this.buildTrails();
    this.buildRain();
    this.buildTrackUI();
    this.buildSidePanel();

    this.countdown();
  }

  computePerspective(n) {
    this.laneScales = [];
    const weights = [];
    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 1 : i / (n - 1);
      const s = lerp(BACK_SCALE, FRONT_SCALE, t);
      this.laneScales.push(s);
      weights.push(s);
    }
    const total = weights.reduce((a, b) => a + b, 0);
    const usable = TRACK_AREA_H * LANE_FILL;
    const top = TRACK_AREA_TOP + (TRACK_AREA_H - usable) * 0.4;
    this.laneCenters = [];
    this.laneHeights = [];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const h = (weights[i] / total) * usable;
      this.laneHeights.push(h);
      this.laneCenters.push(top + acc + h / 2);
      acc += h;
    }
  }

  laneY(lane) { return this.laneCenters[lane]; }
  laneScale(lane) { return this.laneScales[lane]; }

  buildTextures() {
    if (!this.textures.exists("px-dust")) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6);
      g.generateTexture("px-dust", 12, 12); g.destroy();
    }
    if (!this.textures.exists("px-shadow")) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x000000, 1); g.fillEllipse(40, 8, 76, 14);
      g.generateTexture("px-shadow", 80, 16); g.destroy();
    }
    if (!this.textures.exists("px-reeds")) {
      const w = 256, h = HORIZON_H;
      const g = this.add.graphics();
      g.fillStyle(0x14352c, 1);
      for (let x = 0; x < w; x += 18) {
        const rh = 26 + ((x * 37) % 30);
        g.fillTriangle(x, h, x + 5, h - rh, x + 10, h);
      }
      g.fillStyle(0x1c4636, 1);
      for (let x = 8; x < w; x += 40) g.fillEllipse(x, h - 6, 26, 10);
      g.generateTexture("px-reeds", w, h); g.destroy();
    }
    // 먼 나무 + 언덕 실루엣 (느린 패럴랙스 = 깊은 배경)
    if (!this.textures.exists("px-trees")) {
      const w = 320, h = HORIZON_H;
      const g = this.add.graphics();
      g.fillStyle(0x123b30, 1);
      g.fillEllipse(w * 0.3, h + 12, w * 0.95, 64);
      g.fillEllipse(w * 0.82, h + 16, w * 0.8, 52);
      [[42, 44], [98, 58], [156, 36], [214, 52], [272, 44], [308, 56]].forEach(([x, th]) => {
        g.fillStyle(0x271a11, 1);
        g.fillRect(x - 3, h - th, 6, th);
        g.fillStyle(0x1c5236, 1);
        g.fillCircle(x, h - th, 17);
        g.fillCircle(x - 11, h - th + 7, 12);
        g.fillCircle(x + 11, h - th + 7, 12);
      });
      g.generateTexture("px-trees", w, h); g.destroy();
    }
    // 화면 하단 전경: 돌 + 풀포기 (빠른 패럴랙스 = 이동감)
    if (!this.textures.exists("px-fore")) {
      const w = 240, h = 44;
      const g = this.add.graphics();
      g.fillStyle(0x1c4a2e, 1); g.fillRect(0, h - 16, w, 16);
      g.fillStyle(0x4a4e4a, 1); g.fillEllipse(46, h - 12, 34, 18);
      g.fillStyle(0x636763, 1); g.fillEllipse(46, h - 16, 24, 11);
      g.fillStyle(0x44484a, 1); g.fillEllipse(168, h - 10, 42, 20);
      g.fillStyle(0x5a5e60, 1); g.fillEllipse(168, h - 14, 30, 13);
      g.fillStyle(0x2e6b3e, 1);
      [12, 88, 120, 205, 230].forEach((x) => g.fillTriangle(x - 6, h, x, h - 18, x + 6, h));
      g.generateTexture("px-fore", w, h); g.destroy();
    }
  }

  /* ───────── 카메라 3분할 (고해상도 RS 슈퍼샘플) ───────── */
  setupCameras() {
    this.worldObjs = [];
    this.uiObjs = [];
    this.sideObjs = [];
    const S = this.rs = this.scale.width / GAME_W;

    const cam = this.cameras.main;
    cam.setViewport(0, 0, TRACK_PANEL_W * S, GAME_H * S);
    cam.setBounds(0, 0, WORLD_W, GAME_H);
    cam.setBackgroundColor(0x0c2230);
    cam.setZoom(ZOOM_NORMAL * S);

    this.trackUiCam = this.cameras.add(0, 0, TRACK_PANEL_W * S, GAME_H * S);
    this.trackUiCam.setZoom(S);
    this.trackUiCam.centerOn(TRACK_PANEL_W / 2, GAME_H / 2);

    this.sideCam = this.cameras.add(SIDE_X * S, 0, SIDE_PANEL_W * S, GAME_H * S);
    this.sideCam.setZoom(S);
    this.sideCam.centerOn(SIDE_X + SIDE_PANEL_W / 2, GAME_H / 2);
    this.sideCam.setBackgroundColor(COLORS.dark);
  }

  addWorld(o) { this.worldObjs.push(o); this.trackUiCam.ignore(o); this.sideCam.ignore(o); return o; }
  addTrackUI(o) { this.uiObjs.push(o); this.cameras.main.ignore(o); this.sideCam.ignore(o); return o; }
  addSide(o) { this.sideObjs.push(o); this.cameras.main.ignore(o); this.trackUiCam.ignore(o); return o; }

  // 패럴랙스 배경 — 모두 tileSprite(객체 1개씩) + scrollFactor 0.
  // 매 프레임 tilePositionX = scrollX*factor 로 무한 스크롤(레이어별 속도차 = 깊이/이동감).
  buildBackground() {
    const vw = TRACK_PANEL_W * 1.5;
    const cx = TRACK_PANEL_W / 2;
    // 하늘
    this.addWorld(this.add.rectangle(cx, TRACK_TOP + HORIZON_H / 2, vw, HORIZON_H, 0x1d4e5a).setScrollFactor(0).setDepth(-20));
    this.addWorld(this.add.rectangle(cx, TRACK_TOP + 14, vw, 28, 0x2f7d86).setScrollFactor(0).setDepth(-19).setAlpha(0.6));
    // 먼 나무/언덕 (가장 느림)
    this.trees = this.addWorld(this.add.tileSprite(cx, TRACK_TOP + HORIZON_H / 2 + 2, vw, HORIZON_H, "px-trees").setScrollFactor(0).setDepth(-18).setAlpha(0.85));
    // 갈대 (중간)
    this.reeds = this.addWorld(this.add.tileSprite(cx, TRACK_TOP + HORIZON_H / 2 + 8, vw, HORIZON_H, "px-reeds").setScrollFactor(0).setDepth(-17).setAlpha(0.9));
    // 물가 라인
    this.addWorld(this.add.rectangle(cx, TRACK_AREA_TOP, vw, 4, 0x6fc0ce).setScrollFactor(0).setDepth(-16).setAlpha(0.5));
    // 화면 하단 전경 (가장 빠름 = 이동감) — 개구리(depth 20+)보다 뒤(19)라 게임 가림 없음
    this.fore = this.addWorld(this.add.tileSprite(cx, GAME_H - 14, vw, 44, "px-fore").setScrollFactor(0).setDepth(19).setAlpha(0.95));
  }

  buildTrack() {
    this.sprites = {};
    this.laneFlash = {};
    this.miniDots = {};
    const n = this.race.frogs.length;

    // ── 정적 트랙 장식을 텍스처 1장으로 베이크 (드로우콜 ~80 → 1) ──
    // 레인 밴드/하이라이트/그림자 + 거리 마커 + 백도선 + 결승선을 Graphics에 그려 generateTexture.
    if (this.textures.exists("track-static")) this.textures.remove("track-static");
    const g = this.make.graphics({}, false);
    this.race.frogs.forEach((f) => {
      const t = n <= 1 ? 1 : f.lane / (n - 1);
      const cy = this.laneY(f.lane);
      const h = this.laneHeights[f.lane];
      const base = lerpColor(0x0e2f38, 0x1c5560, t);
      g.fillStyle(base, 1); g.fillRect(0, cy - (h - 1) / 2, WORLD_W, h - 1);
      g.fillStyle(0x7fd0de, 0.15 + t * 0.25); g.fillRect(0, cy - h / 2, WORLD_W, 2);
      g.fillStyle(0x06161c, 0.4); g.fillRect(0, cy + h / 2 - 1.5, WORLD_W, 3);
    });
    [25, 50, 75].forEach((p) => { g.fillStyle(0x3e7a64, 0.35); g.fillRect(xFor(p), TRACK_AREA_TOP, 1.5, TRACK_AREA_H); });
    g.fillStyle(0xffd95e, 0.2); g.fillRect(xFor(RULES.BACKRUN_SAFE), TRACK_AREA_TOP, 1.5, TRACK_AREA_H);
    const fx = xFor(RULES.TRACK);
    g.fillStyle(0xf2efe0, 0.95); g.fillRect(fx - 5, TRACK_AREA_TOP, 10, TRACK_AREA_H);
    g.fillStyle(0x222222, 1);
    for (let i = 0; i < Math.floor(TRACK_AREA_H / 14); i += 2) g.fillRect(fx - 5, TRACK_AREA_TOP + 7 + i * 14, 10, 14);
    g.generateTexture("track-static", WORLD_W, GAME_H);
    g.destroy();
    this.addWorld(this.add.image(0, 0, "track-static").setOrigin(0, 0).setDepth(0));

    // 동적 레인 플래시 (선택/스킬 시 점멸) — 레인당 1개만 유지
    this.race.frogs.forEach((f) => {
      this.laneFlash[f.uid] = this.addWorld(
        this.add.rectangle(WORLD_W / 2, this.laneY(f.lane), WORLD_W, this.laneHeights[f.lane] - 2, f.color, 0).setDepth(3)
      );
    });

    // 개구리 + 그림자(공유 px-shadow 텍스처 → 한 배치로 묶임)
    this.race.frogs.forEach((f) => {
      const s = this.laneScale(f.lane) * FROG_BASE;
      const shadow = this.addWorld(
        this.add.image(xFor(0), this.laneY(f.lane) + 16 * this.laneScale(f.lane), "px-shadow").setDepth(20 + f.lane)
      );
      shadow.baseS = s * 0.5;
      shadow.setScale(shadow.baseS).setAlpha(0.35);
      const spr = this.addWorld(
        this.add.image(xFor(0), this.laneY(f.lane), `frog-${f.id}`).setScale(s).setDepth(20 + f.lane + 0.5)
      );
      const animKey = `hop-${f.id}`;
      spr.baseScale = s;
      spr.hopPhase = Math.random() * Math.PI * 2;
      if (this.anims.exists(animKey)) { spr.isProc = false; spr.play(animKey); }
      else spr.isProc = true;
      spr.shadowObj = shadow;
      this.sprites[f.uid] = spr;
    });
  }

  buildTrails() {
    this.trail = this.addWorld(
      this.add.particles(0, 0, "px-dust", {
        lifespan: 300,
        speedX: { min: -50, max: -18 },
        speedY: { min: -22, max: 6 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xcfeefa, 0x6fc0ce],
        maxParticles: 40, // 폭주 방지 상한
        emitting: false,
      }).setDepth(18)
    );
  }

  buildRain() {
    // 비 오버레이는 평소 숨김 — 풀스크린 레이어가 항상 그려지지 않도록(오버드로 절감)
    this.rainOverlay = this.addWorld(this.add.rectangle(WORLD_W / 2, TRACK_AREA_TOP + TRACK_AREA_H / 2, WORLD_W, TRACK_AREA_H, 0x3e8e9e, 0.14).setDepth(16).setVisible(false));
    this.drops = [];
    for (let i = 0; i < 8; i++) {
      this.drops.push(this.addWorld(this.add.text(0, 0, "💧", { fontSize: "16px" }).setScrollFactor(0).setAlpha(0).setDepth(17)));
    }
  }

  setRainVisual(on) {
    this.rainOverlay.setVisible(on);
    this.weatherText.setText(on ? "🌧️ 비!" : "☀️ 맑음");
    this.weatherText.setColor(on ? "#7FD0DE" : CSS.dim);
    this.drops.forEach((d, i) => {
      this.tweens.killTweensOf(d);
      if (on) {
        const x = 30 + i * (TRACK_PANEL_W / 8);
        d.setAlpha(0.8).setX(x);
        this.tweens.add({
          targets: d, y: { from: TRACK_AREA_TOP - 10, to: TRACK_AREA_TOP + TRACK_AREA_H - 10 },
          x: `+=14`, duration: 760 + i * 70, repeat: -1,
          onRepeat: () => d.setY(TRACK_AREA_TOP - 10).setX(x),
        });
      } else d.setAlpha(0);
    });
  }

  buildTrackUI() {
    const BAR_Y = 27, GAP = 10, BAR_FONT = "24px", BAR_PAD = { x: 13, y: 7 };
    let cx = 14;
    const place = (obj) => { obj.setOrigin(0, 0.5).setPosition(cx, BAR_Y); cx += obj.width + GAP; return this.addTrackUI(obj); };

    this.weatherText = place(this.add.text(0, 0, "☀️ 맑음", { fontFamily: FONT, fontSize: BAR_FONT, color: CSS.dim, backgroundColor: CSS.panelTranslucent, padding: BAR_PAD }));
    this.speedBtn = place(this.add.text(0, 0, "▶ x1", { fontFamily: FONT, fontSize: BAR_FONT, color: CSS.dim, backgroundColor: CSS.panelTranslucent, padding: BAR_PAD })
      .setInteractive({ useHandCursor: true }).on("pointerup", () => { sound.click(); this.setSpeed(this.spd >= 4 ? 1 : this.spd * 2); }));
    this.zoomBtn = place(this.add.text(0, 0, "🔍 넓게", { fontFamily: FONT, fontSize: BAR_FONT, color: CSS.dim, backgroundColor: CSS.panelTranslucent, padding: BAR_PAD })
      .setInteractive({ useHandCursor: true }).on("pointerup", () => this.toggleZoom()));
    place(makeMusicToggle(this, 0, 0, { fontSize: BAR_FONT, padding: BAR_PAD }));
    place(this.add.text(0, 0, "✕ 나가기", { fontFamily: FONT, fontSize: BAR_FONT, color: CSS.pink, backgroundColor: CSS.panelTranslucent, padding: BAR_PAD })
      .setInteractive({ useHandCursor: true }).on("pointerup", () => { sound.click(); this.scene.start("Title"); }));

    this.buildCenterBanner();
    this.buildMinimap();

    // 진단용 FPS/프레임타임 표시기 (수평선 밴드 빈 공간). 텍스트 갱신은 0.25초마다(측정 왜곡 방지)
    this.fpsText = this.addTrackUI(
      this.add.text(14, 64, "FPS --", {
        fontFamily: FONT, fontSize: "20px", color: CSS.firefly,
        backgroundColor: "rgba(10,31,26,0.6)", padding: { x: 8, y: 4 },
      }).setDepth(35)
    );
    this.fpsClock = 0;
    this.fpsMin = 999;

    // 진단용: 실제 렌더러 + GPU 이름 (소프트웨어 렌더링/Canvas 폴백 여부 확정)
    let rinfo = "Canvas2D (GPU 미사용)";
    const r = this.game.renderer;
    if (r && r.type === Phaser.WEBGL && r.gl) {
      const gl = r.gl;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "WebGL";
      rinfo = `WebGL · ${name}`;
    }
    this.addTrackUI(
      this.add.text(14, 94, rinfo, {
        fontFamily: FONT, fontSize: "14px", color: CSS.dim,
        backgroundColor: "rgba(10,31,26,0.6)", padding: { x: 8, y: 3 },
      }).setDepth(35)
    );
  }

  buildCenterBanner() {
    this.centerBanner = this.addTrackUI(
      this.add.text(TRACK_PANEL_W / 2, GAME_H / 2, "", {
        fontFamily: FONT, fontSize: "50px", color: CSS.cream, fontStyle: "700",
        align: "center", wordWrap: { width: TRACK_PANEL_W - 80 },
        stroke: "#0A1F1A", strokeThickness: 6,
        backgroundColor: "rgba(10, 31, 26, 0.6)", padding: { x: 28, y: 16 },
      }).setOrigin(0.5).setAlpha(0).setDepth(30)
    );
  }

  toggleZoom() {
    sound.click();
    this.wideView = !this.wideView;
    this.zoomBtn.setText(this.wideView ? "🔍 기본" : "🔍 넓게");
    this.zoomBtn.setColor(this.wideView ? CSS.firefly : CSS.dim);
    this.cameras.main.zoomTo((this.wideView ? ZOOM_WIDE : ZOOM_NORMAL) * this.rs, 300);
  }

  buildMinimap() {
    this.addTrackUI(this.add.rectangle(MM_X + MM_W / 2, MM_Y + MM_H / 2, MM_W, MM_H, 0x0a1f1a, 0.55).setStrokeStyle(1, 0x3e7a64).setDepth(25));
    this.addTrackUI(this.add.text(MM_X + 6, MM_Y + 3, "MAP", { fontFamily: FONT, fontSize: "11px", color: CSS.dim }).setDepth(26));
    const lineY = MM_Y + MM_H - 11;
    this.mmX0 = MM_X + MM_PAD;
    this.mmX1 = MM_X + MM_W - MM_PAD;
    this.addTrackUI(this.add.line(0, 0, this.mmX0, lineY, this.mmX1, lineY, 0x3e7a64, 0.8).setOrigin(0).setDepth(26));
    this.addTrackUI(this.add.line(0, 0, this.mmX1, lineY - 5, this.mmX1, lineY + 5, 0xf2efe0, 0.9).setOrigin(0).setDepth(26));
    this.mmViewport = this.addTrackUI(this.add.rectangle(this.mmX0, MM_Y + MM_H / 2, 10, MM_H - 6, 0xffd95e, 0.12).setStrokeStyle(1, 0xffd95e, 0.5).setOrigin(0, 0.5).setDepth(25));

    const top = MM_Y + 15, bottom = lineY - 5, lanes = this.race.frogs.length;
    this.race.frogs.forEach((f) => {
      const t = bottom <= top || lanes <= 1 ? 0.5 : f.lane / (lanes - 1);
      this.miniDots[f.uid] = this.addTrackUI(this.add.circle(this.mmX0, top + t * (bottom - top), 3, f.color).setDepth(26));
    });
  }

  setSpeed(v) {
    this.spd = v;
    this.speedBtn.setText(`▶ x${v}`);
    this.speedBtn.setColor(v > 1 ? CSS.firefly : CSS.dim);
  }

  countdown() {
    const overlay = this.addTrackUI(this.add.rectangle(TRACK_PANEL_W / 2, GAME_H / 2, TRACK_PANEL_W, GAME_H, 0x0a1f1a, 0.55).setDepth(40));
    const num = this.addTrackUI(this.add.text(TRACK_PANEL_W / 2, GAME_H / 2, "3", { fontFamily: FONT, fontSize: "108px", color: CSS.firefly, fontStyle: "700" }).setOrigin(0.5).setDepth(41));
    const seq = ["3", "2", "1", "개굴!"];
    let i = 0;
    const step = () => {
      if (i >= seq.length) { overlay.destroy(); num.destroy(); this.running = true; this.banner("🐸 레이스 시작!", CSS.firefly); return; }
      num.setText(seq[i]).setScale(0.6);
      sound.countdownBeep(i === seq.length - 1);
      this.tweens.add({ targets: num, scale: 1, duration: 180, ease: "Back.easeOut" });
      i += 1;
      this.time.delayedCall(i === seq.length ? 550 : 700, step);
    };
    step();
  }

  /* ───────── 우측: 컴팩트 리더보드 ───────── */
  buildSidePanel() {
    this.addSide(this.add.text(SIDE_X + SIDE_PANEL_W / 2, SIDE_TITLE_Y, `🏆 실황 · ${RULES.TRACK}칸`, { fontFamily: FONT, fontSize: "20px", color: CSS.firefly, fontStyle: "700" }).setOrigin(0.5));

    this.rankTexts = {};
    this.nameTexts = {};
    this.gaugeTexts = {};
    this.medalTexts = {};

    const n = this.race.frogs.length;
    const areaH = LOG_Y - ROW_TOP - 6;
    const rowH = Math.min(64, areaH / n);

    // 행 배경(정적)을 텍스처 1장으로 베이크 (8 shape → 1)
    if (this.textures.exists("side-static")) this.textures.remove("side-static");
    const bg = this.make.graphics({}, false);
    for (let i = 0; i < n; i++) {
      const y = ROW_TOP + i * rowH;
      bg.fillStyle(0xffffff, 0.03); bg.fillRect(7, y + 2, SIDE_PANEL_W - 14, rowH - 4);
      bg.lineStyle(1, 0x1e4a3d); bg.strokeRect(7, y + 2, SIDE_PANEL_W - 14, rowH - 4);
    }
    bg.generateTexture("side-static", SIDE_PANEL_W, GAME_H);
    bg.destroy();
    this.addSide(this.add.image(SIDE_X, 0, "side-static").setOrigin(0, 0));

    this.race.frogs.forEach((f, i) => {
      const y = ROW_TOP + i * rowH;
      this.rankTexts[f.uid] = this.addSide(this.add.text(SIDE_X + 12, y + rowH / 2, "-", { fontFamily: FONT, fontSize: "22px", color: CSS.dim, fontStyle: "700" }).setOrigin(0, 0.5));
      const fans = this.players.filter((p) => p.frogId === f.id).map((p) => p.label).join("");
      this.nameTexts[f.uid] = this.addSide(this.add.text(SIDE_X + 54, y + 7, `${f.displayName}${fans ? ` ★${fans}` : ""}`, {
        fontFamily: FONT, fontSize: "20px", fontStyle: "700", color: fans ? CSS.firefly : f.colorCss,
      }));
      // 게이지: 5칸 사각형(shape) 대신 텍스트 1개로 (드로우콜 절감)
      if (f.skillType === "active") {
        const gmax = f.gaugeMax || RULES.GAUGE_MAX;
        const tx = this.addSide(this.add.text(SIDE_X + 54, y + rowH - 21, "□".repeat(gmax), { fontFamily: FONT, fontSize: "16px", color: CSS.firefly }));
        tx.gmax = gmax;
        this.gaugeTexts[f.uid] = tx;
      } else {
        this.addSide(this.add.text(SIDE_X + 54, y + rowH - 20, "🔷 패시브", { fontFamily: FONT, fontSize: "14px", color: CSS.dim }));
      }
      this.medalTexts[f.uid] = this.addSide(this.add.text(SIDE_X + SIDE_PANEL_W - 12, y + rowH / 2, "", { fontFamily: FONT, fontSize: "24px", color: CSS.firefly }).setOrigin(1, 0.5));
    });

    this.buildLog();
  }

  buildLog() {
    this.addSide(this.add.rectangle(SIDE_X + SIDE_PANEL_W / 2, LOG_Y + LOG_H / 2, SIDE_PANEL_W - 14, LOG_H, 0x0a1f1a).setStrokeStyle(1, 0x1e4a3d));
    this.logText = this.addSide(this.add.text(SIDE_X + 14, LOG_Y + 8, "", { fontFamily: FONT, fontSize: "16px", color: CSS.cream, lineSpacing: 6, wordWrap: { width: SIDE_PANEL_W - 28 } }));
    const mask = this.make.graphics({}, false);
    mask.fillRect(SIDE_X + 8, LOG_Y, SIDE_PANEL_W - 16, LOG_H);
    this.logText.setMask(mask.createGeometryMask());
  }

  /* ───────── 연출 헬퍼 ───────── */
  banner(msg, color = CSS.cream) {
    const t = this.centerBanner;
    t.setText(msg).setColor(color);
    this.tweens.killTweensOf(t);
    if (this.bannerHideEvent) this.bannerHideEvent.remove(false);
    t.setScale(0.7).setAlpha(1);
    this.tweens.add({ targets: t, scale: 1, duration: 150, ease: "Back.easeOut" });
    this.bannerHideEvent = this.time.delayedCall(1100, () => {
      this.tweens.add({ targets: t, alpha: 0, scale: 0.85, duration: 250, ease: "Sine.easeIn" });
    });
  }

  pushLog(msg) {
    this.logs.unshift(msg);
    this.logs = this.logs.slice(0, 6);
    this.logText.setText(this.logs.join("\n"));
  }

  flashLane(frog, color = null) {
    const rect = this.laneFlash[frog.uid];
    rect.setFillStyle(color ?? frog.color, 0.22);
    this.tweens.add({ targets: rect, fillAlpha: 0, duration: 500 });
  }

  floatText(frog, msg, color = CSS.firefly) {
    const spr = this.sprites[frog.uid];
    const s = this.laneScale(frog.lane);
    const t = this.addWorld(this.add.text(spr.x, spr.y - 30 * s, msg, {
      fontFamily: FONT, fontSize: `${Math.round(20 * s)}px`, color, stroke: "#0A1F1A", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(28));
    this.tweens.add({ targets: t, y: t.y - 22, alpha: 0, duration: 850, onComplete: () => t.destroy() });
  }

  updateGauges() {
    this.race.frogs.forEach((f) => {
      const tx = this.gaugeTexts[f.uid];
      if (!tx) return;
      tx.setText("■".repeat(f.gauge) + "□".repeat(Math.max(0, tx.gmax - f.gauge)));
    });
  }

  updateRanks() {
    currentRanking(this.race).forEach((f, i) => {
      const t = this.rankTexts[f.uid];
      t.setText(`${i + 1}`);
      t.setColor(i === 0 ? CSS.firefly : i < 3 ? CSS.lily : CSS.dim);
    });
  }

  splash(frog, count = 8) {
    const spr = this.sprites[frog.uid];
    if (!spr) return;
    const s = this.laneScale(frog.lane);
    this.trail.emitParticleAt(spr.x - 16 * s, spr.y + 12 * s, count);
  }

  /* ───────── 이벤트 처리 ───────── */
  handleEvents(events) {
    for (const ev of events) {
      switch (ev.type) {
        case "select":
          sound.select();
          this.banner(`🎲 ${ev.frog.displayName}!`, ev.frog.colorCss);
          this.flashLane(ev.frog);
          this.splash(ev.frog, 10);
          break;
        case "move":
          if (ev.cause === "select") this.floatText(ev.frog, `+${Math.round(ev.amount * 10) / 10}`);
          else if (ev.cause === "skill") {
            const amt = Math.round(ev.amount * 10) / 10;
            this.floatText(ev.frog, `${amt > 0 ? "+" : ""}${amt}!`, amt > 0 ? "#7FFFB0" : CSS.pink);
          } else if (ev.cause === "chase") this.floatText(ev.frog, `추격 +${Math.round(ev.amount * 10) / 10}!`, "#9FE060");
          else if (ev.cause === "backrun") {
            this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
            this.pushLog(`💀 백도! ${ev.frog.displayName} ${Math.round(ev.amount)}칸`);
          } else if (ev.cause === "maengCry") this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
          else if (ev.cause === "clawCounter" && ev.amount < 0) this.floatText(ev.frog, `${Math.round(ev.amount * 10) / 10}`, CSS.pink);
          else if (ev.cause === "clawCounter" && ev.amount > 0) this.floatText(ev.frog, `+${Math.round(ev.amount * 10) / 10}!`, "#7FFFB0");
          else if (ev.cause === "hornJump") this.floatText(ev.frog, "돌진!", "#FFB060");
          break;
        case "skill":
          sound.skill();
          this.banner(`✨ ${ev.frog.displayName} [${ev.frog.skillName}]!`, ev.frog.colorCss);
          this.pushLog(`✨ ${ev.frog.displayName}의 ${ev.frog.skillName} 발동!`);
          this.flashLane(ev.frog, 0xffd95e);
          this.splash(ev.frog, 16);
          break;
        case "chase":
          this.pushLog(`🏃 ${ev.frog.displayName}이(가) ${ev.target.displayName}을(를) 추격!`);
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
          this.pushLog(`🛡️ ${ev.frog.displayName}은(는) 밀리지 않는다!`);
          break;
        case "clawCounter":
          this.banner(`🪝 ${ev.frog.displayName}의 역습!`, ev.frog.colorCss);
          this.pushLog(`🪝 ${ev.frog.displayName} 역습! 전원 -5, 자신 +5`);
          break;
        case "finish": {
          const medal = MEDAL[ev.order - 1] || `${ev.order}위`;
          this.medalTexts[ev.frog.uid].setText(medal);
          this.pushLog(`🏁 ${ev.frog.displayName} ${ev.order}위 골인!`);
          if (ev.order === 1) {
            sound.finish();
            this.banner(`🏁 ${ev.frog.displayName} 우승!!`, CSS.firefly);
            if (this.spd === 1) { this.setSpeed(2); this.pushLog("⏩ 남은 레이스 자동 2배속"); }
          }
          break;
        }
        case "allFinished":
          this.running = false;
          this.time.delayedCall(1400, () => {
            this.scene.start("Result", {
              rankings: rankings(this.race).map((f) => ({
                id: f.id, name: f.displayName, colorCss: f.colorCss, finishOrder: f.finishOrder,
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
  updateCamera(delta) {
    const cam = this.cameras.main;
    // 선두 찾기 — 매 프레임 배열 정렬/생성(GC) 없이 단일 패스
    let leader = this.race.frogs[0];
    for (const f of this.race.frogs) if (f.pos > leader.pos) leader = f;
    const targetX = xFor(this.disp[leader.uid]) + LOOKAHEAD;
    // delta 기반 지수 감쇠 — 프레임레이트가 흔들려도 추적 속도가 일정(부드러움)
    const k = 1 - Math.exp(-7 * (delta / 1000));
    this.camFocusX += (targetX - this.camFocusX) * k;
    cam.centerOn(this.camFocusX, GAME_H / 2);
    // 줌은 매 프레임 건드리지 않음(셰이더 재샘플 떨림 방지) — 토글 시 zoomTo로만 변경
  }

  updateMinimap() {
    const span = this.mmX1 - this.mmX0;
    this.race.frogs.forEach((f) => {
      const t = Math.min(1, this.disp[f.uid] / RULES.TRACK);
      this.miniDots[f.uid].x = this.mmX0 + t * span;
    });
    const cam = this.cameras.main;
    const viewW = (TRACK_PANEL_W * this.rs) / cam.zoom;
    const t0 = Phaser.Math.Clamp(cam.scrollX / WORLD_W, 0, 1);
    const t1 = Phaser.Math.Clamp((cam.scrollX + viewW) / WORLD_W, 0, 1);
    this.mmViewport.setX(this.mmX0 + t0 * span);
    this.mmViewport.width = Math.max(6, (t1 - t0) * span);
  }

  update(time, delta) {
    // FPS 표시기는 카운트다운/레이스 무관하게 갱신 (0.25초 주기)
    this.fpsClock += delta;
    if (this.fpsClock > 250) {
      this.fpsClock = 0;
      const fps = this.game.loop.actualFps;
      if (this.running && fps > 5) this.fpsMin = Math.min(this.fpsMin, fps);
      const minStr = this.fpsMin < 900 ? ` (min ${Math.round(this.fpsMin)})` : "";
      this.fpsText.setText(`FPS ${Math.round(fps)}${minStr}`);
      this.fpsText.setColor(fps >= 55 ? "#7FFFB0" : fps >= 40 ? CSS.firefly : CSS.pink);
    }

    if (!this.running) return;
    const dt = (delta / 1000) * this.spd;

    this.handleEvents(tick(this.race, dt));

    this.eventClock += delta * this.spd;
    if (this.eventClock >= RULES.EVENT_INTERVAL) {
      this.eventClock -= RULES.EVENT_INTERVAL;
      this.handleEvents(selectionEvent(this.race));
    }

    const sx = this.cameras.main.scrollX;
    if (this.trees) this.trees.tilePositionX = sx * 0.15;
    if (this.reeds) this.reeds.tilePositionX = sx * 0.35;
    if (this.fore) this.fore.tilePositionX = sx * 0.85;

    for (const f of this.race.frogs) {
      const cur = this.disp[f.uid];
      const moved = f.pos - cur;
      this.disp[f.uid] = cur + moved * Math.min(1, dt * 5);
      const spr = this.sprites[f.uid];
      const s = this.laneScale(f.lane);
      spr.x = xFor(this.disp[f.uid]);
      const ly = this.laneY(f.lane);

      // 점프 애니메이션 (이동 중 빠르게, 정지/골인 시 느리게/멈춤)
      const moving = !f.finished && moved > 0.004;
      spr.hopPhase += dt * (moving ? 10 : 3.2);
      const lift = f.finished ? 0 : Math.abs(Math.sin(spr.hopPhase));
      spr.y = ly - lift * 7 * s;

      if (spr.isProc) {
        if (f.finished) spr.setScale(spr.baseScale);
        else {
          spr.setScale(
            spr.baseScale * (1 - 0.10 * lift + 0.10 * (1 - lift)),
            spr.baseScale * (1 + 0.14 * lift - 0.08 * (1 - lift))
          );
        }
      } else if (f.finished && spr.anims.isPlaying) {
        spr.anims.stop();
        spr.setFrame(0);
      }

      spr.shadowObj.x = spr.x;
      spr.shadowObj.setScale(spr.shadowObj.baseS * (1 - lift * 0.3));
    }
    // (성능) 매 프레임 8마리 물보라 분사는 비용이 커서 제거 — 선택/스킬 등 이벤트 시에만 분사

    this.updateMinimap();
    this.updateCamera(delta);

    this.rankClock += delta;
    if (this.rankClock > 250) { this.rankClock = 0; this.updateRanks(); }
  }
}
