# [FAST-WORKSPACE-019] Publish fallback to Generate VI metadata when overrides are empty

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

- Task ID: FAST-WORKSPACE-019
- Phase: FAST
- Target Phase: Workspace publish UX safety
- Domain: Workspace / Publish Runtime
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do:
  - User lo ngại `Publish Social` không tự lấy `Title/Caption/Hashtags` từ node `Generate VI metadata` khi để trống các trường override.
- Bài toán cần giải quyết:
  - Đảm bảo fallback metadata hoạt động rõ ràng và dễ hiểu với user.

## 3. Scope

- In scope:
  - Giữ fallback runtime cho publish khi các trường override trống.
  - Ưu tiên metadata từ node `Generate VI metadata` upstream của chính publish node (nếu có), fallback sang metadata khác khi cần.
  - Thêm hướng dẫn UI rõ ràng trong node `social.publish`.
- Out of scope:
  - Thay đổi API publish backend.
  - Thiết kế lại toàn bộ schema node publish.

## 4. Acceptance Criteria

1. Khi `title/caption/hashtags` trong `social.publish` để trống, runtime publish tự lấy từ output `Generate VI metadata` nếu có.
2. Nếu publish node có metadata node upstream, runtime ưu tiên metadata upstream đó.
3. Inspector `social.publish` hiển thị guidance rõ: để trống sẽ fallback từ Generate VI metadata.
4. Tests liên quan pass.

## 5. Technical Plan

1. Cập nhật runtime publish fallback resolver theo upstream metadata node trước, rồi mới fallback global.
2. Cập nhật `NodeRuntimeConfig` để hiển thị guidance rõ và ưu tiên hiển thị metadata generated gần nhất khi có runtime result.
3. Cập nhật source-level tests.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-019.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - DFS chọn metadata upstream đầu tiên theo graph traversal; với flow rất phức tạp có thể không đúng ý 100%, nhưng vẫn an toàn vì user đã chấp nhận không cần strict version mapping.
- Rollback:
  - Revert patch `workspace-canvas-panel.tsx` + test.

## 9. Deliverables

1. Publish fallback metadata ổn định hơn.
2. UI publish dễ hiểu hơn khi để trống override.
3. Test + task + changelog cập nhật.

## 10. Changelog Note

- Workspace publish now clearly falls back to Generate VI metadata when title/caption/hashtags overrides are empty, with upstream-aware preference and clearer inspector guidance.

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
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - `workspace-canvas-panel.test.ts` pass (1 file / 8 tests).
  - Version guard pass.

## 13. Follow-up Fix Note

- Trong lúc verify thực tế, phát hiện `ReferenceError: runtimeVietnameseMetadataByNodeId is not defined` khi mở `Flow Setup` và bấm `Run Flow`.
- Root cause: prop mới đã truyền vào `NodeRuntimeConfig` trong modal nhưng chưa truyền vào `WorkspaceFlowSetupModal` signature/type.
- Đã bổ sung prop này đầy đủ tại call-site + function params/type để loại bỏ lỗi runtime.
