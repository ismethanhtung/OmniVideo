# Connection Management (Connection Center)

## 1. Objective

Tạo một tab tập trung hiển thị trạng thái kết nối của toàn bộ thành phần hệ thống để debug nhanh và giảm thời gian chẩn đoán lỗi.

## 2. Services to Monitor

1. MongoDB.
2. Queue/Orchestrator service.
3. Downloader service.
4. AI providers.
5. Storage providers.
6. Social APIs/accounts.

## 3. Check Types

1. `ping`: kiểm tra basic connectivity.
2. `auth`: kiểm tra credential hợp lệ.
3. `capability`: kiểm tra hành vi tối thiểu (ví dụ list model/upload test).
4. `latency`: đo phản hồi.

## 4. Check Result Schema

1. `serviceType`
2. `serviceKey`
3. `status` (`ok`, `degraded`, `down`)
4. `latencyMs`
5. `errorCode`
6. `errorMessage`
7. `checkedAt`

## 5. UI Requirements

1. Bảng tổng hợp trạng thái theo service.
2. Bộ lọc theo domain (db/provider/storage/social).
3. Link vào log lỗi gần nhất.
4. Manual re-check button.
5. Social account checks hiển thị theo platform/account và không lộ secrets.

## 6. Operational Rules

1. Check interval phải configurable.
2. Không chạy check quá dày gây rate-limit provider.
3. Lỗi auth phải hiển thị hành động khắc phục (reconnect/update secret).
4. Social Control Center phase đầu có thể trả `skipped` cho account `manual` vì real API publish/check chưa bật.

## 7. Readiness Rule

Không triển khai feature phụ thuộc tích hợp ngoài nếu tích hợp đó chưa có connection check cơ bản.
