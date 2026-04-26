# [P4-WORKSPACE-002] Upgrade Workspace canvas ergonomics and runtime bridge

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

- Task ID: P4-WORKSPACE-002
- Phase: P4
- Target Phase: P4
- Domain: Workspace / Video Pipeline
- Task Type: Feature/Bugfix
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace Canvas MVP còn bị giới hạn width, chưa kéo-thả node, lỗi connect có thể bubble lên Next.js overlay, inspector border quá đậm, graph chưa có pan/zoom, và runtime path chưa rõ.
- Bài toán cần giải quyết: Nâng Workspace thành bề mặt làm việc node thực tế hơn nhưng không giả vờ có graph runner full khi chưa có API orchestration riêng.
- Tài liệu liên quan: `docs/architecture/node-architecture.md`, `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Workspace dùng full available content width thay vì `max-w-7xl`.
  - Left catalog/right inspector scroll độc lập; graph canvas có pan/zoom.
  - Node có thể kéo-thả để đổi vị trí.
  - Edge linking lỗi hiển thị trong UI, không throw ra Next.js overlay.
  - Inspector border left nhẹ, đúng visual system.
  - Runtime Bridge rõ ràng tới các runtime đã có: Local Upload Intake và Publish Records.
  - Tests cho graph helper mới và connection validation non-throw.
- Out of scope:
  - Graph runner API chạy trực tiếp mọi node từ canvas.
  - Form upload file/social account embedded đầy đủ trong graph.
  - Implement edit/audio nodes thật.

## 4. Input / Output

- Input: Feedback trực tiếp sau Canvas MVP.
- Output mong đợi: Workspace rộng hơn, tương tác node tốt hơn, lỗi link thân thiện, có đường đi rõ để dùng runtime hiện có.

## 5. Acceptance Criteria

1. Workspace không bị giới hạn `max-w-7xl`.
2. Left/right panels scroll độc lập; graph viewport có pan/zoom controls.
3. User kéo node để đổi vị trí và edge render lại theo vị trí mới.
4. Link lỗi như output/input port missing hoặc duplicate edge hiển thị trong Workspace UI, không hiện Next.js error overlay.
5. Inspector border left không còn đậm bất thường.
6. Runtime Bridge có action mở `Local Upload Intake` và `Publish Records`, giải thích rõ graph runner trực tiếp chưa có.
7. Tests update pass.

## 6. Technical Plan

1. Cập nhật `ContentRouter` để Workspace dùng full width layout riêng.
2. Mở rộng workspace graph helpers với move-node và connection validation không throw.
3. Refactor `WorkspaceCanvasPanel` thêm pan/zoom state, drag handlers, independent panel scroll, runtime bridge.
4. Cập nhật tests cho move-node và connection validation.
5. Cập nhật changelog/task evidence và chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/content-router.tsx`, `src/features/workspace/workspace-canvas-panel.tsx`, `src/lib/workspace/workspace-graph.ts`

## 8. Test Plan

1. Unit: move node updates position and keeps edges.
2. Unit: connection validator returns user-facing error for missing ports instead of throwing.
3. Targeted tests for workspace/navigation.
4. Full tests and build.

## 9. Observability

- Metrics/logs/error codes: N/A for canvas UI. Runtime bridge uses existing panels/APIs.

## 10. Risks & Rollback

- Risks: Direct graph runner remains deferred; runtime bridge is explicit but not full orchestration.
- Rollback strategy: revert panel layout/interaction changes while keeping default Workspace registration.

## 11. Deliverables

1. Full-width Workspace layout.
2. Drag, pan, zoom graph interactions.
3. User-facing edge errors.
4. Runtime Bridge to existing upload/publish panels.
5. Tests + verification evidence.

## 12. Changelog Note

- Upgrade Workspace canvas with full-width layout, drag/pan/zoom, safer edge errors, and runtime bridge actions.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

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

- Assumptions: Upload/publish runtime hiện có nằm ở `Local Upload Intake` và `Publish Records`; graph runner trực tiếp cần task/API riêng.
- Blockers: none.
- Verification evidence:
  - Workspace route now uses a full-width content layout instead of `max-w-7xl`.
  - Node positions can be changed by dragging nodes; edges follow node positions.
  - Canvas supports pan by dragging empty graph space and zoom controls in toolbar.
  - Link errors are shown in Workspace UI through `validateWorkspaceConnection` before mutation.
  - Runtime Bridge opens the existing upload and publish runtime modules without pretending the graph runner exists yet.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests: pass (9 tests / 2 files).
  - Build: pass. Existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - Full tests: pass (145 tests / 37 files).
