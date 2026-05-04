# FAST-UX-023 Remove Host Subline in Inspiration Vault Content Cell

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

- Task ID: FAST-UX-023
- Phase: P2
- Target Phase: P2
- Domain: UX
- Task Type: Refactor
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: dòng host dưới content không còn cần thiết trong bảng hiện tại.
- Bài toán cần giải quyết: dọn UI cell content gọn hơn.

## 3. Scope

- In scope: bỏ render `item.host` subline trong content cell.
- Out of scope: thay đổi logic phân loại/link metadata.

## 4. Acceptance Criteria

1. Ô `Content` không còn hiển thị dòng host.
2. Hành vi click-to-copy và feedback `Copied` giữ nguyên.

## 5. Test Evidence

- Test commands executed: None (UI-only micro change).
- Test results summary: N/A.
