# FAST-AUDIO-012 Keep Piper Runtime Self-Contained

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

- Task ID: FAST-AUDIO-012
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User yêu cầu toàn bộ Piper runtime/package được đóng gói trong `repo/piper`, không tạo/cài runtime ở ngoài.
- Bài toán cần giải quyết: Cài hoặc cấu hình Piper sao cho binary/libs/model/config đều nằm trong `piper/`, và app ưu tiên path này.
- Tài liệu liên quan:
  - `tasks/TASK-FAST-AUDIO-010.md`
  - `tasks/TASK-FAST-AUDIO-011.md`

## 3. Scope

- In scope:
  - Xóa runtime thử nghiệm ngoài `piper`.
  - Tạo Python venv trong `piper/.venv` nếu cần.
  - Cài package Piper không dùng cache ngoài repo.
  - Cập nhật app default executable nếu runtime mới hoạt động.
  - Tests/build evidence.
- Out of scope:
  - Cài Homebrew/global packages.
  - Tự tải model voice mới.

## 4. Input / Output

- Input: repo `piper/` hiện có binary/model/config nhưng thiếu `.dylib`.
- Output mong đợi: Piper runtime tự chứa trong `piper/` hoặc lỗi rõ nếu package không hỗ trợ macOS arm64 hiện tại.

## 5. Acceptance Criteria

1. Không còn `.vendor/piper-venv`.
2. Piper package/runtime nếu cài được nằm trong `piper/`.
3. App dùng executable trong `piper/`.
4. Không yêu cầu cài global package.
5. Tests/build pass hoặc ghi rõ blocker.

## 6. Technical Plan

1. Dọn `.vendor` runtime đã tạo dở.
2. Tạo `piper/.venv` và cài `piper-tts` với no-cache.
3. Kiểm tra executable/libs và chạy smoke.
4. Cập nhật app defaults/tests/task/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - tests liên quan

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Runtime thiếu dylib.
   - Runtime executable không khả dụng.
3. Kết quả mong đợi:
   - Tests/build pass; smoke Piper hoặc blocker cụ thể.

## 9. Observability

- Metrics: unchanged.
- Logs: no raw text logging.
- Error codes: existing Piper error codes.

## 10. Risks & Rollback

- Risks:
  - `piper-tts` PyPI wheel có thể không hỗ trợ đúng macOS arm64/Python version.
- Rollback strategy:
  - Xóa `piper/.venv`, giữ binary tarball path hiện có.

## 11. Deliverables

1. Self-contained Piper runtime attempt under `piper/`.
2. Updated app config if executable works.
3. Verification evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Keep Piper runtime packaging self-contained under repo `piper/`.

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

## 14. Execution Notes

- Assumptions:
  - User accepts dependencies inside `piper/` even if that folder becomes larger.
- Blockers:
  - Current `piper/model.onnx` is not Piper VITS-compatible; runtime works but model expects `char_inputs/diac_inputs`.
- Verification evidence:
  - Removed partial `.vendor` runtime.
  - Installed `piper-tts` into repo-local `piper/.venv` with `--no-cache-dir`.
  - `piper/.venv/bin/piper --help` pass.
  - Direct/API smoke reaches Piper runtime and returns concise incompatible-model error.
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts` pass (9 tests / 2 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/app/api/audio/piper-tts/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass (9 tests / 2 files).
  - Build pass with existing warning outside this task.
