# Tasks System

## 1. Mục đích

Thư mục `tasks/` là nguồn sự thật cho kế hoạch và trạng thái thực thi trong repo OmniVideo.

## 2. Quy tắc bắt buộc

1. Mọi hoạt động của AI agent phải gắn với một `Task ID`.
2. Không có task file -> không được bắt đầu implement.
3. Mọi task phải tuân theo template `tasks/templates/task-template.md`.
4. Task phải dùng `Progress Stamp` dạng `[ ]/[x]` để theo dõi tiến độ.
5. Hoàn tất task phải cập nhật `tasks/board.md` và `changelog/changelog.md`.
6. Nếu task có đổi code thì bắt buộc có test evidence trong task.

## 3. Tổ chức file

- `board.md`: bảng trạng thái tổng.
- `backlog-phase-setup.md`: backlog chuẩn theo phase setup.
- `templates/task-template.md`: mẫu task bắt buộc.
- `TASK-*.md`: task detail theo từng mục.

## 4. Status chuẩn

1. `Todo`
2. `Ready`
3. `In Progress`
4. `Blocked`
5. `Review`
6. `Done`
7. `Canceled`

## 5. Workflow

1. Tạo task file từ template.
2. Thêm task vào `board.md`.
3. Đánh dấu progress stamp `[x]` theo trạng thái thực tế.
4. Khi làm, chuyển status theo đúng rules trong governance.
5. Nếu có code change, cập nhật Test Evidence trước khi Review.
6. Khi xong, cập nhật changelog và chốt task.
