import { useState, useEffect, useRef, useCallback } from "react";

/* ───────────────────────── 개굴더비 (Frog Derby) ─────────────────────────
   우마무스메 구조: 개구리 선택 → 12턴 육성 → 레이스 → 결과
   타깃: 윈도우/안드로이드/iOS 브라우저 (터치 우선, 세로 화면 기준)
─────────────────────────────────────────────────────────────────────────── */

const C = {
  bg: "#0E2A24",        // 깊은 연못 녹색
  panel: "#16382F",
  panelLight: "#1E4A3D",
  lily: "#6FBF73",      // 연잎 그린
  firefly: "#FFD95E",   // 반딧불 노랑 (포인트)
  water: "#3E8E9E",     // 물빛
  pink: "#FF8FA3",      // 근성 핑크
  cream: "#F2EFE0",     // 본문 크림
  dim: "#9DB8A8",
};

const STATS = [
  { key: "jump", name: "점프력", color: C.lily, icon: "🦵" },
  { key: "speed", name: "순발력", color: C.water, icon: "⚡" },
  { key: "stamina", name: "스태미나", color: C.firefly, icon: "💧" },
  { key: "guts", name: "근성", color: C.pink, icon: "🔥" },
];

const APT = { S: 1.35, A: 1.15, B: 1.0, C: 0.85 };
const APT_COLOR = { S: "#FFD95E", A: "#FF8FA3", B: "#6FBF73", C: "#9DB8A8" };

const FROGS = [
  {
    id: "poljjak", name: "폴짝이", filter: "none",
    style: "도주형", desc: "초반부터 폴짝폴짝 치고 나가는 천재 점퍼. 뒷심이 약한 게 흠.",
    apt: { jump: "S", speed: "B", stamina: "C", guts: "B" },
    base: { jump: 45, speed: 35, stamina: 25, guts: 30 },
  },
  {
    id: "mureu", name: "미르", filter: "hue-rotate(165deg) saturate(1.2)",
    style: "추입형", desc: "조용한 청개구리. 마지막 직선에서 무서운 순발력을 보여준다.",
    apt: { jump: "B", speed: "S", stamina: "B", guts: "C" },
    base: { jump: 35, speed: 45, stamina: 30, guts: 25 },
  },
  {
    id: "mukjik", name: "묵직이", filter: "sepia(0.7) hue-rotate(-20deg) saturate(1.4)",
    style: "선행형", desc: "연못의 큰형님 두꺼비. 지치지 않는 체력과 근성으로 밀어붙인다.",
    apt: { jump: "C", speed: "C", stamina: "S", guts: "A" },
    base: { jump: 25, speed: 28, stamina: 45, guts: 40 },
  },
];

const EVENTS = [
  { msg: "🪰 살찐 파리 떼를 발견했다! 포식 후 컨디션 최고!", fx: { energy: +15 } },
  { msg: "🌧️ 갑자기 비가 내렸다. 피부가 촉촉! 스태미나 +5", fx: { stamina: +5 } },
  { msg: "🦢 왜가리가 나타나 전력 도주! 순발력 +5, 체력 -10", fx: { speed: +5, energy: -10 } },
  { msg: "🎵 밤새 합창 연습을 했다. 근성 +5, 체력 -5", fx: { guts: +5, energy: -5 } },
  { msg: "🍄 수상한 버섯을 먹었다... 다행히 아무 일도 없었다.", fx: {} },
  { msg: "🐍 라이벌 개구리의 도발! 오기가 생겼다. 근성 +4", fx: { guts: +4 } },
  { msg: "🪷 햇볕 좋은 연잎에서 낮잠. 체력 +20", fx: { energy: +20 } },
];

const NPC_NAMES = ["왕눈이", "초록번개", "연못킹", "개굴몬", "점프스타"];

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const totalOf = (s) => s.jump + s.speed + s.stamina + s.guts;
const gradeOf = (t) => (t >= 420 ? "S" : t >= 340 ? "A" : t >= 260 ? "B" : t >= 180 ? "C" : "D");

