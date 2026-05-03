# [FAST-UX-008] Global Full-Width Layout and Hide Per-Page Header Block

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-UX-008
- Phase: FAST
- Target Phase: UX polish
- Domain: UI/UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Nhiều trang đang bị giới hạn `max-width`, gây cảm giác thiếu không gian so với `Workspace` và `Video Tools Lab` vốn đang dùng full-width.
- Bài toán cần giải quyết: Thử nghiệm giao diện toàn app theo hướng full-width và ẩn phần header title/description ở đầu từng page để so sánh cảm quan.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Bỏ giới hạn `max-w-7xl` trong app content router cho các section thường.
  - Ẩn block title + description mặc định ở các panel dùng metadata `section`.
  - Cập nhật test source-level cho thay đổi layout/header behavior.
- Out of scope:
  - Redesign chi tiết từng panel.
  - Thay đổi modal width hoặc bảng dữ liệu nội bộ của từng module.

## 4. Input / Output

- Input: Layout app shell hiện tại với content router max-width và section title block trong từng panel.
- Output mong đợi: Toàn bộ section chính hiển thị full-width nhất quán, không còn block header title/description mặc định.

## 5. Acceptance Criteria

1. Content area cho các section thường không còn `max-w-7xl` wrapper.
2. `Display` section cũng dùng full-width wrapper như các section thường.
3. `section.label` và `section.description` không còn render tự động trong `ContentRouter`.
4. Có test evidence cho thay đổi source-level.

## 6. Technical Plan

1. Cập nhật `ContentRouter` để thay wrapper `mx-auto max-w-7xl` thành `w-full` với padding giữ nguyên.
2. Truyền `hideSectionHeader` vào các panel thông qua router và thêm gate render header block.
3. Viết/cập nhật test cho `content-router.tsx` để xác nhận full-width và hidden header behavior.
4. Chạy focused tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/content-router.tsx`
  - `src/components/layout/content-router.test.ts`

## 8. Test Plan

1. Source-level regression test cho wrapper classes và prop `hideSectionHeader`.
2. Failure case: đảm bảo workspace/videoToolsLab branch không bị ảnh hưởng bởi logic max-width cũ.
3. Chạy focused Vitest cho file test mới/cập nhật.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Một số panel có thể trông loãng hơn khi kéo full-width toàn màn lớn.
- Rollback strategy: Khôi phục `max-w-7xl` wrappers và bỏ `hideSectionHeader` gate trong `ContentRouter`.

## 11. Deliverables

1. Updated content router layout behavior.
2. Hidden default section header behavior.
3. Focused regression tests.

## 12. Changelog Note

- Add full-width app content experiment and hide default per-page header block.

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

- Assumptions:
  - Đây là UX experiment để review cảm quan trước khi chốt hướng final.
- Blockers:
  - none.
- Verification evidence:
  - Updated router layout/header logic and focused tests.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/content-router.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/content-router.test.ts`
- Test results summary:
  - Pass (2 tests / 1 file).
