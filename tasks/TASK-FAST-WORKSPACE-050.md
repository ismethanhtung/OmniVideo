# [FAST-WORKSPACE-050] Fix VIP transcript network error mapping and stage log clarity

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-050
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP observability correctness
- Domain: Workspace / Multilingual Audio
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- VIP import mode failed with `fetch failed` after long runtime.
- Workspace showed `SYS_DUBBING_MUX_FAILED` + failed stage transcript, but without actionable transcript step details.
- Owner needs reliable stage/error mapping before further diagnosis.

## 3. Scope

- In scope:
  - Fix Groq transcription network-error mapping so errors become `PRV_GROQ_TRANSCRIPTION_FAILED` (not generic mux error).
  - Preserve transcript step evidence (`steps`) for Workspace error detail rendering.
  - Add/adjust regression tests for mapping behavior.
- Out of scope:
  - Re-architecture of live streamed VIP sub-stage logs.
  - Non-transcript provider stability changes.

## 4. Input / Output

- Input: VIP pipeline transcript stage network fetch error.
- Output: Structured provider error code + step details shown in Workspace detail pane.

## 5. Acceptance Criteria

1. Transcript provider network failures are mapped to `PRV_GROQ_TRANSCRIPTION_FAILED`.
2. `/api/audio/video-vip-processing` failure payload includes transcript `steps` for this failure class.
3. Workspace error detail can show VIP stage + transcript step lines (not generic-only message).
4. Regression tests cover new mapping path.
5. `npm run guard:version` passes.

## 6. Technical Plan

1. Wrap Groq fetch call in `transcribeWithGroq` and map thrown network errors to `ChineseTranscriptionError`.
2. Keep `runChineseVideoTranscription` step collector unchanged so mapped errors flow with steps.
3. Add tests for network fetch failure mapping.
4. Run focused tests and guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/groq-transcription.ts`
  - related tests/routes if needed

## 8. Test Plan

1. Unit tests:
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts` (if payload shape impacted)
2. Failure case:
  - Provider `fetch failed` during transcript request.

## 9. Observability

- Improve error code and step-level signal for transcript failures in VIP flow.

## 10. Risks & Rollback

- Risk: Over-broad catch could mask non-network errors.
- Rollback: Revert catch wrapper and previous behavior.

## 11. Deliverables

1. Network error mapping fix.
2. Regression tests.
3. Changelog/task updates.

## 12. Changelog Note

- Fix VIP transcript network failure mapping to preserve provider code and step details.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Root cause (confirmed): Groq transcript `fetch` network exceptions were not wrapped as `ChineseTranscriptionError`, so VIP wrapper downgraded them to generic `SYS_DUBBING_MUX_FAILED` and lost step diagnostics.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/groq-transcription.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 18 tests).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
