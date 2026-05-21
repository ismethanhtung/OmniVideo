# [FAST-VIDEO-012] Match Video Tools Lab asset preview behavior with Audio Transcript picker

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

- Task ID: FAST-VIDEO-012
- Phase: FAST
- Domain: Video Tools Lab / Asset picker UX
- Task Type: Bugfix
- Status: Review

## 2. Context

- User clarified Video Tools Lab preview must match Audio Transcript asset picker behavior.
- Previous change used inline thumbnail-like preview, which did not match expected UX.

## 3. Scope

- Replace per-row thumbnail preview with `Preview/Hide` toggle button.
- Expand/collapse full inline video player (`controls`) per selected row, same pattern as Audio Transcript.
- Keep wrapped lifecycle tags and `Saved setup` badge.

## 4. Acceptance Criteria

1. Video Tools Lab picker rows show `Preview/Hide` action.
2. Clicking Preview expands a playable inline video player for that row.
3. Existing Video Tools Lab tests pass.
4. `npm run guard:version` passes.

## 5. Test Evidence

- `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (1 file / 4 tests).
- `npm run guard:version` pass after bump `0.10.16 -> 0.10.17`.
