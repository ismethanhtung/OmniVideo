# FAST-AUDIO-015 Add AI Provider Selector to Workspace Dubbing

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

- Task ID: FAST-AUDIO-015
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio / Workspace
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Node `Video Dubbing ZH->VI` trong Workspace chỉ có cấu hình `Groq model`, chưa chọn được AI Provider/model tương ứng như trang Audio Transcript.
- Bài toán cần giải quyết: Cho phép node dubbing chọn provider dịch từ AI Provider Management và load model theo provider, đồng thời backend dùng provider đó khi translate.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/domains/ai-provider-management.md`
  - `tasks/TASK-P2-AUDIO-007.md`

## 3. Scope

- In scope:
  - Thêm `translationProviderId` cho node `audio.video-dubbing`.
  - Workspace Inspector load active AI providers và model list theo provider.
  - `/api/audio/video-dubbing` nhận `providerId` và dùng API key/base URL của provider cho translation.
  - Tests cho API provider forwarding.
- Out of scope:
  - Provider fallback/priority routing.
  - Thay đổi node `text.translate-transcript` trong task này.

## 4. Input / Output

- Input: Workspace dubbing node config gồm provider optional và model.
- Output mong đợi: Translation trong dubbing pipeline dùng đúng provider/model user chọn.

## 5. Acceptance Criteria

1. Inspector của `Video Dubbing ZH->VI` có dropdown AI Provider với option default env.
2. Khi chọn provider active, Inspector load models từ `/api/ai-providers/[providerId]/models`.
3. Model selector dùng danh sách model của provider; nếu không có provider/list thì cho nhập model thủ công.
4. Workspace runner gửi `providerId` và `model` tới `/api/audio/video-dubbing`.
5. API video dubbing dùng provider key/base URL khi có `providerId`.
6. Tests pass và docs/changelog/task evidence được cập nhật.

## 6. Technical Plan

1. Cập nhật Workspace node template/config và Inspector provider/model UI.
2. Cập nhật API/lib video dubbing để nhận provider credential.
3. Cập nhật tests, docs, changelog và verification evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/app/api/audio/video-dubbing/route.ts`
  - `src/lib/multilingual-audio/video-dubbing.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts`
2. Failure cases cần thử:
   - Missing video input vẫn fail đúng.
   - Provider/model payload được forward đúng.
3. Kết quả mong đợi:
   - Targeted tests pass, build/type check pass, no new linter diagnostics.

## 9. Observability

- Metrics: giữ translation provider/model trong result hiện có.
- Logs: không log API key.
- Error codes:
  - Existing AI provider errors.
  - Existing dubbing errors.

## 10. Risks & Rollback

- Risks:
  - Provider model API có thể fail; UI fallback sang nhập model thủ công.
- Rollback strategy:
  - Revert provider selector/config and keep default env Groq path.

## 11. Deliverables

1. Provider/model selector for Workspace dubbing node.
2. API provider hydration for video dubbing translation.
3. Tests/docs/changelog evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add AI provider/model selection to Workspace Video Dubbing translation step.

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
  - Provider selector áp dụng cho bước translate bên trong composite dubbing node.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (26 tests / 2 files).
  - `npm run build` pass; existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - `ReadLints` pass for edited code files.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/video-dubbing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
- Test results summary:
  - Targeted tests pass: 26 tests / 2 files.
  - Production build pass with existing unrelated `Image` unused warning.