/* ── 공용 컴포넌트 ── */
function Bar({ value, max, color, h = 10 }) {
  return (
    <div style={{ background: "#0A1F1A", borderRadius: h, height: h, overflow: "hidden" }}>
      <div style={{
        width: `${clamp((value / max) * 100, 0, 100)}%`, height: "100%",
        background: color, borderRadius: h, transition: "width .35s ease",
      }} />
    </div>
  );
}

function Btn({ children, onClick, disabled, big, ghost, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: "inherit", cursor: disabled ? "default" : "pointer",
      border: ghost ? `2px solid ${C.lily}` : "none",
      background: disabled ? "#2A463C" : ghost ? "transparent" : C.firefly,
      color: disabled ? "#5E7A6C" : ghost ? C.lily : "#3A2E00",
      fontWeight: 700, fontSize: big ? 18 : 15,
      padding: big ? "14px 22px" : "10px 14px",
      borderRadius: 14, touchAction: "manipulation",
      boxShadow: disabled || ghost ? "none" : "0 3px 0 #C9A02E",
      transition: "transform .08s", width: big ? "100%" : undefined,
      ...style,
    }}
      onPointerDown={(e) => !disabled && (e.currentTarget.style.transform = "translateY(2px)")}
      onPointerUp={(e) => (e.currentTarget.style.transform = "none")}
      onPointerLeave={(e) => (e.currentTarget.style.transform = "none")}
    >{children}</button>
  );
}

function FrogFace({ filter, size = 44, hop }) {
  return (
    <span className={hop ? "idle-hop" : ""} style={{
      fontSize: size, lineHeight: 1, filter, display: "inline-block",
      userSelect: "none",
    }}>🐸</span>
  );
}

/* ── 메인 앱 ── */
export default function FrogDerby() {
  const [screen, setScreen] = useState("title"); // title | select | training | prerace | race | result
  const [frog, setFrog] = useState(null);
  const [stats, setStats] = useState(null);
  const [energy, setEnergy] = useState(100);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState([]);
  const [raceResult, setRaceResult] = useState(null);
  const MAX_TURN = 12;

  const pushLog = (m) => setLog((l) => [m, ...l].slice(0, 4));

  const startGame = (f) => {
    setFrog(f);
    setStats({ ...f.base });
    setEnergy(100);
    setTurn(1);
    setLog([`${f.name}의 육성을 시작합니다! (${f.style})`]);
    setScreen("training");
  };

  const doTrain = (key) => {
    if (energy < 15) { pushLog("😵 체력이 부족해요! 휴식이 필요합니다."); return; }
    const aptMul = APT[frog.apt[key]];
    const failP = energy >= 60 ? 0.05 : energy >= 40 ? 0.15 : energy >= 20 ? 0.35 : 0.55;
    const stat = STATS.find((s) => s.key === key);
    let next = { ...stats };
    if (Math.random() < failP) {
      pushLog(`💦 ${stat.name} 훈련 실패... 미끄러졌다!`);
      setEnergy((e) => clamp(e - 10, 0, 100));
    } else {
      const great = Math.random() < 0.15;
      const gain = Math.round((9 + ri(0, 6)) * aptMul * (great ? 1.8 : 1));
      next[key] = clamp(next[key] + gain, 0, 150);
      // 보조 스탯 연계
      const sub = key === "jump" ? "speed" : key === "stamina" ? "guts" : key === "speed" ? "jump" : "stamina";
      next[sub] = clamp(next[sub] + ri(1, 3), 0, 150);
      pushLog(`${great ? "✨ 대성공!! " : "✅ "}${stat.name} +${gain}`);
      setEnergy((e) => clamp(e - 20, 0, 100));
    }
    afterAction(next);
  };

  const doRest = () => {
    const gain = ri(35, 50);
    setEnergy((e) => clamp(e + gain, 0, 100));
    pushLog(`💤 푹 쉬었다. 체력 +${gain}`);
    afterAction({ ...stats });
  };

  const afterAction = (next) => {
    // 랜덤 이벤트 22%
    if (Math.random() < 0.22) {
      const ev = EVENTS[ri(0, EVENTS.length - 1)];
      Object.entries(ev.fx).forEach(([k, v]) => {
        if (k === "energy") setEnergy((e) => clamp(e + v, 0, 100));
        else next[k] = clamp(next[k] + v, 0, 150);
      });
      setTimeout(() => pushLog(ev.msg), 350);
    }
    setStats(next);
    if (turn >= MAX_TURN) setTimeout(() => setScreen("prerace"), 700);
    else setTurn((t) => t + 1);
  };

  const reset = () => { setScreen("select"); setRaceResult(null); };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.cream,
      fontFamily: "'Jua','Gowun Dodum',system-ui,sans-serif",
      display: "flex", justifyContent: "center",
      WebkitTapHighlightColor: "transparent",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap');
        @keyframes idleHop { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-9px)} 55%{transform:translateY(0)} }
        .idle-hop { animation: idleHop 1.6s ease-in-out infinite; }
        @keyframes ripple { 0%{opacity:.5;transform:scale(.6)} 100%{opacity:0;transform:scale(1.6)} }
        @media (prefers-reduced-motion: reduce) { .idle-hop { animation: none; } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480, padding: "16px 14px 28px" }}>
        {screen === "title" && <Title onStart={() => setScreen("select")} />}
        {screen === "select" && <Select onPick={startGame} />}
        {screen === "training" && (
          <Training frog={frog} stats={stats} energy={energy} turn={turn} maxTurn={MAX_TURN}
            log={log} onTrain={doTrain} onRest={doRest} />
        )}
        {screen === "prerace" && (
          <PreRace frog={frog} stats={stats} onGo={() => setScreen("race")} />
        )}
        {screen === "race" && (
          <Race frog={frog} stats={stats} onDone={(r) => { setRaceResult(r); setScreen("result"); }} />
        )}
        {screen === "result" && (
          <Result frog={frog} stats={stats} result={raceResult} onRetry={reset} />
        )}
      </div>
    </div>
  );
}

