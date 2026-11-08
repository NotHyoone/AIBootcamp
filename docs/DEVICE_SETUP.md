# 다른 기기에서 이어서 작업하기

다른 PC에서 저장소를 받아 프론트·백엔드 작업과 검증을 이어 가는 순서입니다. 명령은 Windows PowerShell 기준입니다.

## 1. 미리 설치할 것

| 도구 | 용도 | 확인 명령 |
|---|---|---|
| Git | 저장소 받기·커밋 | `git --version` |
| Node.js 22 이상 | 프론트 빌드·테스트(이 저장소는 v22.23에서 확인) | `node -v` |
| Python 3.12 | 백엔드 실행·테스트 | `python --version` |
| GitHub CLI (선택) | PR 만들기·확인 | `gh --version` |
| Claude Code (선택) | AI 작업 도구. 루트의 `CLAUDE.md`를 자동으로 읽음 | `claude --version` |

GitHub CLI 설치와 로그인:

```powershell
winget install --id GitHub.cli -e
gh auth login --hostname github.com --git-protocol https --web
```

`--web`을 붙이면 화면에 나온 일회용 코드를 브라우저에 입력해 로그인합니다. Claude Code 프롬프트에서 `!`로 실행할 때도 이 옵션을 붙여야 대화형 질문 없이 끝납니다.

## 2. 저장소 받기

처음 받는 기기:

```powershell
git clone https://github.com/NotHyoone/AIBootcamp.git
cd AIBootcamp
git switch feat/diary-record-protection   # 이어서 할 브랜치
```

이미 받아 둔 기기:

```powershell
git fetch origin
git switch feat/diary-record-protection
git pull
```

작업 브랜치는 머지 상태에 따라 달라집니다. PR이 머지됐다면 `HW`를 받습니다. `main`은 초기 구조만 있어 작업 기준이 아닙니다.

## 3. 프론트 빌드와 단위 테스트

```powershell
cd frontend
node tools/build.mjs
node --test tests/*.test.cjs
```

프론트는 npm 패키지 설치 없이 빌드됩니다. 빌드된 `frontend/index.html`을 브라우저로 열면 바로 실행됩니다.

## 4. 브라우저 검사 준비 (Playwright)

`tests/browser.cjs`, `themes.cjs`, `wireframes.cjs`, `design-preview.cjs`에는 Playwright와 Chromium 계열 브라우저가 필요합니다. Playwright는 **저장소 의존성이 아니므로** 기기마다 임시 폴더에 따로 설치합니다.

```powershell
$dir = Join-Path $env:TEMP "aibootcamp-frontend-review"
New-Item -ItemType Directory -Force $dir | Out-Null
Push-Location $dir
npm init -y | Out-Null
npm install playwright@1.49.1
npx playwright install chromium
Pop-Location
```

테스트는 기본으로 `%TEMP%\aibootcamp-frontend-review\node_modules\playwright`와 `C:\Program Files\Google\Chrome\Application\chrome.exe`를 찾습니다. Chrome이 없으면 설치한 Chromium 경로를 지정합니다.

```powershell
$env:CARDEX_CHROMIUM = (Get-ChildItem "$env:LOCALAPPDATA\ms-playwright\chromium-*\chrome-win\chrome.exe" | Select-Object -First 1).FullName
# Playwright를 다른 곳에 설치했다면
# $env:CARDEX_PLAYWRIGHT = "C:\path\to\node_modules\playwright"
```

환경변수는 PowerShell 창마다 다시 지정합니다. 이어서 `frontend/`에서 실행합니다.

```powershell
node tests/browser.cjs
node tests/themes.cjs
node tests/wireframes.cjs
node tests/design-preview.cjs
```

## 5. 백엔드 (필요할 때만)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
python -m unittest discover -s backend/tests -v   # 모델 가중치 없이 실행
```

서버를 띄우려면 약 500MB인 모델 체크포인트가 필요합니다. 체크포인트는 Git에 없으므로 별도로 복사합니다. 경로는 환경변수로만 지정합니다(`$env:EMOTION_MODEL_DIR = "C:\path\to\checkpoint"`). 탐색 순서와 Docker 실행은 [README](../README.md#모델-경로)를 참고하세요.

## 6. 기기 간에 옮겨지지 않는 것

- **일기 기록**: 프론트는 기록을 메모리에만 둡니다. 새로고침하면 사라지고 다른 기기로 옮겨지지 않습니다.
- **테마 설정**: 브라우저 `localStorage`에 저장되므로 기기·브라우저마다 다시 고릅니다.
- **모델 체크포인트, `.venv`, Playwright**: Git에 없으므로 기기마다 준비합니다.
- **Claude Code 메모리와 설정**: `~/.claude/` 아래에 기기별로 저장됩니다. 저장소에 있는 `CLAUDE.md`만 함께 옮겨집니다.
- **GitHub 로그인**: 기기마다 `gh auth login`과 Git 자격 증명이 따로 필요합니다.

## 7. 주의할 점

- 소스(`scripts/`, `styles/`, `templates/`, `design/tokens/`)를 고친 뒤에는 빌드합니다. 다시 생성한 결과물은 같은 커밋에 넣습니다. 생성물은 직접 고치지 않습니다.
- 와이어프레임을 다시 생성하면 줄바꿈 문자(CRLF/LF)만 다른 변경이 생길 수 있습니다. 내용 변화가 없다면 `git checkout -- frontend/docs/wireframes/index.html`로 되돌립니다.
- 커밋 전에 `git status`로 모델 가중치, 자격 증명, 실제 일기 내용이 섞이지 않았는지 확인합니다.
- 작업 규칙 전체는 [CLAUDE.md](../CLAUDE.md)와 [AGENTS.md](../AGENTS.md)에 있습니다.
