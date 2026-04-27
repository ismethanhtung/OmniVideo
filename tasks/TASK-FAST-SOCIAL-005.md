# [FAST-SOCIAL-005] Cache Facebook Page List and Manual Refresh in Social Accounts

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

- Task ID: FAST-SOCIAL-005
- Phase: FAST
- Target Phase: Social runtime reliability hardening
- Domain: Social Account Management
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Facebook Graph API dễ trả `OAuthException code=4 (Application request limit reached)` khi load page list nhiều lần từ UI/runtime.
- Bài toán cần giải quyết: Cache page list theo social account để runtime/UI chỉ đọc local data; chỉ gọi Graph khi user chủ động refresh.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Chuẩn hóa cache page list trong `secrets.connectionJson.pages`.
  - `GET /api/social/accounts/[accountId]/facebook-pages` ưu tiên đọc cache, tránh hit Graph.
  - Thêm `POST /api/social/accounts/[accountId]/facebook-pages` để refresh list từ Graph và persist vào account.
  - Best-effort refresh cache ngay sau Facebook OAuth callback (không làm fail callback nếu Graph rate-limited).
  - Thêm nút `Update Pages` trong Social Accounts cho account Facebook.
  - Cập nhật tests + changelog + docs liên quan.
- Out of scope:
  - Background scheduler tự refresh pages.
  - Auto-diff/xóa pages theo lifecycle nâng cao.

## 4. Input / Output

- Input: Social account Facebook có access token; thao tác user tại Social Accounts.
- Output mong đợi: UI/runtime có page list ổn định từ cache; chỉ refresh khi user bấm `Update Pages`.

## 5. Acceptance Criteria

1. `GET /facebook-pages` trả list từ cache khi có cache, không phụ thuộc Graph request thường xuyên.
2. Có `POST /facebook-pages` refresh pages từ Graph và lưu lại `connectionJson.pages`.
3. Social Accounts có action `Update Pages` cho account Facebook và hiển thị kết quả refresh.
4. OAuth callback Facebook cố gắng cache pages ngay khi connect thành công, nhưng không fail toàn flow nếu refresh gặp rate-limit.
5. Có test bao phủ flow mới (happy + failure path chính).

## 6. Technical Plan

1. Refactor `facebook-auth` để tách read cached pages, refresh pages, merge cache payload.
2. Mở rộng API route facebook-pages với `POST` refresh + persist.
3. Cập nhật OAuth callback để best-effort hydrate cache pages.
4. Cập nhật Social Accounts UI thêm `Update Pages`.
5. Thêm/cập nhật tests cho helper + route.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/social/facebook-auth.ts`
  - `src/app/api/social/accounts/[accountId]/facebook-pages/route.ts`
  - `src/app/api/social/oauth/callback/[platform]/route.ts`
  - `src/features/social/social-accounts-panel.tsx`
  - tests liên quan

## 8. Test Plan

1. Unit test facebook auth helper (cached vs refresh).
2. API route test cho GET/POST facebook pages.
3. Regression test cho oauth callback flow.

## 9. Observability

- Metrics: none.
- Logs: không log access token/page token.
- Error codes: dùng `PRV_FACEBOOK_PAGE_LIST_FAILED`, `AUTH_FACEBOOK_ACCESS_TOKEN_MISSING`.

## 10. Risks & Rollback

- Risks: Cache stale nếu user tạo page mới nhưng chưa refresh.
- Rollback strategy: revert route/UI change và quay về cơ chế fetch trực tiếp hiện tại.

## 11. Deliverables

1. Cached page list flow mặc định.
2. Manual refresh pages action ở Social Accounts.
3. Tests + docs/changelog/task evidence đầy đủ.

## 12. Changelog Note

- Cache Facebook page list on account and add manual Update Pages action to avoid Graph rate-limit during regular UI/runtime loads.

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

- Assumptions: `connectionJson` là nơi lưu metadata runtime phù hợp cho pages cache.
- Blockers: none.
- Verification evidence:
  - `GET /api/social/accounts/[accountId]/facebook-pages` trả dữ liệu từ cache (`connectionJson.pages`) thay vì gọi Graph API mặc định.
  - Thêm `POST /api/social/accounts/[accountId]/facebook-pages` để refresh pages từ Graph và persist lại cache vào account secrets.
  - OAuth callback Facebook và create-account (khi có accessToken) đều best-effort hydrate cache pages; lỗi refresh không làm fail flow chính.
  - Social Accounts table có nút `Update Pages` cho account Facebook để user refresh khi tạo Page mới.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/facebook-auth.test.ts` (updated)
  - `src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/social/facebook-auth.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts' src/lib/social/facebook-pages-client.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass (12 tests / 3 files).
  - Build pass; warning cũ còn tồn tại ở `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
