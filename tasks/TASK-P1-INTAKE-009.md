# [P1-INTAKE-009] Intake quality selector, storage detail view, and provider create modal

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

- Task ID: P1-INTAKE-009
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

- Lý do: Video Intake chưa cho chọn mức chất lượng tải; Storage Library đang thiếu dữ liệu vận hành quan trọng và chưa có link mở file tại nơi lưu; UI New Storage Account đang chiếm layout bên trái, khó thao tác.
- Bài toán cần giải quyết: bổ sung quality selector end-to-end cho intake, mở rộng bảng Storage Library + panel chi tiết + open-storage link, chuyển create form sang modal.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`

## 3. Scope

- In scope:
  - Thêm lựa chọn chất lượng intake trên UI và truyền xuống resolver.
  - Mở rộng dữ liệu hiển thị Storage Library + row detail panel.
  - Thêm hành động mở link nơi lưu trữ nếu có thể suy ra URL.
  - Chuyển New Storage Account sang modal UI.
- Out of scope:
  - Build quality ladder transcoding nội bộ sau upload.
  - Quản lý quyền truy cập private Telegram channel ngoài metadata đã có.

## 4. Input / Output

- Input: URL video + storage account + quality preference.
- Output mong đợi: người dùng chọn chất lượng trước khi chạy intake; Storage Library hiển thị đầy đủ thông tin và mở được link storage khi khả dụng.

## 5. Acceptance Criteria

1. Video Intake có field chọn quality (`best`, `1080p`, `720p`, `480p`, `360p`) và payload API nhận field này.
2. Storage Library có thêm dữ liệu chính (status, size, duration, resolver, provider asset id, account label/run/source refs) và có detail view mở rộng.
3. Từ Storage Library có thể bấm mở link nơi lưu nếu asset có URL truy cập khả dụng (Drive webView/publicUrl hoặc Telegram message link suy ra được).
4. Storage Providers dùng modal để tạo account khi nhấn `New`.
5. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng intake types/validation/resolver để nhận `qualityPreference`.
2. Cập nhật Video Intake UI thêm selector và gửi payload.
3. Cập nhật Storage Library UI + helper build storage URL + row detail.
4. Refactor Storage Providers create form thành modal.
5. Chạy test/lint/build và cập nhật changelog/task/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/video-intake/*`, `src/features/storage/*`, `src/lib/video-intake/*`, `src/lib/storage/*`, `src/app/api/storage/assets/route.ts`

## 8. Test Plan

1. Cập nhật unit test `validation.test.ts` cho quality validation.
2. Thêm unit test helper build storage location URL.
3. Chạy `npm run test`, `npm run lint`, `npm run build`.

## 9. Observability

- Error codes giữ taxonomy hiện tại.
- Intake snapshot có thêm qualityPreference để debug run history.

## 10. Risks & Rollback

- Risks: một số video platform có thể không cung cấp đúng chất lượng requested.
- Rollback strategy: bỏ field qualityPreference, giữ default resolver format hiện tại.

## 11. Deliverables

1. Intake quality selector chạy end-to-end.
2. Storage Library detail/open-storage UX.
3. Storage Providers create modal UX.

## 12. Changelog Note

- Thêm quality selector cho Video Intake; mở rộng Storage Library với detail panel và open-storage link; refactor create storage account sang modal.

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

- Assumptions: quality preference áp dụng chủ yếu cho URL cần resolver (YouTube/TikTok/...); direct file URL không cần remap quality.
- Blockers: none
- Verification evidence: pending

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/validation.test.ts`
  - `src/lib/video-intake/media-resolver.test.ts`
  - `src/lib/storage/storage-location.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 9 test files / 28 tests pass; lint pass; build pass.

## 16. Outcome Summary

- Added intake `qualityPreference` (`best`, `1080p`, `720p`, `480p`, `360p`) end-to-end from UI to resolver runtime.
- Added Storage Library detail mode with key metadata (`status`, `size`, `duration`, `resolver`, `requestedQuality`, `providerAssetId`, `jobRunId`, `sourceId`, account refs).
- Added `open storage` capability:
  - use `publicUrl` / `webViewLink` when available.
  - infer Telegram message URL from `chatId + messageId` when possible.
- Refactored Storage Providers `New` action to modal-based form (instead of left-side inline pane).
