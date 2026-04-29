# P2-AUDIO-007 Workspace Audio Dubbing Nodes

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

- Task ID: P2-AUDIO-007
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio / Workspace
- Task Type: Feature
- Priority: P0
- Size: L
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace đã có Audio Transcript và Translate Transcript, nhưng thiếu node Voice Generation và node tổng hợp video dubbing chạy trọn luồng Trung -> Việt.
- Bài toán cần giải quyết: Cho phép Workspace tạo voice Việt từ translated transcript, và tạo video MP4 tiếng Việt bằng cách transcribe, translate, synthesize voice, duck audio gốc rồi mux lại.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/architecture/node-architecture.md`
  - `docs/SYSTEM-SUMMARY.md`

## 3. Scope

- In scope:
  - Thêm Workspace node `audio.voice-generation`.
  - Thêm Workspace node tổng hợp video dubbing ZH->VI.
  - Thêm backend API/lib mux dubbed MP4 bằng ffmpeg.
  - Cho dubbed video preview/download và có thể persist qua `storage.upload`.
  - Tests cho backend API/lib và Workspace graph planning.
- Out of scope:
  - Source separation bằng Demucs/MDX.
  - Full graph runner topological tổng quát.
  - Voice cloning/provider TTS abstraction.

## 4. Input / Output

- Input: video file local hoặc Storage Asset, transcript segments đã dịch cho voice node, cấu hình language/model/Piper/ducking.
- Output mong đợi: WAV voice artifact cho node Voice Generation; MP4 dubbed video artifact cho node tổng hợp, có thể preview/download và persist thành Storage Asset.

## 5. Acceptance Criteria

1. Workspace catalog có node `Voice Generation` available nhận translated transcript và sinh audio.
2. Workspace catalog có node `Video Dubbing ZH->VI` available nhận `Upload Video` hoặc `Storage Asset`.
3. Node dubbing chạy trọn pipeline transcribe -> translate -> TTS -> duck/mix audio gốc -> output MP4.
4. Dubbed MP4 có preview/download trong Workspace.
5. Khi nối `Video Dubbing ZH->VI -> Save to Storage -> Publish Social`, flow persist asset rồi publish bằng assetId mới.
6. Planner báo lỗi rõ khi thiếu upstream hợp lệ hoặc fan-in chưa hỗ trợ.
7. Tests cover happy path và failure path chính.

## 6. Technical Plan

1. Thêm lib/API `video-dubbing` dựa trên module multilingual audio sẵn có.
2. Cập nhật `workspace-graph.ts` với template, step kinds và planning cho voice/dubbing/storage producer.
3. Cập nhật Workspace runner/inspector để gọi APIs, lưu artifacts và bridge dubbed MP4 sang storage upload.
4. Cập nhật tests/docs/changelog và ghi evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - `src/app/api/audio/video-dubbing/*`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `docs/domains/multilingual-audio.md`
  - `docs/architecture/node-architecture.md`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts`
2. Failure cases cần thử:
   - Missing video input.
   - Missing upstream transcript/translation/producer in Workspace.
   - ffmpeg mux failure.
3. Kết quả mong đợi:
   - Targeted tests pass, no new linter diagnostics in edited files.

## 9. Observability

- Metrics: transcript segments, translated segments, voice byte length, output video byte length, generation duration.
- Logs: không log raw transcript, secret, provider token.
- Error codes:
  - `VAL_DUBBING_VIDEO_REQUIRED`
  - `SYS_DUBBING_MUX_FAILED`
  - Existing transcription/translation/TTS errors.

## 10. Risks & Rollback

- Risks:
  - Duck/mix audio gốc giữ nhạc nhưng vẫn có thể còn tiếng Trung nền vì chưa source-separate.
  - MP4 base64 preview phù hợp MVP/local, video dài có thể nặng.
  - Piper/ffmpeg runtime local vẫn là dependency bắt buộc.
- Rollback strategy:
  - Revert node templates/steps and remove `/api/audio/video-dubbing`; existing Audio Transcript/Translate/TTS APIs remain unchanged.

## 11. Deliverables

1. Workspace Voice Generation node.
2. Workspace Video Dubbing ZH->VI node.
3. Backend video dubbing API/lib with tests.
4. Storage/publish bridge for dubbed artifact.
5. Updated docs/changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Workspace voice generation and MVP video dubbing nodes with ffmpeg duck/mix MP4 output.

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

- [x] Có câu hỏi nghiên cứu rõ
- [x] Có kết quả/khuyến nghị cụ thể
- [x] Có quyết định next step
- [x] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - MVP dùng duck/mix audio gốc, không tách nhạc/vocal.
  - Source language mặc định là Chinese (`zh`) và target language mặc định là Vietnamese (`vi`).
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (29 tests / 3 files).
  - `npm run build` pass; existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - `ReadLints` pass for edited code files.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `src/app/api/audio/video-dubbing/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
- Test results summary:
  - Targeted tests pass: 29 tests / 3 files.
  - Production build pass with existing unrelated `Image` unused warning.
