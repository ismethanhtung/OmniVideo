# FAST-AUDIO-003 Harden ffmpeg Binary Resolution

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

- Task ID: FAST-AUDIO-003
- Phase: P2
- Target Phase: P2
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Runtime báo `SYS_AUDIO_EXTRACTION_FAILED: spawn /ROOT/node_modules/ffmpeg-static/ffmpeg ENOENT`.
- Bài toán cần giải quyết: `ffmpeg-static` có thể resolve path không tồn tại trong môi trường bundled/deployed; extractor cần kiểm tra file tồn tại và fallback đúng.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-001.md`
  - `tasks/TASK-FAST-AUDIO-002.md`

## 3. Scope

- In scope:
  - Harden ffmpeg path resolution before spawn.
  - Fallback to `process.cwd()/node_modules/ffmpeg-static/ffmpeg`.
  - Fallback to `ffmpeg` in PATH.
  - Add regression tests for missing static path.
- Out of scope:
  - Installing OS packages on deploy host.
  - Changing deployment packaging.

## 4. Input / Output

- Input: runtime with stale/missing `ffmpeg-static` resolved path.
- Output mong đợi: extractor falls back to available binary path or returns actionable missing-ffmpeg error.

## 5. Acceptance Criteria

1. Missing `ffmpeg-static` resolved path no longer causes immediate spawn ENOENT when another candidate exists.
2. Error message lists checked candidates when no ffmpeg binary is available.
3. Tests cover candidate fallback behavior.

## 6. Technical Plan

1. Add sync existence checks and exported resolver helper.
2. Update `runFfmpeg` to use resolved candidate.
3. Update tests.
4. Update changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/audio-extraction.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts`
2. Failure cases cần thử:
   - Missing primary static binary.
   - No binary candidate available.
3. Kết quả mong đợi:
   - Tests pass.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: `SYS_AUDIO_EXTRACTION_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Deploy artifact may still omit every ffmpeg binary; then user must install `ffmpeg` or include `node_modules/ffmpeg-static/ffmpeg`.
- Rollback strategy:
  - Revert resolver fallback change.

## 11. Deliverables

1. Hardened ffmpeg resolver.
2. Regression tests.
3. Changelog/task update.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden ffmpeg binary resolution for deployed Chinese Transcript extraction.

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

- Assumptions:
  - If bundled binary is absent, `ffmpeg` may be installed in PATH on some hosts.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts` pass (4 tests / 1 file).
  - `npm run build` pass. Existing warning remains: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.
  - `npm run test` pass (178 tests / 42 files).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests pass: 4 tests / 1 file.
  - Full suite pass: 178 tests / 42 files.
  - Build pass with existing unused `Image` warning.
