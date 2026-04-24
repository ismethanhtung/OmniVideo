# AI Provider Management

## 1. Objective

Quản lý nhiều provider/account/model an toàn, có khả năng fallback khi quota cạn hoặc provider lỗi, đồng thời theo dõi chi phí theo task/run.

## 2. Scope

1. Quản lý provider accounts (chat, vision, TTS, generation).
2. Quản lý quota/token/spend theo ngày/tháng.
3. Chính sách chọn provider ưu tiên.
4. Fallback tự động khi lỗi hoặc hết hạn mức.

## 3. Data Requirements

Mỗi account cần có:

1. `providerName`
2. `accountLabel`
3. `enabledModels`
4. `secretRef`
5. `dailyLimit` / `monthlyLimit`
6. `currentUsage`
7. `priorityWeight`
8. `status`
9. `lastHealthCheckAt`

## 4. Provider Selection Policy

1. Lọc account theo model capability phù hợp node.
2. Sắp theo `priorityWeight` và quota còn lại.
3. Chọn account đầu tiên đang `active`.
4. Khi gặp lỗi retryable, thử account fallback kế tiếp.
5. Ghi `providerDecisionLog` vào `step_runs.metrics`.

## 5. Quota & Spend Tracking

1. Track token/input/output theo step.
2. Track estimated cost theo provider pricing config.
3. Cảnh báo khi dùng > 80% daily/monthly limit.
4. Tự động pause account khi vượt ngưỡng cứng.

## 6. Failure Handling

1. `QTA_*`: chuyển fallback ngay, không retry account hiện tại.
2. `AUTH_*`: đánh dấu account `error`, yêu cầu reconnect.
3. `NET_*`: retry theo backoff trước khi fallback.
4. `PRV_*`: retry ngắn rồi fallback.

## 7. UI Requirements (Settings)

1. List provider/account/model đầy đủ.
2. Trạng thái kết nối hiện tại.
3. Usage theo ngày/tháng.
4. Nút test connection.
5. Log lỗi gần nhất.

## 8. Security Rules

1. Không hiển thị raw API key.
2. Không log prompt nhạy cảm theo default.
3. Phân tách policy theo domain node (chat/audio/vision) để giảm blast radius.

## 9. Deferred Enhancements

1. Smart routing theo latency + quality score.
2. A/B provider strategy.
3. Auto-rebalance cost-performance.