/* ── 타이틀 ── */
function Title({ onStart }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 70 }}>
      <div style={{ fontSize: 70 }}><span className="idle-hop" style={{ display: "inline-block" }}>🐸</span></div>
      <h1 style={{ fontSize: 44, margin: "8px 0 2px", color: C.firefly, letterSpacing: 2 }}>개굴더비</h1>
      <div style={{ color: C.dim, marginBottom: 6 }}>FROG DERBY · 연못 챔피언을 키워라</div>
      <div style={{ fontSize: 22, letterSpacing: 6, margin: "10px 0 40px" }}>🪷 🪰 🪷</div>
      <Btn big onClick={onStart}>육성 시작</Btn>
      <p style={{ color: C.dim, fontSize: 13, marginTop: 26, lineHeight: 1.7 }}>
        개구리를 선택해 12턴 동안 훈련시키고<br />연못 그랑프리에서 우승을 노려보세요!
      </p>
    </div>
  );
}

/* ── 개구리 선택 ── */
function Select({ onPick }) {
  return (
    <div>
      <h2 style={{ color: C.firefly, fontSize: 24, margin: "8px 0 14px" }}>파트너 개구리 선택</h2>
      {FROGS.map((f) => (
        <div key={f.id} style={{
          background: C.panel, borderRadius: 18, padding: 16, marginBottom: 14,
          border: `1px solid ${C.panelLight}`,
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <FrogFace filter={f.filter} size={52} hop />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20 }}>{f.name}
                <span style={{
                  fontSize: 12, marginLeft: 8, background: C.panelLight,
                  padding: "2px 8px", borderRadius: 8, color: C.lily,
                }}>{f.style}</span>
              </div>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 3, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            {STATS.map((s) => (
              <div key={s.key} style={{ flex: 1, textAlign: "center", background: "#0A1F1A", borderRadius: 10, padding: "6px 0" }}>
                <div style={{ fontSize: 11, color: C.dim }}>{s.name}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: APT_COLOR[f.apt[s.key]] }}>{f.apt[s.key]}</div>
              </div>
            ))}
          </div>
          <Btn big onClick={() => onPick(f)}>{f.name}와(과) 함께한다</Btn>
        </div>
      ))}
    </div>
  );
}

