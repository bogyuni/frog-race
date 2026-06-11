# 프로그레이스 (Frog Race) — 프로젝트 컨텍스트
> (2026-06-11) 프로젝트명을 "개굴더비(Frog Derby)"에서 "프로그레이스(Frog Race)"로 변경.

## 프로젝트 개요
개구리 레이싱 게임. (장기적으로 육성 시뮬레이션 결합 예정 — 현재 육성은 보류)
- **장르**: 랜덤 뽑기 기반 레이싱 (+ 향후 육성 시뮬레이션)
- **타깃 플랫폼**: Windows, Android, iOS
- **기술 스택**: Phaser.js 4 + Vite + Capacitor (앱화)

## 개발 환경
- VSCode + Claude Code
- 브라우저 프로토타입(육성 포함 구버전)은 `src/prototype/frog-derby.jsx` 에 보관
- JDK 21: `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`
- Android SDK: `%LOCALAPPDATA%\Android\Sdk` (platform 36, build-tools 36.0.0)
- APK 빌드: `npm run build && npx cap sync android && cd android && .\gradlew.bat assembleDebug`

## 산출물 최신화 규칙 (중요)
**기능/코드 변경 작업을 마칠 때마다** 아래 두 산출물을 함께 최신화한다:
1. 웹 산출물: `npm run build` → `docs/`에 자동 반영 (GitHub Pages 배포용)
2. 안드로이드 APK: `npx cap sync android && cd android && .\gradlew.bat assembleDebug` 후
   `android/app/build/outputs/apk/debug/app-debug.apk` → `release/frog-race-debug.apk`로 복사

## 우선순위 변경 (2026-06-11)
- **육성 시스템 보류** — 레이스가 우선. 육성 관련 코드는 prototype에만 존재
- **현재 핵심: 랜덤 레이스** (`src/game/`) — 기획서 `Frog_Race_Prototype_v1.0.md` 기반

## 모바일 UI 개선 (2026-06-12)
- 안드로이드 상태바(메뉴바) 숨김 (immersive 모드, MainActivity.java — 이전 세션에서 완료)
- 전반적 텍스트 크기 약 2배 확대 (트랙 UI/사이드패널/카운트다운/로그/플로팅 텍스트)
- 우측 사이드패널: 개구리 이미지 제거, 텍스트 크기 확대 + 간격 재조정
- 선택 이벤트 표시 배너를 화면 정중앙으로 이동, 등장/소멸 트윈 애니메이션 추가 (`buildCenterBanner`/`banner()`)
- 좌측 상단 컨트롤(날씨/속도/줌/음악/나가기)에 반투명 배경 적용 (`CSS.panelTranslucent`) — 뒤쪽 레이스 시야 확보
- 발열 저감: `src/main.js`에서 `fps.limit: 60` + `render.powerPreference: "low-power"` 적용 (기존 무의미했던 top-level `resolution` 설정 제거)
- 비 지속 시간 2회 → 3회로 증가 (RAIN_DURATION). 비 감속 배율(RAIN_SLOW)은 0.6 유지 — 더 강하게 줄이면 비개구리 면역 패시브와 겹쳐 승률이 35%+ 까지 치솟아 보류
- 비개구리 스킬 추가 버프(이동 3배 등)는 보류 — 위와 같은 이유로 3차례 시도 모두 밸런스 붕괴, 현재 스킬("비 감속 무시")만 유지
- 검증: `node scripts/sim-race.mjs`, `scripts/check-mobile-ui.mjs`(신규), `scripts/check-race.mjs` 모두 통과

## 현재 레이스 룰 (스펙 v1.0 — `src/game/RaceEngine.js`)
```
트랙 100칸, 8마리 전원 출전, 모든 개구리 지속 전진 (2칸/초 ± 흔들림)
선택 이벤트(2초 주기): 랜덤 1마리 +5칸. 선택 안 된 액티브 개구리는 게이지 +1
게이지 5 모은 액티브 개구리가 선택되면 고유 스킬 발동
날씨: 선택 이벤트 시 15% 확률 비 (3회 지속, 2회 쿨다운) → 전원 이동량 60%
백도: 선두 50칸 도달 후 선택 4회당 1회, 랜덤 -5칸 (95칸 이상 제외)
100칸 도달 = 골인. 전원 골인까지 진행, 골인 순서 = 순위
참가자 1~8명, 각자 응원 개구리 선택 (조작 없음, 관전)
참가자 등록 모드: 참가자 수만큼의 개구리만 출전 (빠른 시작은 8마리 전원 출전)
```

### 캐릭터 8종 (스펙 대비 밸런스 조정 포함)
| 이름 | 타입 | 효과 |
|------|------|------|
| 청개구리 | 액티브 | 더블 점프: 발동 시 +10칸 이동 |
| 두꺼비 | 패시브 | 묵직한 뚝심: 모든 밀려남 무시 (백도+방해 울음+역습) |
| 맹꽁이 | 액티브 | 방해 울음: 자신 제외 전원 -5칸 (+본인 기본 이동 유지) |
| 비개구리 | 패시브 | 빗물 타기: 비 감속 무시 (2026-06-12: 비 추가 버프 검토했으나 면역 패시브만으로도 비 강화 시 승률 과도하게 상승해 보류) |
| 뿔개구리 | 액티브 | 분노의 돌진: 50% 확률로 자신의 현재 등수 x 3칸 전진 (게이지 6, 다른 액티브는 5) |
| 무당개구리 | 액티브 | 현혹의 춤: 50% 확률로 +20칸 전진, 실패 시 -20칸 후퇴 |
| 발톱개구리 | 패시브 | 역습의 발톱: 백도 대상 시 전원 -5/자신 +5, 밀려남 절반 |
| 나무개구리 | 패시브 | 끈질긴 추격: 선택 시 앞 개구리+4칸까지 추격 (최소 +5) |

