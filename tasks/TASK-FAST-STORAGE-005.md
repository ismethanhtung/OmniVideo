# [FAST-STORAGE-005] Add Drive OAuth refresh-token runtime flow for stable uploads

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

- Task ID: FAST-STORAGE-005
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

- Lý do: Drive upload chạy được lúc đầu rồi fail `invalid authentication credentials` sau thời gian ngắn.
- Bài toán cần giải quyết: hiện tại flow storage Drive dùng access token tĩnh; chưa có refresh token runtime như YouTube.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Lưu `refresh_token` trong Drive OAuth callback và Storage Provider secrets.
  - Thêm helper runtime resolve token cho Drive (refresh nếu có refresh token + client config).
  - Áp dụng helper cho upload/check/download Drive paths.
  - Cập nhật hướng dẫn để nêu rõ stable flow cần Drive OAuth client config.
- Out of scope:
  - Service Account flow.
  - Token persistence cache phức tạp hoặc background refresh scheduler.

## 4. Input / Output

- Input: Drive OAuth callback payload + storage runtime operations.
- Output mong đợi: upload/check/download tiếp tục hoạt động ổn định sau khi access token cũ hết hạn.

## 5. Acceptance Criteria

1. Drive OAuth callback trả cả `accessToken` và `refreshToken` (nếu provider trả).
2. Storage provider save path giữ được refresh token trong secrets.
3. Upload/check/download Drive dùng token resolver có refresh flow.
4. Tests cho refresh flow pass.

## 6. Technical Plan

1. Tạo helper `drive-token` cho refresh runtime.
2. Wire helper vào storage adapters, connection checks, asset download.
3. Update modal/oauth callback typing và docs note; chạy test/build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage/*`, `src/lib/video-intake/storage-adapters.ts`, `src/lib/connections/storage-checks.ts`, `src/features/storage/storage-providers-panel.tsx`, `src/app/api/storage/oauth/callback/drive/route.ts`.

## 8. Test Plan

1. Unit tests cho Drive token resolver refresh path.
2. Regression tests storage validation + connection checks.
3. Build check.

## 9. Observability

- Metrics: none.
- Logs: giữ nguyên.
- Error codes: dùng message `AUTH_DRIVE_REFRESH_FAILED` khi refresh exchange lỗi.

## 10. Risks & Rollback

- Risks: nếu thiếu `DRIVE_CLIENT_ID`/`DRIVE_CLIENT_SECRET`, refresh path không thể chạy.
- Rollback strategy: fallback về access-token only flow.

## 11. Deliverables

1. Drive refresh-token runtime flow.
2. Updated OAuth callback/message mapping for refresh token.
3. Tests + docs evidence.

## 12. Changelog Note

- Add Drive refresh-token runtime support so storage uploads/checks/downloads remain stable after short-lived access tokens expire.

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

- Assumptions: Google OAuth token exchange trả refresh token khi consent phù hợp.
- Blockers: none.
- Verification evidence:
  - Thêm `src/lib/storage/drive-token.ts` để resolve Drive runtime access token theo thứ tự: refresh-token flow -> access token fallback.
  - OAuth callback Drive trả cả `accessToken` và `refreshToken` qua popup message; modal lưu vào secrets state.
  - Upload/check/download Drive paths dùng runtime resolver mới.
  - Docs/Tutor bổ sung guidance cho case access token hết hạn.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/drive-token.test.ts` (new)
  - `src/lib/connections/storage-checks.test.ts` (updated)
  - `src/lib/storage/drive-oauth.test.ts` (kept pass in regression suite)
  - `src/lib/storage-providers/validation.test.ts` (kept pass in regression suite)
- Test commands executed:
  - `npm run test -- --run src/lib/storage/drive-token.test.ts src/lib/connections/storage-checks.test.ts src/lib/storage-providers/validation.test.ts src/lib/storage/drive-oauth.test.ts`
  - `npm run build`
- Test results summary:
  - Tests pass (23 tests / 4 files).
  - Build pass (warning cũ: unused `Image` in `display-preferences-panel.tsx`).
