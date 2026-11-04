# 화면·상태 명세

기준일: 2026-11-04. 현재 앱과 구조 설명용 와이어프레임을 구분합니다. 원본은 design/wireframes/screens.json입니다.

## 화면 목록

| ID | 화면·상태 | 유형 / 상태 | 와이어프레임 이동 대상 |
|---|---|---|---|
| WF-01 | 일기 작성 | write / normal | ST-02, WF-02, WF-03, WF-06 |
| WF-02 | 예시 감정 카드 | card / normal | WF-01, WF-02, WF-03, WF-06, WF-11 |
| WF-03 | 보관함 | archive / normal | WF-01, WF-03, WF-04, WF-06, WF-07, WF-11 |
| WF-04 | 기록 상세 | detail / normal | ST-07, WF-01, WF-02, WF-03, WF-05, WF-06, WF-10 |
| WF-05 | 기록 수정 | edit / normal | ST-07, WF-01, WF-02, WF-03, WF-04, WF-06, WF-10 |
| WF-06 | 설정 | settings / normal | WF-01, WF-02, WF-03, WF-06 |
| WF-07 | 감정 추이 | trend / normal | WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11 |
| WF-08 | 월간 기록 | count / normal | WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11 |
| WF-09 | 감정 분포 | distribution / normal | WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-11 |
| WF-10 | 날짜별 기록 목록 | filtered / normal | WF-01, WF-03, WF-04, WF-06, WF-07, WF-11 |
| WF-11 | 캐릭터 도감 | catalog / normal | WF-01, WF-03, WF-06, WF-12, WF-14 |
| WF-12 | 해제한 캐릭터 | catalog / unlocked | WF-01, WF-03, WF-06, WF-12, WF-14 |
| WF-13 | 미발견 캐릭터 | catalog / locked | WF-01, WF-03, WF-06, WF-11, WF-13 |
| WF-14 | 유형·단계별 기록 | filtered / normal | WF-01, WF-03, WF-04, WF-06, WF-07, WF-11 |
| ST-09 | 빈 카드: 30% 미만 | card / blank | WF-01, WF-02, WF-03, WF-06, WF-11 |
| ST-10 | 1단계: 30% 이상 | card / stage1 | WF-01, WF-02, WF-03, WF-06, WF-11 |
| ST-11 | 2단계: 60% 이상 | card / stage2 | WF-01, WF-02, WF-03, WF-06, WF-11 |
| ST-12 | 3단계: 90% 이상 | card / stage3 | WF-01, WF-02, WF-03, WF-06, WF-11 |
| ST-01 | 입력 오류 | write / invalid | ST-02, WF-02, WF-03, WF-06 |
| ST-02 | 임시 보관 · 분석 준비 | card / pending | WF-01, WF-03, WF-06 |
| ST-03 | 보관함에 기록 없음 | archive / empty | WF-01, WF-03, WF-06, WF-07, WF-11 |
| ST-04 | 선택 월에 기록 없음 | count / empty | ST-04, WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11 |
| ST-05 | 감정 분석 없음 | trend / no-analysis | ST-05, WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11 |
| ST-06 | 분석된 날짜 하루 | trend / single | ST-06, WF-01, WF-03, WF-06, WF-07, WF-08, WF-09, WF-10, WF-11 |
| ST-07 | 삭제 재확인 | detail / confirm | WF-01, WF-02, WF-03, WF-05, WF-06, WF-10 |
| ST-08 | 이미지 저장 실패 | card / failed | WF-01, WF-02, WF-03, WF-06, WF-11 |
## 실제 화면 규칙
진입·복귀 흐름은 [USER_FLOWS](design/USER_FLOWS.md), 조작·복구는 [PATTERNS](design/PATTERNS.md)를 따릅니다.
- WF-01: 빈 입력은 ST-01. 실제 기록 제출은 ST-02이며 모델 호출은 하지 않습니다.
- WF-02, ST-09~12: 예시 결과 카드. 반올림 전 최다 확률 <30% 빈 카드, 30~60% 미만 1단계, 60~90% 미만 2단계, 90% 이상 3단계. 동률 안내를 유지합니다.
- WF-03~05, ST-07: 목록→상세→수정/삭제. 수정하면 기존 분석 버전을 무효화합니다. 하루 한 편/여러 편과 원래 날짜 유지 규칙은 README를 따릅니다.
- WF-06: 테마·모드 선택 즉시 반영, 설정만 브라우저 저장. 예시 전환은 실제 기록과 분리합니다.
- WF-07~10, ST-04~06: 추이·월간·분포, 날짜 목록. 기록 없음·분석 없음·분석 하루를 구분합니다.
- WF-11~14: 유형·단계별 해제, 미발견, 연결 기록. 유효한 마지막 기록이 사라지면 다시 잠깁니다.
- ST-08: 카드 저장 실패 안내. 분석 실패와 서로 다른 상태입니다.
## 와이어프레임과 앱의 차이
와이어프레임은 고정 날짜·설명용 집계·흑백 도형입니다. 실제 입력·분석·다운로드를 실행하지 않습니다. screens.json의 actions는 화면 링크 목록이며 실제 이벤트 핸들러가 아닙니다. 앱은 app.js의 상태와 뷰 모듈로 전환합니다. 분석 실패는 도메인 상태에 존재하지만 별도의 기존 ST 프레임은 없으며 추가 후보입니다. 긴 원문 스크롤·저장 중 로딩은 주석 중심이고 실화면 확인이 필요합니다.
모바일은 기록/카드를 전환합니다. 정확한 초점·선택·스크롤 복원과 스크린리더는 미검증입니다. 신규 API·계정·서버 저장은 이번 범위가 아닙니다.
