# [FAST-INTAKE-010] Stabilize Bilibili HTML5 Intake Downloads

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

- Task ID: FAST-INTAKE-010
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

- Lý do: User reports both `Download` and `Run Intake Pipeline` fail intermittently or consistently for selected `bilibili-html5-*` formats, with Next logging `failed to pipe response` / `TypeError: terminated`.
- Bài toán cần giải quyết: Bilibili HTML5 formats are resolved as direct progressive URLs, so the app streams Bilibili directly to the browser or Drive. When Bilibili closes the socket mid-stream, the browser sees `Failed to fetch` and intake can surface an unknown upload failure.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Route selected `bilibili-html5-*` downloads through a temp-file materialization path before browser response.
  - Route selected `bilibili-html5-*` Drive uploads through yt-dlp temp-file materialization instead of direct fetch piping.
  - Map interrupted source stream materialization failures to a typed intake error.
  - Add regression coverage for Download and Drive upload behavior.
- Out of scope:
  - Changing non-Bilibili provider behavior.
  - Adding long-running background job infrastructure for manual downloads.
  - Reworking the Video Intake page layout.

## 4. Input / Output

- Input: Bilibili URL with selected `formatSelector=bilibili-html5-64` or another `bilibili-html5-*`.
- Output mong đợi: Download and Drive intake use a locally materialized file, avoiding unstable direct upstream piping.

## 5. Acceptance Criteria

1. `/api/video-intake/resolve-file` uses `downloadResolvedMediaToTempFile` for selected `bilibili-html5-*` media.
2. Drive upload uses `downloadResolvedMediaToTempFile` for selected `bilibili-html5-*` media, not direct fetch piping.
3. Internal resolver download command accepts `bilibili-html5-*` selectors and downloads the resolved HTML5 media to a local file.
4. Interrupted direct source materialization errors are returned as typed intake errors instead of raw `terminated` / unknown errors.
5. Focused regression tests and `npm run guard:version` pass.

## 6. Technical Plan

1. Add Bilibili HTML5 selector handling to the internal resolver download path.
2. Update storage adapter materialization logic and resolve-file route to prefer yt-dlp temp files for Bilibili HTML5 media.
3. Add/update focused route, storage adapter, and resolver tests.
4. Update changelog, board, version, and task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.py`, `src/lib/video-intake/storage-adapters.ts`, `src/app/api/video-intake/resolve-file/route.ts`, related tests.

## 8. Test Plan

1. Unit/API regression: resolve-file route calls temp-file download for `bilibili-html5-*`.
2. Unit regression: Drive upload calls temp-file download for `bilibili-html5-*` and uploads the materialized file.
3. Python regression: internal resolver can download a mocked Bilibili HTML5 selector.
4. Run focused tests and version guard.

## 9. Observability

- Metrics: Existing run/step status.
- Logs: Existing API failure payload and intake step error detail.
- Error codes: Preserve existing `SYS_WORKSPACE_URL_RESOLVE_FAILED`; improve upload path to typed `STG_SOURCE_STREAM_FAILED` where direct materialization fails.

## 10. Risks & Rollback

- Risks: Bilibili HTML5 downloads now require temp disk equal to the selected file size.
- Rollback strategy: Revert resolver download selector handling and route/storage materialization changes.

## 11. Deliverables

1. Runtime fix for Bilibili HTML5 Download and Drive intake upload.
2. Regression tests.
3. Changelog, board, task evidence, and version bump.

## 12. Changelog Note

- Stabilize Bilibili HTML5 Video Intake downloads/uploads by materializing selected HTML5 media through yt-dlp before browser response or Drive upload.

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

- Assumptions: The user-selected `bilibili-html5-*` path is the failing path shown in the report.
- Blockers: None.
- Root cause: `bilibili-html5-*` was represented as `direct-url`, so the app piped Bilibili's upstream response directly to the browser or Drive. When Bilibili closed the socket mid-stream, Next logged `failed to pipe response` and intake could persist an unknown upload failure.
- Fix: Bilibili HTML5 selections now call `downloadResolvedMediaToTempFile`; the Python resolver download command resolves the HTML5 media URL and downloads it with yt-dlp retry/resume before the app serves or uploads the local file.
- Live verification: the reported `BV1A1RUBEEC8` URL with `bilibili-html5-64` downloaded successfully to a `69,392,247` byte MP4 with audio/video metadata.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/video-intake/resolve-file/route.test.ts`
  - `src/lib/video-intake/storage-adapters.test.ts`
  - `src/lib/video-intake/internal-resolver-py.test.py`
- Test commands executed:
  - `npm run test -- --run src/lib/video-intake/storage-adapters.test.ts src/app/api/video-intake/resolve-file/route.test.ts`
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py download 'https://www.bilibili.com/video/BV1A1RUBEEC8/?vd_source=26301331a82f9ac0f2b386f3da4dba1d' best bilibili-html5-64 /private/tmp/omnivideo-bili-html5-smoke`
  - `npm run guard:version`
  - `npm run build`
- Test results summary:
  - Focused TypeScript tests pass (2 files / 11 tests).
  - Python resolver regression tests pass (18 tests).
  - Live Bilibili smoke produced a `69,392,247` byte MP4 for the reported URL and selected format.
  - `npm run build` fails on unrelated pre-existing `src/app/api/audio/video-vip-processing/route.ts:361` type error (`metadataProviderId` passed where `providerId` is expected).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
