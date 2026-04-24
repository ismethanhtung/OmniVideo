# Testing Rules (Mandatory)

## 1. Purpose

Đây là bộ quy tắc bắt buộc về testing cho toàn repo OmniVideo. Mục tiêu: mọi thay đổi code đều có test để giảm regression và bảo vệ tính đúng đắn hệ thống.

## 2. Non-Negotiable Rules

1. Có thay đổi code logic => bắt buộc có test mới hoặc cập nhật test cũ.
2. Bug fix => bắt buộc có regression test tái hiện lỗi cũ.
3. API contract thay đổi => bắt buộc cập nhật API tests.
4. Không có test evidence => task không được chuyển `Done`.
5. "Task nhỏ" không phải lý do bỏ test.

## 3. Required Test Types per Change Type

1. Domain logic change: unit tests.
2. DB/repository change: integration tests với Mongo test DB.
3. API route change: API contract tests.
4. Workflow/orchestration change: integration tests cho run/step state transitions.
5. External adapter change: mapping + error handling tests.

## 4. Minimum Failure Cases (Always)

Mọi task code phải có ít nhất 1 failure case test nếu phù hợp:

1. Invalid input.
2. Dependency timeout/network fail.
3. Provider/auth/quota error.
4. Retry exhausted path.

## 5. Evidence Format in Task

Task notes phải ghi rõ:

1. Danh sách test đã thêm/sửa.
2. Kết quả test chính (pass/fail + phạm vi).
3. Case nào chưa cover và lý do.

## 6. Pull Request Review Rules

1. Reviewer phải kiểm tra test relevance, không chỉ số lượng test.
2. Nếu code change không có test hợp lệ, PR phải bị yêu cầu thay đổi.
3. Coverage tăng nhưng assertions yếu vẫn không đạt.

## 7. Exceptions Policy

Exception chỉ chấp nhận khi:

1. Có lý do kỹ thuật rõ ràng.
2. Có issue/task follow-up với deadline.
3. Có approval của owner.

Không được dùng exception để trì hoãn test không thời hạn.

## 8. AI Agent Enforcement

1. Agent phải tự kiểm tra xem task có thay đổi code không.
2. Nếu có, agent phải cập nhật section `Test Plan` trước khi implement.
3. Agent phải cập nhật `Verification evidence` trước khi đóng task.
