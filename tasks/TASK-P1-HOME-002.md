# [P1-HOME-002] Rebuild app theo create-next style và chỉ triển khai leftbar OmniVideo

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

- Task ID: P1-HOME-002
- Phase: Phase 1
- Target Phase: Phase 1
- Domain: Frontend
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Owner yêu cầu rebuild lại phần app theo hướng create-next, chỉ cần leftbar trước, giữ style gần như gốc.
- Bài toán cần giải quyết: Tổ chức lại cấu trúc file chuyên nghiệp và triển khai leftbar độc lập, có search/filter/collapse animation.
- Tài liệu liên quan: docs/governance/testing-rules.md, docs/architecture/nextjs-mongodb-conventions.md.

## 3. Scope

- In scope: reset phần app code, tạo lại layout + globals theo token CSS, leftbar component hóa, test utility lọc nav.
- Out of scope: giao diện các trang nội dung bên phải, backend integration.

## 4. Input / Output

- Input: snippet leftbar và yêu cầu custom (omnivideo, bỏ user/email, footer rỗng).
- Output mong đợi: app chạy được với leftbar theo style tham chiếu, codebase sạch.

## 5. Acceptance Criteria

1. Cấu trúc dự án theo kiểu create-next (app router + globals + config chuẩn).
2. Trang chủ chỉ hiển thị leftbar, không implement page content khác.
3. Leftbar có search/filter/collapse section animation như yêu cầu.
4. Có test cho logic filter navigation.
5. Build và test pass.

## 6. Technical Plan

1. Tạo lại setup app files theo chuẩn create-next.
2. Tách leftbar thành nhiều file (types/nav/utils/components).
3. Áp theme/font/token CSS theo snippet.
4. Viết và chạy unit test utility.
5. Build, cập nhật task/board/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: app scaffold, leftbar component module, scripts/dependencies.

## 8. Test Plan

1. Test query rỗng trả full groups.
2. Test query match lọc đúng item/group.
3. Test query không match trả mảng rỗng.
4. Chạy build production để verify compile.

## 9. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Tailwind token differences có thể gây lệch nhẹ giao diện.
- Rollback strategy: giữ cấu trúc component, tinh chỉnh token/class sau.

## 11. Deliverables

1. Leftbar app running.
2. Clean component/module structure.
3. Test evidence + build evidence.

## 12. Changelog Note

- Changed: Rebuilt app shell to leftbar-only setup with professional structure.

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

- Assumptions: Ưu tiên “leftbar only” đúng theo owner request.
- Blockers: Không.
- Verification evidence: Leftbar đã chạy theo layout tham chiếu, search/filter/collapse hoạt động, user/email row và footer text đã loại bỏ.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/components/leftbar/utils.test.ts`
- Test commands executed: `npm test`, `npm run lint`, `npm run build`
- Test results summary: 3 unit tests pass, lint pass, production build pass.
