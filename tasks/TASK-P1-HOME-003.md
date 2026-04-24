# [P1-HOME-003] Simplify leftbar structure + light mode branding adjustments

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [ ] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P1-HOME-003
- Phase: Phase 1
- Target Phase: Phase 1
- Domain: Frontend
- Task Type: Refactor
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Owner yêu cầu leftbar phải gọn, một file chính, naming rõ ràng và light mode mặc định.
- Bài toán cần giải quyết: Gộp module leftbar về `components/layout/leftbar.tsx`, cập nhật branding/footer, chỉnh theme mặc định.
- Tài liệu liên quan: tasks/templates/task-template.md.

## 3. Scope

- In scope: Refactor folder/file structure, đổi text UI, đổi theme default sang light.
- Out of scope: Thiết kế page content.

## 4. Input / Output

- Input: Feedback trực tiếp từ owner.
- Output mong đợi: Leftbar gọn, đúng naming, đúng light theme.

## 5. Acceptance Criteria

1. Leftbar nằm tại `src/components/layout/leftbar.tsx`.
2. Không còn module leftbar nhiều file rời rạc.
3. Top brand hiển thị `OmniVideo`.
4. Footer hiển thị `OmniVideo + version`.
5. App mặc định light mode.

## 6. Technical Plan

1. Gộp code leftbar vào một file.
2. Cập nhật import page.
3. Xoá file/module cũ không cần thiết.
4. Chỉnh layout default theme.
5. Build/lint xác nhận không lỗi.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: app layout, page import, components tree.

## 8. Test Plan

1. Verify UI bằng build compile.
2. Verify không còn import hỏng sau khi xoá file cũ.

## 9. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Xoá file cũ có thể làm thiếu import.
- Rollback strategy: restore path cũ nếu compile fail.

## 11. Deliverables

1. Leftbar file đơn.
2. Theme default light.
3. Board/changelog update.

## 12. Changelog Note

- Changed: Simplified leftbar to single file layout and switched default theme to light.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

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

- Assumptions: Tạm thời không cần thêm test mới theo owner request.
- Blockers: Không.
- Verification evidence: Leftbar đã chạy theo layout tham chiếu, search/filter/collapse hoạt động, user/email row và footer text đã chỉnh theo yêu cầu.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: N/A (owner requested temporary skip)
- Test commands executed: `npm run lint`, `npm run build`
- Test results summary: lint pass, production build pass.
