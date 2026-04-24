# Engineering Rules

## 1. Architecture and Code Quality

1. Codebase ưu tiên TypeScript strict mode.
2. Module boundaries phải rõ domain, không import chéo tùy tiện.
3. Shared utilities đặt ở `src/lib`, tránh duplicate logic.
4. Integration logic phải đi qua adapter layer.

## 2. Secrets and Security

1. Cấm hard-code secret/token/key trong code.
2. Chỉ lưu reference (`secretRef`) trong database.
3. Log không chứa dữ liệu nhạy cảm.

## 3. Data Integrity

1. Mọi write path phải định nghĩa trạng thái rõ ràng.
2. Không update trạng thái mơ hồ hoặc bỏ qua error code.
3. Schema change phải có migration note và compatibility check.

## 4. Reliability

1. Call ra bên ngoài phải có timeout.
2. Retry có giới hạn và backoff.
3. Phân biệt retryable và non-retryable errors.

## 5. Testing Baseline (Mandatory)

1. Mọi thay đổi code logic phải có test tương ứng.
2. Bugfix phải có regression test.
3. Feature backend mới phải có test plan tối thiểu trong task.
4. Case thất bại chính (timeout, quota, network, invalid input) phải được nêu.
5. Không đánh dấu Done khi chưa có test evidence.

## 6. Review Rules

1. Review ưu tiên correctness trước style.
2. Kiểm tra edge cases, data races, rollback path.
3. Kiểm tra test relevance, không chỉ đếm số lượng test.
4. Kiểm tra tác động lên observability và docs.

## 7. Documentation Rules

1. Thay đổi nào cũng cập nhật `changelog/changelog.md`.
2. Feature lớn phải cập nhật docs domain/architecture liên quan.
3. Không merge thay đổi khi docs lệch thực tế.
