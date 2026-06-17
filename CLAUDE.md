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
   `app-debug.apk` → **`release/frog-race-v{버전}-debug.apk`** 로 복사 (파일명에 버전 포함).
   - 버전 단일 소스: `package.json` "version". APK 빌드 전 `package.json` 버전과
     `android/app/build.gradle`의 versionName/versionCode를 함께 올린다.
   - 예: `cp app-debug.apk release/frog-race-v$(node -p "require('./package.json').version")-debug.apk`

## 작업 보고 규칙 (2026-06-17 사용자 요청)
- 작업 완료 시 **APK 파일명에 버전 숫자 포함** (위 규칙) + **작업 소요 시간**을 함께 보고한다.
  소요 시간은 작업 시작 시 `date +%s`를 기록해두고 종료 시 차이로 계산.
- 완료 알림(선택): `node scripts/notify.mjs "메시지"` → Discord 웹훅 전송.
  설정은 루트 `.notify.json`({"discordWebhook":"..."}, git 무시) 또는 `DISCORD_WEBHOOK` 환경변수.

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

## 모바일 UI 개선 2차 (2026-06-12)
사용자 피드백("모바일 개선이 전혀 되지 않았다") 반영, 3개 항목 작업:
1. **안드로이드 상태바 노출**: `MainActivity.java`에서 `onCreate`뿐 아니라 `onResume`/`onWindowFocusChanged`에서도
   `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())`를 재적용 (포커스 복귀/회전 시 재노출 방지).
   `styles.xml`의 실제 액티비티 테마 `AppTheme.NoActionBarLaunch`에 `windowActionBar=false`/`windowNoTitle=true`/`windowFullscreen=true` 추가.
2. **텍스트/레이아웃 재정립**: `SIDE_PANEL_W` 256→340 (`TRACK_PANEL_W` 940). RaceScene 우측 패널을 1열x8행 → 2열x4행 카드 그리드로 재구성해
   이름/순위/게이지 폰트를 키울 공간 확보. 좌측 상단 컨트롤(날씨/속도/줌/음악/나가기)을 세로 스택 → 상단 가로 1열 바로 재배치
   — 참가자 등록(2~4명) 시 레인이 두꺼워지면 출발 위치(좌측 끝)의 개구리가 좌측 상단 컨트롤과 겹치던 문제 해결
   (`TRACK_TOP` 16→54로 상단 바 공간 확보, 미니맵도 바 아래로 이동). Title/Result/Lobby 전반 폰트·간격 확대.
3. **로비 개구리 선택 화면 재설계**: 4x2 즉시선택 → 좌(50%) 포커스된 개구리의 큰 이미지+설명, 우(50%) 2x4 이름 그리드(탭 = 포커스 이동)
   + 하단 "✅ {이름} 선택" 확정 버튼으로 변경 (`LobbyScene.showPickStep`).
- 검증: `node scripts/sim-race.mjs`(밸런스 영향 없음 확인), `scripts/check-mobile2.mjs`(1280x720 + 844x390 양쪽 플로우),
  `scripts/check-mobile-result.mjs`(결과 화면) 신규 추가, 모두 통과

## ✅ 모바일 성능 근본 해결 (2026-06-17, v0.2.3) — 중요 교훈
**증상**: 갤럭시 S24(Exynos 2400, Xclipse 940)에서 단순 2D 장면이 18fps. 데스크톱(Playwright)은 60fps.
**진단**: 화면에 실제 렌더러 표시 → `WebGL · ANGLE Samsung Xclipse 940 (Vulkan)` = **하드웨어 GPU 정상**.
즉 GPU/플랫폼 문제가 아니라 **드로우콜(draw call) 과다**. `add.rectangle/line/ellipse`(Shape)와 Text는
배칭이 안 돼 각각 개별 드로우콜 → 트랙 장식 ~80 + 사이드 게이지 ~30 + … 합쳐 ~250개. 데스크톱 GL 드라이버는
견디지만 모바일 드라이버는 질식 → 18fps.
**해결(드로우콜 ~250→~90)**: 정적인 것을 **텍스처로 베이크**해 1 드로우콜로 묶음.
- 정적 트랙 장식(레인 밴드/하이라이트/그림자/마커/결승선) → `generateTexture("track-static")` 이미지 1장.
- 사이드 패널 행 배경 → `generateTexture("side-static")` 1장.
- 개구리 그림자 8개 ellipse → 공유 `px-shadow` 텍스처 이미지(같은 텍스처 = 1배치).
- 게이지(개구리당 사각형 5개) → 텍스트 1개(■□).
**결과**: S24에서 **90~92fps**, 사용자 만족도 높음. RS=1(슈퍼샘플 해제) 상태.
**향후 규칙**: 정적/반복 요소는 Shape 다발로 만들지 말고 **텍스처 베이크/스프라이트 배칭**. 동적 텍스트도 최소화.
드로우콜이 모바일 성능의 핵심 지표. 좌상단 FPS+GPU 표시는 현재 개발 빌드에 상시 노출(릴리스 전 제거/게이팅 예정).

