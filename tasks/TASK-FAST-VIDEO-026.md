# [FAST-VIDEO-026] Add 3-Minute Head Clip Option in Video Splitter

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-026
- Phase: FAST
- Target Phase: Video Tools UX refinement
- Domain: Video Processing / Splitter UI
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner requested adding a `3 min` option for `Split Video -> Chỉ cắt đoạn đầu`.
- Existing UI only provides `15 minutes` and `30 minutes`.

## 3. Scope
- In scope:
  - Add `3 minutes` option to head clip duration select in Video Splitter panel.
  - Update panel test assertions accordingly.
- Out of scope:
  - Split API/runtime logic change (already accepts any positive headMinutes).

## 4. Acceptance Criteria
1. Head clip duration select includes `3 minutes`.
2. Existing `15 minutes` and `30 minutes` options remain available.
3. Related panel test passes.

## 5. Technical Plan
1. Update `mode === "head"` select options in `video-splitter-panel.tsx`.
2. Update `video-splitter-panel.test.ts` source assertions.
3. Run focused test and version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Added `3 minutes` option for `Chỉ cắt đoạn đầu` mode in Video Splitter.

## 8. Execution Notes
- Assumptions:
  - UI wording keeps existing English minute labels (`minutes`) for consistency with current panel copy.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/video-processing/video-splitter-panel.tsx`
  - `src/features/video-processing/video-splitter-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (1 file / 3 tests).
  - Version guard pass.
