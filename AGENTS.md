# Repository Guidelines

## 공용 절대규칙

이 규칙은 현재 저장소 전체의 작업에 적용하며, 아래 프로젝트별 지침과 함께 준수합니다.

1. **기존 파일은 수정 전에 반드시 버전 백업합니다.** 직접 편집뿐 아니라 빌드나 생성 도구가 기존 파일을 덮어쓰는 경우에도 먼저 백업합니다. 한 작업에서 같은 파일은 최초 변경 전에 백업하고, 새로운 수정 작업에서는 다음 버전을 생성합니다. 신규 파일은 수정 전 원본이 없으므로 백업 대상에서 제외합니다.
2. **백업은 저장소 루트의 `.backups/`에 원본의 상대 디렉터리 구조를 유지하여 저장합니다.** 파일명은 `파일명.v001.확장자` 형식을 사용하며, 기존 백업의 최대 번호 다음 번호를 사용합니다. 예: `frontend/index.html` → `.backups/frontend/index.v001.html`, `AGENTS.md` → `.backups/AGENTS.v001.md`. 확장자가 없는 파일은 원래 이름 뒤에 `.v001`을 붙입니다.
3. **기존 백업은 덮어쓰지 않고, 사용자 요청 없이 삭제하지 않습니다.** 백업에도 원본과 동일한 보안 및 개인정보 보호 기준을 적용하며, 인증 정보나 개인 데이터가 담긴 백업은 Git에 포함하지 않습니다.
4. **백업 생성 또는 원본과의 일치 확인에 실패하면 해당 파일의 수정이나 덮어쓰기를 중단합니다.** 백업을 확보하지 않은 상태로 작업을 계속하지 않습니다.
5. **모든 `index.html`의 직접 편집을 원칙적으로 금지합니다.** 모듈 소스와 템플릿을 수정한 뒤 프로젝트의 공식 빌드로 `index.html`을 재생성하는 것은 허용합니다. 재생성 전에도 기존 파일을 백업합니다.
6. **`index.html` 직접 편집은 사용자가 명시적으로 요청하거나 허용한 경우에만 예외로 진행합니다.** 빌드 도구의 부재나 오류만으로 임의 예외를 적용하지 않습니다. 예외 적용 시에도 수정 전 백업을 만들고, 완료 보고에 예외 이유와 검증 결과를 기록합니다.
7. **플랜 수립과 결과 보고는 모두 한국어로 작성합니다.** 작업 계획, 진행 상황, 완료 보고, 검증 결과 요약 등 사용자에게 보여주는 설명은 한국어로 하며, 코드·명령어·파일 경로·식별자는 원문을 유지합니다.

## Project Structure & Module Organization

- `frontend/` is the main diary frontend, promoted from Diary Simple v3. Edit its modular sources and regenerate its standalone `index.html`.
- `backend/main.py` defines the FastAPI app, serves `frontend/index.html`, and exposes `POST /api/analyze`.
- `backend/emotion_model.py` contains checkpoint resolution, inference, and CLI code; `backend/tests/` contains Python unit tests.
- `design-lab/` holds separate diary and emotion-card prototypes. Modular variants use `scripts/`, `styles/`, `templates/`, `tools/`, `tests/`, and `docs/`.
- `image/` holds visual assets; `reports/frontend-comparison/` contains comparison pages, screenshots, and verification scripts.

## Build, Test, and Development Commands

Run backend commands from the repository root using Python 3.12:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
$env:EMOTION_MODEL_DIR = "C:\path\to\checkpoint"
uvicorn backend.main:app --reload
python -m unittest discover -s backend/tests -v
```

The server runs at `http://localhost:8000`. Alternatively, set `EMOTION_STUDY_DIR` to select a checkpoint from experiment results.

For the main frontend, inside `frontend/`:

```powershell
node tools/build.mjs
node --test tests/*.test.cjs
node tests/browser.cjs
node tests/themes.cjs
```

The build embeds sources into standalone `index.html`; open that file directly. Browser checks require Playwright and Chrome; configure `CARDEX_PLAYWRIGHT` and `CARDEX_CHROMIUM` when necessary. Consult each variant's README for additional commands. No root npm build exists.

## Coding Style & Naming Conventions

Use four-space Python indentation, type hints, `snake_case` functions, and `PascalCase` classes. Follow existing two-space JavaScript indentation and `camelCase` names. Preserve UTF-8 Korean text. No shared formatter or linter configuration is present. Edit modular sources and templates, then regenerate their HTML rather than editing generated output alone. Keep changes confined to the requested variant.

## Testing Guidelines

Use Python `unittest` (`test_*` methods) and Node's test runner (`tests/*.test.cjs`). Add regression tests for changed behavior, including invalid input and boundary cases. Unit checkpoint tests need no model weights. Browser scripts check interaction and layout; review mobile layouts manually too. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

History mixes descriptive subjects with `feat:` and `fix:` prefixes; prefer Conventional Commits. Keep commits focused. PRs should include Summary, Changes, Test, and Risk sections, related issues when applicable, and screenshots for UI changes. Report exact verification commands and unavailable prerequisites.

## Security & Configuration

Keep credentials, private diary content, and model weights out of Git. Supply checkpoint paths through environment variables; Docker mounts weights read-only. Preserve each prototype's documented storage behavior and bundled font licenses.
