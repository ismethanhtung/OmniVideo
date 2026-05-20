# [FAST-INTAKE-007] Map fetch failed upload errors to explicit intake codes

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

- Task ID: FAST-INTAKE-007
- Phase: MVP runtime hardening
- Target Phase: Intake upload diagnostics
- Domain: Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Upload failures currently surface as generic `SYS_INTAKE_UNKNOWN` or `SYS_LOCAL_INTAKE_UNKNOWN` when `fetch()` throws.
- Bài toán cần giải quyết: Distinguish source fetch failure, Drive upload network failure, and Drive resumable PUT failure.
- Tài liệu liên quan: `docs/domains/source-management.md`, `docs/operations/observability.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Catch fetch-thrown network errors in intake storage adapters.
  - Map them to `STG_SOURCE_FETCH_FAILED`, `STG_DRIVE_UPLOAD_NETWORK_FAILED`, and `STG_DRIVE_RESUMABLE_PUT_FAILED`.
  - Add regression tests.
- Out of scope:
  - Automatic retry/backoff.
  - Chunked/resumable retry implementation.

## 4. Input / Output

- Input: Intake upload where source fetch or Drive upload fetch throws.
- Output mong đợi: API/history receives explicit storage error codes and readable messages.

## 5. Acceptance Criteria

1. Source media fetch throw maps to `STG_SOURCE_FETCH_FAILED`.
2. Drive session creation fetch throw maps to `STG_DRIVE_UPLOAD_NETWORK_FAILED`.
3. Drive resumable PUT fetch throw maps to `STG_DRIVE_RESUMABLE_PUT_FAILED`.
4. Existing non-network provider responses keep their current error codes.
5. Focused tests pass.

## 6. Technical Plan

1. Add a fetch failure wrapper helper in storage adapters.
2. Wrap source fetch, Drive session fetch, and Drive PUT fetch call sites.
3. Add storage adapter regression tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/storage-adapters.ts`, tests.

## 8. Test Plan

1. Unit tests for thrown source fetch.
2. Unit tests for thrown Drive session fetch.
3. Unit tests for thrown Drive PUT fetch.

## 9. Observability

- Metrics: Existing intake step metrics.
- Logs: Existing run/step error details.
- Error codes: `STG_SOURCE_FETCH_FAILED`, `STG_DRIVE_UPLOAD_NETWORK_FAILED`, `STG_DRIVE_RESUMABLE_PUT_FAILED`.

## 10. Risks & Rollback

- Risks: Message matching may still depend on runtime fetch error strings.
- Rollback strategy: Revert storage adapter catch wrappers.

## 11. Deliverables

1. Code changes.
2. Regression tests.
3. Changelog and board updates.

## 12. Changelog Note

- Intake upload network failures now map to explicit storage error codes instead of generic unknown errors.

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
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: Fetch-thrown errors should be treated as retryable dependency/provider network failures.
- Blockers: None.
- Verification evidence:
  - Fetch-thrown source media failures map to `STG_SOURCE_FETCH_FAILED`.
  - Fetch-thrown Drive session failures map to `STG_DRIVE_UPLOAD_NETWORK_FAILED`.
  - Fetch-thrown Drive resumable PUT failures map to `STG_DRIVE_RESUMABLE_PUT_FAILED`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/storage-adapters.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/server-artifacts.test.ts src/lib/ui/progress-center.test.ts src/lib/video-intake/storage-adapters.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-dubbing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (5 files / 36 tests).
  - Build pass; existing ESLint circular-config warning remains.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
