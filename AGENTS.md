# Repository Guidelines

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
