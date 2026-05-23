# [FAST-VIDEO-013] Add Video Splitter Page for Local Download Workflow

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

- Task ID: FAST-VIDEO-013
- Phase: MVP runtime hardening
- Target Phase: Local split workflow
- Domain: Video Processing
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User cần trang tách video dài (3h) thành nhiều đoạn 30p/1h hoặc trích đoạn đầu 15p/30p, và ưu tiên tải local thay vì Drive.
- Bài toán cần giải quyết: hệ thống chưa có page/route chuyên cho local splitting workflow.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm page `Video Splitter` trong nhóm Video Pipeline.
  - UI theo style hiện có (Video Tools Lab family): upload local video, chọn mode split.
  - API split server-side bằng ffmpeg copy stream.
  - Đóng gói output thành zip và tải thẳng local qua endpoint download.
- Out of scope:
  - Split từ Storage Asset/Drive source trực tiếp.
  - Queue/background persistent jobs.

## 4. Input / Output

- Input: Video local + mode `interval (30/60m)` hoặc `head (15/30m)`.
- Output mong đợi: File zip chứa các segment được tải về local browser downloads.

## 5. Acceptance Criteria

1. Leftbar có mục `Video Splitter` trong Video Pipeline.
2. UI cho phép chọn 2 mode:
   - split interval 30/60 minutes,
   - clip head 15/30 minutes.
3. API `/api/video-processing/split` tạo package zip kết quả.
4. Browser nhận link download trực tiếp qua `/api/video-processing/split/download/:id`.
5. Focused tests + version guard pass.

## 6. Technical Plan

1. Add split runtime lib (`video-split.ts`) using ffmpeg segment/head clip logic.
2. Add temporary download store and download endpoint.
3. Build `VideoSplitterPanel` UI and register section in navigation/router.
4. Add focused source tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/video-processing/video-splitter-panel.tsx`
  - `src/app/api/video-processing/split/*`
  - `src/lib/video-processing/video-split.ts`
  - `src/lib/video-processing/split-download-store.ts`
  - navigation/type/router files

## 8. Test Plan

1. Panel source tests for split modes + API usage.
2. Navigation/content-router tests for new section registration.
3. Focused test run + guard version.

## 9. Observability

- Progress center tracks split run start/success/failure.
- API returns typed error codes for invalid input/system fail.

## 10. Risks & Rollback

- Risks: split with `-c copy` phụ thuộc keyframe, nên boundary có thể lệch nhẹ.
- Rollback strategy: remove section + split routes/libs.

## 11. Deliverables

1. New Video Splitter page.
2. Server-side split + zip + download endpoints.
3. Governance updates + focused tests.

## 12. Changelog Note

- Added Video Splitter page with local ffmpeg split (30/60m interval or 15/30m head clip) and direct local zip download.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: local-file-first workflow là ưu tiên hiện tại theo user request.
- Blockers: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-processing/video-splitter-panel.test.ts`
  - navigation/router tests (existing suite)
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
