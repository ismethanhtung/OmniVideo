# [FAST-GOV-003] Strengthen Version Bump Governance Workflow

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

- Task ID: FAST-GOV-003
- Phase: FAST
- Target Phase: Governance hardening
- Domain: Governance
- Task Type: Docs
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Dù đã có versioning rules, quy tắc cũ chưa đủ cụ thể để bắt buộc bump version đúng thời điểm; app dễ bị giữ ở cùng một version quá lâu.
- Bài toán cần giải quyết: chuẩn hóa quyết định bump `patch/minor/major` và quy trình thao tác bắt buộc khi release.
- Tài liệu liên quan:
  - `docs/governance/versioning-rules.md`
  - `docs/governance/ai-agent-rules.md`

## 3. Scope

- In scope:
  - Bổ sung matrix quyết định bump version theo loại thay đổi.
  - Bổ sung workflow chuẩn thao tác bump version + verify.
  - Bổ sung enforcement rule để không chốt Done/release sai version.
- Out of scope:
  - Tự động hóa release pipeline.
  - Git tag/release notes automation.

## 4. Input / Output

- Input: Quy tắc versioning hiện tại.
- Output mong đợi: Bộ rules rõ ràng, có thể áp dụng ngay để tránh giữ nguyên version qua nhiều release.

## 5. Acceptance Criteria

1. `docs/governance/versioning-rules.md` có decision matrix cho `patch/minor/major`.
2. Có workflow thao tác bump version chuẩn kèm verify tối thiểu.
3. Có rule enforcement rõ ràng để ngăn Done/release khi chưa bump version đúng.
4. Task board và changelog được cập nhật đầy đủ.

## 6. Technical Plan

1. Cập nhật nội dung `docs/governance/versioning-rules.md`.
2. Tạo task FAST-GOV-003 với bằng chứng thực thi.
3. Cập nhật `tasks/board.md` và `changelog/changelog.md`.

## 7. Code Change Impact

- Có thay đổi code không: No
- Nếu Yes, module impacted: N/A

## 8. Test Plan

1. Không có thay đổi code runtime nên không yêu cầu test suite.
2. Verify thủ công tính đầy đủ của rules + traceability (task/board/changelog).
3. Kết quả mong đợi: docs nhất quán và có thể áp dụng trực tiếp.

## 9. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Rule mới chặt hơn có thể yêu cầu discipline cao hơn khi đóng release.
- Rollback strategy: Revert riêng tài liệu nếu owner không muốn áp dụng enforcement mới.

## 11. Deliverables

1. `docs/governance/versioning-rules.md` cập nhật.
2. Task record `tasks/TASK-FAST-GOV-003.md`.
3. Board + changelog entry tương ứng.

## 12. Changelog Note

- Strengthen version bump governance with decision matrix, mandatory workflow, and release enforcement.

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

- Assumptions:
  - Team dùng release batch theo task/changelog hiện có.
- Blockers:
  - Không có.
- Verification evidence:
  - `docs/governance/versioning-rules.md` có thêm SemVer strict note, bump decision matrix, workflow chuẩn (`npm version ... --no-git-tag-version`) và enforcement rule mới.
  - `tasks/board.md` cập nhật trạng thái Done cho FAST-GOV-003.
  - `changelog/changelog.md` thêm mục FAST-GOV-003.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - N/A (docs-only)
- Test commands executed:
  - N/A (docs-only)
- Test results summary:
  - N/A (docs-only)
