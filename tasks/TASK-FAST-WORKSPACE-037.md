# [FAST-WORKSPACE-037] Fix VIP Processing Provider Lookup and Error Mapping

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

- Task ID: FAST-WORKSPACE-037
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP reliability
- Domain: Workspace / VIP Processing
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports Workspace VIP flow failed after 8:42 with `VIP processing failed at /api/audio/video-vip-processing: fetch failed`.
- Bài toán cần giải quyết: The VIP route currently has a known provider lookup type error and weak network error mapping around storage asset downloads. The monolithic long-running request can still be interrupted, but route-level errors should be deterministic and build should pass.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Fix `metadataProviderId` lookup to call `getAiProviderById` with `providerId`.
  - Add regression coverage for metadata provider lookup.
  - Map storage asset download fetch failures to a structured VIP API error.
  - Update verification evidence and changelog.
- Out of scope:
  - Rebuilding VIP processing as a background job with polling.
  - Optimizing full VIP processing runtime.

## 4. Input / Output

- Input: Workspace flow `Storage Asset -> VIP Processing -> Save to Storage`.
- Output mong đợi: VIP route compiles and returns structured API errors for provider/storage failures.

## 5. Acceptance Criteria

1. `npm run build` no longer fails on `metadataProviderId` in `video-vip-processing/route.ts`.
2. Metadata provider lookup calls `getAiProviderById({ db, providerId: metadataProviderId })`.
3. Storage asset download fetch failures return a structured `STG_ASSET_DOWNLOAD_FAILED` JSON error instead of leaking raw fetch errors.
4. Focused route tests and version guard pass.

## 6. Technical Plan

1. Patch the metadata provider lookup argument.
2. Add a helper around storage asset body materialization to map stream/fetch failures.
3. Update route tests for metadata provider and download failure paths.
4. Update changelog, board, version, and task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/api/audio/video-vip-processing/route.ts`, route tests.

## 8. Test Plan

1. Route regression for metadata provider lookup argument.
2. Route regression for storage asset download body failure.
3. Run focused route tests.
4. Run build and version guard.

## 9. Observability

- Metrics: Existing Workspace flow status.
- Logs: Existing route JSON error payload.
- Error codes: Add/ensure `STG_ASSET_DOWNLOAD_FAILED` for storage body materialization failures.

## 10. Risks & Rollback

- Risks: Long-running VIP requests can still be interrupted until moved to background execution.
- Rollback strategy: Revert route/test changes.

## 11. Deliverables

1. VIP route provider lookup fix.
2. Storage download error mapping.
3. Regression tests and changelog evidence.

## 12. Changelog Note

- Fix VIP processing metadata provider lookup and map storage asset download failures to structured API errors.

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

## 14. Execution Notes

- Assumptions: This task fixes deterministic route/provider/download errors; full long-running request reliability remains a separate background-job concern.
- Blockers: None.
- Root cause: The VIP route had a bad metadata provider lookup argument (`metadataProviderId` instead of `providerId`) and storage asset download fetch failures could surface as raw `fetch failed`.
- Fix: Provider lookup now passes the expected `providerId`; storage asset download and stream failures are mapped to `STG_ASSET_DOWNLOAD_FAILED`; VIP subtitle style typing now uses the actual `buildSubtitleAssContent` style parameter.
- Residual risk: VIP processing still runs as one long HTTP request, so an 8+ minute flow can still be interrupted by browser/server/proxy connection drops until this path is moved to a background job with polling.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/video-vip-processing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused VIP route tests pass (1 file / 5 tests).
  - `npm run build` no longer fails on `src/app/api/audio/video-vip-processing/route.ts`; it now fails on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
