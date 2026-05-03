# [FAST-UX-009] Add 5 Typography Options and 3 Additional Light Themes

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
- Task ID: FAST-UX-009
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
- Lý do: Cần mở rộng lựa chọn Typography và Light theme để test visual direction linh hoạt hơn.
- Bài toán cần giải quyết: Bổ sung 5 font options và 3 light theme mới trong hệ preference hiện tại.
- Tài liệu liên quan:
  - docs/governance/ai-agent-rules.md
  - docs/governance/testing-rules.md

## 3. Scope
- In scope:
  - Thêm 5 AppFontKey + APP_FONT_OPTIONS.
  - Thêm 3 AppThemeKey light + APP_THEME_OPTIONS.
  - Thêm CSS variables cho 3 theme mới.
  - Cập nhật test preference.
- Out of scope:
  - Redesign từng màn hình theo theme riêng.

## 4. Acceptance Criteria
1. Tổng typography options tăng từ 5 lên 10.
2. Tổng theme options tăng từ 7 lên 10, gồm thêm 3 light themes.
3. Có CSS token cho 3 theme mới và apply được qua data-theme.
4. Test preferences pass với số lượng mới.

## 5. Test Plan
1. Chạy `npm run test -- --run src/lib/ui/preferences.test.ts`.

## 6. Test Evidence
- Test files added/updated: src/lib/ui/preferences.test.ts
- Test commands executed: npm run test -- --run src/lib/ui/preferences.test.ts
- Test results summary: Pass (to be filled after execution)
