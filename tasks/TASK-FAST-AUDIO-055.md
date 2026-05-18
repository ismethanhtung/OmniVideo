# [FAST-AUDIO-055] Prevent forced long pauses inside split voice segments

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

- Task ID: FAST-AUDIO-055
- Phase: FAST
- Target Phase: Audio timing polish
- Domain: Audio Transcript / Workspace Audio
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: A translated segment can contain several Vietnamese sentences while the source word timestamps expose fewer speech clusters. Current voice timing still splits in that mismatch case, which can preserve a long internal pause after an early short sentence and force the remaining text into a much shorter late slot.
- Bài toán cần giải quyết: Prevent unnatural long silence + catch-up speech in both Audio Transcript and Workspace voice generation when split evidence is ambiguous.
- Tài liệu liên quan: `docs/governance/testing-rules.md`, `docs/domains/multilingual-audio.md`

## 3. Scope

- In scope:
  - Harden shared word-aware voice segment splitting.
  - Add regression coverage for sentence/cluster mismatch that should stay as one continuous voice chunk.
  - Keep Audio Transcript and Workspace behavior aligned through the shared helper.
- Out of scope:
  - Changing Groq transcription output.
  - Retuning Piper min/max speed floors.
  - Replacing heuristic timing with external forced alignment/VAD.

## 4. Input / Output

- Input: translated segments plus Groq word timestamps.
- Output mong đợi: when translated sentence count and detected source speech-cluster count disagree, the system avoids speculative sub-splitting that would create long dead air and late speed-up.

## 5. Acceptance Criteria

1. A translated segment with more sentence chunks than reliable source timing clusters remains a single voice segment instead of being split speculatively.
2. Existing clearly matched multi-sentence / multi-cluster segments still split into separate voice chunks.
3. The shared fix is used by both Audio Transcript and Workspace voice generation paths.
4. Regression tests cover the mismatch case and existing happy path remains green.
5. Targeted tests, build, and version guard pass.

## 6. Technical Plan

1. Inspect the current split heuristic and constrain it to only split when sentence chunks and timing clusters map one-to-one.
2. Add a regression test reproducing the reported “first sentence, long silence, rushed remainder” shape.
3. Verify both shared callers continue using the same helper, then run targeted audio/workspace tests, build, and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/voice-segment-timing.ts`
  - `src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - release/task tracking files

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `src/lib/multilingual-audio/voice-segment-timing.test.ts`
   - `src/lib/multilingual-audio/video-dubbing.test.ts`
   - `src/features/audio/chinese-transcription-panel.test.ts`
   - `src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure cases cần thử:
   - sentence/cluster mismatch must not split;
   - existing exact multi-cluster split must still split.
3. Kết quả mong đợi:
   - mismatch case returns one continuous segment;
   - shared callers remain covered;
   - all targeted tests pass.

## 9. Observability

- Metrics: existing Piper timeline diagnostics.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks:
  - Some ambiguous merged segments with real pauses may remain unsplit more often than before, trading exact micro-pause preservation for more natural pacing.
- Rollback strategy:
  - Revert the stricter split guard if it causes unacceptable loss of legitimate sub-splitting.

## 11. Deliverables

1. Safer shared split heuristic for word-aware voice timing.
2. Regression tests for the mismatch pacing bug.
3. Updated changelog, board, and release metadata.

## 12. Changelog Note

- Prevent ambiguous translated-segment splits from creating long internal silence followed by rushed late speech.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions:
  - The shared splitter is the right correction point because Audio Transcript and Workspace both consume it.
  - When sentence boundaries and source timing clusters disagree, keeping one chunk is safer than guessing a split.
- Blockers: None.
- Verification evidence:
  - Root cause: the splitter previously used `Math.min(...)` + redistribution even when translated sentence chunks and source timing clusters did not match, which could attach multiple later sentences to one delayed cluster.
  - Shared splitter now only sub-splits when translated sentence chunks and detected word clusters map one-to-one.
  - Added a regression test shaped like the reported segment `#66`: three translated sentences but only two source timing clusters now remain one continuous voice chunk.
  - Existing exact multi-cluster split coverage still passes.
  - No domain docs change was required; this is a localized heuristic hardening inside the existing shared timing model.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/voice-segment-timing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Focused regression suite pass (1 file / 6 tests).
  - Targeted shared-path suite pass (4 files / 33 tests).
  - `npm run build` pass after rerunning outside sandbox because Turbopack needed permission to spawn an internal CSS process; existing ESLint circular-config warning remains outside scope.
  - `git diff --check` pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass after patch bump `0.9.1 -> 0.9.2`.
