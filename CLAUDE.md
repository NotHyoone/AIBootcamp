# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)를 위한 안내서입니다. 아래 규칙은 기본 동작보다 우선합니다.

함께 볼 문서: `AGENTS.md`(저장소 지침·커밋/PR 규칙), `README.md`(모델 경로 탐색·API 계약·Docker), `frontend/README.md`, `frontend/docs/ARCHITECTURE.md`, `frontend/docs/QA.md`, `frontend/docs/UI_SPEC.md`, `frontend/docs/DESIGN_STYLE.md`.

## 1. 프로젝트 개요

"오늘의 모먼트"는 한국어 일기와 감정 카드를 다루는 앱입니다. 두 부분은 서로 거의 독립되어 있습니다.

- `frontend/`: 메인 앱입니다(Diary Simple v3에서 승격). 단독 `index.html` 하나를 브라우저에서 바로 열어 실행합니다. 서버, 네트워크, fetch가 필요 없습니다.
- `backend/`: FastAPI 앱입니다. `/`에서 `frontend/index.html`을 제공합니다. `POST /api/analyze`는 비어 있지 않은 줄마다 로컬 KcELECTRA 체크포인트로 6감정(`분노 슬픔 불안 상처 당황 기쁨`) 중 하나를 고릅니다.
- `design-lab/`: 시안 실험실입니다. 시안마다 독립된 폴더로, 각자 README와 명령이 있습니다. `package.json`이 따로 있습니다(`npm test` → `node --test */tests/*.test.cjs`).
- `image/`는 디자인 참고 자산, `reports/frontend-comparison/`은 시안 비교 보고서입니다.

**프론트의 7감정 체계와 백엔드의 6분류 API는 일부러 연결하지 않았습니다.** 실제 일기는 "분석 대기" 상태로 남고, 분석된 카드는 프론트의 예시(데모) 모드에서만 보입니다.

## 2. 명령어

백엔드 (저장소 루트, Python 3.12):

```powershell
python -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
$env:EMOTION_MODEL_DIR = "C:\path\to\checkpoint"   # 또는 EMOTION_STUDY_DIR = 실험 결과 폴더
uvicorn backend.main:app --reload                   # http://localhost:8000, 서버 시작에 유효한 체크포인트 필요
python -m unittest discover -s backend/tests -v     # 모델 가중치 없이 실행
python -m unittest backend.tests.test_main.MainTests.<test_method>   # 단일 테스트
python -m backend.emotion_model --checkpoint "C:\path\to\checkpoint" --text "오늘의 기록"
```

프론트 (`frontend/` 안에서 실행):

```powershell
node tools/build.mjs                        # 디자인 토큰 생성 + 단독 index.html 재생성
node tools/build-tokens.mjs --check         # 오래된 토큰 생성물 검사
node tools/build-design-preview.mjs         # 디자인 검토 페이지 생성 (--check 로 일치 검사)
node tools/build-wireframes.mjs             # 와이어프레임 SVG 재생성
node --test tests/*.test.cjs                # 단위 테스트
node --test tests/cards.test.cjs            # 단일 테스트 파일
node tests/browser.cjs                      # Playwright 조작·배치 검사
node tests/themes.cjs                       # 테마 검사
node tests/wireframes.cjs                   # 와이어프레임 검사
node tests/design-preview.cjs               # 검토 페이지 검사
```

브라우저 검사는 Playwright와 Chrome이 필요합니다. 자동으로 찾지 못하면 `CARDEX_PLAYWRIGHT`, `CARDEX_CHROMIUM`을 지정합니다. 저장소 루트에는 npm 빌드가 없습니다.

Docker는 빌드된 `frontend/index.html`을 복사합니다. 그래서 `docker build` 전에 프론트를 먼저 빌드합니다. 약 500MB인 모델은 `/models/checkpoint`에 읽기 전용으로 마운트하며, 이미지에 넣지 않습니다.

## 3. 절대 규칙

반드시 지킵니다. 예외가 필요하면 먼저 사용자에게 묻습니다.

