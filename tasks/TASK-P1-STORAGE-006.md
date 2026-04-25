# [P1-STORAGE-006] Fix Storage Provider edit hydration and add upload-anyway option for Telegram fallback

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

- Task ID: P1-STORAGE-006
- Phase: P1
- Target Phase: P1
- Domain: Storage Management UX/API
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Form `Edit` ở Storage Providers đang không nạp lại secrets đã cấu hình trước đó; local upload fallback modal chưa cho phép user cố ý giữ Telegram upload.
- Bài toán cần giải quyết:
  - Nạp lại cấu hình provider hiện có vào edit form (bao gồm secret fields) thay vì để trống.
  - Bổ sung option `Upload anyway` trong confirm modal khi file lớn hơn ngưỡng Telegram.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm API lấy chi tiết provider theo id phục vụ edit form hydration.
  - Cập nhật UI `Storage Providers` để gọi API detail trước khi mở modal edit.
  - Cập nhật modal `Confirm Drive Fallback` để thêm action `Upload anyway`.
  - Bổ sung regression test cho mapper phục vụ edit hydration.
- Out of scope:
  - Thay đổi cơ chế secret encryption/secret manager.
  - Thay đổi chính sách upload Telegram >20MB ở backend.

## 4. Input / Output

- Input: thao tác user tại Storage Providers và Local Upload Intake.
- Output mong đợi: edit form hiển thị lại dữ liệu đã cấu hình trước; fallback modal có 3 lựa chọn `Cancel`, `Upload anyway`, `Confirm and Upload to Drive`.

## 5. Acceptance Criteria

1. Khi bấm `Edit` một storage provider, modal phải nạp đầy đủ cấu hình đã lưu (label/description/priority/tags/secrets).
2. Local Upload fallback modal có thêm nút `Upload anyway` để giữ upload qua Telegram account đã chọn.
3. Test/lint/build pass.

## 6. Technical Plan

1. Thêm mapper trả payload editable provider (kèm raw secrets) và API `GET /api/storage/providers/[providerId]`.
2. Sửa `openEditForm` thành async fetch detail rồi hydrate state form.
3. Mở rộng state fallback confirmation để giữ `fromAccount`, thêm action `Upload anyway`.
4. Cập nhật unit tests cho mapper editable payload.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/api/storage/providers/[providerId]/route.ts`, `src/features/storage/storage-providers-panel.tsx`, `src/features/video-intake/local-upload-intake-panel.tsx`, `src/lib/storage-providers/sanitize.ts`, `src/lib/storage-providers/types.ts`

## 8. Test Plan

1. Unit tests cho storage provider sanitize/editable mapping.
2. Full unit test suite.
3. Lint + build.

## 9. Observability

- API detail provider trả error code rõ (`VAL_STORAGE_PROVIDER_*`, `SYS_STORAGE_PROVIDER_GET_API_FAILED`) khi lấy config thất bại.

## 10. Risks & Rollback

- Risks: exposing secret payload qua edit endpoint nếu route bị dùng sai scope.
- Rollback strategy: chỉ dùng endpoint theo provider id trong UI quản trị nội bộ; có thể disable GET route nhanh nếu cần.

## 11. Deliverables

1. Provider edit hydration không còn bị trống secret fields.
2. Fallback modal có `Upload anyway`.
3. Test evidence + changelog update.

## 12. Changelog Note

- Fix edit-form hydration for storage providers and add upload-anyway option in local upload drive fallback modal.

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

- Assumptions: dashboard là internal single-user, cho phép edit flow hydrate lại raw secrets đã lưu.
- Blockers: none.
- Verification evidence:
  - Bấm `Edit` provider sẽ gọi `GET /api/storage/providers/[providerId]` và hydrate lại label/description/priority/tags/secrets vào modal.
  - Confirm modal local upload file lớn có đủ 3 lựa chọn: `Cancel`, `Upload anyway`, `Confirm and Upload to Drive`.
  - `Upload anyway` giữ nguyên Telegram account đang chọn; `Confirm and Upload to Drive` chuyển sang Drive fallback account.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage-providers/validation.test.ts`
- Test commands executed:
  - `npm run test -- src/lib/storage-providers/validation.test.ts`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (8 tests).
  - Full tests: pass (65 tests).
  - Lint: pass (no warnings/errors).
  - Build: pass.
