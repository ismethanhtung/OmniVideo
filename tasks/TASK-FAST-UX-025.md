# [FAST-UX-025] Align Workspace Outer Spacing with App Pages

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-UX-025
- Phase: FAST
- Target Phase: UX polish
- Domain: UI/UX
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Trang Workspace đang có outer padding nhỏ hơn các trang khác, tạo cảm giác lệch layout toàn app.
- Bài toán cần giải quyết: Đồng bộ outer spacing của Workspace với quy ước spacing hiện tại (`px-5 py-5`) của các page chính.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Sửa class wrapper của Workspace trong `ContentRouter` để dùng padding đồng bộ với page khác.
  - Cập nhật source-level test để khóa regression spacing mismatch.
- Out of scope:
  - Redesign canvas/editor nội bộ của Workspace.
  - Thay đổi spacing riêng của từng block trong `WorkspaceCanvasPanel`.

## 4. Input / Output

- Input: `workspace` route đang dùng `p-3` ở wrapper ngoài trong `src/components/layout/content-router.tsx`.
- Output mong đợi: `workspace` route dùng `p-5` để đồng bộ outer spacing với các section khác.

## 5. Acceptance Criteria

1. `workspace` branch trong `ContentRouter` không còn dùng `p-3`.
2. `workspace` branch dùng `p-5` ở wrapper ngoài.
3. Có regression test source-level xác nhận class workspace wrapper.

## 6. Technical Plan

1. Cập nhật className của `workspace` main wrapper trong `ContentRouter` từ `p-3` sang `p-5`.
2. Bổ sung assertion trong `content-router.test.ts` để khóa class workspace wrapper.
3. Chạy focused test + guard version.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/content-router.tsx`
  - `src/components/layout/content-router.test.ts`

## 8. Test Plan

1. Source-level regression test xác nhận workspace wrapper dùng `p-5` và không còn `p-3`.
2. Chạy focused Vitest cho `content-router.test.ts`.
3. Chạy `npm run guard:version` theo governance cho runtime code change.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Khoảng trắng outer ở Workspace tăng nhẹ so với trước.
- Rollback strategy: Đổi class wrapper về `p-3` nếu owner muốn layout sát hơn.

## 11. Deliverables

1. Workspace outer spacing đồng bộ với app pages.
2. Regression test cho class workspace wrapper.
3. Test evidence + changelog entry.

## 12. Changelog Note

- Align Workspace page outer padding with shared app section spacing.

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

- Assumptions:
  - Chuẩn spacing tham chiếu là `px-5 py-5` đang dùng trên phần lớn sections.
- Root cause:
  - `workspace` branch trong `ContentRouter` dùng riêng `p-3`, thấp hơn chuẩn page wrappers khác.
- Verification evidence:
  - Source class đã đổi sang `p-5`, test đã khóa behavior.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/content-router.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/content-router.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (1 file / 3 tests) for focused ContentRouter test.
  - `guard:version` pass.
