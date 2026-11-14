---
name: sync-agent-docs
description: CLAUDE.md와 AGENTS.md의 규칙·명령어·구조 설명을 함께 갱신해 내용이 어긋나지 않게 합니다. 둘 중 하나를 수정했거나, 빌드·테스트 명령, 폴더 구조, 공용 절대규칙이 바뀌었을 때 사용합니다.
argument-hint: "[변경 요약]"
---

# CLAUDE.md ↔ AGENTS.md 동기화

## 절차
1. 두 파일을 모두 읽고 차이를 비교합니다(`git diff --no-index CLAUDE.md AGENTS.md`로 확인 가능).
   - 공통 내용: 공용 절대규칙, 코딩·커밋 규칙, 명령어, frontend/backend 구조, 기타 디렉터리
   - 파일별 고유 내용은 유지: CLAUDE.md 머리말(Claude Code용 안내), `.claude/` hook·skill 설명 등
2. 실제 저장소와 대조합니다: `frontend/tools/build.mjs`의 연결 파일 목록, `frontend/tests/` 파일명, `backend/` 동작. 문서에만 있고 실제로 없는 항목은 고치거나 사용자에게 확인합니다.
3. Edit 도구로 수정합니다(hook이 `.backups/CLAUDE.vNNN.md`, `.backups/AGENTS.vNNN.md`로 자동 백업). 셸로 수정할 경우 먼저 `backup` skill을 사용합니다.
4. UTF-8 한국어를 보존하고, 코드·명령·경로·식별자는 원문을 유지합니다.

## 보고
- 두 파일에 반영한 변경 요약, 의도적으로 다르게 남긴 부분과 이유, 생성된 백업 경로를 한국어로 보고합니다.
