# Thumbnail Studio Domain (Draft V1)

## 1. Mục tiêu

Thiết lập một bề mặt riêng để quản lý và chỉnh sửa thumbnail phục vụ publish YouTube, đồng thời giữ mô hình metadata-first nhất quán với các domain hiện có.

## 2. Vấn đề cần giải

1. Chưa có thư viện thumbnail để tìm/lọc/tái sử dụng theo series.
2. Chưa có UI editing nhẹ, nhanh cho các thao tác thường gặp: text overlay, crop, blur theo vùng.
3. Chưa có điểm gắn thumbnail vào workflow node publish YouTube.

## 3. V1 Scope (UI-first)

1. Một trang `Thumbnail Studio` chia đôi:
   - trái: `Library` (import/search/filter/select);
   - phải: `Editor` (preview + controls + workflow hook).
2. Import thumbnail:
   - kéo thả file ảnh;
   - nhập URL để import.
3. Metadata quản lý:
   - đổi tên thumbnail;
   - lifecycle tags: `raw`, `processed`, `has-processed-output`.
4. Editing mode:
   - mặc định `create variant` (non-destructive);
   - tùy chọn `overwrite current`.
5. Hỗ trợ nhân bản/duplicate thumbnail cho dạng tập 1, 2, 3...
6. Bộ controls tối thiểu: crop preset, blur strength toggle, text font/size/color/stroke/position.

## 4. UX nguyên tắc

1. Bám chặt visual language hiện có của Workspace/Audio Transcript/Video Tools Lab (`border-main`, `bg-secondary/20`, dense form controls, split panel).
2. Giữ thao tác nhẹ: local state trước, chưa kéo thêm engine nặng ở V1.
3. Ưu tiên rõ mode chỉnh sửa để user không ghi đè nhầm.

## 5. Workflow tích hợp (planned)

1. Thêm node `Select Thumbnail` cho publish pipeline YouTube.
2. Node output: thumbnail reference (asset id / drive pointer / version).
3. Publish node nhận thumbnail reference và apply trước khi upload video metadata.

## 6. Lưu trữ (planned)

1. Binary ảnh: Drive (hoặc storage provider tương thích).
2. Metadata ảnh:
   - name;
   - tags lifecycle;
   - source/import method;
   - edit recipe (crop/blur/text settings);
   - workflow usage history.

## 7. Non-goals V1

1. Chưa implement engine render ảnh production.
2. Chưa sync tự động xuống YouTube API.
3. Chưa có version graph đầy đủ giữa các biến thể.
