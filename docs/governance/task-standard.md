# Task Standard

## 1. Objective

Chuẩn hóa task để mọi thay đổi đều có scope rõ, acceptance criteria đo được, tiến độ dễ nhìn, và kiểm chứng được.

## 2. Task ID Convention

Format:

`[PHASE]-[DOMAIN]-[NNN]`

Ví dụ:

- `SETUP-GOV-001`
- `P1-PIPE-003`
- `P2-PROVIDER-002`

## 3. Required Fields

1. `Progress Stamp` (`[ ]/[x]`)
2. `Task ID`
3. `Title`
4. `Phase`
5. `Target Phase`
6. `Domain`
7. `Task Type`
8. `Owner`
9. `Status`
10. `Priority`
11. `Context`
12. `Scope (In/Out)`
13. `Acceptance Criteria`
14. `Technical Plan`
15. `Test Plan`
16. `Observability`
17. `Risks & Rollback`
18. `Deliverables`
19. `Changelog Note`
20. `Execution Notes`
21. `Test Evidence` (bắt buộc nếu có code change)

## 4. Progress Stamp Rule

Task template phải có checklist đóng dấu ở đầu để nhìn tiến độ nhanh:

1. DoR completed
2. Scope locked
3. Implementation completed
4. Tests added/updated (if code changed)
5. Docs updated (if impacted)
6. Changelog updated
7. Ready for review
8. Done

## 5. Quality Criteria for Acceptance Criteria

Acceptance criteria tốt phải:

1. Cụ thể, đo được.
2. Gắn với hành vi hệ thống, không viết mơ hồ.
3. Có thể verify độc lập.

Ví dụ tốt:

- "Khi tạo JobRun mới, `status=queued` và có event `created` trong `run_events`."

Ví dụ không đạt:

- "Hệ thống hoạt động ổn định hơn."

## 6. Required Artifacts per Task

1. 1 file task chi tiết trong `tasks/`.
2. 1 dòng cập nhật trong `tasks/board.md`.
3. 1 entry trong `changelog/changelog.md` khi hoàn tất.
4. Nếu có đổi code: phải có test files changed hoặc lý do exception có approval.

## 7. Task Sizing Rule

1. `S` <= 1 ngày.
2. `M` 2-3 ngày.
3. `L` > 3 ngày (nên tách nhỏ).

Task `L` bắt buộc có breakdown thành sub-task.

## 8. Review Checklist

1. Progress stamp có cập nhật đúng thực tế không.
2. Scope có đúng phase không.
3. Acceptance criteria có đo được không.
4. Test plan có case lỗi chính không.
5. Code changes có test tương ứng không.
6. Có impact lên docs/rules/changelog không.
