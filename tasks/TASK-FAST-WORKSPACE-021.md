# [FAST-WORKSPACE-021] Persist generated VI metadata on stored artifacts and align mask runtime setup sourcing with Video Tools Lab

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

- Task ID: FAST-WORKSPACE-021
- Phase: FAST
- Target Phase: Workspace runtime correctness
- Domain: Workspace / Storage Metadata / Video Edit Runtime
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User report:
  1. `Generate VI metadata` step báo success nhưng asset sau `Save final video` vẫn không có `VI Title/VI Description/VI Hashtags`.
  2. `Blur + subtitle overlay` trong Workspace lệch nhiều so với Video Tools Lab.
- Initial findings:
  - Workspace `store-artifact` chỉ upload video qua local intake pipeline, chưa patch lại metadata VI vào asset mới tạo.
  - Runtime `edit-video` chỉ lấy `videoEditSetup` khi source trực tiếp là `source.asset`; với flow `... -> mirror -> edit` thì setup saved upstream bị bỏ qua dù UI vẫn báo đang dùng setup đó.

## 3. Scope

- In scope:
  - Sau khi `store-artifact` thành công, patch metadata VI (`vietnameseTitle`, `vietnameseDescription`, `vietnameseHashtags`) vào asset vừa tạo nếu có output từ `Generate VI metadata`.
  - Đồng bộ runtime setup sourcing cho `edit.mask-region`: tìm `source.asset` upstream theo graph traversal (không phụ thuộc source trực tiếp) để lấy saved `videoEditSetup`, giống semantics hiển thị trong UI và gần hành vi Video Tools Lab.
  - Thêm/cập nhật test coverage source-level cho các logic mới.
- Out of scope:
  - Persist full media artifacts/base64 vào DB.
  - Refactor tổng thể video edit pipeline/filter order.

## 4. Acceptance Criteria

1. Khi flow có bước `Generate VI metadata` và `Save final video`, asset mới lưu trong Storage có VI metadata fields tương ứng.
2. Nếu metadata patch thất bại, flow không crash toàn bộ; upload asset vẫn thành công và có warning phù hợp.
3. `edit.mask-region` runtime dùng được saved `videoEditSetup` từ `source.asset` upstream ngay cả khi source trực tiếp là node trung gian (`edit.mirror`, `audio.video-dubbing`, `video.preprocess`, ...).
4. Workspace `Blur + subtitle overlay` runtime request truyền `subtitlePlayResX/Y` để đồng bộ hành vi subtitle style với Video Tools Lab.
5. Tests pass + build pass + guard pass.

## 5. Technical Plan

1. Tách helper graph traversal dùng chung để tìm upstream node theo `templateNodeType`.
2. Dùng helper này trong `NodeRuntimeConfig` và `runWorkspaceFlow(edit-video/store-artifact)`.
3. Trong `store-artifact`, patch `/api/storage/assets/:id` với VI metadata generated nếu có.
4. Trong `edit-video`, resolve source video dimensions từ input thực tế và gửi `subtitlePlayResX/Y` vào `/api/video-processing/edit`.
5. Cập nhật tests + changelog.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-021.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Metadata patch API có thể fail do network hoặc write guard; cần non-fatal handling.
  - Video dimension probing thêm async step nhẹ ở edit runtime.
- Rollback:
  - Revert patch workspace-canvas-panel và test/changelog liên quan.

## 9. Deliverables

1. Asset lưu từ Workspace có VI metadata khi flow có metadata step.
2. Runtime blur/subtitle setup sourcing nhất quán hơn với logic saved setup upstream.
3. Test + docs/task/changelog cập nhật.

## 10. Changelog Note

- Workspace now patches generated VI metadata onto stored artifacts and resolves saved edit setup from upstream Storage Asset consistently for mask/subtitle runtime.

## 11. Task Type Checklist (Stamp [x])

### 11.1 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 12. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - 3 test files pass (55 tests).
  - Build pass (existing ESLint circular-config warning remains outside scope).
  - Version guard pass.
