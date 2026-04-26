# [FAST-STORAGE-003] Add Drive OAuth connect flow and modal-scoped validation UX

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

- Task ID: FAST-STORAGE-003
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

- Lý do: UX Drive provider hiện yêu cầu dán access token thủ công và lỗi validation hiển thị chưa rõ trong modal.
- Bài toán cần giải quyết: đưa Drive OAuth flow giống tinh thần social OAuth (click connect) và hiển thị lỗi ngay trong modal New/Edit Storage Account.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Thêm Drive OAuth start/callback API để lấy access token bằng popup flow.
  - Cập nhật Storage Providers modal: nút `Connect OAuth` và autofill access token.
  - Hiển thị lỗi validation/save ngay trong modal thay vì chỉ ở status tổng.
- Out of scope:
  - Persist refresh token + auto-refresh cho Drive OAuth.
  - OAuth wizard đa bước ngoài modal hiện có.

## 4. Input / Output

- Input: thao tác tạo/sửa Drive storage provider từ modal.
- Output mong đợi: user có thể bấm OAuth để lấy token và thấy lỗi rõ ngay trong modal.

## 5. Acceptance Criteria

1. Trong modal Drive có nút `Connect OAuth`; khi OAuth thành công, access token tự điền.
2. Lỗi validate thiếu access token hiển thị trực tiếp trong modal.
3. API OAuth start/callback trả lỗi rõ khi thiếu cấu hình env.
4. Tests mới/updated pass.

## 6. Technical Plan

1. Tạo helper OAuth Drive (`lib/storage/drive-oauth.ts`) + API routes start/callback.
2. Gắn popup OAuth + `postMessage` receiver vào Storage Providers modal.
3. Thêm modal error surface + client pre-validation; chạy tests/build verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage/*`, `src/app/api/storage/oauth/*`, `src/features/storage/storage-providers-panel.tsx`.

## 8. Test Plan

1. Unit test cho helper Drive OAuth config/url.
2. Chạy regression test storage provider validation.
3. Chạy build check.

## 9. Observability

- Metrics: none.
- Logs: giữ nguyên.
- Error codes: thêm `AUTH_DRIVE_OAUTH_*`.

## 10. Risks & Rollback

- Risks: flow OAuth popup phụ thuộc browser popup policy.
- Rollback strategy: bỏ nút OAuth và quay về access token manual input.

## 11. Deliverables

1. Drive OAuth connect flow trong storage modal.
2. Modal-scoped error rendering.
3. Test evidence.

## 12. Changelog Note

- Add Google Drive OAuth connect flow in Storage Providers modal and surface validation errors directly inside the modal.

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

- Assumptions: dùng Google OAuth client cho Drive với scope `drive.file`.
- Blockers: none.
- Verification evidence:
  - Thêm Drive OAuth helper/config/url builder tại `src/lib/storage/drive-oauth.ts`.
  - Thêm API routes `GET /api/storage/oauth/start` và `GET /api/storage/oauth/callback/drive`.
  - Storage Providers modal Drive có nút `Connect OAuth` và tự điền `accessToken` qua popup callback `postMessage`.
  - Lỗi validation `accessToken` hiển thị trực tiếp trong modal.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/drive-oauth.test.ts` (new)
  - `src/lib/storage-providers/validation.test.ts` (updated)
  - `src/lib/connections/storage-checks.test.ts` (updated, retained)
- Test commands executed:
  - `npm run test -- --run src/lib/storage/drive-oauth.test.ts src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts`
  - `npm run build`
- Test results summary:
  - Tests pass (18 tests / 3 files).
  - Build pass (warning cũ: unused `Image` in `display-preferences-panel.tsx`).
