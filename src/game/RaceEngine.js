// 레이스 엔진 — Frog Race Prototype Spec v1.0
// 렌더링과 분리된 순수 로직. 씬은 tick()을 매 프레임, selectionEvent()를 주기마다 호출.
//
// 규칙 요약:
//  - 모든 개구리는 지속 전진 (BASE_SPEED, 비 오면 RAIN_SLOW배)
//  - 선택 이벤트: 랜덤 1마리 +5칸, 나머지 액티브 개구리는 게이지 +1
//  - 게이지 5(뿔개구리는 6) 도달 후 선택되면 고유 스킬 발동 (액티브만, 발동 시 게이지 0)
//  - 날씨: 선택 이벤트 시 RAIN_CHANCE 확률 비 (지속/쿨다운 RAIN_DURATION/RAIN_COOLDOWN회)
//          비개구리는 비 감속 면역
//  - 백도: 선두 50칸 도달 후, 선택 이벤트 4회당 1회 랜덤 -5칸
//          (95칸 이상 제외, 두꺼비 면역, 발톱개구리는 역습)
//  - 100칸 도달 시 골인. 골인 순서 = 순위

import { RULES } from "./constants.js";

export function createRace(characters) {
  return {
    frogs: characters.map((c, i) => ({
      ...c,
      // 고유 런타임 id — 같은 캐릭터 복수 출전(단일 개구리 모드) 시 렌더/상태 키 충돌 방지.
      // 스킬/날씨 판정은 캐릭터 id(c.id)를 그대로 사용한다.
      uid: c.uid || `${c.id}#${i}`,
      lane: i,
      pos: 0,
      gauge: 0,
      finished: false,
      finishOrder: null,
    })),
    raining: false,
    rainLeft: 0,
    rainCooldown: 0,
    selectionCount: 0,
    backrunActive: false,
    sinceBackrun: 0,
    finishCount: 0,
    finished: false,
  };
}

const rnd = Math.random;
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function rainFactor(state, frog) {
  return state.raining && frog.id !== "rain" ? RULES.RAIN_SLOW : 1;
}

function active(state) {
  return state.frogs.filter((f) => !f.finished);
}

// 현재 순위 (골인 순서 우선, 미골인은 위치 내림차순)
export function currentRanking(state) {
  return [...state.frogs].sort((a, b) => {
    if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.pos - a.pos || a.lane - b.lane;
  });
}

function checkFinish(state, frog, events) {
  if (!frog.finished && frog.pos >= RULES.TRACK) {
    frog.pos = RULES.TRACK;
    frog.finished = true;
    frog.finishOrder = ++state.finishCount;
    events.push({ type: "finish", frog, order: frog.finishOrder });
    if (state.finishCount === state.frogs.length) {
      state.finished = true;
      events.push({ type: "allFinished" });
    }
  }
}

/* ── 매 프레임: 지속 전진 ── */
export function tick(state, dtSec) {
  const events = [];
  if (state.finished) return events;
  for (const f of state.frogs) {
    if (f.finished) continue;
    const wobble = 1 + (rnd() * 2 - 1) * RULES.SPEED_WOBBLE;
    f.pos += RULES.BASE_SPEED * rainFactor(state, f) * wobble * dtSec;
    checkFinish(state, f, events);
  }
  return events;
}

/* ── 선택 이벤트 ── */
export function selectionEvent(state) {
  const events = [];
  if (state.finished) return events;

  // 1) 날씨 전이
  if (state.raining) {
    state.rainLeft -= 1;
    if (state.rainLeft <= 0) {
      state.raining = false;
      state.rainCooldown = RULES.RAIN_COOLDOWN;
      events.push({ type: "rainEnd" });
    }
  } else if (state.rainCooldown > 0) {
    state.rainCooldown -= 1;
  } else if (rnd() < RULES.RAIN_CHANCE) {
    state.raining = true;
    state.rainLeft = RULES.RAIN_DURATION;
    events.push({ type: "rainStart" });
  }

  state.selectionCount += 1;

  // 2) 선택 및 게이지 충전
  const racers = active(state);
  if (racers.length === 0) return events;
  const sel = pick(racers);
  events.push({ type: "select", frog: sel });
  for (const f of racers) {
    if (f !== sel && f.skillType === "active") {
      f.gauge = Math.min(f.gaugeMax || RULES.GAUGE_MAX, f.gauge + 1);
    }
  }

  // 3) 선택 이동 해결
  resolveSelection(state, sel, events);

  // 4) 백도 활성화 체크 (선두 진행률 기준)
  if (!state.backrunActive) {
    const lead = Math.max(...state.frogs.map((f) => f.pos));
    if (lead >= RULES.BACKRUN_AT) {
      state.backrunActive = true;
      state.sinceBackrun = 0;
      events.push({ type: "backrunStart" });
    }
  } else {
    state.sinceBackrun += 1;
    if (state.sinceBackrun >= RULES.BACKRUN_EVERY) {
      state.sinceBackrun = 0;
      resolveBackrun(state, events);
    }
  }

  return events;
}

