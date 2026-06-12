# [FAST-VIDEO-039] Add missing Piper Voice settings to Video Narrator

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

- Task ID: FAST-VIDEO-039
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Feature Enhancement
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Currently, the Video Narrator page's Piper Voice panel only displays 4 settings (executable path, model ONNX path, speaker ID, length scale).
- The Audio Transcript page (Chinese transcription panel) exposes 5 additional settings for fine-tuning Piper (Config JSON, Noise Scale, Noise W, Sentence Silence, and Balanced Timing toggle).
- The user requested that the Video Narrator page be updated to feature these additional configuration inputs to match the level of control available in the Audio Transcript page.
- Also, these settings need session persistence (saving/loading via localStorage) so that users don't have to reconfigure them each time the page is loaded.

## 3. Scope

- In scope:
  - Add UI input fields to the "Piper Voice" configuration section in the Video Narrator UI:
    - Config JSON path (input text)
    - Noise scale (input number, step 0.01)
    - Noise W (input number, step 0.01)
    - Sentence silence (input number, step 0.05)
    - Balanced timing (checkbox)
  - Ensure the fields are structured cleanly using grids to match the style of the Chinese Transcription Panel.
  - Implement load/save persistence in the Video Narrator's localStorage session hooks.
  - Verify that the values are correctly forwarded to the API.
- Out of scope:
  - Altering backend rendering, Piper execution logic, or video synthesis engine.

## 4. Acceptance Criteria

1. The Video Narrator's "Piper Voice" settings group displays all 9 settings:
   - Piper executable (input text)
   - Model ONNX path (input text)
   - Config JSON path (input text)
   - Speaker ID (input number)
   - Speed (Length scale) (input number)
   - Noise scale (input number)
   - Noise W (input number)
   - Sentence silence (input number)
   - Balanced timing (checkbox)
2. All inputs match the CSS styling and look cohesive, consistent with other form-fields.
3. On page load, the 9 Piper Voice settings are hydrated from the browser's `localStorage` session state.
4. Any change to any of the 9 settings triggers a `localStorage` state serialization save event.
5. All automated unit and regression tests pass successfully.

## 5. Technical Plan

1. **Locate & edit `video-narrator-panel.tsx`**:
   - In the session hydration `useEffect` hook, load `ttsConfigPath`, `ttsNoiseScale`, `ttsNoiseW`, `ttsSentenceSilence`, and `ttsPreserveTimestampGaps` from local storage.
   - In the session serialization `useEffect` hook, save these 5 additional variables.
   - Update the JSX inside `showTtsSettings` to render:
     - Config JSON next to or below ONNX path using the clean grid system.
     - Noise scale, Noise W, and Sentence silence in a grid next to Speaker and Speed.
     - Balanced timing checkbox at the bottom of the Piper Voice settings.
2. **Verify changes**:
   - Run `npm run test` to make sure all existing tests remain green.
   - Run `npm run guard:version` after incrementing the version in `package.json` to satisfy version constraint checks.
   - Run `npm run build` to ensure Next.js Turbopack build finishes cleanly.

## 6. Code Change Impact

- Code changes: Yes
- Modules impacted:
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. Execute the entire test suite `npm run test` to verify no regressions.
2. Run version guard `npm run guard:version`.
3. Build the project `npm run build` to confirm compilation.

## 8. Observability

- Built-in console and local storage state inspections.

## 9. Risks & Rollback

- Risk: Existing local storage data might lack these settings and load undefined/null.
- Mitigation: Use fallback defaults (e.g. `ttsNoiseScale` defaults to `0.667`, `ttsNoiseW` defaults to `0.8`, `ttsSentenceSilence` defaults to `0.2`, `ttsPreserveTimestampGaps` defaults to `true`).

## 10. Deliverables

1. Expose all 9 Piper settings in Video Narrator UI.
2. Session persistence for all Piper settings.
3. Updated changelog and task board.
4. Passing test suites, version guard, and production build checks.

## 11. Changelog Note

- Add missing Piper Voice settings to Video Narrator UI and persist them in localStorage session state.

## 12. Execution Notes

- None.

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - Existing suite was run as no new business logic was introduced, only frontend JSX alignment and local storage persistence.
- Test commands executed:
  - `npm run test` (Pass: 120 files / 651 tests)
  - `npm run guard:version` (Pass)
  - `npm run build` (Pass)