1. **감정 체계 매핑 금지**: 프론트 7감정과 백엔드 6분류 사이에 임시 매핑, 변환 표, API 호출을 추가하지 않습니다. 실제 기록은 분석 대기 상태를 유지합니다.
2. **생성물 직접 편집 금지**: `frontend/index.html`, `frontend/scripts/generated/`, `frontend/styles/generated/`, 와이어프레임 SVG, 디자인 검토 페이지는 빌드 결과물입니다. `scripts/`, `styles/`, `templates/`, `design/tokens/` 같은 소스를 고친 뒤 다시 빌드합니다. 소스와 생성물은 같은 변경에 함께 반영합니다.
3. **데이터 경계**: 일기 원문과 기록 방식은 메모리에만 둡니다(새로고침하면 사라짐). `localStorage`에는 테마와 밝기만 저장하고, v3에서 쓰던 키 이름을 바꾸지 않습니다. 원문을 서버나 브라우저 저장소(IndexedDB 포함)에 저장하는 코드를 추가하지 않습니다.
4. **예시와 실제 기록 분리**: 예시 데이터는 별도 모드입니다. 실제 기록, 통계, 도감에 섞지 않습니다. `design/fixtures`는 검토 페이지에서만 쓰고 앱에 주입하지 않습니다.
5. **오프라인 단독 실행**: 프론트는 외부 요청 없이 열려야 합니다. CDN 스크립트, 웹폰트 URL, 외부 이미지, fetch를 추가하지 않습니다. 자산은 빌드할 때 HTML에 내장합니다.
6. **비밀 정보 차단**: 모델 가중치, 자격 증명, 실제 일기 내용은 Git에 넣지 않습니다. 체크포인트 경로는 환경변수로만 받습니다. Docker 이미지에 모델을 넣지 않습니다.
7. **변경 범위 제한**: 요청받은 폴더와 변형(variant)만 수정합니다. `design-lab/`의 각 시안은 서로 독립이므로 한 시안을 고치면서 다른 시안이나 `frontend/`를 건드리지 않습니다.
8. **라이선스 유지**: IBM Plex Sans KR 라이선스(`frontend/docs/licenses/ibm-plex-sans-kr.txt`)와 배포 HTML 안의 라이선스 내장을 지우지 않습니다.
9. **API 표면 유지**: OpenAPI/docs 엔드포인트(`docs_url`, `redoc_url`, `openapi_url`)는 꺼진 상태로 둡니다. `/api/analyze`의 요청·응답 형식은 사용자 요청 없이 바꾸지 않습니다.
10. **한국어 보존**: 파일은 UTF-8로 다루고, 한국어 텍스트가 깨지거나 다른 문자로 바뀌지 않게 합니다.
11. **테스트 유지**: 단위·통합·브라우저 검사를 통과해야 PR을 승인합니다. 새 기능은 테스트를 추가합니다. 실패한 검사는 "미실행"과 이유를 적습니다.
12. **커밋·PR 규칙 준수**: Conventional Commits를 쓰고, PR 본문에 Summary, Changes, Test, Risk 섹션을 넣습니다. 관련 이슈를 연결하고, UI를 바꿨다면 스크린샷을 첨부합니다. 실행한 검증 명령과 갖추지 못한 전제 조건을 정확히 적습니다.
13. **사용자 동의**: 새 의존성(pip, npm), 외부 서비스, 모델 변경은 사용자에게 확인합니다. PR에 "사용자 동의 필요"를 표시합니다.
14. **사용자에게 묻기**: 규칙 위반, 새로운 의존성, 외부 서비스, 모델 변경, UI 변경, 경계값 변경은 먼저 사용자에게 확인합니다. PR에 "사용자 동의 필요"를 표시합니다.
15. **사용자 요청 우선**: 사용자가 요청한 변경은 규칙보다 우선합니다. 다만, 규칙 위반이나 보안·라이선스 문제는 먼저 알립니다.

## 4. 프론트 아키텍처

