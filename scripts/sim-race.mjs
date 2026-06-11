// 레이스 엔진 시뮬레이션 — 스펙 v1.0 룰 검증 및 밸런스 확인
import {
  createRace, tick, selectionEvent, rankings,
} from "../src/game/RaceEngine.js";
import { CHARACTERS, RULES } from "../src/game/constants.js";

const N = 2000;
const DT = 0.1; // 시뮬레이션 틱 (초)
const interval = RULES.EVENT_INTERVAL / 1000;

const count = {};
const stat = {
  wins: {},
  firstFinish: 0,
  allFinish: 0,
  rains: 0,
  backruns: 0,
  skills: {},
};

for (let r = 0; r < N; r++) {
  const race = createRace(CHARACTERS);
  let t = 0;
  let nextEvent = interval;
  let firstAt = null;

  while (!race.finished && t < 600) {
    t += DT;
    let events = tick(race, DT);
    if (t >= nextEvent) {
      nextEvent += interval;
      events = events.concat(selectionEvent(race));
    }
    for (const e of events) {
      count[e.type] = (count[e.type] || 0) + 1;
      if (e.type === "rainStart") stat.rains++;
      if (e.type === "backrun") stat.backruns++;
      if (e.type === "skill")
        stat.skills[e.frog.id] = (stat.skills[e.frog.id] || 0) + 1;
      if (e.type === "move" && e.frog.pos < 0) throw new Error("음수 위치!");
      if (e.type === "finish" && firstAt === null) firstAt = t;
      if (e.type === "backrun" && e.at >= RULES.BACKRUN_SAFE)
        throw new Error("백도 안전선 위반!");
    }
  }

  if (!race.finished) throw new Error("600초 내 미완주!");
  const ranks = rankings(race);
  if (new Set(ranks.map((f) => f.finishOrder)).size !== 8)
    throw new Error("순위 중복!");
  stat.wins[ranks[0].id] = (stat.wins[ranks[0].id] || 0) + 1;
  stat.firstFinish += firstAt / N;
  stat.allFinish += t / N;
}

console.log(`시뮬레이션 ${N}회:`);
console.log(
  "승률:",
  Object.fromEntries(
    CHARACTERS.map((c) => [
      c.name,
      (((stat.wins[c.id] || 0) / N) * 100).toFixed(1) + "%",
    ])
  )
);
console.log("1위 골인 평균:", stat.firstFinish.toFixed(1), "초");
console.log("전원 골인 평균:", stat.allFinish.toFixed(1), "초");
console.log("비 발생:", (stat.rains / N).toFixed(2), "회/레이스");
console.log("백도 발생:", (stat.backruns / N).toFixed(2), "회/레이스");
console.log(
  "스킬 발동(회/레이스):",
  Object.fromEntries(
    Object.entries(stat.skills).map(([k, v]) => [k, (v / N).toFixed(2)])
  )
);
console.log("이벤트 합계:", count);
