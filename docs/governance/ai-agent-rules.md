# AI Agent Rules (Mandatory)

## 1. Purpose

Bộ quy tắc này bắt buộc cho mọi AI agent làm việc trong repo OmniVideo. Mục tiêu là đảm bảo tác vụ có truy vết, có chuẩn đầu ra, và không phát sinh thay đổi mơ hồ.

## 2. Non-Negotiable Rules

1. Không có `Task ID` -> không bắt đầu implement.
2. Không có `Acceptance Criteria` -> không chuyển task sang `In Progress`.
3. Không có `Test Plan` (với backend/domain task) -> không được `Done`.
4. Không cập nhật `changelog/changelog.md` -> task chưa hoàn thành.
5. Không có file docs liên quan khi thay đổi kiến trúc/domain -> task chưa hoàn thành.

## 3. Mandatory Execution Protocol

Mọi agent phải đi theo 8 bước sau:

1. Create/attach task.
2. Xác nhận scope và assumptions.
3. Viết execution plan ngắn.
4. Thực thi thay đổi.
5. Verify theo acceptance criteria.
6. Ghi test results hoặc verification evidence.
7. Cập nhật docs/changelog/board trạng thái.
8. Chốt outcome và open risks.

## 4. Task Requirement for Every Activity

Mỗi lần agent hoạt động phải đáp ứng:

1. Có một task active trong `tasks/board.md`.
2. Task file tồn tại theo template `tasks/templates/task-template.md`.
3. Task phải có `Owner`, `Status`, `Target Phase`.
4. Nếu là quick fix dưới 30 phút, vẫn phải có task dạng `FAST-*`.

## 5. Status Transition Rules

1. `Todo -> Ready`: khi đủ context + scope rõ.
2. `Ready -> In Progress`: khi có acceptance criteria + plan.
3. `In Progress -> Review`: khi đã có bằng chứng verify.
4. `Review -> Done`: khi docs + changelog đã cập nhật.
5. `* -> Blocked`: khi phụ thuộc ngoài chưa giải quyết.

## 6. Evidence Rules

Task đóng phải có tối thiểu:

1. Danh sách file thay đổi.
2. Kết quả kiểm tra chính.
3. Risk còn lại (nếu có).
4. Link changelog entry tương ứng.

## 7. Escalation Rules

1. Blocked > 30 phút: tạo Blocker Note trong task.
2. Blocked > 24h: đề xuất ít nhất 2 phương án xử lý.
3. Nếu phát hiện yêu cầu trái compliance/policy: dừng thực thi phần đó và ghi rõ lý do.

## 8. Forbidden Behaviors

1. Làm thay đổi không có task.
2. Đánh dấu Done khi chưa verify.
3. Bỏ qua changelog/docs vì lý do "nhỏ".
4. Giấu lỗi hoặc không ghi rõ hạn chế hiện tại.
