# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

"오늘의 모먼트" — 한국어 일기·감정 카드 앱입니다. `frontend/`가 메인 제품(단일 HTML 독립 실행 앱)이고, `backend/`는 로컬 KcELECTRA 감정 분류 모델을 감싼 FastAPI 서버입니다. `AGENTS.md`에 다른 에이전트용 동일 규칙이 있으므로 규칙이 바뀌면 두 파일을 함께 갱신합니다.

## 공용 절대규칙

이 규칙은 현재 저장소 전체의 작업에 적용하며, 기본 동작보다 우선합니다. 아래 프로젝트별 지침과 함께 준수합니다.

1. **기존 파일은 수정 전에 반드시 버전 백업합니다.** 직접 편집뿐 아니라 빌드나 생성 도구가 기존 파일을 덮어쓰는 경우에도 먼저 백업합니다(예: `frontend/index.html`, `styles/generated/*`, `scripts/generated/*`, 와이어프레임, 디자인 검토 페이지). 한 작업에서 같은 파일은 최초 변경 전에 백업하고, 새로운 수정 작업에서는 다음 버전을 생성합니다. 신규 파일은 수정 전 원본이 없으므로 백업 대상에서 제외합니다.
2. **백업은 저장소 루트의 `.backups/`에 원본의 상대 디렉터리 구조를 유지하여 저장합니다.** 파일명은 `파일명.v001.확장자` 형식을 사용하며, 기존 백업의 최대 번호 다음 번호를 사용합니다. 예: `frontend/index.html` → `.backups/frontend/index.v001.html`, `AGENTS.md` → `.backups/AGENTS.v001.md`. 확장자가 없는 파일은 원래 이름 뒤에 `.v001`을 붙입니다.
3. **기존 백업은 덮어쓰지 않고, 사용자 요청 없이 삭제하지 않습니다.** 백업에도 원본과 동일한 보안 및 개인정보 보호 기준을 적용하며, 인증 정보나 개인 데이터가 담긴 백업은 Git에 포함하지 않습니다.
4. **백업 생성 또는 원본과의 일치 확인에 실패하면 해당 파일의 수정이나 덮어쓰기를 중단합니다.** 백업을 확보하지 않은 상태로 작업을 계속하지 않습니다.
5. **모든 `index.html`의 직접 편집을 원칙적으로 금지합니다.** 모듈 소스와 템플릿을 수정한 뒤 프로젝트의 공식 빌드로 `index.html`을 재생성하는 것은 허용합니다. 재생성 전에도 기존 파일을 백업합니다.
6. **`index.html` 직접 편집은 사용자가 명시적으로 요청하거나 허용한 경우에만 예외로 진행합니다.** 빌드 도구의 부재나 오류만으로 임의 예외를 적용하지 않습니다. 예외 적용 시에도 수정 전 백업을 만들고, 완료 보고에 예외 이유와 검증 결과를 기록합니다.

## 코딩·커밋 규칙

- UTF-8 한국어 텍스트를 보존합니다. 요청받은 변형(variant) 범위 안에서만 수정합니다.
- Python: 4칸 들여쓰기, 타입 힌트, `snake_case` 함수, `PascalCase` 클래스. JavaScript: 기존 2칸 들여쓰기, `camelCase`.
- 커밋은 Conventional Commits(`feat:`, `fix:`, `docs:`)를 선호합니다. PR에는 Summary / Changes / Test / Risk 섹션을, UI 변경에는 스크린샷을 포함합니다.
- 변경된 동작에는 잘못된 입력·경계값을 포함한 회귀 테스트를 추가합니다. 실행한 검증 명령과 사용할 수 없었던 전제 조건을 보고합니다.

## 명령어

백엔드 (저장소 루트, Python 3.12):