### 발열 저감 (v0.2.4)
드로우콜 최적화 후 S24가 RAF에서 90~120fps로 돌아 발열↑. `fps:{target:60, forceSetTimeOut:true}`로
**60fps 상한** → 작업량 ~1/3 감소(발열↓). 드로우콜이 가벼워 60은 항상 안정적으로 달성되어 끊김 없음.
`render:{powerPreference:"low-power"}` 재적용(GPU 다운클럭 힌트). 더 줄이려면 target을 45/30으로.

## ⚠ 성능 긴급 수정 (2026-06-17, v0.2.0)
사용자 보고: 안드로이드(S24) 설치 후 **기기 전체가 멈출 정도로 과부하**. 원인=이번 세션 추가분이
모바일 WebView 프레임 예산을 초과 → `forceSetTimeOut` 30fps 루프 폭주. 부하 대폭 절감:
- **해상도 상한 RS 2→1.5** (`main.js`). 2배(백킹 2560×1440=픽셀 채움 4배)가 주범. 1.5=1080p(2.25배)로 하향.
  더 낮추려면 `const RS = Math.min(devicePixelRatio, 1.5)`의 1.5를 1.25/1로.
- **전체화면 물결 알파 레이어 제거**(`buildBackground`의 px-water tileSprite) — 매 프레임 풀스크린 오버드로 제거. 깊이감은 레인 음영+갈대 패럴랙스로 유지.
- **매 프레임 8마리 물보라 분사 제거** — 선택/스킬 등 이벤트 시에만 분사. 파티클 `maxParticles:40` 상한.
- **비 오버레이 평소 숨김**(setVisible(false), 비 올 때만 표시).
- 검증: dpr1.5 Playwright 렌더 정상/콘솔 에러 없음. (실기기 체감은 사용자 확인 필요)

## 레이스 뷰 2차 보강 + 고해상도 + 단일 개구리 모드 (2026-06-14)
- **점프 애니메이션 구조**: 2프레임(앉음/점프) 스프라이트시트 지원. `manifest`의 frog에 `frames:2`(스트립 w*2×h). `BootScene`이 `load.spritesheet` + `hop-<id>` 애니 생성, `RaceScene`이 이동 중 재생/정지. PNG 미적용 현재는 **프로시저럴 스쿼시&스트레치**(`update`의 lift/scaleX·Y)로 점프 흉내 + 그림자 축소.
- **원근감 강화**: `BACK_SCALE 0.64`/`FRONT_SCALE 1.52`, `LANE_FILL 0.9`(레인 묶음 세로 압축=간격 더 좁힘), `FROG_BASE 1.3`.
- **고해상도(고DPI) 대응**: `main.js`에서 게임 백킹 크기를 `GAME_W*RS × GAME_H*RS`(RS=clamp(round(devicePixelRatio),1,2))로 키우고, 각 씬은 **카메라 줌=RS 슈퍼샘플**로 1280×720 논리 좌표 유지(`ui.applyHiDPI`, RaceScene `setupCameras`의 `this.rs`). 좌표/레이아웃 코드는 불변, 갤럭시 S24 등에서 글자/스프라이트 또렷해짐. (검증: Playwright `deviceScaleFactor:2`)
- **UI 폰트 확대**: 상단 바 22→24, 리더보드 이름 18→20·순위 20→22·로그 15→16, 배너 48→50 등.
- **레인 서는 순서 랜덤**: `RaceScene.create`에서 로스터 `Phaser.Utils.Array.Shuffle` (lane=셔플 인덱스).
- **단일 개구리 모드(solo)**: 같은 종 여러 마리 레이스(예: 청개구리 5마리). 엔진 frog에 **고유 `uid`**(`createRace`) 추가 — 중복 캐릭터 시 렌더/상태 키 충돌 방지(RaceScene 전 키를 `f.uid`로, 표시명 `f.displayName`). 스킬/날씨 판정은 캐릭터 `id` 유지. 로비: `showModeStep`(참가자등록 vs 단일) → `showSoloStep`(종류 2x4 + 마리수 2~8 + 시작). registry `mode:"solo"/soloFrog/soloCount`.
- 검증: `check-v3.mjs`(dpr2 + solo), `check-mobile2.mjs`(모드 단계 경유 다인 플로우), `sim-race.mjs` 밸런스 불변. 콘솔 에러 없음.

