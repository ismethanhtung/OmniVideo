# [P1-STORAGE-001] Storage provider management page

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

- Task ID: P1-STORAGE-001
- Phase: P1
- Target Phase: P1
- Domain: Storage
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Storage Library hiện chỉ quản lý metadata video đã lưu, chưa có trang quản lý nhiều storage account/provider như nhiều Telegram vault, nhiều Drive, S3 hoặc local.
- Bài toán cần giải quyết: Cần một control page để tạo, xem, pause/activate và kiểm soát cấu hình storage provider/account, bao gồm secret input nhưng không trả token thô về UI.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/architecture/data-model.md`, `docs/architecture/system-overview.md`

## 3. Scope

- In scope:
  - Thêm navigation item/page Storage Providers.
  - Thêm API list/create/update status cho storage provider accounts.
  - Thêm domain validation + sanitized projection để secret không bị trả về UI.
  - Thêm UI tạo provider Telegram/Drive/S3/local/other và quản lý trạng thái.
  - Cập nhật docs/changelog/board.
- Out of scope:
  - Kết nối Video Intake để chọn provider account cụ thể.
  - Secret encryption/secret manager production.
  - Provider live health check qua network.

## 4. Input / Output

- Input: Provider type, label, optional description/tags/priority và secret/config fields.
- Output mong đợi: Storage provider account được lưu trong MongoDB và list ra UI dưới dạng masked metadata.

## 5. Acceptance Criteria

1. Có leftbar link `Storage Providers` riêng biệt với `Storage Library`.
2. UI tạo được provider account cho Telegram/Drive/S3/local/other.
3. API không trả raw secret/token khi list hoặc create response.
4. Có thể pause/activate từng provider account.
5. Validation reject thiếu required secret fields theo từng provider type.
6. Có unit tests cho validation + secret sanitization.
7. Docs/changelog/board được cập nhật.

## 6. Technical Plan

1. Tạo module `src/lib/storage-providers/*` gồm types, validation, repository.
2. Tạo API `src/app/api/storage/providers/route.ts` và dynamic route update status.
3. Tạo UI panel `src/features/storage/storage-providers-panel.tsx` và đăng ký navigation/router.
4. Thêm tests, cập nhật docs/changelog/task board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: layout navigation/router, storage provider domain, API routes, storage feature UI.

## 8. Test Plan

1. Unit: validate create payload hợp lệ cho Telegram/Drive/S3/local/other.
2. Unit: reject thiếu required secret fields.
3. Unit: sanitized projection không trả raw secrets.
4. Chạy `npm run test`.
5. Chạy `npm run build`.

## 9. Observability

- Metrics: chưa thêm metrics runtime riêng trong task này.
- Logs: API trả error code chuẩn hóa.
- Error codes: `VAL_STORAGE_PROVIDER_*`, `SYS_STORAGE_PROVIDERS_API_FAILED`.

## 10. Risks & Rollback

- Risks: Secret hiện lưu inline trong MongoDB cho MVP, cần secret manager/encryption ở production.
- Rollback strategy: Gỡ navigation item, API routes và module `storage-providers`; dữ liệu collection mới không ảnh hưởng assets hiện có.

## 11. Deliverables

1. Storage Providers page.
2. Storage provider account APIs.
3. Validation/sanitization tests.
4. Docs/changelog/task board updates.

## 12. Changelog Note

- Thêm Storage Providers page/API để quản lý nhiều Telegram/Drive/S3/local storage accounts với secret masking.

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

- Assumptions: MVP cho phép lưu secret inline trong MongoDB nhưng API không bao giờ trả raw secret về browser.
- Blockers: none
- Verification evidence: `npm run test`, `npm run build`, `npm run lint` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/storage-providers/validation.test.ts`
- Test commands executed: `npm run test`, `npm run build`, `npm run lint`
- Test results summary: 5 test files / 13 tests pass; Next build pass; ESLint reports no warnings/errors.
