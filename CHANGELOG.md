# Changelog

All notable changes to this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

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
