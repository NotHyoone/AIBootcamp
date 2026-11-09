# 디자인 QA

## 명령 (frontend에서)

```powershell
node tools/build.mjs
node tools/build-tokens.mjs --check
node tools/build-wireframes.mjs
node tools/build-design-preview.mjs
node tools/build-design-preview.mjs --check
node --test tests/*.test.cjs
node tests/browser.cjs
node tests/themes.cjs
node tests/card-effects.cjs
node tests/wireframes.cjs
node tests/design-preview.cjs
```

브라우저 검사는 기존 CARDEX_PLAYWRIGHT·CARDEX_CHROMIUM 설정을 사용합니다. 결과와 실행 환경은 아래에 기록합니다.

## 인수 기준

- 토큰 누락·순환·잘못된 값·테마 모드 누락은 생성 전에 실패합니다.
- 화면 ID 중복·없는 이동 대상·지원하지 않는 프레임 크기는 실패합니다.
- 기존 도메인 경계값·동률·버전·예시 분리 검사를 유지합니다.
- 6테마×2모드, 시스템 전환·잘못된 설정·저장 차단, 대표 크기의 넘침을 검사합니다.
- 카드 효과 검사는 12개 팔레트에서 모서리·그림자·빛·전환 설정의 동일성, PC 기울기·모바일 길게 누르기, 키보드 뒤집기, 동작 줄이기와 320px·375px 배치를 확인합니다.
- PNG 1080×1620·원문 미포함·테마 반영을 확인합니다.
- 검토 페이지는 합성 데이터·실제 토큰·기존 컴포넌트 스타일을 사용하고 외부 요청 없이 열립니다.

## 수동 체크 (미검증)

1366×768, 1440×900, 390×844, 360×640, 320×568에서 읽기·조작·내부 스크롤을 확인합니다. 키보드 초점·한국어 스크린리더·200% 확대·실기기 키보드·Safari/Firefox·카드 안전 영역은 자동 검사와 별도로 기록합니다.

## 결과 기록

실행일 / OS / Node·브라우저 버전 / 명령 / 통과·실패·미실행 / 증거 위치 / 한계를 남깁니다. 기존 previews·browser-results.json은 과거 증거로 유지합니다.

## 초기 세팅 실행 결과 (2026-11-04)

환경: Windows, Node v22.16.0, 로컬 Chrome headless, 기존 임시 폴더의 Playwright. Chrome 156.0.8078.80.

