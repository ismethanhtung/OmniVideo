# [FAST-SOCIAL-004] Add Semantic Status Colors for Social Runtime Panels

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

- Task ID: FAST-SOCIAL-004
- Phase: FAST
- Target Phase: Social runtime UX hardening
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Các trạng thái như `published`, `failed`, `planned`, `connected`, `needs_auth` đang hiển thị text trơn ở nhiều chỗ nên khó scan nhanh.
- Bài toán cần giải quyết: Chuẩn hóa màu trạng thái theo semantics và tái sử dụng được giữa các social panels.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Tạo shared status badge helper cho social UI.
  - Áp dụng badge ở các vị trí chính trong Published Content + Publish Records + Social Accounts.
  - Bổ sung test cho status color mapping.
- Out of scope:
  - Redesign layout tổng thể của social pages.
  - Thay đổi API/status enums backend.

## 4. Input / Output

- Input: Status strings từ account/publish records/remote inventory (`published`, `failed`, `planned`, `connected`, `needs_auth`, ...).
- Output mong đợi: Status hiển thị có màu semantic nhất quán để user hiểu nhanh.

## 5. Acceptance Criteria

1. `Published Content` hiển thị status badge có màu semantic thay cho text trơn ở các vùng inventory chính.
2. `Publish Records` cột status hiển thị badge có màu semantic.
3. `Social Accounts` dùng cùng shared status badge (không giữ mapping local riêng).
4. Có test cover mapping status -> style và normalize label cơ bản.

## 6. Technical Plan

1. Tạo `status-badge` helper cho social features với normalize + tone mapping theo status.
2. Refactor các panel sử dụng helper.
3. Viết test cho helper và chạy test suite liên quan.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/social/status-badge.tsx` (new)
  - `src/features/social/published-content-panel.tsx`
  - `src/features/social/publish-records-panel.tsx`
  - `src/features/social/social-accounts-panel.tsx`
  - `src/features/social/status-badge.test.ts` (new)

## 8. Test Plan

1. Unit test: status mapping và label normalize trong status badge helper.
2. Regression sanity: chạy toàn bộ `npm run test` để đảm bảo social panels không vỡ.
3. Kết quả mong đợi: test pass, không regression compile/type.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Một số status lạ có thể chưa map semantic như kỳ vọng.
- Rollback strategy: fallback helper về neutral style và giữ nguyên text value.

## 11. Deliverables

1. Shared social status badge component.
2. Semantic status colors áp dụng cho social runtime UI chính.
3. Test evidence + changelog/task updates.

## 12. Changelog Note

- Add shared semantic status badges across social runtime panels to improve status scanability.

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

- Assumptions: Semantic colors theo nhóm trạng thái (success/warn/error/info/neutral) là đủ cho UX hiện tại.
- Blockers:
- Verification evidence:
  - Added shared status mapping helper (`status-badge-style.ts`) and reusable UI badge (`status-badge.tsx`).
  - Applied semantic badges in `Published Content` (account status, local record status, YouTube remote status, asset footprint status).
  - Applied semantic badges in `Publish Records` status column and panel runtime status.
  - Migrated `Social Accounts` to shared status badge helper (removed local duplicated mapping).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/social/status-badge-style.ts` (new)
  - `src/features/social/status-badge.tsx` (new)
  - `src/features/social/status-badge.test.ts` (new)
  - `src/features/social/published-content-panel.tsx` (updated)
  - `src/features/social/publish-records-panel.tsx` (updated)
  - `src/features/social/social-accounts-panel.tsx` (updated)
- Test commands executed:
  - `npm run test -- --run src/features/social/status-badge.test.ts src/features/social/published-content-panel.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (6 tests / 2 files).
  - Full suite pass (133 tests / 34 files).
  - Build pass; existing lint warnings remain in unrelated files (`src/components/layout/navigation.ts`, `src/features/workspace/display-preferences-panel.tsx`).
