# 오늘의 모먼트 · Diary Simple v3

프로젝트의 메인 프론트입니다. 기존 `design-lab/diary-simple-v3/`에서 `frontend/`로 이동했으며, 소스·빌드·단독 HTML 실행 방식은 유지합니다. 아래 명령은 이 폴더에서 실행합니다. 저장소 루트의 FastAPI 서버는 이 폴더의 `index.html`을 기본 화면으로 제공합니다. 서버 실행 방법은 [루트 README](../README.md)를 참고하세요.

## 디자인·인수인계 문서

- [디자인 작업 안내](docs/design/README.md): 토큰·배치·컴포넌트·문구·자산의 편집 기준.
- [디자인 검토 페이지](docs/design/preview/index.html): 실제 스타일과 합성 상태 견본.
- [화면 명세](docs/UI_SPEC.md) / [구조](docs/ARCHITECTURE.md) / [작업 목록](docs/ROADMAP.md) / [QA](docs/QA.md).

디자인 원본은 `design/`에 있습니다. `node tools/build.mjs`는 토큰과 앱을 함께 생성합니다. 와이어프레임은 `node tools/build-wireframes.mjs`, 검토 페이지는 `node tools/build-design-preview.mjs`로 재생성합니다. 원본 수정 후 두 검토 산출물도 갱신하세요. 생성 파일은 직접 편집하지 않습니다.


- [디자인 스타일 가이드](docs/DESIGN_STYLE.md): 현재 5개 테마, 색상·타이포그래피·컴포넌트·반응형 규칙과 별도의 개선 제안.
- [후속 문서 작성 계획](docs/DOCUMENTATION_PLAN.md): 화면 명세·구조 설명·UI 개선 작업 목록·QA 문서의 작성 순서와 완료 기준.

## 실행과 보관

`index.html` 하나를 브라우저에서 엽니다. 실제 작성본은 현재 실행의 메모리에 저장되며 보관함·작성 횟수 통계에 연결됩니다. 새로고침하면 기록과 기록 방식이 초기화됩니다. 테마와 밝기 선택만 브라우저에 보관합니다. 서버·브라우저 저장소에 원문을 저장하지 않습니다. 실제 분석·계정·서버 저장은 추후 연결합니다.

설정의 하루 한 편은 오늘 기록을 갱신하고, 여러 편은 새 기록 쓰기마다 항목을 생성합니다. 기록 날짜는 현지 날짜로 자동 결정하며 기존 기록 수정은 원래 날짜를 유지합니다.

## 기록별 카드

기록 ID와 원문 버전으로 분석·카드를 연결합니다. 실제 글은 현재 분석 대기 상태입니다. 설정의 예시 모드에서만 분석된 예시 카드와 수집을 확인할 수 있습니다. 예시 데이터는 실제 기록과 섞이지 않습니다.

7개 감정 중 최다 확률을 반올림 전에 판정합니다. 30% 미만은 빈 카드, 30% 이상~60% 미만은 1단계, 60% 이상~90% 미만은 2단계, 90% 이상은 3단계입니다. 동률은 기존 감정 ID 순서로 대표를 선택하고 공동 최다 표시를 남깁니다. 분석 실패·대기는 빈 카드와 구분합니다. 단계는 감정 강도나 성장 점수가 아닙니다.

같은 캐릭터여도 기록별로 독립된 카드이며 날짜·작성 시각을 표시합니다. 선택한 기록의 카드를 1080×1620 PNG로 저장하며 원문은 포함하지 않습니다. 임시 캐릭터 도형은 실제 디자인 연결 전의 표시입니다.

## 보관함

- 지난 기록: 날짜·작성 시각·카드 상태를 확인하고 기록과 카드를 열어봅니다.
- 돌아보기: 감정 추이·월간 기록·감정 분포를 한 화면에서 전환합니다. 분석 누락을 중립으로 채우지 않습니다.
- 캐릭터 도감: 7유형 × 3단계의 21개 슬롯입니다. 만난 단계만 해제합니다. 같은 슬롯의 마지막 기록을 삭제하거나 수정해 분석이 무효화되면 다시 잠깁니다.

원문 수정은 버전을 증가시키고 분석을 대기로 바꿉니다. 이전 버전 분석은 카드·통계·도감에서 제외합니다. 캐릭터 도감에서 해당 유형·단계의 기록으로 이동할 수 있습니다.

## 소스와 검증

`cards.js`는 카드·수집 판정, `catalog-view.js`는 도감, `statistics.js`는 통계, `app.js`는 기록 상태와 공통 SVG·PNG 출력을 담당합니다. 빌드 시 단일 HTML로 내장합니다.

```powershell
node tools/build.mjs
node --test tests/*.test.cjs
node tests/browser.cjs
node tools/build-wireframes.mjs
node tests/wireframes.cjs
```

브라우저 검사는 Playwright와 Chrome을 사용합니다. `CARDEX_PLAYWRIGHT`, `CARDEX_CHROMIUM`으로 경로를 지정할 수 있습니다. 실기기 키보드와 Safari·Firefox는 별도 수동 검증이 필요합니다.

[와이어프레임 HTML](docs/wireframes/index.html) / [SVG 52개 목록](docs/wireframes/README.md)

IBM Plex Sans KR 라이선스는 `docs/licenses/ibm-plex-sans-kr.txt`와 배포 HTML에 포함됩니다.

## 화면 테마

설정에서 페이퍼 다이어리, 세이지 터치, 리퀴드 오로라, 에디토리얼 모노, 레트로 플레이를 선택합니다. 각 테마는 밝음·어두움·시스템 모드를 지원합니다. 기본값은 페이퍼 다이어리 + 시스템입니다. 선택은 앱 전체와 카드 PNG(1080×1620)에 적용됩니다. 저장소 차단 시 현재 실행에만 적용합니다. 일기 원문은 저장하지 않습니다.

테마 검증: `node tests/themes.cjs`. 기존 브라우저 검사와 같은 Playwright·Chrome 경로를 사용합니다.

디자인 참고: [Canva 2026](https://www.canva.com/newsroom/news/design-trends-2026/), [Adobe 2026](https://business.adobe.com/au/blog/adobe-2026-creative-trends-forecast), [Apple Liquid Glass](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/). 프로젝트용 해석이며 공식 인기 순위가 아닙니다.
