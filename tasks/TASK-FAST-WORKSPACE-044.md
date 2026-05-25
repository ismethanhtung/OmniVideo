# [FAST-WORKSPACE-044] Surface VIP Partial Checkpoints on Failed Continue

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

- Task ID: FAST-WORKSPACE-044
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP resume reliability
- Domain: Workspace / VIP Processing
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

Owner hit a Workspace VIP failure after expensive transcript/translation stages completed. `Continue Failed Flow` still appears to rerun `VIP full processing` from the beginning because VIP is represented as one Workspace step and failed API responses do not expose which internal stage checkpoints are reusable.

## 3. Scope

- In scope:
  - Attach VIP checkpoint telemetry to failed VIP API responses.
  - Show reusable checkpoint stages in Workspace failure detail.
  - Clarify Continue mode copy so retrying a VIP node announces server checkpoint reuse.
  - Add regression tests for failed-stage checkpoint reporting.
  - Update task board, changelog, docs, and version.
- Out of scope:
  - Full background job queue and live streaming sub-stage telemetry.
  - Durable Mongo-backed binary checkpoint storage.
  - Reworking VIP into separate graph nodes.

## 4. Acceptance Criteria

1. If VIP fails after transcript/translation/voice checkpoints are saved, the API error payload includes reusable checkpoint stages.
2. Workspace failure detail shows which VIP stages will be reused on `Continue Failed Flow`.
3. On resume mode, Workspace explicitly logs that server-side VIP checkpoints will be reused when available.
4. Existing successful VIP checkpoint reuse remains unchanged.
5. Focused tests, build, and `npm run guard:version` pass or unrelated failures are documented.

## 5. Technical Plan

1. Add VIP checkpoint failure metadata in `runVideoVipProcessing`.
2. Include checkpoint metadata in `/api/audio/video-vip-processing` error JSON.
3. Parse/render checkpoint metadata in Workspace API failure details.
4. Add focused unit/source tests.
5. Update docs/changelog/version/task state.

## 6. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note

- Surface reusable VIP internal checkpoints on failed Workspace VIP runs so Continue Failed Flow clearly resumes after completed stages.

## 8. Execution Notes

- Implementation summary:
  - Added `VipCheckpointError` metadata for failed VIP internal stages.
  - Failed VIP API responses now include checkpoint `failedStage`, `savedStages`, `reusedStages`, and `reusableStages`.
  - Workspace failure detail now shows reusable VIP stages and states that Continue skips them on the same server/source/config.
  - Resume-mode VIP runs now log that server-side checkpoints will be reused when available.
  - Updated docs/changelog/version to `0.10.48`.
- Blockers:
  - None.

## 9. Test Evidence

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 34 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - Version guard passes.
