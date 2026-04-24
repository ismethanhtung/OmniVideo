# Task Standard

## 1. Objective

Chuẩn hóa task để mọi thay đổi đều có scope rõ, acceptance criteria đo được, và kiểm chứng được.

## 2. Task ID Convention

Format:

`[PHASE]-[DOMAIN]-[NNN]`

Ví dụ:

- `SETUP-GOV-001`
- `P1-PIPE-003`
- `P2-PROVIDER-002`

## 3. Required Fields

1. `Task ID`
2. `Title`
3. `Phase`
4. `Domain`
5. `Owner`
6. `Status`
7. `Priority`
8. `Context`
9. `Scope (In/Out)`
10. `Acceptance Criteria`
11. `Technical Plan`
12. `Test Plan`
13. `Observability`
14. `Risks & Rollback`
15. `Deliverables`
16. `Changelog Note`

## 4. Quality Criteria for Acceptance Criteria

Acceptance criteria tốt phải:

1. Cụ thể, đo được.
2. Gắn với hành vi hệ thống, không viết mơ hồ.
3. Có thể verify độc lập.

Ví dụ tốt:

- "Khi tạo JobRun mới, `status=queued` và có event `created` trong `run_events`."

Ví dụ không đạt:

- "Hệ thống hoạt động ổn định hơn."

## 5. Required Artifacts per Task

1. 1 file task chi tiết trong `tasks/`.
2. 1 dòng cập nhật trong `tasks/board.md`.
3. 1 entry trong `changelog/changelog.md` khi hoàn tất.

## 6. Task Sizing Rule

1. `S` <= 1 ngày.
2. `M` 2-3 ngày.
3. `L` > 3 ngày (nên tách nhỏ).

Task `L` bắt buộc có breakdown thành sub-task.

## 7. Review Checklist

1. Scope có đúng phase không.
2. Acceptance criteria có đo được không.
3. Test plan có case lỗi chính không.
4. Có impact lên docs/rules/changelog không.
