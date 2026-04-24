# Affiliate Automation (Deferred Domain)

## 1. Objective

Tự động hóa quy trình triển khai affiliate campaign dựa trên nội dung đã tạo, gồm quản lý campaign, phân phối nội dung, và theo dõi kết quả.

## 2. Current Phase Policy

- Domain này `deferred`, chưa triển khai trong phase setup.
- Mọi thiết kế hiện tại chỉ ở mức blueprint.

## 3. Future Scope

1. Campaign management.
2. Rule-based comment/link distribution.
3. Platform-specific constraints/policies.
4. Tracking click/conversion/revenue.
5. Report dashboard theo campaign/channel/platform.

## 4. Required Data Model (Future)

1. `affiliate_campaigns`
2. `affiliate_links`
3. `distribution_rules`
4. `distribution_events`
5. `conversion_metrics`

## 5. Compliance Note

1. Tự động hóa phải tuân thủ chính sách từng nền tảng.
2. Không dùng hành vi spam hoặc thao tác vi phạm điều khoản dịch vụ.
3. Cần có throttle, frequency cap, và kiểm soát chất lượng nội dung.
