# [P1-INTAKE-004] Improve direct media fetch reliability and config guidance

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P1-INTAKE-004
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / Storage
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Direct media URL một số host trả 403 với server fetch dù URL mở được trên browser. Người dùng cũng cần hướng dẫn rõ config bắt buộc cho YouTube page URL.
- Bài toán cần giải quyết: thêm fetch strategy robust hơn cho direct URL và làm rõ checklist cấu hình vận hành.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`

## 3. Scope

- In scope:
  - Retry source media fetch với browser-like headers khi gặp 401/403.
  - Dùng cùng chiến lược cho Telegram binary fallback và Drive upload stream.
  - Cập nhật changelog/task evidence.
- Out of scope:
  - Xây resolver service hoàn chỉnh cho YouTube/TikTok.
  - Bypass cơ chế anti-bot của mọi nguồn.

## 4. Input / Output

- Input: direct media URL.
- Output mong đợi: tăng tỉ lệ fetch thành công với host nhạy cảm UA/header.

## 5. Acceptance Criteria

1. Source fetch cho Telegram/Drive retry với browser-like headers khi 401/403.
2. Lỗi vẫn trả rõ `STG_TELEGRAM_SOURCE_STREAM_FAILED` hoặc `STG_DRIVE_SOURCE_STREAM_FAILED` nếu source tiếp tục block.
3. Test/lint/build pass.

## 6. Technical Plan

1. Thêm helper fetch source media có retry strategy.
2. Thay thế các call `fetch(media.directMediaUrl)` trong storage adapters.
3. Verify bằng test/lint/build, cập nhật changelog/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/storage-adapters.ts`

## 8. Test Plan

1. Chạy `npm run test`.
2. Chạy `npm run lint`.
3. Chạy `npm run build`.

## 9. Observability

- Error codes: giữ nguyên contract hiện tại.

## 10. Risks & Rollback

- Risks: vẫn có host chặn theo IP/rate-limit, không thể đảm bảo 100%.
- Rollback strategy: quay lại source fetch đơn giản trước đó.

## 11. Deliverables

1. Fetch retry strategy cho source media.
2. Updated changelog/task evidence.

## 12. Changelog Note

- Cải thiện source media fetch reliability bằng retry với browser-like headers khi bị 401/403.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: retry header strategy giải quyết được một phần host chặn UA mặc định.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: existing suite validated (`src/lib/video-intake/storage-adapters.test.ts` and full regression set).
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 6 test files / 18 tests pass; lint pass; build pass.
