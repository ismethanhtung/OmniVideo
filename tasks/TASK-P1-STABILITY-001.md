# [P1-STABILITY-001] Fix Telegram large-file download error messaging and Next dev chunk cache instability

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

- Task ID: P1-STABILITY-001
- Phase: P1
- Target Phase: P1
- Domain: Storage / Dev Runtime Stability
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User gặp lỗi API download Telegram `STG_TELEGRAM_GET_FILE_FAILED: file is too big` và hay gặp lỗi `Cannot find module './xxx.js'` làm app mất giao diện trong lúc dev.
- Bài toán cần giải quyết: làm rõ giới hạn Telegram download qua bot API và giảm lỗi chunk missing trong môi trường `next dev`.
- Tài liệu liên quan: `docs/governance/testing-rules.md`, `docs/governance/ai-agent-rules.md`

## 3. Scope

- In scope:
  - Chuẩn hóa xử lý Telegram large-file download với error code/message rõ ràng.
  - Cập nhật UI Storage Library để cảnh báo/disable action Download khi Telegram asset vượt giới hạn bot download.
  - Tách `distDir` cho `next dev` và `next build` để tránh xung đột cache `.next`.
- Out of scope:
  - Thay đổi giới hạn phía Telegram API.
  - Triển khai giải pháp download Telegram ngoài Bot API.

## 4. Input / Output

- Input: Telegram asset lớn (ví dụ ~35MB), môi trường dev có chạy/rebuild nhiều lần.
- Output mong đợi: lỗi download rõ nguyên nhân Telegram limit và dev server ổn định hơn, không mất giao diện do chunk missing.

## 5. Acceptance Criteria

1. Telegram asset vượt giới hạn bot download trả error code/message rõ giới hạn thay vì lỗi mơ hồ.
2. Storage Library UI hiển thị trạng thái không cho tải với Telegram asset quá giới hạn và nêu lý do ngắn gọn.
3. `next dev` dùng `distDir` tách biệt với `next build` để giảm lỗi `Cannot find module './xxx.js'` từ cache chung.
4. Tests/lint/build pass.

## 6. Technical Plan

1. Tạo helper Telegram download-limit để tái sử dụng ở API/UI.
2. Cập nhật resolver download API Telegram để map lỗi "file is too big" thành error code chuyên biệt.
3. Cập nhật Storage Library panel để disable action Download với Telegram file vượt giới hạn.
4. Cập nhật `next.config.ts` tách `distDir` cho dev/prod.
5. Viết test cho helper mới và chạy verify commands.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage/*`, `src/app/api/storage/assets/[assetId]/download/route.ts` (indirect via lib), `src/features/storage/storage-library-panel.tsx`, `next.config.ts`

## 8. Test Plan

1. Unit test helper giới hạn Telegram download.
2. `npm run test`
3. `npm run lint`
4. `npm run build`

## 9. Observability

- Error code cụ thể cho Telegram file quá lớn.
- UI message rõ lý do không tải được từ Telegram bot API.

## 10. Risks & Rollback

- Risks: user kỳ vọng download Telegram mọi kích thước; cần thông điệp rõ giới hạn của Telegram bot API.
- Rollback strategy: revert helper + UI disable + distDir split.

## 11. Deliverables

1. Telegram large-file error handling rõ ràng.
2. Storage Library UI guard cho Telegram large-file download.
3. DistDir split cho dev/build.
4. Test evidence + changelog update.

## 12. Changelog Note

- Fix thông điệp và guard cho Telegram large-file download; tách distDir dev/build để giảm lỗi chunk missing.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: lỗi chunk missing chủ yếu do xung đột cache `.next` giữa dev/build trong cùng workspace.
- Blockers: none
- Verification evidence:
  - API download Telegram map lỗi `file is too big` sang error code chuyên biệt và thông điệp rõ giới hạn bot download.
  - Storage Library UI chặn download Telegram asset vượt giới hạn với lý do cụ thể.
  - `next.config.ts` tách `distDir` dev/prod (`.next-dev` vs `.next`) để tránh xung đột chunk cache.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/telegram-download.test.ts`
- Test commands executed:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Vitest: 11 files / 43 tests pass.
  - ESLint: pass, không warnings/errors.
  - Next build: pass.

## 16. Outcome Summary

- Fixed Telegram large-file download error path with explicit limit-aware error handling.
- Added UI guard to prevent futile Telegram download action for oversized assets.
- Stabilized local dev/runtime by splitting Next.js build artifacts for dev and production.
