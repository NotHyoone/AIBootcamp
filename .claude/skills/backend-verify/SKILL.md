---
name: backend-verify
description: FastAPI + KcELECTRA 감정 분류 backend를 단위 테스트하고, 체크포인트가 있으면 추론·서버 스모크 테스트까지 수행합니다. backend/*.py 수정 후, 또는 사용자가 백엔드 테스트·모델 동작 확인을 요청할 때 사용합니다.
argument-hint: "[unit|model \"텍스트\"|serve]"
---

# backend 검증

저장소 루트에서 실행합니다. Python은 `.venv`를 우선 사용합니다(시스템 python에는 fastapi가 없음).

```powershell
$py = if (Test-Path .venv\Scripts\python.exe) { ".venv\Scripts\python.exe" } else { "python" }
```

## unit (기본) — 모델 가중치 불필요
```powershell
& $py -m unittest discover -s backend/tests -v
# 단일: & $py -m unittest backend.tests.test_main.<Class>.<test_method>
```

## model "텍스트" — 실제 추론
1. 체크포인트 위치: `EMOTION_MODEL_DIR` → `EMOTION_STUDY_DIR` → `emotional-dialogue-input-study-20261007-v1` 자동 탐색 순서. 필요한 파일: `config.json`, `model.safetensors`, `tokenizer_config.json`.
2. 경로를 모르면 사용자에게 묻고 추측하지 않습니다.
```powershell
& $py -m backend.emotion_model --checkpoint "<체크포인트>" --text "<텍스트>"
```
- `confidence`는 감정 강도가 아니라 선택 클래스 확률입니다. `truncated`(max_length 256)를 함께 보고합니다.

## serve — 서버 스모크
```powershell
& $py -m uvicorn backend.main:app --port 8000   # run_in_background로 실행
```
`GET /`(frontend/index.html 제공), `POST /api/analyze`(빈 입력 → 422)를 확인한 뒤 서버를 종료합니다.

## 규칙
- 백엔드 6분류(`분노, 슬픔, 불안, 상처, 당황, 기쁨`)와 프론트 7감정을 임의로 매핑하지 않습니다(의도적 미연결).
- 동작을 바꿨다면 잘못된 입력·경계값 회귀 테스트를 `backend/tests`에 추가하고, 테스트는 predictor를 모의해 가중치 없이 돌아가게 유지합니다.
- 체크포인트·일기 내용은 Git에 넣지 않습니다.
- 결과(실행 명령, 통과/실패, 실행 불가 전제 조건)는 한국어로 보고합니다.
