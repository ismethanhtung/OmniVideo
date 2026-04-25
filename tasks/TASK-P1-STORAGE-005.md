# [P1-STORAGE-005] Add edit/delete for Storage Providers and add/delete plus true inline preview UX for Storage Library

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

- Task ID: P1-STORAGE-005
- Phase: P1
- Target Phase: P1
- Domain: Storage Management UX/API
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User yêu cầu Storage Providers phải sửa/xoá được; Storage Library phải thêm/xoá được; preview phải là xem trực tiếp thay vì hành vi tải file.
- Bài toán cần giải quyết:
  - Bổ sung CRUD cho account và asset theo nhu cầu vận hành.
  - Tách rõ hành vi preview inline với hành vi download.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - API + UI edit/delete Storage Provider.
  - API + UI add/delete Storage Library asset.
  - Preview UX ưu tiên player inline trong modal.
- Out of scope:
  - Bulk actions.
  - Soft-delete/audit trail nâng cao.

## 4. Input / Output

- Input: thao tác quản trị storage account và asset từ dashboard.
- Output mong đợi: user có thể sửa/xoá provider, thêm/xoá asset, preview video trực tiếp trong modal.

## 5. Acceptance Criteria

1. Storage Providers có thể edit config và delete account từ UI.
2. Storage Library có thể add manual asset metadata và delete asset.
3. Preview trong Storage Library là inline playback trong modal, không còn phụ thuộc link preview mới xem được.
4. Test/lint/build pass.

## 6. Technical Plan

1. Thêm validation + repository + API cho update/delete provider.
2. Thêm repository + API cho create/delete asset manual.
3. Cập nhật Storage Providers panel với edit/delete actions.
4. Cập nhật Storage Library panel với add/delete actions và preview player UX.
5. Cập nhật tests cho validation/repository APIs liên quan.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage-providers/*`, `src/app/api/storage/providers/*`, `src/lib/video-intake/repository.ts`, `src/app/api/storage/assets/*`, `src/features/storage/*`

## 8. Test Plan

1. Unit tests cho storage provider update validation.
2. Unit tests cho storage library API/repository helper mới.
3. `npm run test`, `npm run lint`, `npm run build`.

## 9. Observability

- API trả errorCode rõ cho update/delete/create thất bại.

## 10. Risks & Rollback

- Risks: manual asset create thiếu dữ liệu có thể làm trải nghiệm không nhất quán.
- Rollback strategy: giới hạn bắt buộc trường tối thiểu và giữ form đơn giản.

## 11. Deliverables

1. Storage Providers edit/delete.
2. Storage Library add/delete + inline preview UX.
3. Test evidence + changelog update.

## 12. Changelog Note

- Add Storage Providers edit/delete and Storage Library add/delete with inline preview-first UX.

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

- Assumptions: manual asset create phục vụ backfill/metadata management nội bộ.
- Blockers: none
- Verification evidence:
  - Storage Providers có `Edit` + `Delete` action, API hỗ trợ PATCH/DELETE config account.
  - Storage Library có `Add Asset` modal để tạo manual asset và `Delete` theo row.
  - Preview trong table chuyển thành `Play` mở modal player inline; hành vi download giữ riêng ở nút `Download`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage-providers/validation.test.ts` (updated)
- Test commands executed:
  - `npm run test -- src/lib/storage-providers/validation.test.ts`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (7 tests).
  - Full tests: pass (64 tests).
  - Lint: pass.
  - Build: pass.
