# [P2-SOCIAL-005] Publish records and manual publish planning

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

- Task ID: P2-SOCIAL-005
- Phase: P2
- Target Phase: P2
- Domain: Social Publish Planning
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User cần kiểm soát video nào chuẩn bị đăng lên nền tảng nào.
- Bài toán cần giải quyết: lập kế hoạch publish từ asset đã lưu, chưa auto-publish thật.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/domains/storage-strategy.md`

## 3. Scope

- In scope: publish record validation/repository/API/UI.
- Out of scope: queue publish thật và platform post id thật.

## 4. Input / Output

- Input: assetId, socialAccountId, publishType, title/caption/hashtags/schedule.
- Output mong đợi: `publish_records` status `planned` có trace tới asset/account.

## 5. Acceptance Criteria

1. User có thể tạo planned publish record từ Storage Library asset.
2. Publish type phải khớp account platform.
3. Missing asset/account trả `VAL_*`.
4. Retry eligibility phân biệt auth/validation vs transient errors.

## 6. Technical Plan

1. Add publish record validation and repository.
2. Add `GET/POST /api/social/publish-records`.
3. Add Publish Records UI.
4. Add tests for validation and retry rules.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/*`, `src/app/api/social/publish-records/route.ts`, `src/features/social/publish-records-panel.tsx`

## 8. Test Plan

1. Unit tests for publish validation/retry rules.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Publish records include status/errorCode/errorDetail/retryCount.

## 10. Risks & Rollback

- Risks: planned records can reference assets deleted later.
- Rollback strategy: validation requires asset exists when planning; future delete guard can be added.

## 11. Deliverables

1. Publish records API/UI.
2. Validation and tests.

## 12. Changelog Note

- Add manual social publish planning linked to storage assets.

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

- Assumptions: `planned` is the only status created by Control Center.
- Blockers: none
- Verification evidence: targeted social tests pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/validation.test.ts`, `src/app/api/social/publish-records/route.test.ts`
- Test commands executed: `npm run test -- src/lib/social/validation.test.ts src/lib/social/connection-checks.test.ts`, `npm run test`, `npm run build`
- Test results summary: targeted social tests pass (12 tests); full tests pass (84 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
