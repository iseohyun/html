# KanaLoop Changelog

All notable changes to the KanaLoop project will be documented in this file.

## [v1.0.2] - 2026-08-08
### Changed & Improved
- **Local-First (Browser-First) Architecture & DB Optimization**:
  - **0ms Instant Startup & Caching**: Restores state from `localStorage` immediately, saving up to 100% of unnecessary Firestore read queries.
  - **Lazy Batch Sync**: Eliminates real-time DB writes per question; batches updates into a single `writeBatch` request upon session completion (90%+ DB write cost reduction).
  - **Smart Bidirectional Timestamp Merging**: Performs item-level timestamp comparison to seamlessly merge server & local progress without data loss.
  - **Self-Healing Fallback**: Gracefully handles network/security rule errors via local fallback.
- **Modal UI & UX Refinement**:
  - **Non-Overlapping Modal Header (`.modal-header`)**: Re-architected modal dialogs with flexbox layout for title & close button (`&times;`), eliminating overlapping issues with content elements.
  - **Hidden Scrollbar Styling**: Visually hides scrollbar track (`::-webkit-scrollbar { display: none; }`, `scrollbar-width: none`) while retaining smooth scrolling capabilities.

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
