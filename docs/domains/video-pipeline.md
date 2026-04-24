# Video Pipeline

## 1. Objective

Xây pipeline video module hóa theo node graph để hỗ trợ nhiều style và loại content, không khóa cứng một quy trình duy nhất.

## 2. Pipeline Types (Initial)

1. URL Rework Pipeline.
2. Text-to-Video Story Pipeline.
3. Review/Knowledge Short Pipeline.
4. Music/Fun Clip Pipeline.

## 3. Canonical Stages

1. Intake: nhận source và chuẩn hóa metadata.
2. Analysis: phân tích script/chia scene/intent tagging.
3. Asset generation: visual/audio/subtitle.
4. Editing: trim/concat/overlay/mix/blur.
5. Packaging: export output + thumbnail + metadata.
6. Output: storage + publish prep.

## 4. Edit Capabilities (MVP -> Extend)

1. Trim theo timeline.
2. Concat clip.
3. Blur vùng chọn.
4. Overlay watermark/subtitle.
5. Adjust volume/ducking.
6. Speed adjustment (creative use hợp lệ).

## 5. Traceability Requirements

Mỗi output video phải truy vết được:

1. Source nào tạo ra.
2. Pipeline version nào chạy.
3. Node nào đã transform.
4. Model/provider nào được gọi.
5. Ai/Task nào kích hoạt run.

## 6. Validation Rules

1. Timeline không được overlap bất hợp lệ.
2. Scene duration phải > 0.
3. Input asset phải có metadata cơ bản trước khi edit.
4. Nếu thiếu subtitle/audio track theo policy thì run không thể finalize.

## 7. Quality Rules

1. Output phải có preview metadata (duration/resolution/fps).
2. Nếu pipeline có subtitle node, bắt buộc kiểm tra sync drift.
3. Audio peak không vượt ngưỡng clipping policy.

## 8. Compliance Baseline

1. Pipeline không nhằm mục tiêu né cơ chế bản quyền hoặc vi phạm chính sách nền tảng.
2. Mọi nội dung tái sử dụng phải có trạng thái quyền rõ ràng trong metadata.

## 9. Phase Priorities

1. P0: URL intake + basic edit + output storage trace.
2. P1: scene-based composition.
3. P1: output publish node.
4. P2: advanced automation và optimization.
