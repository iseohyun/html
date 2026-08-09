# Changelog

All notable changes to the KakaoTalk Generator project will be documented in this file.

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