## 레이스 뷰 Excitebike 스타일 재설계 (2026-06-14)
SNES Excitebike처럼 측면 뷰 + 레인 간 원근감으로 RaceScene 전면 개편. **게임 밸런스(100칸/속도/캐릭터)는 불변**, "보이는" 트랙만 길고 깊어짐.
- **원근 레인**: 뒤 레인=작게/위, 앞 레인=크게/아래 (`computePerspective` — 레인별 스케일 `BACK_SCALE 0.74`~`FRONT_SCALE 1.34`, 높이도 스케일 비례로 연속 배치=간격 좁힘). 개구리 기본 확대 `FROG_BASE 1.25` + 레인 스케일. 앞 레인이 위에 그려지도록 depth=20+lane(가까운 개구리가 먼 개구리를 가림). 그림자 타원 추가.
- **트랙 2배 길이 + 선두 추적 뷰포트**: 월드 픽셀 길이 `WORLD_LEN = 100*PX_PER_CELL(17) = 1700`(기존 ~8.6px/칸의 약 2배). 카메라(main)는 트랙 뷰포트(`TRACK_PANEL_W`)만큼만 보이고 **선두 개구리를 따라 가로 스크롤**(`updateCamera`, 세로는 전 레인 고정 표시). `setBounds`로 양끝 클램프. 줌 토글은 기본(1.0)/넓게(0.82).
- **패럴랙스 배경**: 상단 수평선 밴드(하늘+먼 갈대 `px-reeds` tileSprite 0.3배속 + 물결 `px-water` 0.6배속). 모두 절차적 텍스처(`buildTextures`), `scrollFactor 0` + `tilePositionX = cam.scrollX*factor`로 무한 스크롤.
- **이동 잔효과**: 개구리 뒤 물보라 파티클(`px-dust`, 단일 이미터 `buildTrails`/`splash`). 이동 중 주기 분사 + 선택/스킬 시 강하게.
- **실황 패널 축소**: `SIDE_PANEL_W` 340→264(constants.js), `TRACK_PANEL_W` 1016. 2x4 카드 그리드 → **1열 컴팩트 리더보드**(순위 배지+이름+게이지/패시브+메달) + 하단 짧은 로그. 경기장이 더 커짐.
- **미니맵**: 전체 2배 트랙 + **현재 뷰포트 박스(노란 반투명)** 표시(`mmViewport`).
- 검증: `scripts/check-racev2.mjs`(빠른시작 다구간, 1280+844), `check-mobile2.mjs`(2인 로비→레이스, 레인 적을 때 원근) 콘솔 에러 없음. `sim-race.mjs` 밸런스 불변 확인.

