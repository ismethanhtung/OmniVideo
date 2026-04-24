# [P1-UX-001] Sửa UX nav: Connection Test hiển thị ở panel bên phải, không hiển thị trong leftbar

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

- Task ID: P1-UX-001
- Phase: Phase 1
- Target Phase: Phase 1
- Domain: Frontend
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: UX hiện tại sai. Click `Connection Test` đang hiển thị trạng thái ngay trong leftbar thay vì panel nội dung bên phải.
- Bài toán cần giải quyết: tách navigation và content area đúng luồng điều hướng.
- Tài liệu liên quan: yêu cầu trực tiếp của owner trong hội thoại hiện tại.

## 3. Scope

- In scope: Leftbar chỉ làm navigation, page render nội dung bên phải theo section active, trang Connection Test nằm ở panel bên phải.
- Out of scope: thiết kế chi tiết tất cả trang settings.

## 4. Input / Output

- Input: phản hồi UX từ owner.
- Output mong đợi: click nav đổi nội dung panel phải, đặc biệt Connection Test chạy ở panel phải.

## 5. Acceptance Criteria

1. Leftbar không còn hiển thị trạng thái DB.
2. Click `Connection Test` hiển thị trang `Connection Test` ở bên phải.
3. Trang `Connection Test` gọi `/api/health/db` và hiển thị kết quả ở panel phải.
4. Lint/build pass.

## 6. Technical Plan

1. Refactor Leftbar nhận `activeSection` + `onSectionChange` từ parent.
2. Dựng page client shell có khu vực content bên phải.
3. Tạo view `Connection Test` trong panel phải và gọi API health.
4. Chạy lint/build và cập nhật task/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/leftbar.tsx`, `src/app/page.tsx`.

## 8. Test Plan

1. Manual verify nav click đổi content panel.
2. Manual verify click `Connection Test` chạy check DB ở panel phải.
3. Chạy lint/build để verify compile.

## 9. Observability

- Metrics: latency hiển thị trong panel Connection Test.
- Logs: N/A
- Error codes: DB_HEALTH_FAILED (từ API)

## 10. Risks & Rollback

- Risks: refactor state có thể làm active nav mất đồng bộ.
- Rollback strategy: giữ activeSection ở parent như single source of truth.

## 11. Deliverables

1. UX fix cho nav/content split.
2. Connection Test page right panel.

## 12. Changelog Note

- Fixed: Connection Test UX now renders in right panel instead of sidebar.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [ ] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: ưu tiên đúng UX flow trước, style content panel giữ tối giản cùng visual language.
- Blockers: Không.
- Verification evidence: Leftbar chỉ còn chức năng điều hướng, panel phải hiển thị content theo nav, Connection Test chạy và hiển thị kết quả ở panel phải.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: N/A (manual verification focus)
- Test commands executed: `npm run lint`, `npm run build`
- Test results summary: lint pass, build pass.
