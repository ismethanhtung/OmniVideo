# FAST-AUDIO-011 Harden Piper TTS Runtime Preflight

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

- Task ID: FAST-AUDIO-011
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

- Lý do: Piper sandbox timeout khi runtime bundle thiếu dynamic libraries hoặc UI đang dùng placeholder model path.
- Bài toán cần giải quyết: Fail fast với lỗi cấu hình rõ ràng trước khi spawn Piper, và mặc định lấy model/config từ `repo/piper`.
- Tài liệu liên quan:
  - `tasks/TASK-FAST-AUDIO-010.md`
  - `docs/domains/multilingual-audio.md`

## 3. Scope

- In scope:
  - Preflight binary/model/config/runtime libraries trước khi spawn.
  - Default UI path sang `piper/model.onnx` và `piper/model.onnx.json`.
  - Test cho missing dynamic libraries và repo defaults.
- Out of scope:
  - Tải/cài dynamic libraries tự động.
  - Persistent Piper server mode.

## 4. Input / Output

- Input: Piper executable/model/config paths.
- Output mong đợi: lỗi thiếu dependency/path trả ngay, hoặc Piper synthesize khi runtime đầy đủ.

## 5. Acceptance Criteria

1. UI mặc định dùng model/config trong `repo/piper`.
2. Missing `.dylib` trả lỗi rõ trước khi spawn, không chờ timeout.
3. Missing model/config path trả lỗi rõ.
4. Tests pass.

## 6. Technical Plan

1. Thêm runtime preflight trong Piper adapter.
2. Cập nhật UI repo defaults.
3. Cập nhật tests và evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - `src/lib/multilingual-audio/piper-tts.test.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Missing model path.
   - Missing dynamic libraries.
3. Kết quả mong đợi:
   - Tests/build pass.

## 9. Observability

- Metrics: none new.
- Logs: no text payload logging.
- Error codes:
  - `VAL_PIPER_TTS_MODEL_REQUIRED`
  - `VAL_PIPER_TTS_CONFIG_NOT_FOUND`
  - `CFG_PIPER_TTS_RUNTIME_MISSING`

## 10. Risks & Rollback

- Risks:
  - Dynamic library names differ across Piper distributions.
- Rollback strategy:
  - Remove strict dynamic library preflight and rely on stderr.

## 11. Deliverables

1. Runtime preflight.
2. Repo-default UI paths.
3. Tests/changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden Piper sandbox with repo defaults and fail-fast runtime dependency checks.

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
  - Piper macOS tarball should include dynamic libraries next to `piper`; current local folder does not.
- Blockers:
  - None currently.
- Verification evidence:
  - Direct Piper smoke command fails fast with missing `libespeak-ng.1.dylib`, confirming runtime dependency issue rather than slow synthesis.
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts` pass (8 tests / 2 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/app/api/audio/piper-tts/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass (8 tests / 2 files).
  - Build pass with existing warning outside this task.