`tools/build.mjs`는 소스를 `templates/shell.html`의 마커 위치에 이어 붙입니다. 마커는 `/*__STYLES__*/`, `/*__THEME__*/`, `/*__DOMAIN__*/`, `/*__APP__*/`이고, `app.js` 안에는 `/*__STATISTICS_VIEW__*/`가 있습니다. 마지막으로 IBM Plex Sans KR 라이선스를 내장합니다.

- 빌드 순서: `buildTokens`(JSON 참조 검증 → CSS·테마 데이터 생성) → 스타일 내장 → 테마 스크립트 → 뷰·도메인·앱 → 라이선스.
- `styles/base.css`에서는 `@font-face` 줄만 가져갑니다. 스타일 순서는 `diary.css → themes.css → generated/tokens.css`입니다.
- `generated/theme-tokens.js → theme.js`는 첫 화면이 그려지기 전에 실행됩니다(설정 저장, OS 모드, `meta theme-color`).
- 도메인 스크립트(`core.js`, `diary-core.js`, `statistics.js`, `cards.js`)는 일반 공유 스크립트이면서 Node용으로도 export합니다. 테스트는 `require("../scripts/*.js")`로 바로 불러옵니다. 새 도메인 함수도 이 방식을 따릅니다.
- `app.js`는 상태, 렌더링, SVG/PNG 카드 출력을 맡습니다. `statistics-view.js`와 `catalog-view.js`는 뷰입니다. 도메인 판정 로직은 뷰에 넣지 않고 도메인 스크립트에 둡니다.
- 토큰 값만 바꿔도 앱과 디자인 검토 페이지를 둘 다 다시 생성합니다.

## 5. 도메인 규칙

- **기록 식별**: 기록은 ID와 원문 버전으로 구분합니다. 원문을 고치면 버전이 올라가고 분석은 대기로 돌아갑니다. 이전 버전의 분석은 카드, 통계, 도감에서 모두 빠집니다.
- **카드 단계**: 7감정 중 최고 확률을 **반올림 전** 값으로 판정합니다.
  - 30% 미만 → 빈 카드
  - 30% 이상 60% 미만 → 1단계
  - 60% 이상 90% 미만 → 2단계
  - 90% 이상 → 3단계
  - 경계값(30/60/90%)은 위 단계에 들어갑니다. 경계값을 바꾸려면 먼저 사용자에게 확인합니다.
- **동률**: 기존 감정 ID 순서로 대표 감정을 고르고 "공동 최다" 표시를 남깁니다.
- **상태 구분**: 분석 대기와 분석 실패는 빈 카드와 다른 상태로 표시합니다. 셋을 하나로 합치지 않습니다.
- **의미 제한**: 카드 단계와 `confidence`는 감정의 강도나 성장 점수가 아닙니다. UI 문구나 주석에서 그렇게 표현하지 않습니다.
- **도감**: 7유형 × 3단계 = 21슬롯입니다. 만난 단계만 해제됩니다. 한 슬롯의 마지막 기록이 삭제되거나 수정으로 분석이 무효화되면 슬롯이 다시 잠깁니다.
- **통계**: 분석이 빠진 기록을 중립으로 채우지 않습니다.
- **기록 방식**: "하루 한 편"은 오늘 기록을 갱신하고, "여러 편"은 새 기록을 쓸 때마다 항목을 만듭니다. 날짜는 현지 날짜로 정하며, 기존 기록을 고쳐도 원래 날짜를 유지합니다.
- **PNG 출력**: 1080×1620 크기이며 일기 원문을 넣지 않습니다. 현재 테마를 반영합니다.
- **테마**: 페이퍼 다이어리, 세이지 터치, 리퀴드 오로라, 에디토리얼 모노, 레트로 플레이의 5테마 × 밝음·어두움·시스템을 지원합니다. 기본값은 페이퍼 다이어리 + 시스템입니다. 저장소가 막히면 현재 실행에만 적용합니다.

## 6. 백엔드 규칙

