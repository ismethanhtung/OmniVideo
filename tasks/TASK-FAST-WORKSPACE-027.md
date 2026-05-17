# [FAST-WORKSPACE-027] Fix Workspace edge delete hitbox and curve drag preview

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

- Task ID: FAST-WORKSPACE-027
- Phase: FAST
- Target Phase: Workspace canvas polish
- Domain: Workspace / UI interactions
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User reported that deleting a Workspace link requires clicking slightly below the visible delete affordance.
- User also requested that the in-progress drag link preview use a curved line instead of the current straight segment.
- Current implementation renders the delete control through SVG `foreignObject`, while the drag preview path uses `L` (line-to).

## 3. Scope

- In scope:
  - Replace the embedded HTML delete control with an SVG-native control so visible center and click target share the same geometry.
  - Keep a generous centered hit target around the delete affordance.
  - Render the temporary drag-link preview as a cubic Bézier curve.
- Out of scope:
  - Redesigning final edge routing strategy for all graph layouts.
  - Changing graph connection validation rules.

## 4. Acceptance Criteria

1. The delete affordance uses a centered SVG hit target instead of `foreignObject` HTML embedding.
2. Clicking the visible delete affordance no longer depends on a below-icon offset.
3. Dragging a new link renders a cubic Bézier preview rather than a straight `L` segment.
4. Regression tests cover the new delete-control and preview-path wiring.
5. Test/build/version guard pass.

## 5. Technical Plan

1. Add a small reusable helper for Workspace Bézier link paths.
2. Replace the `foreignObject` delete button with an SVG-native clickable group centered on the edge midpoint.
3. Switch temporary drag-link rendering from straight line to the same Bézier path builder.
4. Add source-level regression assertions and run verification.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/features/workspace/workspace-linking-interactions.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-027.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. Source-level regression test confirms the delete control is SVG-native and stops using `foreignObject`.
2. Source-level regression test confirms drag preview calls the Bézier helper instead of rendering a straight `L` path.
3. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/features/workspace/workspace-linking-interactions.test.ts`
4. `npm run build`
5. `npm run guard:version`

## 8. Observability

- None; this is direct interaction polish.

## 9. Risks & Rollback

- Risks:
  - SVG-native control styling may differ slightly from the previous HTML button.
  - A larger click target must not make accidental deletes too easy; keep it modest and only visible on edge hover.
- Rollback:
  - Restore the prior `foreignObject` delete button and straight preview path.

## 10. Deliverables

1. Center-aligned delete hit target for Workspace edges.
2. Curved in-progress drag-link preview.
3. Regression coverage + release metadata.

## 11. Changelog Note

- Fix Workspace edge deletion hitbox alignment and render dragged link previews as curves.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/features/workspace/workspace-linking-interactions.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/features/workspace/workspace-linking-interactions.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/features/workspace/workspace-linking-interactions.test.ts` pass (2 files / 15 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
- Versioning note:
  - Bumped app version `0.8.4 -> 0.8.5` (`PATCH`) because this is a backward-compatible interaction bugfix.

## 14. Execution Notes

- Assumptions:
  - The user wants dragged previews to visually match the curved language of persisted links.
- Root cause:
  - Delete affordance mixed HTML inside SVG via `foreignObject`, while the drag preview path used a straight `L` command.
- Verification evidence:
  - Delete affordance is now an SVG-native centered control with an invisible centered hit target and pointer-down isolation.
  - Drag preview now routes through `buildWorkspaceLinkPath(...)` and renders `d={dragPath}`.
