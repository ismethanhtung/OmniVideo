# FAST-SOCIAL-001 Add Quick Open Links For Published Posts

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

- Task ID: FAST-SOCIAL-001
- Phase: FAST
- Target Phase: Social Platform MVP
- Domain: Social Account Management
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Sau khi publish, user cần click mở bài đăng ngay để kiểm tra kết quả thực tế.
- Bài toán cần giải quyết: `Publish Records` và `Published Content` mới chỉ hiển thị `platformPostId` dạng text.
- Tài liệu liên quan: `docs/domains/social-account-management.md`.

## 3. Scope

- In scope:
  - Thêm helper build URL bài đăng từ `platform` + `platformPostId`.
  - Render link `Open` trên `Publish Records` và `Published Content` khi có URL hợp lệ.
- Out of scope:
  - Bổ sung mapping URL đầy đủ cho mọi platform không có quy tắc URL ổn định từ ID.

## 4. Input / Output

- Input: publish records data.
- Output mong đợi: user click được link đi đến bài đăng đã publish.

## 5. Acceptance Criteria

1. `Publish Records` có cột post link và mở tab mới khi URL hợp lệ.
2. `Published Content` account inventory hiển thị link mở post khi URL hợp lệ.
3. `Published Content` video footprint hiển thị chip có thể click mở post khi URL hợp lệ.
4. Build và tests liên quan pass.

## 6. Technical Plan

1. Thêm utility `buildPublishedPostUrl` trong social shared types.
2. Dùng utility cho cả 2 panels để render link `Open`.
3. Chạy tests và build verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/social/*`.

## 8. Test Plan

1. Chạy social tests liên quan.
2. Chạy build typecheck.
3. Kiểm tra manual UI link rendering.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Với platform không đủ dữ liệu URL, vẫn fallback hiển thị `platformPostId`.
- Rollback strategy: revert các thay đổi UI helper/link rendering.

## 11. Deliverables

1. Link mở bài đăng tại `Publish Records`.
2. Link mở bài đăng tại `Published Content`.

## 12. Changelog Note

- Thêm quick-open links cho published posts ở social panels.

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

- Assumptions: Chỉ auto build URL chắc chắn cho YouTube hoặc khi `platformPostId` đã là URL đầy đủ.
- Blockers: none.
- Verification evidence: `npm run test -- --run src/app/api/social/published-content/route.test.ts src/lib/social/inventory.test.ts` pass; `npm run build` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: none.
- Test commands executed: `npm run test -- --run src/app/api/social/published-content/route.test.ts src/lib/social/inventory.test.ts`; `npm run build`.
- Test results summary: pass.
