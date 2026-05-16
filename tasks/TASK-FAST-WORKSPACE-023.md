# [FAST-WORKSPACE-023] Fix mirror/blur mismatch when upstream video is mirrored

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

- Task ID: FAST-WORKSPACE-023
- Phase: FAST
- Target Phase: Workspace runtime correctness
- Domain: Workspace / Video Edit Runtime
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User report: Với flow có `Mirror video` trước `Blur + subtitle overlay`, vùng blur từ setup lưu trên Storage Asset bị lệch trái/phải: logo đã bị lật sang bên phải nhưng blur vẫn áp dụng bên trái.

## 3. Scope

- In scope:
  - Detect mirror parity trên nhánh video upstream của `edit.mask-region`.
  - Auto-mirror fallback blur regions từ `videoEditSetup` khi upstream video đã qua mirror (odd parity).
  - Cập nhật copy UI để tránh hiểu sai về thứ tự mirror trong node.
- Out of scope:
  - Thay đổi thứ tự filter của Video Tools Lab/API pipeline.
  - Refactor planner graph lớn.

## 4. Acceptance Criteria

1. Flow có `Mirror video -> Blur + subtitle overlay` và mask đang fallback từ Storage Asset setup sẽ blur đúng phía logo sau mirror.
2. Nếu user đã override `blurRegionsJson` ở node, hệ thống không tự mirror lại fallback để tránh phá override.
3. Inspector hiển thị rõ khi fallback setup đang được auto-mirror do upstream mirror path.
4. Test/build/guard pass.

## 5. Technical Plan

1. Thêm helper tìm upstream video node của mask node và mirror parity tới source asset ancestor.
2. Thêm helper build effective setup (auto-mirror blurRegions fallback khi cần).
3. Áp dụng logic trên cho cả runtime edit step và Inspector resolved config.
4. Cập nhật test source assertions.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-023.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Graph có topology phức tạp có thể có nhiều path mirror khác parity; hiện tại lấy path hợp lệ đầu tiên theo traversal.
- Rollback:
  - Revert helper mirror parity + effective setup patch trong `workspace-canvas-panel.tsx`.

## 9. Deliverables

1. Runtime blur fallback auto-mirror theo upstream mirror parity.
2. UI copy/notice rõ ràng hơn cho mirror behavior.
3. Test evidence + changelog/task updates.

## 10. Changelog Note

- Workspace mask runtime now auto-mirrors fallback blur regions from saved Storage Asset setup when upstream video path includes mirror transforms.

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
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (3 files / 55 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
