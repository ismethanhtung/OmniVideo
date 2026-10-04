# [FAST-VIDEO-068] Switch Video Color Grading Compare Mode to Direct Click Toggle Between Graded and Original

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-068
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Video Color Grading & Post-Processing
- Task Type: Enhancement / UX Polish
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

In Video Color Grading & Lighting Studio, the before/after comparison previously used `onMouseDown`/`onMouseUp` hold-to-compare behavior alongside `onClick`, causing mouse release events to fail to restore the graded view or getting stuck in raw view. The operator requested replacing the hold/release interaction with a direct toggle button ("chuyển qua chuyển lại") without hold/release gestures.

## 3. Scope

- In scope:
  - In `src/features/audio/piper-tts-sandbox-panel.tsx`:
    - Remove `onMouseDown`, `onMouseUp`, `onTouchStart`, `onTouchEnd` from the compare control.
    - Implement a clean segmented switch and toggle behavior allowing direct one-click switching between "✨ Đã chỉnh màu" and "👁️ Video gốc".
  - Update unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
  - Bump package version to `0.11.81` and update changelog.
- Out of scope:
  - Backend API changes.

## 4. Input / Output

- Input: Operator clicks between "Đã chỉnh màu" and "Video gốc".
- Output: Instant, deterministic 60fps switch between graded CSS filter view and raw original video view without gesture dependency.

## 5. Acceptance Criteria

1. Hold-to-compare mouse down/up listeners are completely removed.
2. Clicking switches deterministically between graded color view and original video view.
3. UI clearly displays the active view state ("Đã chỉnh màu" vs "Video gốc").
4. Automated unit tests pass and version guard succeeds.

## 6. Technical Plan

1. Edit `src/features/audio/piper-tts-sandbox-panel.tsx` around line 4133 to replace the hold button with the segmented switch control.
2. Update `src/features/audio/piper-tts-sandbox-panel.test.ts` to assert the click toggle behavior.
3. Bump version to `0.11.81` in `package.json` and `package-lock.json`.
4. Update `changelog/changelog.md` and `tasks/board.md`.
5. Run vitest and `npm run guard:version`.

## 7. Deliverables

- Clean click toggle control for Video Color Grading comparison.
- Updated automated unit tests and changelog entry.
