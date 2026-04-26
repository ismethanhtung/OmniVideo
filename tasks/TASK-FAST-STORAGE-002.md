# [FAST-STORAGE-002] Switch Google Drive storage flow to OAuth-only

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

- Task ID: FAST-STORAGE-002
- Phase: FAST
- Target Phase: Storage reliability hardening
- Domain: Storage Strategy
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner tạm thời dừng hướng Service Account do lỗi quota/phân quyền phức tạp, cần chạy ổn định bằng OAuth quota cá nhân.
- Bài toán cần giải quyết: ép flow Drive storage về OAuth token path, bỏ/khóa Service Account path ở validation/runtime/UI.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Validation Drive provider yêu cầu `accessToken`.
  - Runtime upload/check/download Drive chỉ dùng access token.
  - UI Storage Providers (Drive) bỏ input Service Account JSON, giữ Access Token (+ Folder ID optional).
  - Cập nhật tests liên quan.
- Out of scope:
  - Xây OAuth auto-refresh hoặc OAuth connect wizard mới cho Drive.
  - Migration tự động dữ liệu provider cũ.

## 4. Input / Output

- Input: cấu hình Drive provider và intake/upload/download/check flow.
- Output mong đợi: mọi Drive path chạy theo access token cá nhân, không còn phụ thuộc Service Account JSON.

## 5. Acceptance Criteria

1. Tạo Drive provider fail nếu thiếu `accessToken`.
2. Upload/check/download Drive báo lỗi `missing access token` khi không có token và không còn đọc Service Account JSON.
3. UI Drive config chỉ hiển thị Access Token + Folder ID.
4. Regression tests liên quan pass.

## 6. Technical Plan

1. Cập nhật validation và messages sang OAuth-only.
2. Cập nhật runtime Drive modules (`storage-adapters`, `storage-checks`, `asset-download`) bỏ resolve token từ Service Account JSON.
3. Cập nhật Storage Providers panel + tests, chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage-providers/*`, `src/lib/video-intake/*`, `src/lib/connections/*`, `src/lib/storage/*`, `src/features/storage/*`.

## 8. Test Plan

1. Unit tests cho storage provider validation.
2. Unit tests cho storage connection checks.
3. Unit tests cho Drive upload target helper/runtime liên quan sau khi bỏ Service Account path.

## 9. Observability

- Metrics: none.
- Logs: giữ nguyên.
- Error codes: giữ `STG_DRIVE_*` hiện tại, message chuyển OAuth-only.

## 10. Risks & Rollback

- Risks: Drive providers cũ chỉ có Service Account JSON sẽ cần cập nhật thủ công `accessToken`.
- Rollback strategy: phục hồi các module/token resolver về dual-mode (access token + service account).

## 11. Deliverables

1. OAuth-only Drive validation/runtime/UI.
2. Regression tests cập nhật.

## 12. Changelog Note

- Switch Google Drive storage provider flow to OAuth-only and disable Service Account upload/check/download path.

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

- Assumptions: owner đã xác nhận tạm dừng Service Account direction cho Drive.
- Blockers: none.
- Verification evidence:
  - Drive create validation chuyển về yêu cầu `accessToken` bắt buộc.
  - Drive upload/check/download runtime chỉ còn đọc access token (provider secret hoặc env fallback), không còn resolve từ Service Account JSON.
  - Storage Providers UI cho Drive bỏ field Service Account JSON, chỉ giữ Access Token + Folder ID optional.
  - Xóa helper guard Service Account `src/lib/storage/drive-upload-target.ts` và test liên quan.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage-providers/validation.test.ts` (updated)
  - `src/lib/connections/storage-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts`
  - `npm run build`
- Test results summary:
  - Tests pass (14 tests / 2 files).
  - Build pass (Next.js build thành công; còn warning cũ `Image` unused ở `display-preferences-panel.tsx`).
