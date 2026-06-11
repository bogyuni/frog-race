// 레이스 엔진 — 주사위(뽑기) 기반 경주 로직. 렌더링과 분리된 순수 로직.
//
// 규칙:
//  - 매 뽑기마다 참가 개구리 중 1마리를 균등 확률로 선택, 한 칸 전진
//  - GOAL(10칸) 도달 시 우승, 즉시 레이스 종료
//  - 전원이 첫 번째 칸(pos >= 1)을 지나면 후진 페이즈 시작:
//    이후 BACK_EVERY번째 뽑기마다 후진 뽑기(선택된 개구리 한 칸 후퇴)
//  - 스킬은 각 개구리가 중간 지점(MID)을 통과하면 발동 가능 상태가 됨
//    · 청개구리: 발동 후 처음 뽑히면 2칸 이동 (1회)
//    · 두꺼비:   발동 후 후진 뽑기 면역
//    · 맹꽁이:   발동 즉시 장전 → 바로 다음 전진 뽑기의 대상(자신 포함)을 봉쇄 (1회)
//    · 레인프록: 발동 후 다른 개구리가 전진할 때 함께 1칸 전진 (1회)

import { GOAL, MID, BACK_EVERY } from "./constants.js";

export function createRace(characters) {
  return {
    frogs: characters.map((c, i) => ({
      ...c,
      lane: i,
      pos: 0,
      skillReady: false, // 중간 지점 통과 여부
      skillUsed: false,  // 1회성 스킬 소모 여부 (두꺼비는 소모 없음)
    })),
    backPhase: false,    // 전원 1칸 통과 → 후진 뽑기 활성화
    forwardSinceBack: 0, // 후진 페이즈에서 전진 뽑기 카운트
    blockArmed: false,   // 맹꽁이 봉쇄 장전 상태
    finished: false,
    winner: null,
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 이동 후 스킬 발동 체크. 발생한 이벤트를 events에 추가.
function checkSkillReady(state, frog, events) {
  if (!frog.skillReady && frog.pos >= MID) {
    frog.skillReady = true;
    events.push({ type: "skillReady", frog });
    if (frog.id === "maeng" && !frog.skillUsed) {
      state.blockArmed = true;
      events.push({ type: "blockArmed", frog });
    }
  }
}

function moveForward(state, frog, steps, events, cause) {
  const from = frog.pos;
  frog.pos = Math.min(GOAL, frog.pos + steps);
  events.push({ type: "move", frog, from, to: frog.pos, cause });
  if (frog.pos >= GOAL && !state.finished) {
    state.finished = true;
    state.winner = frog;
    events.push({ type: "finish", frog });
    return true;
  }
  checkSkillReady(state, frog, events);
  return false;
}

// 한 번의 뽑기를 진행하고 이벤트 목록을 반환
export function nextDraw(state) {
  const events = [];
  if (state.finished) return events;

  const isBackDraw =
    state.backPhase && state.forwardSinceBack >= BACK_EVERY - 1;

  if (isBackDraw) {
    state.forwardSinceBack = 0;
    const frog = pickRandom(state.frogs);
    events.push({ type: "drawBack", frog });
    if (frog.id === "toad" && frog.skillReady) {
      events.push({ type: "immune", frog });
    } else {
      const from = frog.pos;
      frog.pos = Math.max(0, frog.pos - 1);
      events.push({ type: "moveBack", frog, from, to: frog.pos });
    }
    return events;
  }

  if (state.backPhase) state.forwardSinceBack += 1;

  const frog = pickRandom(state.frogs);
  events.push({ type: "drawForward", frog });

  // 맹꽁이 봉쇄: 다음 전진 뽑기의 대상은 이동 불가 (자신 포함)
  if (state.blockArmed) {
    state.blockArmed = false;
    const maeng = state.frogs.find((f) => f.id === "maeng");
    maeng.skillUsed = true;
    events.push({ type: "blocked", frog, by: maeng });
    return events;
  }

  // 청개구리: 중간 지점 통과 후 첫 선택 시 2칸
  let steps = 1;
  if (frog.id === "tree" && frog.skillReady && !frog.skillUsed) {
    frog.skillUsed = true;
    steps = 2;
    events.push({ type: "doubleJump", frog });
  }

  const won = moveForward(state, frog, steps, events, "draw");
  if (won) return events;

  // 레인프록: 다른 개구리가 전진하면 함께 1칸 (1회)
  const rain = state.frogs.find((f) => f.id === "rain");
  if (rain !== frog && rain.skillReady && !rain.skillUsed) {
    rain.skillUsed = true;
    events.push({ type: "rideAlong", frog: rain, with: frog });
    if (moveForward(state, rain, 1, events, "ride")) return events;
  }

  // 후진 페이즈 진입 체크
  if (!state.backPhase && state.frogs.every((f) => f.pos >= 1)) {
    state.backPhase = true;
    state.forwardSinceBack = 0;
    events.push({ type: "backPhaseStart" });
  }

  return events;
}

// 최종 순위: 우승자 → 남은 개구리는 위치 내림차순 (동률은 레인 순)
export function rankings(state) {
  const rest = state.frogs
    .filter((f) => f !== state.winner)
    .sort((a, b) => b.pos - a.pos || a.lane - b.lane);
  return state.winner ? [state.winner, ...rest] : rest;
}
