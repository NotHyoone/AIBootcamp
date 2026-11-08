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
node tests/wireframes.cjs
node tests/design-preview.cjs
```

브라우저 검사는 기존 CARDEX_PLAYWRIGHT·CARDEX_CHROMIUM 설정을 사용합니다. 결과와 실행 환경은 아래에 기록합니다.

## 인수 기준

- 토큰 누락·순환·잘못된 값·테마 모드 누락은 생성 전에 실패합니다.
- 화면 ID 중복·없는 이동 대상·지원하지 않는 프레임 크기는 실패합니다.
- 기존 도메인 경계값·동률·버전·예시 분리 검사를 유지합니다.
- 5테마×2모드, 시스템 전환·잘못된 설정·저장 차단, 대표 크기의 넘침을 검사합니다.
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

## 2026-11-09 코드 병합 검증
- 단위 테스트 46개 통과(기존 43개 + 기록 보호 회귀 3개).
- 토큰·디자인 검토 페이지 일치, JS 문법, 단독 HTML 빌드 통과.
- `tests/design-merge-browser.cjs`에 아이콘·기록 원문·확대창 초점 복귀·뒤집기 상태 검사를 추가했다.
- 이 환경에는 Chromium 실행 파일이 없어 브라우저 검사 실행 실패. 반응형 320/390/1440, 5테마×2모드, 터치·키보드·실기기 및 Figma 미리보기는 미검증이다.