/* ── 육성 ── */
function Training({ frog, stats, energy, turn, maxTurn, log, onTrain, onRest }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <FrogFace filter={frog.filter} size={40} hop />
          <div>
            <div style={{ fontSize: 18 }}>{frog.name}</div>
            <div style={{ fontSize: 12, color: C.dim }}>{frog.style}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: C.dim }}>턴</div>
          <div style={{ fontSize: 22, color: C.firefly }}>{turn} <span style={{ fontSize: 13, color: C.dim }}>/ {maxTurn}</span></div>
        </div>
      </div>

      {/* 체력 */}
      <div style={{ background: C.panel, borderRadius: 14, padding: "10px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
          <span>체력</span><span style={{ color: energy < 30 ? C.pink : C.lily }}>{energy} / 100</span>
        </div>
        <Bar value={energy} max={100} color={energy < 30 ? C.pink : C.lily} />
      </div>

      {/* 스탯 */}
      <div style={{ background: C.panel, borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
        {STATS.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ width: 70, fontSize: 13 }}>{s.icon} {s.name}</span>
            <div style={{ flex: 1 }}><Bar value={stats[s.key]} max={150} color={s.color} h={12} /></div>
            <span style={{ width: 34, textAlign: "right", fontSize: 14, color: s.color }}>{stats[s.key]}</span>
          </div>
        ))}
        <div style={{ textAlign: "right", fontSize: 12, color: C.dim }}>
          총합 {totalOf(stats)} · 현재 등급 <b style={{ color: C.firefly }}>{gradeOf(totalOf(stats))}</b>
        </div>
      </div>

      {/* 훈련 버튼 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {STATS.map((s) => (
          <Btn key={s.key} onClick={() => onTrain(s.key)} style={{ background: C.panelLight, color: C.cream, boxShadow: "0 3px 0 #0A1F1A" }}>
            {s.icon} {s.name} 훈련
            <span style={{ display: "block", fontSize: 11, color: APT_COLOR[frog.apt[s.key]], fontWeight: 400 }}>
              적성 {frog.apt[s.key]} · 체력 -20
            </span>
          </Btn>
        ))}
      </div>
      <Btn big onClick={onRest} ghost>💤 휴식 (체력 회복)</Btn>

      {/* 로그 */}
      <div style={{ marginTop: 12, background: "#0A1F1A", borderRadius: 14, padding: "10px 14px", minHeight: 86 }}>
        {log.map((m, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.8, opacity: 1 - i * 0.22 }}>{m}</div>
        ))}
      </div>
    </div>
  );
}

/* ── 출주 전 ── */
function PreRace({ frog, stats, onGo }) {
  const total = totalOf(stats);
  return (
    <div style={{ textAlign: "center", paddingTop: 40 }}>
      <div style={{ fontSize: 14, color: C.dim, letterSpacing: 3 }}>FINAL RACE</div>
      <h2 style={{ color: C.firefly, fontSize: 28, margin: "6px 0 18px" }}>🏆 연못 그랑프리</h2>
      <FrogFace filter={frog.filter} size={72} hop />
      <div style={{ fontSize: 22, marginTop: 8 }}>{frog.name}</div>
      <div style={{
        display: "inline-block", background: C.panel, borderRadius: 14,
        padding: "12px 22px", margin: "16px 0 24px",
      }}>
        {STATS.map((s) => (
          <span key={s.key} style={{ margin: "0 8px", fontSize: 14 }}>
            {s.icon}<b style={{ color: s.color, marginLeft: 3 }}>{stats[s.key]}</b>
          </span>
        ))}
        <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>
          총합 {total} · 등급 <b style={{ color: C.firefly }}>{gradeOf(total)}</b>
        </div>
      </div>
      <Btn big onClick={onGo}>레이스 출발! 🚩</Btn>
    </div>
  );
}

