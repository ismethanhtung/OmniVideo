# [FAST-AUDIO-077] Restore Strict Voice Timestamp Starts and 1.15x Floor

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-077
- Phase: FAST
- Target Phase: Workspace VIP Voice
- Domain: Multilingual Audio / Piper Timeline
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports voice segment timing became too flexible after the timing optimization work.
- Current strict timeline code can borrow lead time and schedule a segment before `segment.start`.
- Current timeline speed logic can use `1.00x` for strict chunks that fit their slot, while owner wants a lower but still enforced minimum floor of `1.15x`.
- VIP should start generated voice exactly at each transcript segment start unless a caller explicitly selects a non-strict mode.

## 3. Scope

- In scope:
  - Remove strict timeline lead borrowing that starts voice before the transcript timestamp.
  - Set strict timeline minimum speed floor to `1.15x`.
  - Keep balanced alignment as an explicit non-strict mode.
  - Default VIP voice alignment to `strict` when `ttsAlignmentMode` is not provided.
  - Update regression tests for strict start timestamps and `1.15x` floor.
- Out of scope:
  - Transcript segmentation thresholds.
  - Translation prompt behavior.
  - Final render chunking or EC2 deployment scripts.

## 4. Acceptance Criteria

1. Strict Piper timeline always sets `scheduledStartSeconds` equal to `segment.start`.
2. Strict Piper timeline reports no negative start drift from lead borrowing.
3. Strict Piper timeline clamps valid speed factors to a minimum of `1.15x`.
4. Balanced alignment can still use natural `1.00x` behavior when explicitly selected.
5. VIP processing defaults to strict voice alignment when no `ttsAlignmentMode` is supplied.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Remove strict timeline lead-borrow constants and scheduling math.
2. Add a strict-floor path to timeline speed calculation and set `timelineMinSpeedFactor` to `1.15`.
3. Update VIP voice settings fallback to prefer strict alignment.
4. Update Piper and VIP tests.
5. Bump patch version, update changelog/task/board, and verify.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - release metadata

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- VIP voice diagnostics should show strict timeline `scheduledStartSeconds` matching source segment starts and speed factors floored at `1.15x` where applicable.

## 9. Risks & Rollback

- Risks: `1.15x` can leave slightly more padded silence than `1.00x`, but keeps a consistent non-natural strict voice baseline.
- Rollback strategy: revert this task's Piper/VIP fallback changes, tests, changelog, and version bump.

## 10. Deliverables

1. Strict timestamp voice starts.
2. `1.15x` strict timeline speed floor.
3. VIP strict fallback alignment.
4. Regression tests and verification evidence.

## 11. Changelog Note

- Tom tat dong changelog du kien: Restore strict voice segment starts and lower the strict timeline speed floor to 1.15x.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.2 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Root cause:
  - Strict Piper timeline still had lead borrowing from the timing optimization, allowing `scheduledStartSeconds = segment.start - borrowedLeadSeconds`.
  - Strict timeline speed calculation returned `1.00x` for chunks that fit the target duration, while VIP needs a consistent minimum strict baseline.
  - VIP processing fell back to global Piper default `balanced` alignment when no `ttsAlignmentMode` was provided.
- Implementation:
  - Removed strict timeline lead-borrow constants and scheduling logic.
  - Strict timeline now schedules each chunk at exactly `item.segment.start` and reports `driftSeconds: 0`.
  - Changed strict timeline minimum speed floor to `1.15x`.
  - Added a strict-floor speed path for timeline mode while preserving balanced mode natural `1.00x`.
  - Defaulted VIP voice generation to strict alignment when no alignment mode is provided.
- Test evidence:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts` pass (4 files / 92 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
- Residual risk:
  - Real media should still be regenerated and checked after EC2 worker restart, because already-running workers keep old code in memory.
