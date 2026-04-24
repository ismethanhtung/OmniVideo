# Incident Playbook

## 1. Objective

Chuẩn hóa cách phản ứng khi có sự cố để giảm downtime, giảm lỗi lặp lại, và giữ dữ liệu nhất quán.

## 2. Severity Levels

1. `SEV-1`: hệ thống ngừng hoạt động diện rộng, pipeline không chạy.
2. `SEV-2`: một domain chính lỗi (provider/storage/social) làm gián đoạn đáng kể.
3. `SEV-3`: lỗi cục bộ hoặc lỗi có workaround.
4. `SEV-4`: warning hoặc degrade nhẹ.

## 3. Incident Lifecycle

1. Detect: từ alert, dashboard, hoặc phản hồi user.
2. Triage: xác định phạm vi ảnh hưởng và severity.
3. Mitigate: hành động giảm thiểu tức thời.
4. Recover: khôi phục trạng thái hoạt động.
5. Postmortem: phân tích nguyên nhân và hành động phòng ngừa.

## 4. First 15-Minute Checklist

1. Xác định service lỗi chính (DB/queue/provider/storage/social).
2. Kiểm tra timeline events gần nhất.
3. Freeze rollout thay đổi mới nếu liên quan.
4. Kích hoạt fallback policy nếu có.
5. Ghi lại mốc thời gian chính của sự cố.

## 5. Common Scenarios

### MongoDB Down

1. Chuyển hệ thống sang read-only mode nếu có.
2. Tạm ngưng enqueue run mới.
3. Khôi phục DB rồi replay queue an toàn.

### Provider Quota Exhausted

1. Chuyển sang provider fallback.
2. Giảm concurrency nếu cần.
3. Cập nhật cảnh báo quota và policy phân bổ.

### Storage Upload Failure

1. Retry theo policy.
2. Nếu fail liên tục, chuyển storage fallback.
3. Tạm đánh dấu run `blocked_storage`.

## 6. Postmortem Template

1. Summary.
2. Impact.
3. Timeline.
4. Root cause.
5. Corrective actions.
6. Prevention actions.
7. Owner và deadline.

## 7. Mandatory Rule

Mọi incident `SEV-1` và `SEV-2` bắt buộc có postmortem trong vòng 48 giờ.
