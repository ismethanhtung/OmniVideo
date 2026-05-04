# FAST-UX-024 Auto-sort exploited Inspiration items to bottom

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

- Task ID: FAST-UX-024
- Phase: P2
- Target Phase: P2
- Domain: UX / Inspiration Vault
- Task Type: Bugfix
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: User muốn item sau khi đánh `Exploited` tự động rơi xuống dưới danh sách.
- Bài toán cần giải quyết: đảm bảo mỗi bảng trong Inspiration Vault sắp xếp chưa exploited trước, exploited sau.
- Tài liệu liên quan: `src/features/inspiration-vault/inspiration-vault-panel.tsx`.

## 5. Acceptance Criteria

1. Khi toggle `Exploited = true`, row tương ứng di chuyển xuống phần cuối danh sách trong category đó.
2. Item chưa exploited luôn nằm trên item đã exploited.
3. Test regression cho panel được cập nhật.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  `src/features/inspiration-vault/inspiration-vault-panel.test.ts`
- Test commands executed:
  `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts`
- Test results summary:
  Pass (1 file / 2 tests).
