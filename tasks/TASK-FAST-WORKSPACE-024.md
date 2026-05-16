# [FAST-WORKSPACE-024] Fix dubbing voice timeline drift in preprocess (0.7x) Workspace flows

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-024
- Phase: FAST
- Target Phase: Workspace dubbing runtime parity with Audio Transcript
- Domain: Workspace / Audio Dubbing / Runtime alignment
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User report: flow có `Video Preprocess (0.7x)` + `Vietnamese voice dubbing` cho ra video/sub đúng nhịp chậm, nhưng voice nói xong sớm.
- Audio Transcript page cho kết quả chuẩn hơn vì đang dùng strict timeline alignment.

## 3. Scope

- In scope:
  - So sánh runtime behavior Workspace dubbing với Audio Transcript voice alignment.
  - Ép runtime Workspace dùng `strict` alignment khi source vào dubbing đi qua `video.preprocess` khác `1x` và node đang để `balanced`.
  - Đổi default alignment trong Workspace graph/template/seed sang `strict` để tránh drift mặc định.
  - Cập nhật UI hint để user hiểu vì sao runtime auto-force strict ở trường hợp preprocess.
- Out of scope:
  - Refactor sâu Piper alignment engine.
  - Thay đổi API contract `video-dubbing`.

## 4. Acceptance Criteria

1. Flow `source -> preprocess(0.7x) -> video dubbing` không còn voice kết thúc sớm do balanced-gap compression.
2. Nếu node chọn balanced nhưng source là preprocess khác 1x, runtime tự gửi `ttsAlignmentMode=strict`.
3. Workspace defaults cho `audio.voice-generation` và `audio.video-dubbing` dùng strict alignment.
4. Test/build/guard pass.

## 5. Technical Plan

1. Patch Workspace dubbing runtime để tính effective alignment mode trước khi gọi `/api/audio/video-dubbing`.
2. Add auto-force strict condition cho preprocess source != 1x.
3. Update Workspace template/seed defaults từ balanced sang strict.
4. Update tests + changelog/task evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-024.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Một số flow cũ cố ý dùng balanced với preprocess có thể khác nhịp kỳ vọng trước đây.
- Rollback:
  - Revert logic `shouldForceStrictAlignment` và defaults alignment trong workspace graph.

## 9. Deliverables

1. Workspace dubbing runtime parity tốt hơn cho preprocess flows.
2. Strict-default alignment cho workspace piper nodes.
3. Test evidence + changelog/task/board updates.

## 10. Changelog Note

- Workspace dubbing now auto-forces strict alignment for preprocess sources (non-1x speed) to prevent voice ending earlier than slowed timeline.

## 11. Task Type Checklist (Stamp [x])

### 11.1 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 12. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (3 files / 55 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
