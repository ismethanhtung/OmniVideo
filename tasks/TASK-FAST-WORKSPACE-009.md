# [FAST-WORKSPACE-009] Make URL Video Behave Like Upload Video in Workspace Flow

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-009
- Phase: FAST
- Target Phase: Workspace runtime UX and flow parity
- Domain: Workspace
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: `URL Video` mới được support trực tiếp với `Save to Storage`, nhưng chưa được xem như video source hợp lệ cho các processing nodes như `Mirror Video`.
- Bài toán cần giải quyết: Làm cho `URL Video` có tính chất gần với `Upload Video` trong planner/runtime, để flow `URL Video -> Mirror -> Save to Storage -> Publish Social` chạy được.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/governance/definition-of-ready-done.md`

## 3. Scope

- In scope:
  - Mở planner để `URL Video` được dùng upstream cho transcript/dubbing/mirror/edit.
  - Thêm API server-side resolve+tải URL thành file runtime cho Workspace.
  - Cập nhật executor để xử lý `source.url` như source video ở các step video-processing/audio-processing liên quan.
  - Thêm test cho flow `URL Video -> Mirror -> Save to Storage -> Publish Social`.
- Out of scope:
  - Đổi naming nội bộ `ChineseTranscription*`.
  - Refactor toàn bộ Video Intake runtime architecture.

## 4. Input / Output

- Input: Flow Workspace với `URL Video` nối sang `Mirror Video`, `Save to Storage`, `Publish Social`.
- Output mong đợi: Flow được plan thành công và runtime có thể resolve URL video thành file tạm để xử lý tiếp.

## 5. Acceptance Criteria

1. `planWorkspaceFlow` không còn báo `URL Video` phải nối thẳng tới `Save to Storage` nếu node này đang nối vào processing nodes hợp lệ.
2. `Mirror Video` chấp nhận upstream `URL Video`.
3. Runtime có thể resolve/tải URL video qua server route rồi đưa vào mirror/edit/dubbing/transcription steps như một `videoFile`.
4. Có test cho flow `URL Video -> Mirror -> Save to Storage -> Publish Social`.

## 6. Technical Plan

1. Mở rộng planner cho `source.url` parity với `source.file` ở các step phù hợp.
2. Thêm route `POST /api/video-intake/resolve-file` để resolve URL và tải binary ở server side.
3. Cập nhật Workspace executor để gọi route trên khi `source.url` được dùng upstream cho processing steps.
4. Thêm regression tests cho planner và route mới.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/app/api/video-intake/resolve-file/route.ts`
  - `src/app/api/video-intake/resolve-file/route.test.ts`

## 8. Test Plan

1. Unit tests cho planner flow URL -> mirror -> storage -> publish.
2. Route test cho URL resolve-file API.
3. Build để kiểm tra type/runtime mapping không regression.

## 9. Observability

- Metrics: dùng progress/runtime status có sẵn của Workspace.
- Logs: giữ API error message từ route resolve-file và downstream video/audio APIs.
- Error codes: thêm `SYS_WORKSPACE_URL_RESOLVE_FAILED`.

## 10. Risks & Rollback

- Risks: download direct media URL vẫn phụ thuộc resolver/upstream site fetchability.
- Rollback strategy: revert route resolve-file + planner/runtime parity cho `source.url`.

## 11. Deliverables

1. `URL Video` dùng được như source video upstream cho các processing nodes liên quan.
2. Flow `URL Video -> Mirror -> Save to Storage -> Publish Social` được planner nhận diện đúng.
3. Route resolve-file + tests + changelog/task cập nhật đầy đủ.

## 12. Changelog Note

- Workspace: make `URL Video` behave like `Upload Video` for processing flows by resolving remote source URLs into runtime video files.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: Workspace có thể dùng server route riêng để tải URL video thành `File` mà không phải persist vào storage trước.
- Blockers: none.
- Verification evidence:
  - Planner chấp nhận `source.url` làm upstream cho transcript/dubbing/mirror/edit.
  - Runtime có helper resolve URL video thành `File` qua `/api/video-intake/resolve-file`.
  - Case người dùng nêu `URL Video -> Mirror -> Save to Storage -> Publish Social` có regression test riêng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/app/api/video-intake/resolve-file/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/app/api/video-intake/resolve-file/route.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass.
  - Build pass; warning cũ ngoài scope vẫn còn.
