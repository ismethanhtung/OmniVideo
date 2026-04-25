# [P1-INTAKE-010] Fix TikTok/Douyin resolver cookie fallback for intake pipeline

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

- Task ID: P1-INTAKE-010
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / Resolver
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Intake pipeline đang fail với TikTok/Douyin do resolver cần fresh cookies, trong khi flow hiện tại phụ thuộc cấu hình env thủ công.
- Bài toán cần giải quyết: tăng tỷ lệ resolve cho TikTok/Douyin bằng cookie fallback tự động từ browser profile, đồng thời giữ khả năng override bằng env.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Bổ sung cookie strategy fallback tự động cho resolver nội bộ khi gặp platform cần cookies.
  - Cập nhật message guidance khi resolver fail vì cookies/runtime.
  - Thêm regression tests cho strategy mới và failure path.
- Out of scope:
  - Thay đổi external resolver endpoint.
  - Triển khai cơ chế bypass anti-bot ngoài khả năng yt-dlp + browser cookies.

## 4. Input / Output

- Input: TikTok/Douyin page URL, cấu hình env resolver có hoặc không có cookies.
- Output mong đợi: Resolver tự thử được nhiều nguồn cookie hợp lệ trước khi fail, lỗi cuối cùng có hướng dẫn cấu hình rõ ràng.

## 5. Acceptance Criteria

1. Với TikTok/Douyin, resolver nội bộ có fallback strategy cho cookie source ngay cả khi chưa set `VIDEO_RESOLVER_COOKIES_*`.
2. Nếu env cookies được set, resolver ưu tiên env config và không phá vỡ behavior hiện có.
3. Có regression tests bao phủ ít nhất một failure case liên quan cookie-required extraction.
4. `npm run test` pass cho test suite liên quan resolver.

## 6. Technical Plan

1. Refactor `internal-resolver.py` để build extraction profiles theo cookie strategy (env-first, auto-browser fallback).
2. Cập nhật `internal-resolver.ts` cho thông điệp lỗi rõ hơn với cookie strategy đã thử.
3. Thêm/cập nhật unit tests cho parser/message + logic profile.
4. Chạy test, cập nhật task evidence, board và changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.py`, `src/lib/video-intake/internal-resolver.ts`, `src/lib/video-intake/internal-resolver.test.ts`, `src/lib/video-intake/internal-resolver-py.test.py`

## 8. Test Plan

1. Unit test resolver message parsing + cookie guidance.
2. Unit/integration-like test cho profile selection/fallback behavior.
3. Chạy `npm run test` (hoặc scope test resolver nếu cần) để verify.

## 9. Observability

- Resolver errors vẫn dùng `VID_RESOLVER_FAILED`.
- Message lỗi bổ sung thông tin cookies strategy để triage nhanh.

## 10. Risks & Rollback

- Risks: một số máy không có browser profile tương thích nên auto-cookie vẫn có thể fail.
- Rollback strategy: revert về behavior env-only cookies nếu phát sinh regression.

## 11. Deliverables

1. Resolver cookie fallback logic cho TikTok/Douyin.
2. Regression tests cập nhật.
3. Changelog entry + task evidence đầy đủ.

## 12. Changelog Note

- Cải thiện resolver TikTok/Douyin với auto cookie fallback từ browser và cập nhật guidance khi thiếu cookies.

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

- Assumptions: môi trường local có ít nhất một browser profile khả dụng để yt-dlp đọc cookie.
- Blockers: none
- Verification evidence:
  - Resolver profile builder hiện chỉ bật fallback `youtube-android` cho YouTube, không còn retry profile dư thừa cho TikTok/Douyin.
  - Với TikTok/Douyin, khi chưa có env cookies, resolver tự thử chuỗi browser cookie sources (`chrome`, `chromium`, `edge`, `firefox`, `safari`) trước khi fail.
  - Error guidance trên UI/runtime đã nêu rõ auto browser-cookie fallback đã được thử.
  - Dry-run command `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py "https://www.douyin.com/jingxuan?modal_id=7631973489948133044" best` cho thấy trace đã thử đầy đủ profile `auto-cookie-browser-*`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/internal-resolver.py`
  - `src/lib/video-intake/internal-resolver.ts`
  - `src/lib/video-intake/internal-resolver.test.ts`
  - `src/lib/video-intake/internal-resolver-py.test.py`
- Test commands executed:
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Python regression suite: 5 tests pass.
  - Vitest suite: 9 files / 31 tests pass.
  - ESLint: pass, không warnings/errors.
  - Next.js production build: pass.