function moveBy(state, frog, amount, events, cause) {
  // 두꺼비 패시브 확장: 모든 "밀려남" 효과 무시 (백도/방해 울음/역습)
  if (amount < 0 && frog.id === "toad") {
    events.push({ type: "pushImmune", frog, cause });
    return;
  }
  // 발톱개구리: 반격 본능 — 밀려나는 효과 절반으로 버팀
  if (amount < 0 && frog.id === "claw") {
    amount /= 2;
  }
  const from = frog.pos;
  frog.pos = Math.max(0, frog.pos + amount);
  events.push({ type: "move", frog, from, to: frog.pos, amount, cause });
  if (amount > 0) checkFinish(state, frog, events);
}

function resolveSelection(state, sel, events) {
  const baseMove = RULES.SELECT_MOVE * rainFactor(state, sel);

  // 나무개구리 패시브: 바로 앞 개구리 위치까지 추격 (최소 기본 이동 보장)
  if (sel.id === "wood") {
    const aheadList = state.frogs
      .filter((f) => f !== sel && f.pos > sel.pos)
      .sort((a, b) => a.pos - b.pos);
    const ahead = aheadList[0];
    if (ahead) {
      // 바로 앞 개구리를 추월 (+4). 추격으로 즉시 골인은 방지
      const target = Math.min(ahead.pos + 4, RULES.TRACK - 1);
      const dest = Math.max(sel.pos + baseMove, target);
      events.push({ type: "chase", frog: sel, target: ahead });
      moveBy(state, sel, dest - sel.pos, events, "chase");
      return;
    }
    moveBy(state, sel, baseMove, events, "select");
    return;
  }

  // 액티브 스킬: 게이지 가득 + 선택 → 발동 (기본 이동 대체)
  if (sel.skillType === "active" && sel.gauge >= (sel.gaugeMax || RULES.GAUGE_MAX)) {
    switch (sel.id) {
      case "tree": {
        sel.gauge = 0;
        events.push({ type: "skill", frog: sel });
        moveBy(state, sel, 10, events, "skill");
        return;
      }
      case "maeng": {
        sel.gauge = 0;
        events.push({ type: "skill", frog: sel });
        for (const f of active(state)) {
          if (f !== sel) moveBy(state, f, -RULES.SELECT_MOVE, events, "maengCry");
        }
        moveBy(state, sel, baseMove, events, "select");
        return;
      }
      case "horn": {
        // 50% 확률로 자신의 현재 등수 x 3칸 전진
        if (rnd() < 0.5) {
          sel.gauge = 0;
          events.push({ type: "skill", frog: sel });
          const rank = currentRanking(state).indexOf(sel) + 1;
          moveBy(state, sel, rank * 3, events, "skill");
          return;
        }
        // 실패 시 게이지 유지하고 일반 이동
        moveBy(state, sel, baseMove, events, "select");
        return;
      }
      case "fire": {
        sel.gauge = 0;
        events.push({ type: "skill", frog: sel });
        // 50% 확률로 +20칸 전진, 실패하면 -20칸 후퇴
        if (rnd() < 0.5) {
          moveBy(state, sel, 20, events, "skill");
        } else {
          moveBy(state, sel, -20, events, "skill");
        }
        return;
      }
    }
  }

  // 일반 선택 이동
  moveBy(state, sel, baseMove, events, "select");
}

function resolveBackrun(state, events) {
  const targets = active(state).filter((f) => f.pos < RULES.BACKRUN_SAFE);
  if (targets.length === 0) return;
  const victim = pick(targets);
  events.push({ type: "backrun", frog: victim, at: victim.pos });

  if (victim.id === "toad") {
    events.push({ type: "backrunImmune", frog: victim });
    return;
  }
  if (victim.id === "claw") {
    // 역습: 전원 -5, 자신 +5
    events.push({ type: "clawCounter", frog: victim });
    for (const f of active(state)) {
      if (f !== victim) moveBy(state, f, -RULES.BACKRUN_MOVE, events, "clawCounter");
    }
    moveBy(state, victim, RULES.BACKRUN_MOVE, events, "clawCounter");
    return;
  }
  moveBy(state, victim, -RULES.BACKRUN_MOVE, events, "backrun");
}

// 최종 순위
export function rankings(state) {
  return currentRanking(state);
}
