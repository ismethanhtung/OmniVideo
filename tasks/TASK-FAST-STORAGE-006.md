# [FAST-STORAGE-006] Fix Drive Provider Edit Null Secret Hydration and Setup UX

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

- Task ID: FAST-STORAGE-006
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

- Lý do: Khi edit Google Drive storage provider, React warning vì `input` nhận `value=null`.
- Bài toán cần giải quyết: Editable secrets có thể chứa `null` từ dữ liệu cũ/API, nhưng form state yêu cầu string. Đồng thời UI hướng dẫn Drive trong modal đang dài và khó dùng hơn mẫu New Social Account.
- Tài liệu liên quan:
  - `docs/domains/storage-strategy.md`
  - `docs/operations/tutorial-docs.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Normalize editable storage provider secrets về string rỗng trước khi vào controlled inputs.
  - Cải thiện Drive setup UI theo pattern quick setup / redirect URI / notes giống New Social Account.
  - Thêm regression test cho secret normalization.
  - Cập nhật changelog/task evidence.
- Out of scope:
  - Thay đổi Drive OAuth backend flow.
  - Secret manager/encryption at-rest.

## 4. Input / Output

- Input: User bấm `Edit` một Drive provider có secret null/thiếu.
- Output mong đợi: Modal mở không còn React warning; form vẫn cho phép OAuth connect/update.

## 5. Acceptance Criteria

1. `SecretInput` không bao giờ nhận `value=null` khi edit provider.
2. Drive OAuth instructions trong Storage Provider modal được gom thành setup panel rõ ràng, có redirect URI và troubleshooting note ngắn.
3. Regression test chứng minh null/undefined secrets normalize thành empty string.
4. Test/build evidence được ghi lại trước khi task hoàn tất.

## 6. Technical Plan

1. Thêm helper normalize secrets cho storage provider edit form.
2. Refactor Drive modal instruction UI theo quick setup panel tương tự Social Account.
3. Thêm/cập nhật test cho helper hoặc sanitizer liên quan.
4. Chạy focused tests/build và cập nhật changelog/board/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/storage/storage-providers-panel.tsx`
  - `src/lib/storage-providers/*`
  - tests/changelog/tasks.

## 8. Test Plan

1. Regression unit test cho editable secret normalization.
2. Run storage provider validation/sanitize related tests.
3. Run `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: giữ nguyên `VAL_STORAGE_PROVIDER_SECRET_REQUIRED`, `AUTH_DRIVE_OAUTH_*`.

## 10. Risks & Rollback

- Risks: UI-only refactor có thể làm thiếu thông tin redirect URI nếu browser origin chưa sẵn sàng.
- Rollback strategy: revert UI panel/helper changes.

## 11. Deliverables

1. Null-safe Drive edit form.
2. Improved Drive OAuth setup guidance UI.
3. Regression tests and changelog entry.

## 12. Changelog Note

- Fix Drive provider edit null secret hydration and improve OAuth setup guidance UI.

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

- Assumptions: Existing providers may contain legacy null values despite TypeScript secret type being optional string.
- Blockers:
- Verification evidence:
  - Added `normalizeStorageProviderSecretFormState` to coerce null/undefined editable secrets to empty strings before React controlled inputs.
  - Refactored Drive provider modal guidance into quick setup + redirect URI panel.
  - Focused regression tests and full suite pass; build pass with unrelated existing unused `Image` warning.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage-providers/form-secrets.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/storage-providers/form-secrets.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts src/app/api/social/capabilities/route.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (14 tests / 4 files).
  - Full suite pass (117 tests / 29 files).
  - Build pass; existing warning: unused `Image` in `src/features/workspace/display-preferences-panel.tsx`.
