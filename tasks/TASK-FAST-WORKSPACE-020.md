# [FAST-WORKSPACE-020] Persist Workspace resume checkpoints and strengthen publish-only continuation after navigation

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

- Task ID: FAST-WORKSPACE-020
- Phase: FAST
- Target Phase: Workspace runtime resilience
- Domain: Workspace / Runtime Resume
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do:
  - User chạy flow 8 step, fail ở step publish do token social hết hạn.
  - Khi chuyển sang trang Social để fix token rồi quay lại Workspace, state runtime bị reset theo component lifecycle nên `Continue Failed Flow` không còn checkpoint mạnh để chạy tiếp step 8.
- Bài toán cần giải quyết:
  - Cho phép resume bền vững qua điều hướng/reload với chi phí nhẹ, không persist artifact binary lớn.

## 3. Scope

- In scope:
  - Persist runtime resume snapshot vào localStorage (asset checkpoints, metadata checkpoints, node run statuses, run error/result) theo graph signature.
  - Hydrate resume snapshot khi vào lại Workspace nếu graph không đổi.
  - Tăng cường resume logic để hỗ trợ publish-only continuation an toàn khi đã có checkpoint `store-artifact` thành công trước đó.
- Out of scope:
  - Persist full media artifacts/base64 cho mọi node.
  - Distributed checkpoint backend trên server/DB.

## 4. Acceptance Criteria

1. Sau khi flow fail ở publish step, user chuyển trang để fix token rồi quay lại Workspace vẫn giữ được checkpoint resume hợp lệ.
2. `Continue Failed Flow` có thể chạy tiếp publish step mà không bắt buộc rerun lại toàn bộ preprocessing/dubbing/edit khi đã có store checkpoint thành công.
3. Không persist artifact binary lớn vào localStorage.
4. Clear draft sẽ xoá runtime snapshot tương ứng.
5. Tests pass + guard pass.

## 5. Technical Plan

1. Thêm localStorage snapshot key + parser/signature helpers cho runtime resume state.
2. Hydrate runtime resume state khi mount, chỉ nhận snapshot nếu graph signature match.
3. Persist snapshot mỗi khi run state/checkpoint thay đổi.
4. Bổ sung resume policy `publish-only` (chỉ skip non-publish steps đã success khi có store checkpoint và tồn tại failed step).
5. Cập nhật test strings + verify.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-020.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Snapshot signature mismatch sẽ bỏ qua checkpoint cũ; đây là expected behavior để tránh resume sai flow.
  - `publish-only` resume intentionally nhắm case đã store xong; case failed trước store vẫn cần rerun upstream.
- Rollback:
  - Revert patch runtime snapshot + publish-only resume logic.

## 9. Deliverables

1. Runtime resume snapshot persistence/hydration cho Workspace.
2. Continue Failed Flow đáng tin cậy hơn cho case fail publish sau khi đã store artifact.
3. Test/docs/changelog/task updates.

## 10. Changelog Note

- Workspace runtime now persists lightweight resume checkpoints across navigation and can continue failed publish steps without replaying completed upstream processing when store checkpoint already exists.

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
  - 3 test files pass (53 tests).
  - Build pass (existing ESLint circular-config warning remains outside scope).
  - Version guard pass.
