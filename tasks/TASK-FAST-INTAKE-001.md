# [FAST-INTAKE-001] Restore repo-local yt-dlp resolver runtime

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

- Task ID: FAST-INTAKE-001
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

- Lý do: Video Intake fail với lỗi `Internal resolver runtime is missing yt-dlp` khi resolve YouTube/Douyin/Bilibili page URL.
- Bài toán cần giải quyết: khôi phục runtime `yt-dlp` cục bộ trong repo và thêm bootstrap command để máy khác có thể dựng lại runtime repo-local mà không cài global.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `README.md`

## 3. Scope

- In scope:
  - Cài `yt-dlp` vào `.vendor/python` trong repo.
  - Thêm npm script bootstrap resolver runtime repo-local.
  - Cập nhật error guidance, docs, changelog và regression test liên quan.
- Out of scope:
  - Bypass chống bot của từng nền tảng ngoài khả năng `yt-dlp`/cookies hiện có.
  - Thay đổi external resolver endpoint hoặc storage upload flow.

## 4. Input / Output

- Input: URL page YouTube/Douyin/Bilibili qua Video Intake.
- Output mong đợi: resolver nội bộ có module `yt_dlp` khả dụng từ `.vendor/python`; khi thiếu runtime, lỗi hướng dẫn chạy `npm run setup:resolver`.

## 5. Acceptance Criteria

1. `yt-dlp` được cài trong `.vendor/python` của repo, không cài global vào máy.
2. Có command repo-local để bootstrap lại runtime trên máy khác.
3. Missing runtime error nêu rõ command cần chạy.
4. Regression tests resolver pass.

## 6. Technical Plan

1. Cài `yt-dlp` bằng pip với `--target .vendor/python`.
2. Thêm `scripts/setup-yt-dlp.mjs` và script `npm run setup:resolver`.
3. Cập nhật resolver error message, README/domain docs, changelog và test.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.ts`, `scripts/setup-yt-dlp.mjs`, `package.json`

## 8. Test Plan

1. Unit tests: `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts`
2. Python regression: `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
3. Runtime smoke: `PYTHONPATH=.vendor/python python3 -c "import yt_dlp; print(yt_dlp.version.__version__)"`

## 9. Observability

- Metrics: none.
- Logs: setup script prints install and verification status.
- Error codes: `VID_RESOLVER_RUNTIME_MISSING`

## 10. Risks & Rollback

- Risks: Nền tảng nguồn có thể vẫn chặn extraction hoặc yêu cầu cookies/header mới dù runtime đã có.
- Rollback strategy: revert script/message/docs changes and remove `.vendor/python` runtime if needed.

## 11. Deliverables

1. Repo-local `.vendor/python` contains `yt-dlp`.
2. `npm run setup:resolver` bootstrap command.
3. Updated resolver guidance, docs, changelog, and tests.

## 12. Changelog Note

- Khôi phục runtime `yt-dlp` repo-local cho Video Intake và thêm command bootstrap `.vendor/python`.

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

- Assumptions: Python 3 và pip khả dụng để bootstrap repo-local runtime.
- Blockers: none.
- Verification evidence:
  - `yt-dlp 2025.10.14` import thành công từ `.vendor/python`.
  - `npm run setup:resolver` pass và verify `yt-dlp 2025.10.14 ready`.
  - Resolver unit tests pass.
  - Python resolver regression tests pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/internal-resolver.test.ts`
- Test commands executed:
  - `PYTHONPATH=.vendor/python python3 -c "import yt_dlp; print(yt_dlp.version.__version__)"`
  - `npm run setup:resolver`
  - `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts`
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
- Test results summary:
  - Runtime smoke pass, version `2025.10.14`.
  - Setup script pass.
  - Vitest pass: 2 files / 6 tests.
  - Python unittest pass: 8 tests.