시뮬레이션 승률 (2000회, 2026-06-12 기준): 전 캐릭터 8.6~17.8% 분포 (비개구리·뿔개구리 약 16~18%로 다소 높은 편, 비 강화 영향). 1위 골인 평균 42초, 전원 골인 54초
검증 스크립트: `node scripts/sim-race.mjs`

## 코드 구조
```
src/main.js                  Phaser 진입점 (480x854, FIT 스케일)
src/game/constants.js        색상/RULES 상수/캐릭터 8종 정의
src/game/RaceEngine.js       순수 레이스 로직 — tick(연속 전진) + selectionEvent(이산 이벤트)
src/game/frogTexture.js      프로시저럴 개구리 텍스처 (종별 체형/눈/무늬 TRAITS)
src/game/ui.js               버튼 헬퍼
src/game/scenes/             Title / Lobby(참가자 등록) / Race / Result 씬
src/game-v0-backup/          구버전(10칸 턴제) 백업
scripts/sim-race.mjs         엔진 시뮬레이션 테스트
scripts/check-race.mjs       Playwright 헤드리스 플로우 검증 (dev 서버 필요)
```

## (보류) 구 육성 시스템 구조 — prototype 참고용
```
개구리 선택 → 12턴 육성 → 레이스 → 결과 → 반복
```

### 개구리 3종
| 이름 | 스타일 | S 적성 | 특징 |
|------|--------|--------|------|
| 폴짝이 | 도주형 | 점프력 | 초반 질주, 뒷심 약함 |
| 미르 | 추입형 | 순발력 | 막판 직선 가속 |
| 묵직이 | 선행형 | 스태미나+근성 | 지치지 않는 체력 |

### 스탯 4종
- **점프력** (jump): 초반 가속에 기여
- **순발력** (speed): 전체 이동 속도
- **스태미나** (stamina): 스태미나 풀 크기 (고갈 시 속도 55%)
- **근성** (guts): 막판 스퍼트 발동 확률 (72% 지점 이후)

### 육성 시스템
- 12턴 제한
- 훈련 4종 / 휴식 1종
- 체력 100 → 훈련 시 -20, 휴식 시 +35~50
- 체력 낮을수록 훈련 실패 확률 증가 (20 미만 → 55%)
- 적성(S/A/B/C) 배율: 1.35 / 1.15 / 1.0 / 0.85
- 대성공 15% 확률 (1.8배)
- 랜덤 이벤트 22% 확률 (7종)

### 레이스 시스템
- 트랙 1000m, 6마리 동시 경주 (플레이어 1 + NPC 5)
- 속도 계산: `(55 + speed*0.22 + jump*0.18 + random(-8,8)) * cond`
- 스태미나 풀: `380 + stamina*6.2`
- 막판 스퍼트: 72% 지점 이후, guts/125 확률로 1.35배 가속

## 디자인 토큰
```
bg:         #0E2A24  (깊은 연못 녹색)
panel:      #16382F
panelLight: #1E4A3D
lily:       #6FBF73  (연잎 그린)
firefly:    #FFD95E  (반딧불 노랑, 포인트 컬러)
water:      #3E8E9E  (물빛)
pink:       #FF8FA3  (근성 핑크)
cream:      #F2EFE0  (본문 크림)
dim:        #9DB8A8
```
폰트: Noto Sans KR

## 현재까지 완료된 것
- [x] 게임 기획 확정 (Claude.ai 세션에서)
- [x] React 브라우저 프로토타입 완성 (`src/prototype/frog-derby.jsx`)
- [x] 기술 스택 결정: Phaser.js + Capacitor
- [x] Phaser.js 랜덤 레이스 구현 (스펙 v1.0: 100칸/8종/날씨/백도/게이지)
- [x] 참가자 등록(1~8명) + 개구리 선택 화면
- [x] 캐릭터 8종 프로시저럴 텍스처 (종별 형태 차별화)
- [x] Capacitor Android 설정 + APK 빌드 환경 구축
- [x] 프로젝트명 개굴더비→프로그레이스 변경, 폰트 Noto Sans KR 적용
- [x] 16:9 가로 레이아웃(좌 8 트랙 / 우 2 사이드패널) + 레이스 카메라 연출 + 줌인/아웃 토글
- [x] 배경음 / 효과음 추가 (Web Audio 절차적 BGM·SFX, `src/game/sound.js`)
- [x] 빌드 출력을 `docs/`로 일원화 (`vite.config.js` outDir, `dist/` 폐지) — GitHub Pages `/docs` 배포 + Capacitor webDir 겸용
- [ ] 픽셀아트 에셋 (현재 프로시저럴 텍스처)
- [ ] 진동
- [ ] (보류) 육성 시스템 Phaser 포팅
- [ ] iOS 설정

## 관련 선행 프로젝트
- **프로그레이스(카드) — 별도 저장소, 동명이작**: 카드 경주 게임. Phaser.js, 4종 카드슈트 개구리, 히든카드 메커닉. 픽셀/도트아트 에셋, 숲+연못 테마. 본 프로젝트와 이름이 같아졌지만(2026-06-11 개명) 별개의 저장소/신작이므로 혼동 주의.