## 픽셀아트 에셋 파이프라인 (2026-06-14)
16비트 레트로(SNES 마리오카트 톤) 픽셀아트 에셋 제작/통합 파이프라인 구축. 그림은 **Piskel/Aseprite로 그리고**, 통합·검증은 코드로 처리.
- **단일 진실 소스 팔레트**: `src/game/assets/palette.js` (개구리 8종 4단 램프 + 환경/UI, 총 55색). 여기만 고치고 `node scripts/gen-palette.mjs` 재실행.
- **산출물**: `palette/frog-race-16bit.gpl`(Piskel/Aseprite import용) / `.png`(스와치, 시각참고) / `.md`(색표). `scripts/gen-palette.mjs`가 생성(순수 Node `zlib`로 PNG 인코딩, 의존성 없음).
- **에셋 폴더**: `public/sprites/frogs/<id>.png` (id: tree/toad/maeng/rain/horn/fire/claw/wood). Vite가 `public/`을 빌드 루트로 복사 → 실행 시 `sprites/...` 경로 로드. 작업 가이드는 `public/sprites/README.md`.
- **매니페스트**: `src/game/assets/manifest.js` — `SPRITE_ASSETS`(게임이 실제 로드, 그린 것만 등록) + `PLANNED_SPRITES`(목표 전체, 검증용).
- **로딩/폴백**: `src/game/scenes/BootScene.js`가 등록된 PNG를 프리로드(NEAREST 필터로 또렷하게) 후 Title 진입. 미등록 key는 `frogTexture.js`의 기존 **프로시저럴 텍스처로 자동 폴백** → 개구리 한 마리씩 교체 가능, 항상 동작.
- **인게임 미리보기**: 개발 서버에서 `?assets` 쿼리(`AssetPreviewScene`) → 전 스프라이트 1x/2x/3x + 팔레트 스트립 한 화면 확인.
- **검증**: `node scripts/check-assets.mjs` — 진행도/캔버스 크기/**팔레트 외 색 린트**(순수 Node PNG 디코더, 8bit RGBA/RGB/indexed·non-interlaced 지원). `scripts/check-boot.mjs`(부팅+미리보기 Playwright 검증, dev 서버 필요).
- 검증: BootScene 경유 부팅·`?assets` 미리보기 콘솔 에러 없음 확인 완료. 현재 PNG 0개 = 게임 외형 기존과 동일(전부 프로시저럴).

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
scripts/check-mobile-ui.mjs  모바일 UI(1차) 검증
scripts/check-mobile2.mjs    모바일 UI(2차) 검증 — 로비 픽 단계(좌/우 분할) 포함, 1280x720 + 844x390
scripts/check-mobile-result.mjs  결과(Result) 화면 레이아웃 검증 (4배속으로 결과까지 진행)
src/game/assets/palette.js   16비트 팔레트 단일 진실 소스 (램프/환경/UI 55색)
src/game/assets/manifest.js  스프라이트 에셋 매니페스트 (SPRITE_ASSETS/PLANNED_SPRITES)
src/game/scenes/BootScene.js PNG 프리로드 + 프로시저럴 폴백 + ?assets 라우팅
src/game/scenes/AssetPreviewScene.js  개발용 에셋 컨택트시트(?assets)
scripts/gen-palette.mjs      팔레트 → .gpl/.png/.md 생성
scripts/check-assets.mjs     에셋 진행도/크기/팔레트 린트
scripts/check-boot.mjs       부팅+미리보기 Playwright 검증
scripts/check-racev2.mjs     Excitebike 스타일 레이스 뷰 검증 (다구간 캡처)
scripts/check-v3.mjs         고해상도(dpr2)+단일 개구리 모드 검증
src/game/scenes/BootScene.js (frames>1 스프라이트시트 → hop-<id> 애니 생성 포함)
public/sprites/              그린 PNG 에셋 (frogs/<id>.png)
palette/                     생성된 팔레트 산출물(.gpl/.png/.md)
```

## 코딩 규칙 — 모바일 최적화 (가로 모드 기준)

- 방향: 가로 모드(Landscape) 전용, 세로 모드 무시
- 폰트: 본문 최소 16px, 버튼 18px 이상, 제목 22px 이상 / px 대신 vw·rem 사용
- 터치 타겟: 버튼 최소 높이 48px, 간격 8px 이상
- 캔버스: 1280×720 (16:9) 고정, Phaser ScaleManager FIT + autoCenter로 실제 기기 해상도에 맞춰 축소/중앙 정렬
- 검증 기준: Chrome DevTools Pixel 7 가로 / iPhone 14 가로 에뮬레이터


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