/* ── 레이스 ── */
const TRACK = 1000;
function makeRacers(frog, stats) {
  const hueList = [40, 95, 200, 280, 320];
  const npcs = NPC_NAMES.map((n, i) => {
    const s = { jump: ri(52, 88), speed: ri(52, 88), stamina: ri(52, 88), guts: ri(45, 85) };
    return { name: n, stats: s, filter: `hue-rotate(${hueList[i]}deg)`, isPlayer: false };
  });
  const all = [...npcs];
  all.splice(ri(0, 5), 0, { name: frog.name, stats, filter: frog.filter, isPlayer: true });
  return all.map((r, lane) => ({
    ...r, lane, pos: 0, done: false, finishT: null,
    cond: rnd(0.95, 1.05),
    pool: 380 + r.stats.stamina * 6.2,
    spurt: null, hopPhase: rnd(0, Math.PI * 2),
  }));
}

function Race({ frog, stats, onDone }) {
  const [count, setCount] = useState(3);
  const [, force] = useState(0);
  const racersRef = useRef(null);
  const rafRef = useRef(null);
  if (!racersRef.current) racersRef.current = makeRacers(frog, stats);

  // 카운트다운
  useEffect(() => {
    if (count < 0) return;
    const t = setTimeout(() => setCount((c) => c - 1), count === 0 ? 600 : 800);
    return () => clearTimeout(t);
  }, [count]);

  const running = count < 0;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const start = last;
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const rs = racersRef.current;
      let allDone = true;
      for (const r of rs) {
        if (r.done) continue;
        allDone = false;
        let v = (55 + r.stats.speed * 0.22 + r.stats.jump * 0.18 + rnd(-8, 8)) * r.cond;
        // 스태미나 고갈
        r.pool -= v * dt;
        if (r.pool <= 0) v *= 0.55;
        // 막판 스퍼트 (근성)
        if (r.pos > TRACK * 0.72 && r.spurt === null) {
          r.spurt = Math.random() < r.stats.guts / 125 ? 1.35 : Math.random() < 0.3 ? 1.12 : 1;
        }
        if (r.spurt) v *= r.spurt;
        r.pos += v * dt;
        r.hopPhase += dt * (5 + r.stats.speed * 0.045);
        if (r.pos >= TRACK) { r.pos = TRACK; r.done = true; r.finishT = now - start; }
      }
      force((x) => x + 1);
      if (allDone) {
        const order = [...rs].sort((a, b) => a.finishT - b.finishT);
        setTimeout(() => onDone(order), 900);
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, onDone]);

  const rs = racersRef.current;
  const ranked = [...rs].sort((a, b) => b.pos - a.pos || (a.finishT ?? 1e9) - (b.finishT ?? 1e9));
  const LANE_H = 50;

  return (
    <div>
      <h2 style={{ color: C.firefly, fontSize: 20, margin: "4px 0 10px", textAlign: "center" }}>
        🏆 연못 그랑프리 <span style={{ fontSize: 13, color: C.dim }}>1000m</span>
      </h2>

      {/* 트랙 */}
      <div style={{
        position: "relative", background: `linear-gradient(180deg, #14424A 0%, #0F3A3F 100%)`,
        borderRadius: 16, overflow: "hidden", height: rs.length * LANE_H + 20,
        border: `2px solid ${C.panelLight}`,
      }}>
        {/* 연잎 장식 */}
        {[12, 30, 52, 70, 88].map((x, i) => (
          <span key={i} style={{ position: "absolute", left: `${x}%`, top: `${(i * 37) % 90}%`, fontSize: 16, opacity: 0.3 }}>🪷</span>
        ))}
        {/* 결승선 */}
        <div style={{
          position: "absolute", right: 26, top: 0, bottom: 0, width: 6,
          background: `repeating-linear-gradient(0deg, ${C.cream} 0 8px, #222 8px 16px)`,
        }} />
        {rs.map((r) => {
          const x = (r.pos / TRACK) * 100;
          const hopY = -Math.abs(Math.sin(r.hopPhase)) * 13;
          return (
            <div key={r.lane} style={{
              position: "absolute", top: 10 + r.lane * LANE_H, left: 0, right: 0, height: LANE_H,
            }}>
              <div style={{ position: "absolute", left: 8, top: 16, fontSize: 11, color: r.isPlayer ? C.firefly : C.dim, opacity: 0.8 }}>
                {r.isPlayer ? "★ " : ""}{r.name}
              </div>
              <div style={{
                position: "absolute", left: `calc(${4 + x * 0.86}%)`, top: 6,
                transform: `translateY(${running ? hopY : 0}px)`,
                transition: "none", textAlign: "center",
              }}>
                <span style={{ fontSize: 28, filter: r.filter, display: "inline-block" }}>🐸</span>
              </div>
            </div>
          );
        })}
        {/* 카운트다운 오버레이 */}
        {count >= 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10,31,26,.55)", fontSize: 64, color: C.firefly, fontWeight: 700,
          }}>{count === 0 ? "개굴!" : count}</div>
        )}
      </div>

      {/* 실시간 순위 */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {ranked.map((r, i) => (
          <span key={r.lane} style={{
            fontSize: 12, padding: "4px 10px", borderRadius: 10,
            background: r.isPlayer ? C.firefly : C.panel,
            color: r.isPlayer ? "#3A2E00" : C.dim, fontWeight: r.isPlayer ? 700 : 400,
          }}>{i + 1}위 {r.name}</span>
        ))}
      </div>
    </div>
  );
}

