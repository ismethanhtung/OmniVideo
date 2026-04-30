# [FAST-INTAKE-002] Prefer public no-cookie video resolver path

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

- Task ID: FAST-INTAKE-002
- Phase: P1
- Target Phase: P1
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Bilibili public URL fail vì resolver thử Chrome cookies trước và format selector quá chặt cho một số public page.
- Bài toán cần giải quyết: giữ flow public đơn giản, ưu tiên tải/resolve không dùng cookie/browser GUI; chỉ dùng cookie fallback cho platform thật sự cần.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `README.md`

## 3. Scope

- In scope:
  - Đổi thứ tự resolver profile để `no-cookie` luôn chạy trước.
  - Không áp dụng browser-cookie fallback cho Bilibili/public platform.
  - Thêm format fallback ít ràng buộc hơn khi progressive media không có.
  - Cập nhật test/docs/changelog/task evidence.
- Out of scope:
  - Bypass private/login-only video.
  - Tải và mux DASH video/audio thành file local trong task này.

## 4. Input / Output

- Input: Public page URL như Bilibili/YouTube.
- Output mong đợi: resolver không đòi Chrome cookies cho public URL và thử no-cookie direct extraction trước.

## 5. Acceptance Criteria

1. Bilibili/public platform không còn dùng `cookie-browser-chrome` từ env global.
2. `no-cookie` là resolver profile đầu tiên.
3. Resolver có fallback format relaxed cho public video khi format progressive chặt không có.
4. Regression tests pass.

## 6. Technical Plan

1. Refactor `internal-resolver.py` để tách cookie-required platforms và public platforms.
2. Thêm format profile fallback relaxed.
3. Cập nhật Python regression tests, UI guidance/docs/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.py`, `src/lib/video-intake/internal-resolver-py.test.py`, UI guidance.

## 8. Test Plan

1. Python regression: `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
2. Unit tests resolver: `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts`
3. Smoke resolver public profile ordering through tests.

## 9. Observability

- Metrics: none.
- Logs: resolver error trace still includes profile names tried.
- Error codes: `VID_RESOLVER_FAILED`, `VID_RESOLVER_RUNTIME_MISSING`.

## 10. Risks & Rollback

- Risks: Some sites may still require cookies or separate video/audio muxing; this task deliberately keeps public no-cookie path simple.
- Rollback strategy: revert resolver profile ordering/format fallback changes.

## 11. Deliverables

1. Public no-cookie resolver path.
2. Regression tests for Bilibili/public profile behavior.
3. Updated docs/changelog.

## 12. Changelog Note

- Ưu tiên no-cookie resolver cho public Video Intake URLs và không dùng Chrome cookie fallback cho Bilibili/public sites.

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

- Assumptions: Người dùng chủ yếu intake public videos; private/login-only videos không nằm trong scope.
- Blockers: none.
- Verification evidence:
  - Bilibili profile ordering with cookie env/file present resolves to `default:no-cookie`, then `default:no-cookie:relaxed-public`.
  - Full-network smoke for `https://www.bilibili.com/video/BV1W2oSBWEYw/` with `VIDEO_RESOLVER_COOKIES_FROM_BROWSER=chrome` returned direct media JSON without any `cookie-browser-*` profile.
  - Regression tests pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/internal-resolver-py.test.py`
- Test commands executed:
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
  - `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts`
  - `PYTHONPATH=.vendor/python VIDEO_RESOLVER_COOKIES_FROM_BROWSER=chrome python3 src/lib/video-intake/internal-resolver.py "https://www.bilibili.com/video/BV1W2oSBWEYw/" best`
- Test results summary:
  - Python unittest pass: 11 tests.
  - Vitest pass: 2 files / 6 tests.
  - Bilibili smoke pass and returned direct media JSON using no-cookie public profiles.
