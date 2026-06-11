# 프로그레이스 (Frog Race)

개구리 8종이 출전하는 랜덤 뽑기 기반 레이싱 게임. Phaser.js + Vite + Capacitor.

## 기술 스택
- Phaser.js 4 (게임 엔진)
- Vite 8 (빌드/개발 서버)
- Capacitor 8 (Android/iOS 앱 패키징)
- React 19 (구 육성 프로토타입 전용, 현재 게임 본편은 미사용)

## 개발 명령어
```bash
npm run dev      # 개발 서버 (Vite)
npm run build    # 프로덕션 빌드 → docs/
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
node scripts/sim-race.mjs   # 레이스 엔진 시뮬레이션 (밸런스 검증)
node scripts/check-race.mjs # Playwright 헤드리스 플로우 검증 (dev 서버 필요)
```

### 안드로이드 빌드
```bash
npm run build
npx cap sync android
cd android && ./gradlew.bat assembleDebug
```
- JDK 21: `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot`
- Android SDK: `%LOCALAPPDATA%\Android\Sdk` (platform 36, build-tools 36.0.0)
- 빌드 결과: `android/app/build/outputs/apk/debug/app-debug.apk`
- 최신 디버그 APK는 `release/frog-race-debug.apk`에 보관 (직접 설치용)

## 프로젝트 구조
```
src/main.js                  Phaser 진입점
src/game/constants.js        색상/폰트/레이아웃/RULES 상수, 캐릭터 8종 정의
src/game/RaceEngine.js        순수 레이스 로직 (tick + selectionEvent)
src/game/frogTexture.js       프로시저럴 개구리 텍스처
src/game/sound.js             Web Audio 기반 절차적 BGM/효과음 매니저
src/game/ui.js                버튼 등 공용 UI 헬퍼 (클릭음 포함)
src/game/scenes/              Title / Lobby / Race / Result 씬
src/game-v0-backup/           구버전(10칸 턴제) 백업
src/prototype/                (보류) 육성 시뮬레이션 React 프로토타입
scripts/sim-race.mjs          레이스 엔진 통계 시뮬레이션
scripts/check-race.mjs        Playwright 플로우 검증 (타이틀→로비→레이스→결과)
scripts/check-zoom.mjs        8:2 레이아웃 + 줌 토글 검증
scripts/check-log.mjs         중계 로그 클리핑 검증
docs/                          빌드 산출물 (npm run build 결과, GitHub Pages 배포 겸용)
release/                        배포용 APK 보관
```

## 현재 레이스 룰 (스펙 v1.0)
트랙 100칸, 8마리 전원 출전. 모든 개구리가 지속 전진(2칸/초 ± 흔들림)하며,
2초마다 선택 이벤트로 1마리가 +5칸 전진. 선택되지 않은 액티브 캐릭터는
게이지 +1 (5 모이면 선택 시 고유 스킬 발동). 비/백도 등 변수 포함, 100칸
도달 순서대로 순위 결정. 자세한 수치는 `src/game/constants.js`의 `RULES`,
캐릭터 8종 밸런스는 `src/game/constants.js`의 `CHARACTERS` 참고.

## 현재 진행 상황 체크리스트
- [x] 게임 기획 확정
- [x] Phaser.js 랜덤 레이스 구현 (스펙 v1.0)
- [x] 참가자 등록(1~8명) + 개구리 선택 화면
- [x] 캐릭터 8종 프로시저럴 텍스처
- [x] Capacitor Android 빌드 환경
- [x] 16:9 가로 레이아웃(8:2) + 레이스 카메라 연출 + 줌인/아웃 토글
- [x] 배경음 / 효과음 (Web Audio 절차적 생성)
- [x] 빌드 출력을 `docs/`로 일원화 (GitHub Pages 배포 + Capacitor webDir 겸용) + 최신 디버그 APK(`release/frog-race-debug.apk`)
- [ ] 픽셀아트 에셋 (현재 프로시저럴 텍스처)
- [ ] 진동
- [ ] (보류) 육성 시스템 Phaser 포팅
- [ ] iOS 설정

## 배포
`vite.config.js`에서 빌드 출력 경로를 `docs/`로 설정해두었습니다
(`base: './'`이라 서브 경로에 올려도 동작). `npm run build` 한 번이면
`docs/`가 최신 산출물로 갱신되며, GitHub 저장소 설정에서 Pages 소스를
`/docs` 폴더로 지정하면 그대로 배포됩니다. 별도의 동기화 작업은 필요 없습니다.

자세한 컨텍스트와 디자인 토큰, 캐릭터별 스킬 설명은 `CLAUDE.md` 참고.