```powershell
pip install -r backend/requirements.txt
$env:EMOTION_MODEL_DIR = "C:\path\to\checkpoint"   # 또는 $env:EMOTION_STUDY_DIR = <실험 폴더>
uvicorn backend.main:app --reload                   # http://localhost:8000 에서 frontend/index.html 제공
python -m unittest discover -s backend/tests -v     # 모델 가중치 불필요
python -m unittest backend.tests.test_main.<Class>.<test_method>   # 단일 테스트
python -m backend.emotion_model --checkpoint "C:\path\to\checkpoint" --text "오늘의 기록"
```

프론트엔드 (`frontend/` 안에서 실행, npm 패키지·루트 빌드 없음):

```powershell
node tools/build.mjs                    # 토큰 생성 + 단일 index.html 재생성
node --test tests/*.test.cjs            # 단위 테스트 (도메인 모듈을 require로 로드)
node --test tests/cards.test.cjs        # 단일 테스트 파일
node --test --test-name-pattern "<이름>" tests/cards.test.cjs
node tests/browser.cjs                  # 빌드된 index.html 대상 Playwright 브라우저 검사
node tests/themes.cjs
node tests/persistence-browser.cjs
node tests/card-effects.cjs
node tools/build-wireframes.mjs; node tests/wireframes.cjs
node tools/build-design-preview.mjs     # 디자인 검토 페이지, --check로 오래된 토큰·검토 페이지 감지
node tools/build-tokens.mjs --check
```

`.test`가 없는 `tests/*.cjs` 브라우저 스크립트는 `node --test` 스위트가 아닌 일반 Node 스크립트입니다. Playwright는 `CARDEX_PLAYWRIGHT`(기본값 `%TEMP%/aibootcamp-frontend-review/node_modules/playwright`), Chrome은 `CARDEX_CHROMIUM`(기본값 `C:/Program Files/Google/Chrome/Application/chrome.exe`)에서 불러옵니다. 생성된 `index.html`을 검사하므로 브라우저 테스트 전에 항상 빌드합니다(빌드 전 `index.html` 백업). 모바일 레이아웃, 실기기 키보드, Safari·Firefox는 수동 확인이 필요합니다.

Docker: 이미지에는 `frontend/index.html`만 복사되므로 먼저 프론트를 빌드하고, 체크포인트는 `/models/checkpoint`에 읽기 전용으로 마운트합니다.

## 프론트엔드 구조

- **빌드 파이프라인** (`tools/build.mjs`): `buildTokens()`로 `design/tokens/`의 JSON을 `styles/generated/tokens.css`와 `scripts/generated/theme-tokens.js`로 생성한 뒤 `templates/shell.html`의 마커를 채웁니다.
  - `/*__STYLES__*/` ← `base.css`의 `@font-face` 줄 + `diary.css` + `themes.css` + `generated/tokens.css` + `flip.css`
  - `/*__THEME__*/` ← `theme-tokens.js` + `theme.js` (첫 화면 표시 전 실행)
  - `/*__DOMAIN__*/` ← `core.js`, `diary-core.js`, `statistics.js`, `cards.js`, `storage.js`, `flip.js`
  - `/*__APP__*/` ← `app.js`. 내부 마커 `/*__OBJECT_ASSETS__*/`(캐릭터 PNG 9종 base64), `/*__PERSISTENCE__*/`(`persistence.js`), `/*__STATISTICS_VIEW__*/`(`statistics-view.js` + `catalog-view.js`)
  - 결과는 fetch가 필요 없는 단일 `index.html`입니다. 위 목록에 없는 파일(`scripts/integrated.js`, `styles/integrated.css`, `styles/refinements.css`)은 **배포되지 않습니다**. 새 소스 파일은 `build.mjs`에 연결해야 반영됩니다.
