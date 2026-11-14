---
name: backup
description: 저장소 규칙에 맞춰 기존 파일을 .backups/<상대경로>/<이름>.vNNN.<확장자>로 수동 백업하고 해시로 검증합니다. Edit/Write 도구는 hook이 자동 백업하지만, 셸 명령·생성 스크립트·sed/이동/일괄 치환처럼 hook을 거치지 않고 기존 파일을 바꾸기 직전에 반드시 사용합니다. 사용자가 "백업해줘"라고 할 때도 사용합니다.
argument-hint: "<파일 경로> [파일 경로 ...]"
---

# 수동 버전 백업

## 언제 필요한가
- `.claude/hooks/backup-guard.mjs`가 Edit·Write·MultiEdit·NotebookEdit 직전에 세션당 한 번 자동 백업합니다.
- 다음은 hook이 잡지 못하므로 **실행 전에** 이 skill로 백업합니다.
  - PowerShell/Bash로 파일을 덮어쓰거나 치환·이동하는 명령
  - `frontend/tools/build.mjs` 외의 생성 도구가 기존 파일을 덮어쓰는 경우(예: `build-wireframes.mjs`, `build-design-preview.mjs`의 산출물)
  - `frontend/tools/build.mjs`는 `index.html`·생성 토큰을 자체 백업하므로 별도 백업 불필요

## 실행
저장소 루트에서:
```powershell
node .claude/hooks/backup-guard.mjs --file <경로1> --file <경로2>
```
- 출력의 `백업 완료: <원본> → <백업>` 줄을 완료 보고에 포함합니다.
- 신규 파일은 "백업 불필요"로 건너뜁니다.
- exit 코드가 0이 아니면(백업 또는 해시 검증 실패) 해당 파일의 수정·덮어쓰기를 중단하고 사용자에게 알립니다.

## 규칙
- 기존 백업은 덮어쓰지 않고(`wx` 플래그), 사용자 요청 없이 삭제하지 않습니다.
- `.backups/`는 `.gitignore`에 있습니다. 인증 정보·개인 일기 데이터가 담긴 백업을 Git에 추가하지 않습니다.
