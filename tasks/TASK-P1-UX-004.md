# [P1-UX-004] Add pastel light theme, restore Display logo style, and semantic dark-compatible action buttons

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

- Task ID: P1-UX-004
- Phase: P1
- Target Phase: P1
- Domain: UX/UI
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User yêu cầu bổ sung theme sáng pastel hồng, hiển thị logo Display giống style ban đầu, và giữ semantic màu đỏ/xanh cho actions nhưng tương thích dark mode.
- Bài toán cần giải quyết:
  - Thêm `light pastel pink` theme vào system.
  - Cập nhật Display panel để có logo visual giống leftbar branding.
  - Khôi phục semantic action styles (`Delete`, `Activate`) với token riêng theo theme.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Theme token update + preferences options update.
  - Display panel logo update.
  - Action button class update tại Storage Providers/Storage Library.
- Out of scope:
  - Redesign toàn bộ component kit.

## 4. Input / Output

- Input: feedback UX trực tiếp sau round chỉnh sửa trước.
- Output mong đợi: có thêm theme pastel hồng; logo Display giống branding ban đầu; nút delete/active giữ semantic color ở light & dark.

## 5. Acceptance Criteria

1. Có thêm theme `Light Pastel Pink` và apply được từ Display settings.
2. Display panel hiển thị logo GIF + OmniVideo wordmark như style ban đầu.
3. Nút `Delete` giữ semantic đỏ; nút `Activate` giữ semantic xanh; cả hai readable trong dark themes.
4. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng `preferences` với theme mới và cập nhật test.
2. Bổ sung semantic CSS variables/classes cho danger/success actions theo theme.
3. Áp class semantic vào nút Delete/Activate tại các panel liên quan.
4. Thêm branding block trong Display panel.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/globals.css`, `src/lib/ui/preferences.ts`, `src/lib/ui/preferences.test.ts`, `src/features/workspace/display-preferences-panel.tsx`, `src/features/storage/storage-providers-panel.tsx`, `src/features/storage/storage-library-panel.tsx`

## 8. Test Plan

1. Unit tests `src/lib/ui/preferences.test.ts`.
2. Full tests.
3. Lint + build.

## 9. Observability

- N/A.

## 10. Risks & Rollback

- Risks: semantic tokens áp rộng có thể ảnh hưởng visual consistency.
- Rollback strategy: revert utility classes về `border-main/bg-main` nếu cần.

## 11. Deliverables

1. New pastel light theme.
2. Restored Display branding style.
3. Semantic dark-compatible action button styles.
4. Test evidence + changelog.

## 12. Changelog Note

- Add pastel light theme, restore Display logo style, and bring back semantic delete/activate button colors with dark-mode compatibility.

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

- Assumptions: logo chuẩn là `/logo.gif` + chữ `OmniVideo` giống leftbar.
- Blockers: none.
- Verification evidence:
  - Theme `Light Pastel Pink` xuất hiện trong Display settings và apply được toàn app.
  - Display panel hiển thị branding block với logo GIF + chữ OmniVideo theo style header ban đầu.
  - Nút `Delete` và `Activate` dùng semantic tokens (`btn-danger`, `btn-success`) hiển thị tốt ở light/dark themes.

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
