# [P1-INTAKE-003] Intake history pagination and Telegram upload fallback

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P1-INTAKE-003
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / Storage
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Intake Run History refresh không có phản hồi rõ và chưa có phân trang. Upload Telegram đang fail với một số direct URL do Telegram không fetch được URL nguồn.
- Bài toán cần giải quyết: làm lịch sử run có pagination + refresh state rõ ràng, và thêm fallback upload binary trực tiếp cho Telegram khi remote URL mode lỗi.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`

## 3. Scope

- In scope:
  - Pagination cho `GET /api/video-intake/runs`.
  - UI history hỗ trợ chia trang + refresh state rõ.
  - Telegram upload fallback từ remote URL sang direct binary upload (không lưu disk).
  - Cập nhật tests/changelog/task evidence.
- Out of scope:
  - Cài resolver service cho YouTube/TikTok URL.
  - Thêm upload adapter mới cho provider khác.

## 4. Input / Output

- Input: page/pageSize cho history; source direct URL cho upload.
- Output mong đợi: history điều hướng trang được, refresh có phản hồi, Telegram upload thành công hơn với direct URL.

## 5. Acceptance Criteria

1. History API trả về `pagination` gồm `page`, `pageSize`, `total`, `totalPages`.
2. Video Intake có nút Prev/Next và hiển thị page hiện tại.
3. Nút Refresh history có trạng thái loading rõ và hoạt động ổn định.
4. Khi Telegram URL-upload fail do source URL inaccessible, hệ thống fallback upload file bytes trực tiếp.
5. Test/lint/build pass.

## 6. Technical Plan

1. Cập nhật repository + API route cho history pagination.
2. Cập nhật Video Intake panel state cho `historyPage`, `historyLoading`, `pagination`.
3. Refactor Telegram adapter: thử sendVideo bằng URL trước, fail thì stream->blob upload multipart.
4. Chạy verify và cập nhật task/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: video-intake API/repository/panel, storage adapter.

## 8. Test Plan

1. Unit test cho pagination logic (repository/API) nếu phù hợp.
2. Unit test fallback decision trong Telegram adapter.
3. `npm run test`, `npm run lint`, `npm run build`.

## 9. Observability

- Metrics: history pagination giúp quan sát run log ổn định hơn.
- Logs: giữ nguyên `job_runs`, `run_events`.
- Error codes: giữ `VID_RESOLVER_REQUIRED`, `STG_TELEGRAM_UPLOAD_FAILED`.

## 10. Risks & Rollback

- Risks: fallback binary upload tăng memory usage nếu file lớn.
- Rollback strategy: tắt fallback path, quay về URL upload mode hiện tại.

## 11. Deliverables

1. History API + UI pagination.
2. Telegram upload fallback path.
3. Updated task/changelog evidence.

## 12. Changelog Note

- Thêm pagination cho Intake Run History và Telegram binary upload fallback khi URL upload lỗi.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: nguồn direct URL đủ nhỏ để fallback upload không gây áp lực quá cao trong môi trường MVP.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/storage-adapters.test.ts`, `src/lib/video-intake/validation.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 6 test files / 18 tests pass; lint pass; Next build pass.
