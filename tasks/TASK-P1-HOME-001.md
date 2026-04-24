# [P1-HOME-001] Xây dựng trang chủ OmniVideo theo layout tham chiếu và refactor module hóa

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

- Task ID: P1-HOME-001
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

- Lý do: Cần bước đầu triển khai trang chủ theo giao diện tham chiếu, nhưng phải refactor thành cấu trúc chuyên nghiệp phù hợp OmniVideo.
- Bài toán cần giải quyết: Clone visual style của sidebar/settings, chuyển thành homepage dashboard có cấu trúc component hóa, dễ mở rộng.
- Tài liệu liên quan: docs/architecture/nextjs-mongodb-conventions.md, docs/governance/testing-rules.md, tasks/templates/task-template.md.

## 3. Scope

- In scope: Dựng homepage layout + sidebar + content sections + style system cơ bản; refactor thành modules rõ ràng; thêm test cho logic lọc nav.
- Out of scope: Tích hợp backend, auth, data thật từ MongoDB.

## 4. Input / Output

- Input: UI snippet người dùng cung cấp và yêu cầu clone style ban đầu.
- Output mong đợi: Trang chủ OmniVideo chạy được bằng Next.js, cấu trúc code sạch, có test cơ bản.

## 5. Acceptance Criteria

1. Có homepage với left sidebar style tương đồng mẫu tham chiếu.
2. Có custom nội dung phù hợp OmniVideo Home (hero/quick actions/system cards/recent runs).
3. Code được tổ chức theo module tách config/components/utils.
4. Có test cho logic `filter nav groups` (happy + query cases).
5. Cập nhật changelog và task evidence đầy đủ.

## 6. Technical Plan

1. Dựng khung Next.js App Router tối thiểu cần thiết.
2. Tách module `src/modules/home` gồm config/types/utils/components.
3. Xây homepage với sidebar + main panels theo theme clone/refactor.
4. Viết test dùng `node:test` cho utility lọc navigation.
5. Chạy test, cập nhật task/board/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/*`, `src/modules/home/*`, root setup files.

## 8. Test Plan

1. Chạy unit test cho utility lọc nav groups.
2. Verify query rỗng trả full groups.
3. Verify query có lọc item đúng theo label.
4. Verify query không match trả empty groups.

## 9. Observability

- Metrics: N/A (UI scaffold)
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Chưa có backend nên UI sẽ dùng mock data ban đầu.
- Rollback strategy: Giữ component contracts, thay mock bằng API sau.

## 11. Deliverables

1. Next.js homepage scaffold + module hóa.
2. UI clone/refactor cho OmniVideo.
3. Test file + test results.

## 12. Changelog Note

- Added: OmniVideo home page initial implementation with modular architecture.

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

- Assumptions: Ưu tiên giao diện homepage đầu tiên, chưa nối dữ liệu thật.
- Blockers: Không.
- Verification evidence: UI layout mới theo thiết kế tham chiếu, đã refactor module và tách utility test được.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/modules/home/utils/filter-nav-groups.test.ts`
- Test commands executed: `npm test`, `npm run build`
- Test results summary: 3 unit tests passed, Next.js production build passed successfully.
