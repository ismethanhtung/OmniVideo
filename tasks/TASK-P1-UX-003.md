# [P1-UX-003] Storage Library layout refinements, dark delete button fix, and merged Typography+Appearance settings

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

- Task ID: P1-UX-003
- Phase: P1
- Target Phase: P1
- Domain: UX/UI
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User yêu cầu tinh chỉnh giao diện Storage Library và hiện thực phần cài đặt giao diện thay vì để placeholder.
- Bài toán cần giải quyết:
  - Đưa `Created` từ bảng vào phần `Detail`.
  - Thêm inline video preview mini trước cột Asset, không padding để chiếm full vùng cell nhỏ.
  - Sửa màu nút Delete ở dark mode để không lệch style.
  - Gộp `Typography + Appearance` thành 1 mục và cho phép chọn thật 5 font + 6 theme.
- Tài liệu liên quan: `docs/governance/testing-rules.md`, `docs/governance/ai-agent-rules.md`

## 3. Scope

- In scope:
  - Cập nhật table/detail modal của Storage Library.
  - Chuẩn hóa style nút delete tương thích dark mode.
  - Refactor navigation/settings để gộp Typography+Appearance.
  - Thêm state/apply persistence cho font/theme trong app shell.
- Out of scope:
  - Rework toàn bộ design system.
  - Thêm backend persistence cho user settings.

## 4. Input / Output

- Input: feedback UX trực tiếp từ user.
- Output mong đợi: layout Storage Library đúng yêu cầu; dark mode button không lệch; có panel settings hoạt động thật cho 5 font + 6 theme.

## 5. Acceptance Criteria

1. Storage Library có cột preview đứng trước `Asset` với video inline fill full cell (không padding), và bỏ cột `Created` khỏi table.
2. `Created` được hiển thị trong modal `Detail` của asset.
3. Nút `Delete` hiển thị hợp lý ở cả light/dark mode trong Storage Providers/Storage Library.
4. Leftbar không còn mục `Typography` và `Appearance` tách riêng; thay bằng mục gộp có thể chọn 5 font + 6 theme và áp dụng ngay lên app.
5. Test/lint/build pass.

## 6. Technical Plan

1. Sửa Storage Library table/detail theo layout mới (preview column + detail created).
2. Chuẩn hóa class cho delete buttons để không phụ thuộc hard-coded light-red.
3. Tạo UI preferences domain (font/theme options, load/apply helpers) + test.
4. Tạo panel settings gộp Typography+Appearance, nối qua AppShell + ContentRouter.
5. Cập nhật navigation/types để dùng section gộp.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/storage/storage-library-panel.tsx`, `src/features/storage/storage-providers-panel.tsx`, `src/components/layout/*`, `src/features/workspace/*`, `src/lib/ui/*`

## 8. Test Plan

1. Unit test cho helpers font/theme preferences.
2. Full `npm run test`.
3. `npm run lint`.
4. `npm run build`.

## 9. Observability

- N/A (UI/settings local state only).

## 10. Risks & Rollback

- Risks: đổi `AppSectionId` có thể làm mismatch routing/nav.
- Rollback strategy: revert section mapping về placeholder nếu phát sinh regression.

## 11. Deliverables

1. Storage Library layout updated.
2. Delete button dark-mode styling fixed.
3. Merged working preferences panel for typography+appearance.
4. Test evidence + changelog.

## 12. Changelog Note

- Refine Storage Library preview/detail layout, fix delete button dark style, and implement merged display preferences with 5 fonts and 6 themes.

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

- Assumptions: settings lưu localStorage là đủ cho phase hiện tại.
- Blockers: none.
- Verification evidence:
  - Storage Library table có preview video inline ở trước cột Asset, bỏ cột Created khỏi table, và chuyển Created vào Detail modal.
  - Delete button ở Storage Providers/Storage Library dùng style đồng nhất tương thích dark mode.
  - Leftbar gộp Typography + Appearance thành `Display`, panel settings áp dụng trực tiếp 5 fonts + 6 themes và lưu localStorage.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ui/preferences.test.ts`
- Test commands executed:
  - `npm run test -- src/lib/ui/preferences.test.ts`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (4 tests).
  - Full tests: pass (69 tests).
  - Lint: pass.
  - Build: pass.
