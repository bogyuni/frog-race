import Phaser from "phaser";
import {
  CSS, FONT, GAME_W, CHARACTERS, GOAL, MID, BACK_EVERY,
} from "../constants.js";
import { createRace, nextDraw, rankings } from "../RaceEngine.js";
import { ensureFrogTextures } from "../frogTexture.js";

// 트랙 배치
const TRACK_TOP = 96;
const LANE_H = 86;
const CELL_L = 26; // 첫 칸 중심 x
const CELL_W = 39;
const FROG_DY = 50; // 레인 상단에서 개구리 y 오프셋

const cellX = (i) => CELL_L + i * CELL_W + CELL_W / 2 - 8;

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super("Race");
  }

  create() {
    ensureFrogTextures(this, CHARACTERS);
    this.race = createRace(CHARACTERS);
    this.playerId = this.registry.get("playerId");
    this.spd = 1;
    this.running = true;
    this.logs = [];

    this.buildHeader();
    this.buildTrack();
    this.buildBanner();
    this.buildSkillPanel();
    this.buildLog();

    this.events.on("shutdown", () => (this.running = false));

    this.countdown();
  }

  /* ───── 레이아웃 ───── */

  buildHeader() {
    const player = CHARACTERS.find((c) => c.id === this.playerId);
    this.add
      .text(GAME_W / 2, 28, `🏆 연못 더비  ·  ${GOAL}칸 레이스`, {
        fontFamily: FONT, fontSize: "22px", color: CSS.firefly,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 58, `내 개구리: ★ ${player.name}`, {
        fontFamily: FONT, fontSize: "15px", color: player.colorCss,
      })
      .setOrigin(0.5);

    // 배속 토글
    this.speedBtn = this.add
      .text(GAME_W - 16, 28, "▶ x1", {
        fontFamily: FONT, fontSize: "16px", color: CSS.dim,
        backgroundColor: CSS.panel, padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        this.spd = this.spd === 1 ? 2 : 1;
        this.speedBtn.setText(`▶ x${this.spd}`);
        this.speedBtn.setColor(this.spd === 2 ? CSS.firefly : CSS.dim);
      });
  }

  buildTrack() {
    this.add
      .rectangle(GAME_W / 2, TRACK_TOP + LANE_H * 2, GAME_W - 8, LANE_H * 4 + 16, 0x14424a)
      .setStrokeStyle(2, 0x1e4a3d);

    this.sprites = {};
    this.laneFlash = {};

    this.race.frogs.forEach((f) => {
      const laneY = TRACK_TOP + f.lane * LANE_H + 8;

      // 레인 하이라이트 (평소 투명)
      this.laneFlash[f.id] = this.add
        .rectangle(GAME_W / 2, laneY + LANE_H / 2 - 8, GAME_W - 16, LANE_H - 6, f.color, 0)
        .setDepth(0);

      // 칸 (연잎)
      for (let i = 0; i <= GOAL; i++) {
        const x = cellX(i);
        const y = laneY + FROG_DY + 14;
        if (i === GOAL) {
          this.add.text(x, y - 6, "🏁", { fontSize: "20px" }).setOrigin(0.5);
        } else {
          const isMid = i === MID;
          this.add
            .ellipse(x, y, 30, 13, isMid ? 0x3e8e9e : 0x2c5e4f, 1)
            .setStrokeStyle(1, isMid ? 0x7fd0de : 0x3e7a64);
        }
      }

      // 이름표
      const isPlayer = f.id === this.playerId;
      this.add.text(14, laneY, `${isPlayer ? "★ " : ""}${f.name}`, {
        fontFamily: FONT, fontSize: "14px",
        color: isPlayer ? CSS.firefly : f.colorCss,
      });

      // 개구리 스프라이트
      const spr = this.add
        .image(cellX(0), laneY + FROG_DY, `frog-${f.id}`)
        .setDepth(5)
        .setScale(0.85);
      this.sprites[f.id] = spr;
    });

    // 중간 지점 안내
    this.add
      .text(cellX(MID), TRACK_TOP - 2, "스킬 발동선", {
        fontFamily: FONT, fontSize: "10px", color: "#7FD0DE",
      })
      .setOrigin(0.5, 1);
  }

  buildBanner() {
    const y = TRACK_TOP + LANE_H * 4 + 38;
    this.add
      .rectangle(GAME_W / 2, y, GAME_W - 24, 52, 0x0a1f1a)
      .setStrokeStyle(1, 0x1e4a3d);
    this.bannerText = this.add
      .text(GAME_W / 2, y, "", {
        fontFamily: FONT, fontSize: "20px", color: CSS.cream,
      })
      .setOrigin(0.5);
    this.bannerY = y;
  }

  buildSkillPanel() {
    const top = this.bannerY + 44;
    this.add
      .rectangle(GAME_W / 2, top + 74, GAME_W - 24, 148, 0x16382f)
      .setStrokeStyle(1, 0x1e4a3d);
    this.skillTexts = {};
    this.race.frogs.forEach((f, i) => {
      const y = top + 22 + i * 34;
      this.add.circle(34, y, 6, f.color);
      this.add.text(50, y - 9, f.name, {
        fontFamily: FONT, fontSize: "14px", color: CSS.cream,
      });
      this.add.text(130, y - 9, f.skillName, {
        fontFamily: FONT, fontSize: "13px", color: f.colorCss,
      });
      this.skillTexts[f.id] = this.add
        .text(GAME_W - 36, y - 9, "대기", {
          fontFamily: FONT, fontSize: "13px", color: CSS.dim,
        })
        .setOrigin(1, 0);
    });
    this.skillPanelBottom = top + 148;
  }

  buildLog() {
    const top = this.skillPanelBottom + 8;
    this.add
      .rectangle(GAME_W / 2, top + 62, GAME_W - 24, 124, 0x0a1f1a)
      .setStrokeStyle(1, 0x1e4a3d);
    this.logText = this.add.text(26, top + 8, "", {
      fontFamily: FONT, fontSize: "13px", color: CSS.cream,
      lineSpacing: 5,
    });
  }

  /* ───── 유틸 ───── */

  wait(ms) {
    return new Promise((res) => this.time.delayedCall(ms / this.spd, res));
  }

  pushLog(msg) {
    this.logs.unshift(msg);
    this.logs = this.logs.slice(0, 6);
    this.logText.setText(this.logs.join("\n"));
  }

  banner(msg, color = CSS.cream) {
    this.bannerText.setText(msg).setColor(color);
    this.bannerText.setScale(0.7);
    this.tweens.add({
      targets: this.bannerText, scale: 1, duration: 140, ease: "Back.easeOut",
    });
  }

  flashLane(frog, color = null) {
    const rect = this.laneFlash[frog.id];
    if (color !== null) rect.fillColor = color;
    rect.setFillStyle(color ?? frog.color, 0.18);
    this.tweens.add({
      targets: rect, fillAlpha: 0, duration: 600 / this.spd,
    });
  }

  hopBy(frog, from, to) {
    // from→to 칸까지 한 칸씩 폴짝폴짝
    const spr = this.sprites[frog.id];
    const dir = to > from ? 1 : -1;
    const steps = Math.abs(to - from);
    return new Promise((resolve) => {
      let i = 0;
      const hopOnce = () => {
        if (i >= steps) return resolve();
        i += 1;
        const tx = cellX(from + dir * i);
        this.tweens.add({
          targets: spr, x: tx, duration: 250 / this.spd, ease: "Linear",
          onComplete: hopOnce,
        });
        this.tweens.add({
          targets: spr, y: spr.y - 20, duration: 125 / this.spd,
          yoyo: true, ease: "Quad.easeOut",
        });
      };
      hopOnce();
    });
  }

  shake(frog) {
    const spr = this.sprites[frog.id];
    this.tweens.add({
      targets: spr, x: spr.x + 5, duration: 50, yoyo: true, repeat: 4,
    });
  }

  floatText(frog, msg, color = CSS.firefly) {
    const spr = this.sprites[frog.id];
    const t = this.add
      .text(spr.x, spr.y - 32, msg, {
        fontFamily: FONT, fontSize: "13px", color,
        stroke: "#0A1F1A", strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.tweens.add({
      targets: t, y: t.y - 22, alpha: 0, duration: 900 / this.spd,
      onComplete: () => t.destroy(),
    });
  }

  updateSkillPanel() {
    this.race.frogs.forEach((f) => {
      const t = this.skillTexts[f.id];
      if (f.skillUsed) {
        t.setText("사용됨").setColor(CSS.dim);
      } else if (f.skillReady) {
        t.setText(f.id === "toad" ? "발동중" : "준비!").setColor(CSS.firefly);
      } else {
        t.setText("대기").setColor(CSS.dim);
      }
    });
  }

  /* ───── 진행 ───── */

  async countdown() {
    const overlay = this.add
      .rectangle(GAME_W / 2, TRACK_TOP + LANE_H * 2, GAME_W - 8, LANE_H * 4 + 16, 0x0a1f1a, 0.55)
      .setDepth(20);
    const num = this.add
      .text(GAME_W / 2, TRACK_TOP + LANE_H * 2, "3", {
        fontFamily: FONT, fontSize: "64px", color: CSS.firefly,
      })
      .setOrigin(0.5)
      .setDepth(21);
    for (const s of ["3", "2", "1", "개굴!"]) {
      if (!this.running) return;
      num.setText(s).setScale(0.6);
      this.tweens.add({ targets: num, scale: 1, duration: 200, ease: "Back.easeOut" });
      await this.wait(s === "개굴!" ? 600 : 750);
    }
    overlay.destroy();
    num.destroy();
    this.runRace();
  }

  async runRace() {
    while (this.running && !this.race.finished) {
      const isBackNext =
        this.race.backPhase &&
        this.race.forwardSinceBack >= BACK_EVERY - 1;
      await this.diceAnim(isBackNext);
      if (!this.running) return;

      const events = nextDraw(this.race);
      for (const ev of events) {
        if (!this.running) return;
        await this.playEvent(ev);
        this.updateSkillPanel();
      }
      await this.wait(420);
    }
  }

  diceAnim(isBack) {
    // 뽑기 연출: 이름이 빠르게 돌아가는 룰렛
    return new Promise((resolve) => {
      let ticks = 0;
      const total = 7;
      const timer = this.time.addEvent({
        delay: 70 / this.spd,
        repeat: total - 1,
        callback: () => {
          ticks += 1;
          const f = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
          this.bannerText
            .setText(`${isBack ? "💀" : "🎲"} ${f.name}`)
            .setColor(isBack ? CSS.pink : CSS.dim)
            .setScale(1);
          if (ticks >= total) {
            timer.remove();
            resolve();
          }
        },
      });
    });
  }

  async playEvent(ev) {
    switch (ev.type) {
      case "drawForward":
        this.banner(`🎲 ${ev.frog.name}!`, ev.frog.colorCss);
        this.flashLane(ev.frog);
        await this.wait(420);
        break;

      case "drawBack":
        this.banner(`💀 후진 뽑기... ${ev.frog.name}!`, CSS.pink);
        this.flashLane(ev.frog, 0xff8fa3);
        await this.wait(520);
        break;

      case "blocked":
        this.banner(`🚫 ${ev.by.name}의 방해 울음!`, CSS.pink);
        this.pushLog(`🚫 ${ev.by.name}의 방해 울음! ${ev.frog.name} 이동 불가`);
        this.shake(ev.frog);
        this.floatText(ev.frog, "이동 불가!", CSS.pink);
        await this.wait(850);
        break;

      case "doubleJump":
        this.banner(`✨ ${ev.frog.name} 더블 점프!`, CSS.firefly);
        this.pushLog(`✨ ${ev.frog.name}의 더블 점프 발동!`);
        this.floatText(ev.frog, "더블 점프!");
        await this.wait(550);
        break;

      case "rideAlong":
        this.banner(`🌧️ ${ev.frog.name} 빗물 타기!`, "#7FD0DE");
        this.pushLog(`🌧️ ${ev.frog.name}이(가) ${ev.with.name}을(를) 따라 전진!`);
        this.floatText(ev.frog, "빗물 타기!", "#7FD0DE");
        await this.wait(550);
        break;

      case "move":
        await this.hopBy(ev.frog, ev.from, ev.to);
        this.pushLog(
          `${ev.cause === "ride" ? "🌧️" : "🐸"} ${ev.frog.name} ${
            ev.to - ev.from > 1 ? `+${ev.to - ev.from}칸` : "+1칸"
          } → ${ev.to}칸`
        );
        await this.wait(120);
        break;

      case "moveBack":
        await this.hopBy(ev.frog, ev.from, ev.to);
        this.pushLog(`↩️ ${ev.frog.name} 한 칸 후퇴 → ${ev.to}칸`);
        await this.wait(120);
        break;

      case "immune":
        this.banner(`🛡️ ${ev.frog.name}은(는) 끄떡없다!`, ev.frog.colorCss);
        this.pushLog(`🛡️ ${ev.frog.name}의 묵직한 뚝심! 후진 무효`);
        this.floatText(ev.frog, "면역!", "#FFD95E");
        this.shake(ev.frog);
        await this.wait(750);
        break;

      case "skillReady":
        if (ev.frog.id !== "maeng") {
          this.pushLog(`⚡ ${ev.frog.name} 중간 지점 통과! 스킬 준비`);
          this.floatText(ev.frog, "스킬 준비!");
          await this.wait(300);
        }
        break;

      case "blockArmed":
        this.banner(`📢 ${ev.frog.name}이(가) 울음을 준비한다...`, ev.frog.colorCss);
        this.pushLog(`📢 ${ev.frog.name} 중간 지점 통과! 방해 울음 장전`);
        this.floatText(ev.frog, "방해 울음 장전!");
        await this.wait(700);
        break;

      case "backPhaseStart":
        this.banner(`⚠️ 전원 첫 칸 통과! 후진 뽑기 시작`, CSS.pink);
        this.pushLog(`⚠️ 지금부터 ${BACK_EVERY}번마다 후진 뽑기가 진행됩니다`);
        await this.wait(950);
        break;

      case "finish": {
        this.banner(`🏁 ${ev.frog.name} 우승!!`, CSS.firefly);
        this.pushLog(`🏁 ${ev.frog.name} 우승!`);
        const spr = this.sprites[ev.frog.id];
        this.tweens.add({
          targets: spr, y: spr.y - 26, duration: 280,
          yoyo: true, repeat: 3, ease: "Quad.easeOut",
        });
        await this.wait(1600);
        this.running = false;
        this.scene.start("Result", {
          rankings: rankings(this.race).map((f) => ({
            id: f.id, name: f.name, colorCss: f.colorCss, pos: f.pos,
          })),
          playerId: this.playerId,
        });
        break;
      }
    }
  }
}
