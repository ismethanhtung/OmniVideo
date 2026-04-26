# [FAST-SOCIAL-002] Harden Facebook Page Selection and Token Resolution for Publish-Now

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

- Task ID: FAST-SOCIAL-002
- Phase: FAST
- Target Phase: Social runtime hardening
- Domain: Social Account Management
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Facebook publish-now fail `PRV_FACEBOOK_PAGE_TOKEN_FAILED ... Object with ID ... does not exist`.
- Bài toán cần giải quyết: Với account Facebook có nhiều Page, luồng hiện tại chưa bắt buộc chọn `pageId` rõ ràng; callback OAuth còn có thể ghi đè `accountId` bằng Mongo ID nội bộ gây fallback sai.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/operations/tutorial-docs.md`

## 3. Scope

- In scope:
  - Sửa OAuth callback để không map nhầm internal accountId sang platform account id.
  - Harden Facebook auth: lấy danh sách page từ `/me/accounts`, resolve đúng page token theo `pageId`.
  - Fail rõ khi có nhiều Page mà chưa cấu hình `pageId`.
  - Cập nhật UI copy giúp user thấy rõ account nào đang gắn Page ID nào.
  - Thêm regression tests cho các nhánh nhiều Page/sai pageId.
  - Cập nhật docs/changelog/task evidence.
- Out of scope:
  - Multi-page picker dropdown động trong publish form.
  - Background sync toàn bộ Page metadata.

## 4. Input / Output

- Input: Facebook user token, social account config, publish-now request.
- Output mong đợi: Nếu nhiều Page phải chọn đúng `pageId`; publish dùng đúng Page token và lỗi trả về actionable.

## 5. Acceptance Criteria

1. OAuth callback không còn ghi `accountId` thành Mongo internal id.
2. Nếu account có nhiều Page và chưa có `pageId`, publish fail với lỗi hướng dẫn chọn `pageId`.
3. Nếu có `pageId`, hệ thống resolve đúng Page token qua `/me/accounts` và publish dùng token đó.
4. Nếu `pageId` không thuộc danh sách Page của token hiện tại, fail với lỗi rõ ràng.
5. Có regression tests cho success và failure path mới.

## 6. Technical Plan

1. Update callback mapping + Facebook auth resolver.
2. Add page-list based token resolver and error codes.
3. Update UI/status copy for Page ID visibility.
4. Add tests and run focused/full verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/app/api/social/oauth/callback/[platform]/route.ts`
  - `src/lib/social/facebook-auth.ts`
  - `src/lib/social/facebook-upload.ts`
  - `src/features/social/*`
  - tests/docs/changelog/tasks.

## 8. Test Plan

1. Unit tests cho Facebook auth resolver: single-page, multi-page missing pageId, unknown pageId.
2. Unit tests cho Facebook upload path liên quan page resolution.
3. Run `npm run test` và `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: không log raw tokens.
- Error codes:
  - `AUTH_FACEBOOK_PAGE_ID_REQUIRED`
  - `AUTH_FACEBOOK_PAGE_ID_NOT_ACCESSIBLE`
  - `PRV_FACEBOOK_PAGE_LIST_FAILED`

## 10. Risks & Rollback

- Risks: Một số token cấp quyền hạn chế có thể không đọc được `/me/accounts`.
- Rollback strategy: revert resolver hardening và giữ behavior cũ.

## 11. Deliverables

1. Hardened Facebook page/token resolution.
2. Regression tests.
3. Docs/changelog/task updates.

## 12. Changelog Note

- Fix Facebook publish-now failure by enforcing explicit page selection and proper Page token resolution from `/me/accounts`.

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

- Assumptions: Facebook publish target luôn là Page, không phải profile.
- Blockers:
- Verification evidence:
  - OAuth callback no longer overwrites Facebook platform `accountId` using internal Mongo id from OAuth state.
  - Facebook resolver now uses `/me/accounts` to map `pageId` -> `pageAccessToken`; when multiple Pages exist and `pageId` is not configured, it fails with actionable `AUTH_FACEBOOK_PAGE_ID_REQUIRED`.
  - Social Accounts UI now shows configured Facebook Page ID preview in account rows for operational clarity.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/facebook-auth.test.ts` (new)
  - `src/lib/social/facebook-upload.test.ts` (updated)
  - `src/lib/social/connection-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (14 tests / 3 files).
  - Full suite pass (120 tests / 30 files).
  - Build pass; existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
