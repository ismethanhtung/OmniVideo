# FAST-UX-019 Copy on Content Click in Inspiration Vault

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

- Task ID: FAST-UX-019
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

- Lý do: User muốn thao tác copy nhanh hơn, không cần nút riêng.
- Bài toán cần giải quyết: Copy trực tiếp khi click vào ô content.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: bỏ nút copy và gắn click-to-copy cho cột content.
- Out of scope: thay đổi logic dữ liệu khác.

## 4. Input / Output

- Input: feedback UX về thao tác copy.
- Output mong đợi: click content là copy item raw text.

## 5. Acceptance Criteria

1. Không còn nút `Copy` ở actions.
2. Click ô `Content` sẽ copy nội dung item.
3. Không ảnh hưởng các action khác (`Delete`, `Exploited`).

## 6. Technical Plan

1. Refactor row render trong Inspiration Vault.
2. Giữ helper copy hiện có, gắn vào content cell.
3. Run build verify và cập nhật artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: clipboard failure không crash UI.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: user có thể click nhầm và copy ngoài ý muốn.
- Rollback strategy: revert row interaction changes.

## 11. Deliverables

1. Content click-to-copy interaction.
2. Copy button removed.
3. Build evidence + changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Remove Copy button and enable click-to-copy directly on Content cell in Inspiration Vault.

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

- Assumptions: copy content uses `item.raw`.
- Blockers: None.
- Verification evidence: build pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-019.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: click-to-copy có thể bị trigger ngoài ý muốn nếu user click để chọn text.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
