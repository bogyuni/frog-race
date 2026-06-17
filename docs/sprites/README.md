# 스프라이트 에셋 폴더

여기에 그린 픽셀아트 PNG를 넣으면 게임에 반영됩니다. Vite가 `public/`을 빌드 루트로 복사하므로
`public/sprites/frogs/tree.png` → 실행 시 `sprites/frogs/tree.png` 경로로 로드됩니다.

## 작업 순서
1. **팔레트 불러오기**: Piskel에서 `palette/frog-race-16bit.gpl` 을 import
   (Piskel: Palettes 패널 → Import → `.gpl` 선택 / Aseprite도 동일하게 `.gpl` 로드 지원)
2. **캔버스 크기 / 점프 애니메이션**: 프레임 1장 64×56 권장.
   - **2프레임 권장**: 프레임0 = 앉은 모습, 프레임1 = 뛰는 모습. 가로로 이어 붙인 **스트립 128×56** PNG.
     게임이 두 프레임을 번갈아 재생해 점프 애니메이션이 된다(이동 중 빠르게, 정지 시 멈춤).
   - 정지 1프레임만 그려도 됨(그 경우 manifest `frames:1`, 프로시저럴 스쿼시 점프로 대체).
   - 더 작게(예: 32×28) 그려 게임에서 확대해도 또렷(NEAREST).
3. **저장 위치**: `public/sprites/frogs/<id>.png`
   - id: tree(청개구리) / toad(두꺼비) / maeng(맹꽁이) / rain(비개구리) /
     horn(뿔개구리) / fire(무당개구리) / claw(발톱개구리) / wood(나무개구리)
4. **게임에 등록**: `src/game/assets/manifest.js` 의 `SPRITE_ASSETS` 에 한 줄 추가
   ```js
   { key: "frog-tree", path: "sprites/frogs/tree.png", w: 64, h: 56, frames: 2 },
   ```
   (등록 전엔 기존 프로시저럴 텍스처로 표시됨 — 한 마리씩 교체 가능)

## 확인
- 인게임 미리보기: 개발 서버에서 `?assets` 쿼리로 접속 (예: `http://localhost:5180/?assets`)
  → 모든 스프라이트를 1x/2x/3x 로 한 화면에서 확인
- 검사: `node scripts/check-assets.mjs`
  → 진행도, 캔버스 크기, **팔레트 위반 색** 자동 점검
