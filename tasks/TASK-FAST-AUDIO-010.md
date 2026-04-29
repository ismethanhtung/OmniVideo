# FAST-AUDIO-010 Add Local Piper TTS Sandbox Page

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

- Task ID: FAST-AUDIO-010
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Cần thay Groq TTS test bằng Piper TTS chạy local, nhẹ, phù hợp máy yếu không GPU và dùng voice model `.onnx` user đã chuẩn bị.
- Bài toán cần giải quyết: Tạo sandbox để cấu hình Piper binary/model/config và test sinh audio local mà không tích hợp sâu vào pipeline chính.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-006.md`

## 3. Scope

- In scope:
  - Xóa sạch phần Groq TTS sandbox còn sót.
  - Thêm local Piper TTS sandbox UI.
  - Thêm API route gọi Piper CLI local bằng `child_process`.
  - Hỗ trợ cấu hình binary path, model `.onnx`, optional config `.json`, speaker, length scale, noise scale và noise width.
  - Tests cho validation + command invocation.
- Out of scope:
  - Tải model/binary từ internet.
  - Lưu cấu hình vào DB.
  - Tích hợp Workspace runtime hoặc storage persistence.

## 4. Input / Output

- Input: text, Piper binary path, `.onnx` model path, optional `.onnx.json` config path, tuning params.
- Output mong đợi: WAV audio preview/download và metadata đủ để kiểm tra tốc độ/dung lượng.

## 5. Acceptance Criteria

1. Groq TTS sandbox không còn xuất hiện trong navigation/task board.
2. Có trang sandbox riêng cho Piper TTS local.
3. API trả lỗi rõ khi thiếu text, binary path hoặc model path.
4. API gọi Piper CLI bằng stdin/stdout, không cần GPU và không ghi file tạm nếu không bắt buộc.
5. UI cho phép test model `.onnx` local và nghe/tải WAV kết quả.
6. Có tests cho validation và success path với mocked child process.

## 6. Technical Plan

1. Dọn references Groq TTS sandbox.
2. Thêm Piper adapter server-side với validation/resource guard nhẹ.
3. Thêm `POST /api/audio/piper-tts` trả audio base64.
4. Thêm panel UI `Piper TTS Sandbox` trong Video Pipeline.
5. Chạy focused tests và build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/*`
  - `src/features/audio/*`
  - `src/app/api/audio/piper-tts/*`
  - `src/lib/multilingual-audio/*`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/components/layout/navigation.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Empty text.
   - Missing binary/model path.
   - Piper process non-zero exit.
3. Kết quả mong đợi:
   - Focused tests pass.
   - Build pass.

## 9. Observability

- Metrics: byteLength, durationMs, modelPath basename, speaker id.
- Logs: không log full text payload.
- Error codes:
  - `VAL_PIPER_TTS_TEXT_REQUIRED`
  - `VAL_PIPER_TTS_BINARY_REQUIRED`
  - `VAL_PIPER_TTS_MODEL_REQUIRED`
  - `PRV_PIPER_TTS_FAILED`

## 10. Risks & Rollback

- Risks:
  - Piper binary chưa có trên máy hoặc không executable.
  - Model `.onnx` thiếu file config tương ứng.
- Rollback strategy:
  - Xóa Piper sandbox panel + API + adapter + nav item.

## 11. Deliverables

1. Groq sandbox cleanup.
2. Piper TTS Sandbox panel.
3. Local Piper TTS API/adapter.
4. Tests + changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Replace temporary Groq TTS sandbox with a local Piper TTS sandbox for lightweight CPU-only voice testing.

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

- Assumptions:
  - User already has at least one Piper `.onnx` voice model locally.
  - For weak CPU/memory, CLI-based one-shot synthesis is acceptable for sandbox testing.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/components/layout/navigation.test.ts` pass (10 tests / 3 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng.
  - Dev server started on `http://localhost:3002`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/app/api/audio/piper-tts/route.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass (10 tests / 3 files).
  - Build pass with existing warning outside this task.