- `EmotionPredictor`는 FastAPI lifespan에서 한 번만 로드해 `app.state.predictor`에 둡니다. 요청마다 모델을 로드하지 않습니다.
- 체크포인트 탐색 순서:
  1. `EMOTION_MODEL_DIR`
  2. `EMOTION_STUDY_DIR` 아래에서 validation 성능이 가장 높은 체크포인트
  3. 프로젝트에 함께 둔 `emotional-dialogue-input-study-20261007-v1`
  4. 상위 디렉터리의 `experiments/emotional-dialogue-input-study-20261007-v1`
  5. `Downloads` 아래 압축을 푼 같은 실험 폴더
- 체크포인트 폴더에는 `config.json`, `model.safetensors`, `tokenizer_config.json`이 있어야 합니다.
- 입력이 비어 있으면 422와 한국어 메시지("분석할 문장을 입력하세요.")를 돌려줍니다. 오류 메시지는 한국어로 씁니다.
- 응답 필드(`lines`, `predictions[].emotion`, `confidence`, `probabilities`, `input_tokens`, `truncated`)를 유지합니다. `confidence`는 선택된 클래스의 확률이지 감정 강도가 아닙니다.
- 테스트에서는 `backend.main.EmotionPredictor`를 mock으로 바꾸고 실제 가중치를 로드하지 않습니다. 새 테스트도 가중치 없이 돌아가야 합니다.

## 7. 코딩 스타일

- Python: 4칸 들여쓰기, 타입 힌트, `snake_case` 함수, `PascalCase` 클래스를 씁니다.
- JavaScript: 기존처럼 2칸 들여쓰기와 `camelCase`를 씁니다. 프레임워크나 번들러를 새로 넣지 않습니다.
- 공용 포매터나 린터 설정이 없으므로 주변 코드 스타일에 맞춥니다. 관련 없는 줄을 다시 포맷하지 않습니다.
- 새 의존성(pip, npm)은 사용자 동의를 받은 뒤 추가합니다.

## 8. 변경 후 검증 체크리스트

변경 종류에 맞는 명령을 실행하고 결과를 보고합니다.

| 변경 | 실행할 명령 (`frontend/` 기준) |
|---|---|
| 프론트 스크립트·스타일·템플릿 | `node tools/build.mjs` → `node --test tests/*.test.cjs` → `node tests/browser.cjs` → `node tests/themes.cjs` |
| 디자인 토큰 | 위 항목 + `node tools/build-tokens.mjs --check` + `node tools/build-design-preview.mjs` + `node tests/design-preview.cjs` |
| 화면 구조·이동 | `node tools/build-wireframes.mjs` → `node tests/wireframes.cjs` |
| 백엔드 | 루트에서 `python -m unittest discover -s backend/tests -v` |
| `design-lab/` 시안 | 해당 시안 README의 명령, 또는 `design-lab/`에서 `npm test` |

- 동작을 바꾸면 회귀 테스트를 추가합니다. 경계값(30/60/90%, 동률, 버전 변경)과 잘못된 입력을 포함합니다.
- Playwright나 Chrome이 없어 실행하지 못한 검사는 "미실행"과 이유를 적습니다. 통과한 것처럼 보고하지 않습니다.
- 모바일 배치(390×844, 360×640, 320×568), 키보드 초점, 스크린리더는 자동 검사로 확인되지 않으므로 수동 확인 필요 항목으로 남깁니다.

## 9. 커밋·PR 규칙

- 커밋과 푸시는 사용자가 요청할 때만 합니다. 기본 브랜치(`main`)에서 작업 중이면 새 브랜치를 먼저 만듭니다.
- Conventional Commits(`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)를 쓰고, 제목은 영어로 짧게 씁니다. 한 커밋에는 한 주제만 담습니다.
- 소스 변경과 다시 빌드한 생성물은 같은 커밋에 넣습니다.
- PR 본문에는 Summary, Changes, Test, Risk 섹션을 넣습니다. 관련 이슈를 연결하고, UI를 바꿨다면 스크린샷을 첨부합니다. 실행한 검증 명령과 갖추지 못한 전제 조건을 정확히 적습니다.

## 10. 언어

- 사용자에게 하는 답변과 새 문서는 한국어로 씁니다.
- 코드 식별자, 커밋 메시지, 브랜치 이름은 영어로 씁니다.
- UI 문구와 오류 메시지는 한국어로 씁니다.
