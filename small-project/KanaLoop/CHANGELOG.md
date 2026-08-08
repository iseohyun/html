# KanaLoop Changelog

All notable changes to the KanaLoop project will be documented in this file.

## [v1.0.1] - 2026-08-08
### Changed
- **Modern Design System Overhaul**:
  - Implemented glassmorphism header backdrop with smooth hover transitions.
  - Replaced legacy monochrome buttons with interactive 3D gradient cards (Study, Record, Spectator modes).
  - Integrated Google Fonts (`Outfit`, `Noto Sans KR`, `Noto Sans JP`) for refined Korean & Japanese typography.
  - Added KanaLoop Quick Info Card and enhanced modal dialog styling (rounded corners, backdrop blur, fade animations).
- **Architecture & Template Sync**:
  - Updated `MAIN_SELECTION_HTML` template in `main.js` to synchronize dynamic JavaScript rendering with the new 3D card layout.
  - Added fallback CSS gradient declarations for `.mode-btn` component.
