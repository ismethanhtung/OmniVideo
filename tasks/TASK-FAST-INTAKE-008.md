# [FAST-INTAKE-008] Materialize Bilibili HTML5 Drive Uploads

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

- Task ID: FAST-INTAKE-008
- Phase: MVP runtime hardening
- Target Phase: Intake reliability
- Domain: Video Intake / Bilibili resolver / Drive storage
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports Drive intake only fails when selecting `bilibili-html5-*`; other yt-dlp formats upload normally.
- Bài toán cần giải quyết: The HTML5 Bilibili path resolves as a progressive direct URL and Drive uploads it via remote-stream. That exposes the Google Drive resumable PUT to upstream Bilibili stream instability and surfaces as `STG_DRIVE_RESUMABLE_PUT_FAILED`.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Detect Bilibili HTML5 resolved media in Drive upload.
  - Materialize that source media to a temp file before the Drive resumable PUT.
  - Add regression coverage for the upload mode.
- Out of scope:
  - Changing non-Bilibili providers.
  - Reworking the Bilibili HTML5 resolver/listing UI.
  - Drive resumable chunk retry implementation.

## 4. Input / Output

- Input: Video Intake URL using `formatSelector=bilibili-html5-64` or another `bilibili-html5-*` selector with Google Drive storage.
- Output mong đợi: Intake uploads via file-stream mode after resolving/fetching the Bilibili HTML5 source, avoiding remote-stream PUT failure.

## 5. Acceptance Criteria

1. Drive upload for `bilibili-html5-*` media uses a temp file stream, not the direct remote response body.
2. Existing generic direct URL Drive uploads continue using remote-stream.
3. Existing `yt-dlp-file` Drive uploads continue using file-stream.
4. Regression test covers `bilibili-html5-*` selecting file-stream upload behavior.
5. Focused tests and `npm run guard:version` pass.

## 6. Technical Plan

1. Add a small helper that identifies Bilibili HTML5 progressive resolved media.
2. Reuse the existing direct-media materialization path for that helper inside Drive upload.
3. Add storage adapter regression tests and update release/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/storage-adapters.ts`, `src/lib/video-intake/storage-adapters.test.ts`

## 8. Test Plan

1. Unit regression: Bilibili HTML5 direct media is fetched to a temp file and uploaded to Drive as a file stream.
2. Unit regression: generic direct media still uploads as remote-stream.
3. Run focused storage adapter tests.
4. Run version guard.

## 9. Observability

- Metrics: Existing intake run/step status and upload mode metadata.
- Logs: Existing run/step error details.
- Error codes: Existing storage error codes remain unchanged.

## 10. Risks & Rollback

- Risks: HTML5 uploads now use local temp disk space equal to the selected video size.
- Rollback strategy: Revert Drive materialization helper and regression test.

## 11. Deliverables

1. Code fix for Bilibili HTML5 Drive uploads.
2. Regression test.
3. Changelog, board, task evidence, and version bump.

## 12. Changelog Note

- Bilibili HTML5 Drive uploads now materialize the progressive source to a temp file before Google Drive resumable upload, avoiding remote-stream PUT failures.

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

- Assumptions: User-provided evidence is enough to scope the fix to selected `bilibili-html5-*` formats.
- Blockers: None.
- Root cause: `bilibili-html5-*` resolves as direct progressive media, so Drive previously forwarded the Bilibili response body directly into the Google Drive resumable PUT. Other selected formats used `yt-dlp-file` and therefore uploaded from a local temp file.
- Fix: Drive now materializes Bilibili HTML5 direct media to a temp file before starting the resumable PUT, while generic direct URLs remain remote-stream.
- Verification evidence:
  - Bilibili HTML5 direct media uses temp file upload mode.
  - Generic direct media remains remote-stream.
  - Focused regression tests and version guard pass.
- Residual risk:
  - `npm run build` currently fails in unrelated `src/app/api/audio/video-vip-processing/route.ts:361` because `getAiProviderById` is called with `metadataProviderId` instead of the expected `providerId`. This file was not changed by this task.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/storage-adapters.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-intake/storage-adapters.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused storage adapter tests pass (1 file / 7 tests).
  - `npm run build` fails on unrelated pre-existing type error in `src/app/api/audio/video-vip-processing/route.ts:361`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
