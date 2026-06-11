// 절차적 사운드 매니저 — Web Audio API로 BGM/효과음 합성 (외부 에셋 불필요)

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C major pentatonic (옥타브 확장)

class SoundManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.musicEnabled = false;
  }

  ensure() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.16;
    this.bgmGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.4;
    this.sfxGain.connect(this.master);
  }

  // 최초 사용자 입력 시 호출 — 오토플레이 정책 해제 (음악 ON일 때만 BGM 시작)
  unlock() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.musicEnabled) this.startBgm();
  }

  // 음악 on/off 토글 (기본 off)
  setMusicEnabled(on) {
    this.musicEnabled = on;
    this.ensure();
    if (!this.ctx) return;
    if (on) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  tone(freq, { duration = 0.18, type = "sine", gain = 1, delay = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env);
    env.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /* ── 효과음 ── */

  click() {
    this.unlock();
    this.tone(660, { duration: 0.06, type: "square", gain: 0.18 });
  }

  select() {
    if (!this.ctx) return;
    this.tone(523.25, { duration: 0.12, type: "triangle", gain: 0.5 });
    this.tone(783.99, { duration: 0.18, type: "triangle", gain: 0.35, delay: 0.05 });
  }

  skill() {
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, { duration: 0.16, type: "sawtooth", gain: 0.3, delay: i * 0.06 })
    );
  }

  backrun() {
    if (!this.ctx) return;
    this.tone(392, { duration: 0.22, type: "sawtooth", gain: 0.35 });
    this.tone(261.63, { duration: 0.28, type: "sawtooth", gain: 0.3, delay: 0.08 });
  }

  rain(start) {
    if (!this.ctx) return;
    if (start) {
      [880, 740, 660].forEach((f, i) =>
        this.tone(f, { duration: 0.5, type: "sine", gain: 0.12, delay: i * 0.05 })
      );
    } else {
      [660, 880].forEach((f, i) =>
        this.tone(f, { duration: 0.35, type: "sine", gain: 0.14, delay: i * 0.05 })
      );
    }
  }

  countdownBeep(isGo = false) {
    if (!this.ctx) return;
    this.tone(isGo ? 1046.5 : 523.25, {
      duration: isGo ? 0.35 : 0.14,
      type: "square",
      gain: isGo ? 0.4 : 0.25,
    });
  }

  finish() {
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, { duration: 0.3, type: "triangle", gain: 0.4, delay: i * 0.1 })
    );
  }

  /* ── 배경음 (펜타토닉 아르페지오 루프) ── */

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const playStep = () => {
      const note = PENTATONIC[this.bgmStep % PENTATONIC.length];
      const octave = (this.bgmStep % 16 < 8) ? 1 : 0.5;
      this.tone(note * octave, {
        duration: 1.4, type: "sine", gain: 0.5, dest: this.bgmGain,
      });
      this.bgmStep += 1;
    };
    playStep();
    this.bgmTimer = setInterval(playStep, 850);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new SoundManager();
