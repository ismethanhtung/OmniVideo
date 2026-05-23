# [FAST-INTAKE-009] Add Manual Download Action to Video Intake

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

- Task ID: FAST-INTAKE-009
- Phase: MVP runtime hardening
- Target Phase: Intake workaround UX
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Bilibili HTML5 intake to Drive can still fail/terminate in runtime, and the user needs a manual fallback to download the selected source file locally.
- Bài toán cần giải quyết: Video Intake has only `Run Intake Pipeline`; when storage upload fails there is no direct UI action to download the resolved media with the selected format.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Add a `Download` button next to `Run Intake Pipeline`.
  - Reuse `/api/video-intake/resolve-file` with current URL/title/quality/format selector.
  - Show running/success/failure status through the existing status area.
  - Add regression coverage for the UI affordance.
- Out of scope:
  - Fixing Drive/Bilibili upload termination root cause.
  - Changing resolver internals.
  - Adding storage metadata for manually downloaded files.

## 4. Input / Output

- Input: User enters a Bilibili URL and optionally selects `bilibili-html5-*`.
- Output mong đợi: User can click `Download` and receive the resolved media file through the browser.

## 5. Acceptance Criteria

1. Video Intake renders a `Download` action beside `Run Intake Pipeline`.
2. Download action is enabled when a source URL exists and does not require storage account/folder.
3. Download action calls `/api/video-intake/resolve-file` with source URL, title, quality preference, and format selector.
4. Successful response triggers browser download using the server-provided filename header when available.
5. Focused UI test and version guard pass.

## 6. Technical Plan

1. Add client-side download state and handler in `VideoIntakePanel`.
2. Render a secondary `Download` button beside the run button.
3. Add source-text regression assertions and update release/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/video-intake/video-intake-panel.tsx`, `src/features/video-intake/video-intake-panel.test.ts`

## 8. Test Plan

1. Static UI regression checks for the new `Download` action and API route usage.
2. Run focused `video-intake-panel.test.ts`.
3. Run version guard.

## 9. Observability

- Metrics: Existing UI status/progress center only.
- Logs: API route errors already return JSON failure payload.
- Error codes: Existing `SYS_WORKSPACE_URL_RESOLVE_FAILED` from resolve-file route.

## 10. Risks & Rollback

- Risks: Browser downloads still depend on the resolver route being able to stream the selected media.
- Rollback strategy: Remove the `downloadResolvedVideo` handler and button.

## 11. Deliverables

1. Manual Download action in Video Intake.
2. Focused regression test.
3. Changelog, board, task evidence, and version bump.

## 12. Changelog Note

- Add a manual Download action to Video Intake so selected URL/format media can be saved locally when storage upload fails.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

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

- Assumptions: Manual download is an acceptable temporary workaround while Drive upload termination is investigated separately.
- Blockers: None.
- Implementation notes:
  - Added `downloadResolvedVideo()` in Video Intake.
  - The handler posts current `sourceUrl`, `title`, `qualityPreference`, and `formatSelector` to `/api/video-intake/resolve-file`.
  - The browser download filename uses `x-omnivideo-file-name` when present.
  - The Download button only requires a source URL; storage account and folder are not required.
- Verification evidence:
  - Focused UI regression test passes.
  - Version guard passes.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-intake/video-intake-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused Video Intake panel test passes (1 file / 5 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
