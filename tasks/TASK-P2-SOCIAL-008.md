# [P2-SOCIAL-008] Enforce real social connection semantics and OAuth foundation

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

- Task ID: P2-SOCIAL-008
- Phase: P2
- Target Phase: P2
- Domain: Social Account Management
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User phản hồi rằng account chưa xác thực không được hiển thị `active`; hệ thống phải báo thiếu xác thực và ưu tiên OAuth thật.
- Bài toán cần giải quyết: đổi semantic status và thêm OAuth start/callback foundation để chỉ OAuth thành công mới chuyển `connected`.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/architecture/data-model.md`

## 3. Scope

- In scope: status `needs_auth/connected`, modal connect OAuth action, OAuth start/callback routes, env missing errors, connection checks down until connected.
- Out of scope: full production publish adapters và Shopee signed partner OAuth.

## 4. Input / Output

- Input: social account metadata and OAuth provider env vars.
- Output mong đợi: account mới là `needs_auth`; OAuth config missing hiển thị lỗi; callback token exchange thành công mới set `connected`.

## 5. Acceptance Criteria

1. Account tạo mới không còn status `active`.
2. UI không cho user tự chọn connected/active.
3. Connection checks báo `AUTH_SOCIAL_NOT_CONNECTED` cho account chưa OAuth.
4. OAuth start route báo rõ thiếu env vars.
5. OAuth callback route có thể exchange code và mark account connected cho Facebook/TikTok/YouTube.

## 6. Technical Plan

1. Update social status enum and validation defaults.
2. Add OAuth config/authorization/token exchange helpers.
3. Add OAuth start/callback routes.
4. Update UI modal and connection check logic.
5. Update docs/tests/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/*`, `src/app/api/social/oauth/*`, `src/features/social/*`

## 8. Test Plan

1. Unit tests for status and connection check semantics.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Connection Center surfaces not-connected accounts as down with `AUTH_SOCIAL_NOT_CONNECTED`.

## 10. Risks & Rollback

- Risks: OAuth requires correct platform app credentials and callback URLs.
- Rollback strategy: keep accounts in `needs_auth`; no real publish is triggered.

## 11. Deliverables

1. Strict connection status semantics.
2. OAuth start/callback foundation.
3. Updated docs and evidence.

## 12. Changelog Note

- Enforce social connected status only after OAuth callback succeeds.

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

- Assumptions: Facebook/TikTok/YouTube OAuth can use standard authorization-code flow; Shopee needs a follow-up signed partner flow.
- Blockers: real connection requires platform app credentials configured in `.env`.
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/connection-checks.test.ts`, `src/lib/social/validation.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (85 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
