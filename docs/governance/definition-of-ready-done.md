# Definition of Ready / Done

## Definition of Ready (DoR)

Task chỉ được chuyển `Ready` khi đáp ứng đủ:

1. Có Task ID hợp lệ.
2. Có context và mục tiêu rõ.
3. Có scope `In` và `Out`.
4. Có acceptance criteria đo được.
5. Có technical plan tối thiểu 3 bước.
6. Có test plan tối thiểu.
7. Có link docs liên quan.

## Definition of Done (DoD)

Task chỉ được chuyển `Done` khi đáp ứng đủ:

1. Đạt toàn bộ acceptance criteria.
2. Thực hiện verify/test theo plan và ghi kết quả.
3. Cập nhật docs liên quan (nếu có tác động).
4. Cập nhật `changelog/changelog.md`.
5. Cập nhật trạng thái trong `tasks/board.md`.
6. Nêu rõ residual risks (nếu còn).

## Fail-Fast Rule

Nếu trong lúc làm phát hiện scope sai hoặc assumption sai:

1. Dừng triển khai phần impacted.
2. Cập nhật lại task scope.
3. Chỉ tiếp tục khi task quay lại trạng thái `Ready` hợp lệ.
