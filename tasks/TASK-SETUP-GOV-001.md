# [SETUP-GOV-001] Chuẩn hóa Governance Rules cho Repo

## 1. Metadata

- Task ID: SETUP-GOV-001
- Phase: Setup
- Target Phase: Setup
- Domain: Governance
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Cần bộ quy tắc cứng để AI agent và developer làm việc thống nhất.
- Bài toán cần giải quyết: Viết rules engineering/product/agent/task/DoR-DoD/changelog.
- Tài liệu liên quan: docs/governance/*, tasks/*.

## 3. Scope

- In scope: Tài liệu governance và quy trình task/changelog.
- Out of scope: Tự động enforcement bằng code.

## 4. Input / Output

- Input: Yêu cầu bắt buộc task chuẩn cho mỗi lần agent hoạt động.
- Output mong đợi: Bộ governance docs có thể áp dụng ngay.

## 5. Acceptance Criteria

1. Có file rules cho engineering và product.
2. Có AI agent rules với điều kiện bắt buộc trước/sau khi làm.
3. Có task standard + DoR/DoD + changelog policy rõ ràng.

## 6. Technical Plan

1. Viết governance docs theo từng chủ đề.
2. Đồng bộ với task board/template.
3. Bổ sung index governance.

## 7. Test Plan

1. Kiểm tra rule nào cũng có actionable criteria.
2. Kiểm tra không mâu thuẫn giữa ai-agent rules và DoR/DoD.
3. Kiểm tra task template phản ánh đầy đủ fields bắt buộc.

## 8. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 9. Risks & Rollback

- Risks: Rule quá chặt gây giảm tốc độ task nhỏ.
- Rollback strategy: Tách quick-path cho `FAST-*` task nhưng vẫn giữ traceability.

## 10. Deliverables

1. Bộ file governance trong `docs/governance/`.
2. Task system baseline trong `tasks/`.

## 11. Changelog Note

- Added: Governance and AI agent operating rules.

## 12. Execution Notes

- Assumptions: Repo ưu tiên docs-first.
- Blockers: Không.
- Verification evidence: File governance đã tạo.
