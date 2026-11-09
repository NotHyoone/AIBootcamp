# 디자인 작업 안내

기준일: 2026-11-04. 현재 화면을 유지하며 편집 기준을 정리한 초기 버전입니다.

## 읽는 순서

[현황](AUDIT.md) → [원칙](PRINCIPLES.md) → [사용자 흐름](USER_FLOWS.md) → [기초 규칙](FOUNDATIONS.md) → [배치](LAYOUT.md) → [컴포넌트](COMPONENTS.md) → [패턴](PATTERNS.md).

[화면 명세](../UI_SPEC.md), [문구](CONTENT.md), [자산](ASSETS.md), [접근성](ACCESSIBILITY.md), [구조](../ARCHITECTURE.md), [작업 목록](../ROADMAP.md), [QA](../QA.md), [결정 기록](DECISIONS.md).

## 수정 위치

| 작업 | 편집 원본 | 확인 위치 |
|---|---|---|
| 색·간격·글자 값 | ../../design/tokens/*.json | [디자인 검토 페이지](preview/index.html) |
| 화면·상태 목록 | ../../design/wireframes/screens.json | [와이어프레임](../wireframes/index.html) |
| SVG 도형·실제 클릭 동작 | ../../tools/build-wireframes.mjs | 와이어프레임 검증 |
| 실제 UI 배치 | ../../styles/diary.css | ../../index.html |
| 테마 재질 | ../../styles/themes.css | 앱과 검토 페이지 |
| 자산 슬롯·권리 | ../../design/assets/manifest.json | ASSETS.md |

`styles/generated/`, `scripts/generated/`, 와이어프레임 결과, preview/index.html, frontend/index.html은 생성물입니다. 직접 편집하지 않습니다. JSON은 런타임 fetch 없이 빌드에서 내장합니다.

## 재생성

frontend에서 `node tools/build.mjs`, `node tools/build-wireframes.mjs`, `node tools/build-design-preview.mjs`를 순서대로 실행합니다. 전체 검사는 [QA](../QA.md)를 따릅니다. 새 문서의 수치는 현재 구현과 제안 여부를 함께 확인하세요.
