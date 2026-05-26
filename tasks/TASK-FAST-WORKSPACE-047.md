# [FAST-WORKSPACE-047] Add Detailed Terminal Logs for VIP Pipeline

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

- Task ID: FAST-WORKSPACE-047
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP observability
- Domain: Workspace / VIP Processing / Transcript Translation
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner reports Workspace VIP failure details are still not enough to identify whether failure happens during translation or after translation.
- Bài toán cần giải quyết: Terminal logs need precise stage boundaries and progress markers for long VIP runs.
- Tài liệu liên quan: `docs/operations/observability.md`, `docs/domains/video-pipeline.md`.

## 3. Scope

- In scope:
  - Add structured terminal logs for VIP stage start/success/fail.
  - Add structured translation chunk logs with chunk index, segment range/count, request size, provider host/model, status, request id, duration, and error detail.
  - Log checkpoint read/reuse/save status and final VIP summary.
  - Avoid logging API keys and full transcript/request bodies.
- Out of scope:
  - Changing provider behavior, chunking, retries, or rendering logic.
  - UI log streaming.

## 4. Input / Output

- Input: Workspace VIP processing run.
- Output mong đợi: Server terminal clearly shows which stage started, completed, or failed and the exact translation chunk/provider state around failures.

## 5. Acceptance Criteria

1. VIP terminal logs include run id, source summary, config summary, checkpoint status, and every stage transition.
2. Translation logs include overall chunk plan and per-chunk request/response/failure progress without secrets.
3. Failures include stage/chunk context, error code/message/status, and stack preview.
4. Existing tests pass with added log regression coverage.
5. Changelog, board, and version guard are updated.

## 6. Technical Plan

1. Add reusable structured console log helpers to VIP processing and transcript translation modules.
2. Wrap VIP stages with start/success/fail logging.
3. Add translation plan and chunk-level logging around provider requests and adaptive fallback paths.
4. Add focused tests asserting useful log markers.
5. Run focused tests, build, and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - related tests

## 8. Test Plan

1. Unit: VIP processing and transcript translation tests.
2. Failure cases cần thử: provider network failure logs chunk context.
3. Kết quả mong đợi: focused tests pass.

## 9. Observability

- Metrics: duration, count, byte-size fields in structured logs.
- Logs: `[VIP]` and `[TranscriptTranslation]` structured terminal events.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: More verbose terminal output for long runs.
- Rollback strategy: Remove logging helpers and calls.

## 11. Deliverables

1. Detailed VIP terminal logging.
2. Detailed translation chunk terminal logging.
3. Regression tests and changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add structured terminal logs for VIP stage progress and transcript translation chunks.

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

- Assumptions:
  - Terminal/server logs are the requested observability surface.
- Blockers:
  - None.
- Verification evidence:
  - Focused tests and build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 21 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
