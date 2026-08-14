# Changelog

All notable changes to this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

## [20260814v1] - 2026-08-14

### Changed
- **Webpointer v0.8.3**:
  - 도형 내 텍스트 통합 연동 (F2 편집 모드 지원, 도형 회전 시 텍스트 위치 및 중심축 동기화, 텍스트 패딩 연동)
  - 베지어(Bezier) 3차 커브 S 명령어 지원 및 아크(Arc)/베지어 경로 정밀 근접 선택(Parametric Curve Sampling) 알고리즘 적용
  - 리본 메뉴 '수치' 카테고리(너비, 높이, 회전 각도) 추가 및 회전/그룹화 툴바 오류 수정
  - 텍스트 수직 정렬 엔진 구현 및 텍스트 자동맞춤(Autofit) 버그 수정

## [20260716v5] - 2026-07-16

### Fixed
- **Git Index Cleanup**: Cleared tracked cache for ignored agent skills (`.agents/`), local tool configs (`.vscode/`), and Firebase functions dependencies (`functions/`).

## [20260716v4] - 2026-07-16

### Fixed
- **KakaoTalk Simulator v1.0.6**: Fixed canvas oversize alignment and scaling issue by replacing `ResizeObserver` physical scaling with CSS `max-width/max-height` and `object-fit: contain`.
- **KakaoTalk Simulator v1.0.6**: Restored 1:1 synchronization between physical pixels and UI configuration resolutions.
- **KakaoTalk Simulator v1.0.6**: Reset `lastSpeaker` tracker upon date divider rendering for consistent speech bubble margin spacing.

## [20260716v3] - 2026-07-16

### Fixed
- **KakaoTalk Simulator v1.0.6**: Added `lastInitializedCanvas` DOM instance guard to prevent duplicate event listener bindings and double step jumps.
- **KakaoTalk Simulator v1.0.6**: Implemented `requestAnimationFrame` frame batching renderer to eliminate flicker on input/change events.

## [20260716v2] - 2026-07-16

### Changed
- **KakaoTalk Simulator v1.0.6**: Migrated module loader to sequential Promise loader chain and separated init API for SPA re-entry.
- **KakaoTalk Simulator v1.0.6**: Converted continuous frame loop to low-power Sleep/Wake loop to prevent CPU overuse.
- **KakaoTalk Simulator v1.0.6**: Fixed top bar clipping bug on canvas height limit and restored Y-axis coordinates.

## [20260715v3] - 2026-07-15

### Added
- **Admin Page (`admin.html`)**: Implemented `formatLinks` feature to detect `@category>topic>page` syntax and auto-convert to hyperlinked tabs.

## [20260715v2] - 2026-07-15

### Removed
- **Sidebar Menu**: Removed `nav-toggle`, `nav-recent`, and `nav-update` items and associated tab panels (`tab-recent`, `tab-update`).
- **History Sync**: Deleted local/server visit history methods from `navigation.js` and `auth-handler.js`.

### Fixed
- **Taxonomy Page (`/basicStudy/science/middle/first/taxonomy.html`)**: Wrapped `<tspan>` nodes with proper `<span>` tags to prevent `Cannot read properties of null` DOM parsing error.
