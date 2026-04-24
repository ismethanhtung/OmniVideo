# [P1-INTAKE-001] Node-based URL video intake upload Telegram/Drive

## Progress

- [x] Todo
- [x] Ready
- [x] In Progress
- [ ] Review
- [ ] Done

## Metadata

- Task ID: P1-INTAKE-001
- Type: Feature
- Priority: P1
- Owner: AI Agent
- Created: 2026-04-25
- Status: In Progress

## Problem

Cần hiện thực luồng MVP: nhập link video từ các nền tảng, xử lý theo kiểu node pipeline, upload sang nơi lưu trữ như Telegram/Google Drive và lưu metadata đầy đủ. Video chỉ được đi trung gian qua server bằng stream/remote URL, không tải xuống disk server rồi mới upload.

## Scope

- Thêm page Video Intake trong leftbar.
- Thêm page Storage Library trong leftbar.
- Thêm node pipeline URL intake: validate URL, resolve media, upload storage, persist metadata.
- Thêm adapter storage Telegram và Google Drive theo hướng không ghi file xuống disk.
- Lưu metadata vào MongoDB: sources, assets, job_runs, step_runs, run_events.
- Thêm API tạo run intake và API list assets.
- Thêm tests cho validation/platform detection/node graph/metadata mapping failure cases.

## Acceptance Criteria

- [ ] Có leftbar link cho Video Intake và Storage Library.
- [ ] Video Intake UI cho nhập URL, tags, storage provider, chạy pipeline.
- [ ] Storage Library UI list metadata video đã lưu.
- [ ] API intake tạo job run + step runs + events trong MongoDB.
- [ ] Pipeline được chia node rõ ràng, không hard-code vào route/UI.
- [ ] Không ghi binary video xuống local filesystem/server disk.
- [ ] Telegram upload dùng remote URL khi có direct media URL.
- [ ] Drive upload dùng resumable upload từ remote stream khi có access token.
- [ ] Nếu page URL chưa resolve được direct media URL thì fail rõ lỗi và lưu trace.
- [ ] Có test logic mới theo testing rules.
- [ ] `npm run test` pass.
- [ ] `npm run lint` pass.
- [ ] `npm run build` pass.

## Test Plan

- Unit: detect platform từ URL.
- Unit: validate intake input và tags.
- Unit: build default node graph đúng thứ tự.
- Unit: map storage upload result thành asset metadata.
- Failure: invalid URL bị reject.
- Failure: thiếu direct media URL khi không có resolver sẽ trả lỗi rõ.

## Implementation Notes

- `VIDEO_RESOLVER_ENDPOINT` là optional external resolver service để biến page URL thành direct media URL.
- Telegram cần `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`.
- Drive cần `GOOGLE_DRIVE_ACCESS_TOKEN`, optional `GOOGLE_DRIVE_FOLDER_ID`.
- Không lưu secret/token vào DB hoặc UI.

## Verification

- Pending.

## Changelog

- Pending.
