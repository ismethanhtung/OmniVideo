# Source Management

## 1. Why It Matters

Nguồn là tài sản quan trọng nhất để duy trì content pipeline liên tục. Hệ thống phải quản lý nguồn có cấu trúc, phân loại rõ, truy vết được và tái sử dụng được.

## 2. Source Types

1. URL đơn lẻ (Douyin/YouTube/Bilibili/khác).
2. Kênh/account nguồn (theo creator hoặc topic).
3. Danh sách trend/link tổng hợp.
4. Text ideas/script/outline.
5. File upload nội bộ.

## 3. Required Metadata

1. `sourceType`
2. `originPlatform`
3. `canonicalLink`
4. `tags` (topic, format, campaign)
5. `languageHint`
6. `contentIntent` (`review`, `music`, `fun`, `knowledge`, `story`, `sales`, `other`)
7. `ownershipStatus`
8. `ingestedAt`

## 4. Core Operations

1. Ingest source mới.
2. Chuẩn hóa metadata và deduplicate.
3. Tagging bắt buộc.
4. Link source với job runs.
5. Đánh dấu source hiệu quả cao để tái khai thác.

## 5. Quality Rules

1. Source mới phải có ít nhất 2 tags.
2. Link nguồn không hợp lệ phải fail sớm ở bước validate.
3. Mọi source được dùng để tạo output phải lưu trace vào `job_runs`.

## 6. Trend Research Direction

1. Tạo danh mục `trend_hubs` để lưu nguồn nghiên cứu.
2. Mỗi entry trend nên có: `topic`, `platform`, `evidence_links`, `observed_at`.
3. Không scrape hoặc dùng dữ liệu vi phạm điều khoản nền tảng.

## 7. Backlog Priorities

1. P0: Source ingest + metadata normalize + list/search.
2. P1: Channel-level source collection.
3. P1: Trend list management.
4. P2: Source scoring và gợi ý tái sử dụng.
