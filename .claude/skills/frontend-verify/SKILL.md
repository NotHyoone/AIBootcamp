---
name: frontend-verify
description: 오늘의 모먼트 frontend를 공식 빌드로 index.html 재생성하고 단위·브라우저 테스트로 검증합니다. frontend/scripts·styles·templates·assets·design/tokens를 수정한 뒤, 작업 마무리·커밋 전, 또는 사용자가 "빌드", "검증", "테스트 돌려줘"라고 할 때 사용합니다.
argument-hint: "[quick|full|tokens] (기본 quick)"
---

# frontend 빌드·검증

모든 명령은 `frontend/` 안에서 실행합니다. 보고는 한국어로 합니다.

## 0. 사전 확인
- `index.html`은 직접 편집하지 않습니다. 빌드가 재생성하며, `tools/backup-generated.mjs`가 빌드 전에 `index.html`·생성 토큰을 `.backups/`에 자동 백업하고 해시로 검증합니다.
- 새 소스 파일을 추가했다면 `tools/build.mjs`에 연결되어 있는지 확인합니다(연결 안 된 파일은 배포되지 않음).

## 1. 빌드 + 단위 테스트 (모든 모드)
```powershell
node tools/build.mjs
node --test tests/*.test.cjs
```
빌드 실패 시 원인을 고치기 전까지 다음 단계로 가지 않습니다.

## 2. 모드별 추가 검사
- `quick`(기본): 변경 영역과 맞는 브라우저 스크립트 1~2개만 실행
  - 카드·효과: `node tests/card-effects.cjs` / 테마: `node tests/themes.cjs`
  - 저장·복원: `node tests/persistence-browser.cjs` / 기록 UI: `node tests/record-ui.cjs`
  - 홈·통계·도감: `node tests/home-view.cjs`, `node tests/taxonomy-browser.cjs`
  - 기타 전반: `node tests/browser.cjs`
- `full`: `tests/` 아래 `.test`가 없는 `*.cjs` 브라우저 스크립트를 모두 실행(`benchmark-browser.cjs`, `mobile-lan.cjs`는 사용자 요청 시에만, `browser-runtime.cjs`는 공용 헬퍼라 실행하지 않음)
- `tokens`: 1단계 + 아래
  ```powershell
  node tools/build-tokens.mjs --check
  node tools/build-design-preview.mjs; node tests/design-preview.cjs
  node tools/build-wireframes.mjs; node tests/wireframes.cjs
  ```

## 3. 브라우저 전제 조건
- Playwright: `CARDEX_PLAYWRIGHT`(기본 `%TEMP%/aibootcamp-frontend-review/node_modules/playwright`)
- Chrome: `CARDEX_CHROMIUM`(기본 `C:/Program Files/Google/Chrome/Application/chrome.exe`)
- 둘 중 하나가 없으면 해당 브라우저 검사를 "실행 불가(전제 조건 없음)"로 보고하고 임의로 설치하지 않습니다.

## 4. 보고 형식
- 실행한 명령과 통과/실패 수, 생성된 백업 경로(빌드 로그·`.backups/frontend/`의 최신 번호)
- 실행하지 못한 검사와 이유
- 수동 확인 필요 항목: 모바일 레이아웃, 실기기 키보드, Safari·Firefox