| 명령 | 결과 |
|---|---|
| node tools/build.mjs | 단독 HTML 재생성 통과 |
| node tools/build-tokens.mjs --check | 토큰 생성물 일치 |
| node tools/build-wireframes.mjs | 기존 52개 SVG 재생성 |
| node tools/build-design-preview.mjs / --check | 생성·일치 검사 통과 |
| node --test tests/*.test.cjs | 43개 통과 |
| node tests/browser.cjs | 40개 검사, PNG 1080×1620, 오류·외부 요청 없음 |
| node tests/themes.cjs | 5테마·10팔레트/PNG·5크기·시스템·초안·설정 유지·복구·차단·오프라인 통과 |
| node tests/wireframes.cjs | 52 SVG·내비게이션·3크기 통과 |
| node tests/design-preview.cjs | 10팔레트×3너비·링크·오프라인 통과 |

검토 페이지의 390px 전체 캡처를 시각 확인했습니다. 증거는 `%TEMP%/aibootcamp-design-setup/preview-390.png`, `preview-1366.png`입니다. 임시 파일은 Git 배포 자산이 아니며 환경 정리 시 사라질 수 있습니다. 수동 접근성·실기기 항목은 계속 미검증입니다.


## Lemon·Flip·영구 저장 통합 결과 (2026-11-09)

Windows / Node v22.16.0 / 로컬 Chrome headless와 기존 Playwright로 실행했습니다. 아래 명령은 저장소 루트 기준입니다.

| 명령 | 결과 |
|---|---|
| `node frontend/tools/build.mjs` | 단일 HTML 재생성, 약 12.3 MB. 글꼴·PNG 9종 내장 |
| `node --test frontend/tests/*.test.cjs` | 49개 통과. 저장 데이터 검증·복원 대기·저장 세대·실패 후 복구 포함 |
| `node frontend/tests/browser.cjs` | 44개 레이아웃 검사, 작성·카드·도감·통계, PNG 1080×1620, 오류·외부 요청 없음 |
| `node frontend/tests/persistence-browser.cjs` | 초안·기록·방식 복원, 수정·삭제·전체 삭제, 쓰기 실패 재시도, 다중 탭 충돌, 손상 데이터 보존, 저장소 차단 통과 |
| 같은 영구 저장 검사 | 긴 기록 대화상자·HTML 문자 안전 처리·Esc 초점 복귀, 터치 탭·500ms 길게 누르기·스크롤·동작 줄이기, 10감정 자산·단계·확률 통과 |
| `node frontend/tests/themes.cjs` | 6테마·12팔레트/PNG·5화면 크기, 본문 대비, 시스템 모드, 기존 선택 유지·기본값 복구·차단·오프라인 통과 |
| `node frontend/tools/build-tokens.mjs --check` | 생성 토큰 일치 |
| `node frontend/tools/build-design-preview.mjs --check` | 디자인 검토 산출물 일치 |
| `node frontend/tests/design-preview.cjs` | 12팔레트 × 3너비, 링크·오프라인 통과 |
| `node frontend/tests/wireframes.cjs` | 52 SVG, 화면 연결·3너비 통과 |

작성 화면의 320px 캡처와 Lemon 3D 카드의 390px 캡처를 시각 확인했습니다. 테스트 증거는 `%TEMP%/moment-write-320.png`, `moment-write-1440.png`, `moment-lemon-mobile.png`입니다. 임시 증거는 Git에 포함하지 않습니다.

터치 검증은 Chrome의 모바일·터치 에뮬레이션과 CDP 입력으로 수행했습니다. 물리적 모바일 기기·화면 키보드·한국어 스크린리더·Safari/Firefox는 미검증입니다. 실제 분석 API와 기기 간 동기화는 제공하지 않습니다.


## 카드 프레임·조작 단순화 (2026-11-09)

카드 앞면·뒷면·빛·클릭 영역은 공통 2:3 프레임(최대 360×540px)을 사용합니다. 효과 여백 16px을 제외한 가용 크기에 맞춰 축소하며 안내는 프레임 밖에 둡니다. 테마는 색상과 재질을 바꾸며 카드의 기하와 동작은 유지합니다.

카드에는 이미지 저장과 더보기만 기본 노출합니다. 더보기에서 확대 읽기·수정·도감·삭제에 접근합니다. 대기·실패 카드는 다운로드를 제공하지 않습니다. 서비스명은 작성 화면 복귀 버튼입니다. 작성 더보기에서 초안을 지우며 저장 재시도는 저장 실패 시 노출합니다. 삭제는 취소가 기본 초점인 확인 대화상자를 거칩니다. 수정 취소는 원문을 유지합니다.

설정의 기록 방식·예시 모드·데이터 관리는 접이식 항목이며, 예시 전환은 스위치입니다. 통계 종류는 선택 상자, 월은 월 입력으로 조작합니다. 발견한 도감 슬롯은 연결 기록으로 바로 이동합니다. 키보드·터치·Esc·초점 복귀를 검증하며 PNG와 저장 데이터 형식은 유지합니다.


검증 명령(저장소 루트): `node frontend/tests/simplification.cjs`. 6테마×2모드×6화면 크기의 카드·빛·뒷면 좌표 및 테마 간 크기 오차 1px 이하, 더보기 Esc, 삭제 취소 기본 초점, 수정 취소, 정상 저장 시 재시도 숨김을 검사합니다. 대표 화면은 임시 폴더의 moment-simple-mobile.png와 moment-simple-desktop.png로 확인합니다. 모바일 실기기·한국어 스크린리더·Safari/Firefox는 미검증입니다.

## 기록 중심 UI 검증 (2026-11-09)

단위 테스트 49개, 브라우저 46개 검사, 6테마·12팔레트, 저장 회귀, 카드 효과, 72개 배치 조합, 52개 SVG, 검토 페이지 검사를 통과했습니다. `node tests/record-ui.cjs`는 저장 실패 시 성공 안내 금지·재시도·읽기와 초점 복귀·월간 기록 기본값·10,000자 읽기·PNG를 검증합니다. [변경 전후와 실행 명령](../../reports/record-ui-2026-11-09/README.md)을 참고하세요.

기본 Chrome 경로 대신 기존 Playwright Chromium을 사용했습니다. CSS로 확대된 읽기 대화상자는 검증했으나 브라우저 전체 200% 확대·실제 모바일 키보드·스크린리더·Safari/Firefox는 미검증입니다.

## 3+10 회귀 검증

`node tests/taxonomy-browser.cjs`로 30슬롯·10종 명칭·중립 4종 표식·키보드 선택·모바일 분포·PNG를 검증합니다. Node 단위 테스트는 30/60/90% 경계, 구형 6/7종 결과, 잘못된 분류 버전, 잘린 결과, 중립 합산과 도감 재잠금을 포함합니다. 실제 모델 성능과 카드 발급 비율 검증은 API 연동 후 수행합니다.

## 3+10 구현 검증 결과 (2026-11-10)

아래 명령은 `frontend/`에서 실행했습니다. 기본 Chrome 실행 파일이 없어 설치된 Chromium을 명시했습니다. 기록 UI 증거의 기존 저장 경로는 쓰기가 거부되어 임시 디렉터리를 사용했습니다.

```powershell
$env:CARDEX_CHROMIUM = "$env:LOCALAPPDATA/ms-playwright/chromium-1148/chrome-win/chrome.exe"
$env:CARDEX_EVIDENCE = $env:TEMP
```

| 명령 | 결과 |
|---|---|
| `node tools/build.mjs` | 단독 HTML·토큰 생성 성공 |
| `node tools/build-wireframes.mjs` | SVG 52개·검토 HTML 생성 성공 |
| `node tools/build-design-preview.mjs` | 디자인 검토 페이지 생성 성공 |
| `node --test --test-reporter=dot tests/*.test.cjs` | 54개 통과 |
| `node tests/browser.cjs` | 기본 화면 검사 46개, PNG, 오프라인 요청 검사 통과 |
| `node tests/taxonomy-browser.cjs` | 10종·30슬롯·중립 4종 PNG·키보드·모바일 분포·12개 테마/밝기 조합 통과 |
| `node tests/themes.cjs` | 6개 테마·12개 팔레트/PNG·5개 화면 크기 통과 |
| `node tests/simplification.cjs` | 72개 테마/화면 크기 조합과 동작 통과 |
| `node tests/persistence-browser.cjs` | 저장·복원·재시도·삭제·충돌·10종 자산·3단계 통과 |
| `node tests/card-effects.cjs` | 12개 팔레트·데스크톱/터치 효과·키보드·동작 축소 통과 |
| `node tests/record-ui.cjs` | 기록 읽기·저장 실패/재시도·긴 원문·PNG 통과 |
| `node tests/wireframes.cjs` | SVG 52개·이동·1366/390/320px 통과 |
| `node tests/design-preview.cjs` | 12개 팔레트 × 3개 너비·오프라인·링크 통과 |

320px 분포 화면과 중립 카드 PNG를 이미지로 확인했습니다. 실제 모델 추론, Safari·Firefox 및 실기기 키보드는 이번 자동 검증에 포함하지 않았습니다. 저장소 스키마나 실제 분석 연결은 변경하지 않았습니다.

- 카드 효과 설정: Windows `애니메이션 효과`(또는 OS 동작 줄이기)를 끈 상태에서 `자동`이면 빛·기울기가 꺼지고, `켜기`면 마우스를 올렸을 때 빛·기울기가 동작하는지 확인합니다. 자동 검사는 `node tests/card-effects.cjs`입니다.