/* ── 결과 ── */
function Result({ frog, stats, result, onRetry }) {
  const myRank = result.findIndex((r) => r.isPlayer) + 1;
  const medal = ["🥇", "🥈", "🥉"][myRank - 1] || "🎗️";
  const total = totalOf(stats);
  const msg = myRank === 1 ? "연못 그랑프리 우승!! 전설의 개구리 탄생!"
    : myRank <= 3 ? "입상! 다음엔 정상을 노려보자."
    : "아쉽다... 훈련 배분을 바꿔서 다시 도전!";
  return (
    <div style={{ textAlign: "center", paddingTop: 30 }}>
      <div style={{ fontSize: 60 }}>{medal}</div>
      <h2 style={{ color: C.firefly, fontSize: 26, margin: "6px 0" }}>{myRank}위</h2>
      <div style={{ color: C.dim, marginBottom: 4 }}>{frog.name} · 육성 등급 <b style={{ color: C.firefly }}>{gradeOf(total)}</b> (총합 {total})</div>
      <div style={{ fontSize: 15, margin: "10px 0 18px", lineHeight: 1.6 }}>{msg}</div>

      <div style={{ background: C.panel, borderRadius: 14, padding: "12px 16px", textAlign: "left", marginBottom: 20 }}>
        {result.map((r, i) => (
          <div key={r.lane} style={{
            display: "flex", justifyContent: "space-between", padding: "5px 4px",
            fontSize: 15, color: r.isPlayer ? C.firefly : C.cream,
            fontWeight: r.isPlayer ? 700 : 400,
            borderBottom: i < result.length - 1 ? `1px solid ${C.panelLight}` : "none",
          }}>
            <span>{i + 1}위 <span style={{ filter: r.filter }}>🐸</span> {r.name}{r.isPlayer ? " ★" : ""}</span>
            <span style={{ color: C.dim, fontSize: 13 }}>{(r.finishT / 1000).toFixed(2)}s</span>
          </div>
        ))}
      </div>

      <Btn big onClick={onRetry}>🔁 새로운 개구리 육성하기</Btn>
    </div>
  );
}
