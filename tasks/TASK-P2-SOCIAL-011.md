# [P2-SOCIAL-011] Align YouTube connection check with upload scope

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

- Task ID: P2-SOCIAL-011
- Phase: P2
- Target Phase: P2
- Domain: Social Connection Checks
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: YouTube Connection Test used a channel read endpoint and failed with insufficient scopes even when upload scope was configured.
- Bài toán cần giải quyết: check should validate token and `youtube.upload` scope, not require unnecessary read scope.
- Tài liệu liên quan: `docs/domains/social-account-management.md`

## 3. Scope

- In scope: YouTube tokeninfo check, missing-scope guidance, tests.
- Out of scope: refresh-token renewal and actual video upload.

## 4. Input / Output

- Input: connected YouTube account with access token.
- Output mong đợi: connection check validates token contains `https://www.googleapis.com/auth/youtube.upload`.

## 5. Acceptance Criteria

1. YouTube checker no longer calls `channels?mine=true`.
2. Tokeninfo response with `youtube.upload` returns ok.
3. Tokeninfo response without upload scope returns `AUTH_YOUTUBE_SCOPE_MISSING`.
4. Docs explain reconnecting OAuth after adding scopes.

## 6. Technical Plan

1. Replace YouTube channel read check with Google tokeninfo scope check.
2. Add test for missing upload scope.
3. Update modal guide and docs.
4. Verify test/build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/connection-checks.ts`, `src/features/social/social-accounts-panel.tsx`

## 8. Test Plan

1. Unit tests for YouTube tokeninfo ok/missing-scope.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Connection Test message now identifies missing upload scope directly.

## 10. Risks & Rollback

- Risks: tokeninfo confirms token/scope but does not test upload quota.
- Rollback strategy: restore channel endpoint only if adding `youtube.readonly` becomes desired.

## 11. Deliverables

1. Upload-scope-aligned YouTube connection check.
2. Scope reconnect guidance.

## 12. Changelog Note

- Fix YouTube Connection Test insufficient-scope false negative by checking tokeninfo upload scope.

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

## 14. Execution Notes

- Assumptions: upload readiness should not require `youtube.readonly`.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/connection-checks.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (87 tests / 21 files); build pass with existing unused `Image` warning and Mongo DNS logs during static generation.
