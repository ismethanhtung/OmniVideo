# [FAST-STORAGE-004] Add Drive OAuth guidance and redirect URI mismatch hardening

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

- Task ID: FAST-STORAGE-004
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

- Lý do: User gặp lỗi Google OAuth `redirect_uri_mismatch` và cần hướng dẫn setup tương tự YouTube ngay trong modal + Tutor Docs.
- Bài toán cần giải quyết: hiển thị redirect URI rõ ràng, bổ sung troubleshooting, và harden base URL resolution để giảm mismatch khi env chưa set đúng.
- Tài liệu liên quan: `docs/operations/tutorial-docs.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Bổ sung hướng dẫn Drive OAuth trong modal Storage Providers.
  - Bổ sung mục Drive OAuth setup + troubleshooting trong Tutor Docs UI và docs markdown.
  - Cập nhật Drive OAuth start route trả `redirectUri` + ưu tiên request origin khi thiếu base URL env.
- Out of scope:
  - Thay đổi flow OAuth social hiện có.
  - Refresh token persistence cho Drive storage.

## 4. Input / Output

- Input: thao tác mở modal New Storage Account và click Connect OAuth.
- Output mong đợi: user thấy rõ redirect URI cần cấu hình, tránh/có hướng xử lý lỗi `redirect_uri_mismatch`.

## 5. Acceptance Criteria

1. Modal Drive hiển thị setup note và redirect URI cụ thể.
2. Tutor Docs có section Drive OAuth setup + troubleshooting `redirect_uri_mismatch`.
3. API `/api/storage/oauth/start` trả kèm `redirectUri` và xử lý base URL ổn định hơn.
4. Tests liên quan pass.

## 6. Technical Plan

1. Mở rộng helper Drive OAuth để nhận `preferredBaseUrl`.
2. Cập nhật API start route trả `redirectUri`.
3. Cập nhật UI modal + Tutor Docs + docs markdown, sau đó chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage/*`, `src/app/api/storage/oauth/start/route.ts`, `src/features/storage/storage-providers-panel.tsx`, `src/features/social/tutorial-docs-panel.tsx`, `docs/operations/tutorial-docs.md`.

## 8. Test Plan

1. Cập nhật unit tests cho helper Drive OAuth.
2. Chạy regression tests storage oauth/validation.
3. Chạy build check.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: giữ nguyên `AUTH_DRIVE_OAUTH_*`.

## 10. Risks & Rollback

- Risks: Nếu env base URL sai vẫn có thể mismatch, nhưng UX sẽ chỉ rõ URI expected để sửa nhanh.
- Rollback strategy: revert các thay đổi guidance/base URL fallback.

## 11. Deliverables

1. Modal guidance cho Drive OAuth.
2. Tutor Docs cập nhật.
3. OAuth start response có redirect URI.

## 12. Changelog Note

- Add Drive OAuth setup/troubleshooting guidance in modal and Tutor Docs; return explicit redirect URI from storage OAuth start API.

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

- Assumptions: app chạy local qua `http://localhost:3001` trừ khi owner đổi port/domain.
- Blockers: none.
- Verification evidence:
  - Modal Drive hiển thị callback URI cụ thể và hướng dẫn xử lý `redirect_uri_mismatch`.
  - Tutor Docs UI + markdown có section Drive OAuth setup/troubleshooting.
  - `GET /api/storage/oauth/start` trả `redirectUri`.
  - OAuth helper hỗ trợ ưu tiên base URL theo request origin để giảm mismatch khi env chưa set.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/drive-oauth.test.ts` (updated)
  - `src/lib/storage-providers/validation.test.ts` (kept regression)
  - `src/lib/connections/storage-checks.test.ts` (kept regression)
- Test commands executed:
  - `npm run test -- --run src/lib/storage/drive-oauth.test.ts src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts`
  - `npm run build`
- Test results summary:
  - Tests pass (19 tests / 3 files).
  - Build pass (warning cũ: unused `Image` in `display-preferences-panel.tsx`).
