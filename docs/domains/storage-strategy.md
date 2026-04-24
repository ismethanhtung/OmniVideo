# Storage Strategy

## 1. Objective

Đảm bảo asset input/output được lưu ổn định, truy cập nhanh, truy vết dễ, và có thể migrate giữa nhiều nhà lưu trữ mà không phá metadata.

## 2. Storage Layers

1. Binary storage: video/audio/thumbnail/subtitle files.
2. Metadata storage (MongoDB): mọi thông tin định danh, trace, indexing.

## 3. Supported Binary Providers (Pluggable)

1. Local filesystem (dev).
2. S3-compatible object storage (khuyến nghị production).
3. Telegram (optional, dùng như external asset vault).
4. Google Drive (optional).

## 4. Storage Pointer Strategy

Mỗi asset phải có:

1. `storageProvider`
2. `storagePointer`
3. `checksumSha256`
4. `sizeBytes`
5. `mimeType`

Domain logic luôn đọc asset qua storage adapter, không phụ thuộc pointer format cụ thể.

## 5. Naming Convention (Binary)

Đề xuất key/path:

`/{env}/{assetType}/{yyyy}/{mm}/{dd}/{assetId}-{version}.{ext}`

Ví dụ:

`/prod/video/2026/04/24/ast_123-v1.mp4`

## 6. Retention & Lifecycle

1. Raw input giữ ít nhất 30 ngày.
2. Output publish-ready giữ tối thiểu 180 ngày.
3. Metadata giữ dài hạn để truy vết.
4. Cleanup job không được xóa asset còn tham chiếu active.

## 7. Performance Notes

1. Upload/download lớn cần stream, tránh đọc toàn bộ vào memory.
2. Lưu thêm preview/thumbnail để browse nhanh UI.
3. Tách hot storage và cold archive khi asset tăng mạnh.

## 8. Reliability Rules

1. Upload thành công mới ghi `assets` status ready.
2. Mismatch checksum phải đánh dấu corrupted.
3. Lỗi storage phải có retry và cảnh báo observability.

## 9. Security Rules

1. Không để lộ signed URL quá hạn dài trên UI.
2. Asset nhạy cảm cần policy truy cập nội bộ.
3. Credential storage provider quản lý qua secretRef.
