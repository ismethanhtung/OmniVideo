# Test Execution Playbook

## 1. Objective

Chuẩn hóa cách chạy, đọc và xử lý kết quả test trong quá trình phát triển OmniVideo.

## 2. Execution Order (Recommended)

1. Chạy lint trước.
2. Chạy unit tests cho module thay đổi.
3. Chạy integration tests liên quan DB/adapters.
4. Chạy API/smoke tests cho luồng chính bị ảnh hưởng.

## 3. Failure Triage Workflow

1. Phân loại lỗi test: flaky / regression / environment.
2. Xác định test fail do code mới hay do setup sai.
3. Nếu regression: fix code hoặc điều chỉnh logic theo specs.
4. Nếu flaky: tạo task riêng để ổn định test.

## 4. Mandatory Reporting in Task

Sau khi chạy test, phải ghi vào task:

1. Bộ test đã chạy.
2. Kết quả chính.
3. Các fail còn lại và quyết định xử lý.

## 5. Retry Policy for Test Runs

1. Không retry mù quáng quá 2 lần.
2. Nếu fail lặp lại, bắt buộc phân tích nguyên nhân trước khi chạy lại.
3. Flaky tests phải được theo dõi bằng backlog riêng.

## 6. Environment Rules

1. Test DB tách khỏi runtime DB.
2. Fixture data phải deterministic.
3. Không phụ thuộc external service thật trong unit tests.

## 7. Release Readiness Gate

Không được xem là ready cho release nếu:

1. Critical integration tests đang fail.
2. Regression chưa có fix hoặc mitigation rõ ràng.
3. Task không đính kèm test evidence.