- **모듈 패턴**: 도메인 스크립트는 `globalThis`에 붙고 `module.exports`도 설정하는 UMD 형태 IIFE입니다. Node 단위 테스트가 `require("../scripts/core.js")`로 직접 불러오므로 이 이중 export를 유지합니다.
- **역할**: `core.js`/`diary-core.js`/`cards.js`/`statistics.js`는 순수 도메인 로직, `app.js`는 상태·렌더링·SVG/PNG 카드 출력(1080×1620), `statistics-view.js`/`catalog-view.js`는 뷰, `flip.js`는 카드 제스처·포커스, `storage.js`는 스냅샷 검증과 IndexedDB 트랜잭션, `persistence.js`는 복원·자동 저장 연결입니다.
- **저장**: 일기 데이터는 IndexedDB `moment-diary-main`의 `data` 저장소, `state` 키에 저장합니다(schemaVersion 1 스냅샷, `revision` 포함). 저장은 직렬화되고 readwrite 트랜잭션 안에서 revision을 비교하며, 다른 탭이 먼저 저장하면 이후 쓰기를 차단합니다. 손상·미지원 데이터는 자동 덮어쓰기를 막습니다. 테마·표시 설정은 별도의 기존 localStorage 키(`CardexTheme` API)를 사용하므로 둘을 합치지 않습니다. 기록 최대 30편, 기록·초안당 최대 10,000자. 예시 모드 데이터는 메모리 전용이며 실제 기록과 섞지 않습니다.
- **카드 규칙**: 7감정 중 최다 확률(반올림 전) 30% 미만은 빈 카드, 30~60%는 1단계, 60~90%는 2단계, 90% 이상은 3단계입니다. 동률은 감정 ID 순서로 선택합니다. 원문 수정 시 버전이 올라가고 분석이 대기로 바뀌며, 이전 버전 분석은 카드·통계·21칸 캐릭터 도감에서 제외합니다. `neg_1=불안, neg_2=슬픔, neg_3=분노` 계약을 카드·도감·통계가 공유합니다.
- **프론트와 백엔드는 의도적으로 미연결**: 프론트는 7감정, 백엔드는 6분류(`분노, 슬픔, 불안, 상처, 당황, 기쁨`)입니다. 실제 기록은 "분석 대기"로 표시되며 임의 매핑을 추가하지 않습니다.
- 디자인 원본은 `frontend/design/`(토큰·와이어프레임·fixtures), 문서는 `frontend/docs/`(`ARCHITECTURE.md`, `UI_SPEC.md`, `QA.md`, `docs/design/*`)에 있습니다. 토큰을 바꾸면 앱·디자인 검토 페이지·와이어프레임을 모두 재생성합니다.

## 백엔드 구조

- `backend/main.py`: 문서 엔드포인트를 끈 FastAPI 앱입니다. lifespan에서 `EmotionPredictor` 하나를 `app.state.predictor`에 로드하며, 유효한 체크포인트가 없으면 시작에 실패합니다. `GET /`는 `frontend/index.html`을 제공합니다. `POST /api/analyze`는 텍스트를 공백 제거한 비어 있지 않은 줄로 나눠 줄마다 예측하며, 빈 입력이나 predictor의 `ValueError`는 422를 반환합니다.
- `backend/emotion_model.py`: 체크포인트 탐색 순서는 `EMOTION_MODEL_DIR` → `EMOTION_STUDY_DIR`(validation 성능 최고 run) → 프로젝트·상위 디렉터리·Downloads의 `emotional-dialogue-input-study-20261007-v1` 폴더입니다. 체크포인트에는 `config.json`, `model.safetensors`, `tokenizer_config.json`이 필요합니다. `max_length` 기본값은 256이며 응답에 `truncated`를 표시합니다. `confidence`는 감정 강도가 아니라 선택된 클래스의 확률입니다.
- 테스트는 predictor·체크포인트 구조를 모의하므로 모델 가중치 없이 실행 가능하게 유지합니다.

## 기타 디렉터리

- `design-lab/`: 독립 시안(diary-glass, diary-3d, emotion-cardex 변형, 이전 `emotion-mvp`). 각자 README·빌드가 있으며 과거 문서의 `hw/`는 이전 경로명입니다. `frontend/` 작업 시 수정하지 않습니다.
- `reports/frontend-comparison/`: 비교 페이지와 검증 스크립트. `image/`, `reference/`: 자산.
- 인증 정보, 개인 일기 내용, 모델 가중치는 Git에 넣지 않습니다. 각 시안의 저장 방식과 번들 글꼴 라이선스를 유지합니다.
