# [FAST-VIDEO-057] Add VIP Segment Transcript Retry and Vietnamese Name Guard

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

- Task ID: FAST-VIDEO-057
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: Workspace / Video Pipeline / Multilingual Audio
- Task Type: Feature + Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reviews completed VIP runs in Background Progress `Segments (...)`.
- Even when automatic overlong transcript splitting keeps Chinese text under the hard limit, some completed segments are still too coarse because speech that should be separated is merged into one long timestamp span.
- Owner wants to select multiple bad segments in `Segments` and rerun with transcript retry/splitting, then translate again for the new segment structure.
- Owner also reports severe Vietnamese translation failures where Chinese names are rendered as Pinyin/latinized text such as `Zhūzhū` or `Xǔ Shí`, which is bad for Vietnamese voice output.

## 3. Scope

- In scope:
  - Extend Background Progress `Segments` edit mode with multi-select transcript retry controls.
  - Build a Workspace VIP rerun path that applies a transcript override from selected retry segments and asks VIP processing to retranslate from that corrected transcript.
  - Add a transcript retry helper that splits selected segments by source punctuation/text while preserving timeline order and reindexing segment IDs.
  - Harden Vietnamese translation prompt and TTS normalization against Pinyin/latinized Chinese-name output.
  - Add focused regression tests for UI wiring, event validation, transcript retry splitting, Workspace rerun wiring, and Vietnamese name guard.
- Out of scope:
  - Calling the speech-to-text provider on clipped segment audio from the browser.
  - Persisting selected retry drafts across browser reload.
  - Segment-level voice patching without a full VIP voice/render rerun.

## 4. Acceptance Criteria

1. In Background Progress `Segments` edit mode, user can mark multiple segments for transcript retry.
2. Running transcript retry dispatches selected segment IDs for the matching VIP node.
3. Workspace receives the retry request, builds a transcript override that splits selected source segments, and reruns VIP with AI translation enabled instead of imported translation text.
4. Corrected transcript retry changes VIP checkpoint fingerprint through `transcriptOverrideJson`, so stale voice/render/metadata are not reused.
5. Translation prompt/normalization prevents obvious Pinyin/latinized Chinese-name output from reaching Vietnamese TTS text.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend the VIP translation correction event payload with optional `transcriptRetrySegmentIds`.
2. Add a transcript retry/splitting helper for selected transcript segment IDs.
3. Update Topbar `ProgressSegmentsPanel` to provide retry selection and `Retry transcript + translate`.
4. Update Workspace event handling and run options to support transcript-only override reruns with AI translation.
5. Harden translation prompt/TTS normalization for Pinyin names and add regression coverage.
6. Bump patch version, update changelog/board evidence, and verify.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/components/layout/topbar.tsx`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/vip-translation-correction-events.ts`
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - new transcript retry helper/tests
  - focused tests

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/lib/multilingual-audio/transcript-segment-retry.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress should show selected retry count while editing.
- Workspace progress should state that transcript retry mode is using a corrected transcript and retranslation.

## 9. Risks & Rollback

- Risks: This task performs deterministic transcript splitting from the completed transcript; it does not run fresh clipped STT against the audio provider.
- Rollback strategy: revert this task's UI retry controls, event payload extension, transcript retry helper, Workspace rerun wiring, translation prompt guard, tests, changelog, and version bump.

## 10. Deliverables

1. Multi-select transcript retry controls inside Background Progress segments.
2. Workspace corrected transcript + retranslation rerun path.
3. Pinyin-name guard for Vietnamese TTS output.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Add Background Progress segment transcript retry reruns and guard Vietnamese translation against Pinyin names.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 12.2 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Added `transcriptRetrySegmentIds` to the Background Progress VIP correction event payload.
  - Added `src/lib/multilingual-audio/transcript-segment-retry.ts` to split selected merged source transcript segments by punctuation/word timing and reindex the transcript override.
  - Updated `ProgressSegmentsPanel` edit mode with `Retry transcript` checkboxes and a `Retry transcript + translate` action.
  - Updated Workspace VIP event handling to use transcript retry overrides and rerun VIP with AI translation enabled.
  - Updated Workspace VIP progress text to show transcript retry mode and clarify that STT is skipped while AI translation runs again.
  - Hardened translation prompt instructions and Vietnamese TTS normalization against Pinyin/latinized Chinese-name output.
  - Bumped app version from `0.11.44` to `0.11.45`.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/vip-translation-correction-events.test.ts`
  - `src/lib/multilingual-audio/transcript-segment-retry.test.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-segment-retry.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/lib/multilingual-audio/transcript-segment-retry.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused UI/event/retry/translation tests pass (5 files / 54 tests).
  - Focused UI/event/retry/translation plus VIP API/runtime regression tests pass (7 files / 104 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - Transcript retry is deterministic splitting of completed transcript text/timing, not a fresh clipped STT provider call.
  - Corrected rerun still regenerates voice/render/metadata; segment-level voice patching remains out of scope.
