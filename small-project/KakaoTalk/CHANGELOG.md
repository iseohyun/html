# Changelog

All notable changes to the KakaoTalk Generator project will be documented in this file.

## [1.5.0] - 2026-08-11
### Added & Fixed
- Added global `window.logColorChange` fail-safe logging system with explicit source tags (`[출처: ...]`).
- Fixed 2D modal picker and native color pickers to log on selection confirmation rather than mousemove dragging.
- Added `try-catch-finally` error protection around log handlers and UI callbacks to ensure fail-safe execution.
- Restored `applySettingsToUI` export on `window.ChatInterface` namespace, fixing color and layout state restoration during Undo/Redo.
- Added automatic Redo stack truncation and branching when performing a new action after Undo.
- Unified all layout and general setting changes into standard `"변경내용","변경전 값","변경후 값"` history format.

## [1.4.2] - 2026-08-09
### Added
- Implemented real KakaoTalk S-curve cubic bezier speech bubble tail algorithm in `engine.js`.
- Added automated curve matching test suite (`tests/kakaotalk-bubble.spec.js`) verifying 96.8% IoU shape matching against real screenshot fixtures (`tests/fixtures/*.jpg`).

## [1.4.1] - 2026-08-09
### Fixed
- Fixed theme select dropdown (`#select-theme`) not applying theme preset colors (light/dark/custom) to the main chat canvas immediately.

## [1.4.0] - 2026-08-09
### Fixed
- Fixed `#btn-close-theme-modal` (✕ close button) not closing the theme detail modal.
- Created dedicated mini preview renderer (`drawThemePreviewCanvas`) to eliminate giant text overlap and present realistic mobile KakaoTalk chat preview.

## [1.3.9] - 2026-08-09
### Fixed
- Fixed theme detail modal missing on SPA hash route (`/#/small-project/KakaoTalk/index.html`) by moving modal inside `#kakaotalk-article` and applying event delegation & body teleportation.

## [1.3.8] - 2026-08-09
### Fixed
- Fixed wifi and cell status 0% setting rendered as 100% full icons on canvas drawing due to JS falsy OR fallback bug.

## [1.3.7] - 2026-08-09
### Fixed
- Fixed theme detail modal (`#theme-detail-modal`) not opening on `[상세보기 ⚙️]` button click by adding `setupThemeModalEvents()`.
- Fine-tuned light theme presets based on real KakaoTalk screenshot (`time-color: #64748b`, `you-name-color: #374151`, auto `그룹채팅 5` room name count).

## [1.3.6] - 2026-08-09
### Changed
- Removed redundant `#svg-box` wrapper div under `#kakaotalk-article`.
- Applied `border-radius: 20px`, `box-shadow`, and `overflow: hidden` directly to `#chat-canvas` for clean rounded canvas rendering.

## [1.3.5] - 2026-08-09
### Fixed
- Automatically adjusted dialog range (`startRangeIndex ~ endRangeIndex`) to match loaded dialog total count (`1 ~ totalCount`, e.g. `1 ~ 3192`) on file load.

## [1.3.4] - 2026-08-09
### Fixed
- Added null safety guards `if (el)` in `applySettingsToUI()` to fix `TypeError: Cannot set properties of null`.
- Converted `loadDefaultData()` to pure in-memory defaults (height 2340px) to eliminate browser console 404 network errors.

## [1.3.3] - 2026-08-09
### Fixed
- Removed `accept` attribute from file loaders to ensure Windows File Explorer opens with **"All Files (*.*)"** by default.
- Enhanced `[대화내용 불러오기]` button click listener with `fileLoader.value=''` reset to ensure 100% reliable file dialog triggering.

## [1.3.2] - 2026-08-09
### Fixed
- Fixed progress slider (`#input-progress`) staying at `-1`/`0` on file load, which prevented battery/Wi-Fi/chat room name and canvas messages from rendering.
- Enforced auto-setting progress value to `totalCount` (3,192) upon loading chat files for instant full canvas rendering.

## [1.3.1] - 2026-08-09
### Fixed
- Changed file loader `accept` attribute to `*` to allow loading extensionless exported chat files.
- Fixed date header regex with timestamps (`2022년 7월 8일 오후 1:24`) and multi-line message line breaks to parse 3,192+ messages accurately.

## [1.3.0] - 2026-08-09
### Added
- Unified theme selection dropdown (Light Theme with `#acc0d1` background, Dark Theme, and Custom Theme).
- Dedicated Theme Color Detail Modal with real-time live preview mini-canvas for tuning background, bubbles, text, nickname, time, and date colors.

## [1.2.2] - 2026-08-09
### Changed
- Synchronized speech bubble and dark mode design with real KakaoTalk screenshot.
- Updated default dark mode background (`#000000`), user bubble (`#fee500`), recipient bubble (`#2a2a2a`), and time badge colors.

## [1.2.0] - 2026-08-08
### Added
- Image export options (PNG, MP4 video, and tall stitched image).

## [1.0.0] - 2026-08-01
### Added
- Initial release.
