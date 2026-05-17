# [FAST-WORKSPACE-026] Add subtle dot grid to Workspace canvas

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

- Task ID: FAST-WORKSPACE-026
- Phase: FAST
- Target Phase: Workspace canvas polish
- Domain: Workspace / UI
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User requested a light dotted background behind the Workspace node-dragging area.
- Follow-up clarification confirmed the dots are intended as a coordinate-grid surface, so they must move and scale with pan/zoom rather than stay fixed to the viewport.
- User follow-up confirmed the first contrast level was too faint to be perceptible, so the final styling needs to remain subtle but visibly present.
- The current visible canvas background is mostly flat, which makes the free-form flow surface feel visually empty.

## 3. Scope

- In scope:
  - Add a subtle dot-grid pattern to the Workspace flow canvas surface.
  - Keep the dots theme-aware and intentionally low contrast.
  - Anchor the pattern to the transformed flow plane so it follows the canvas coordinate system during pan/zoom.
- Out of scope:
  - Redesigning node cards, edges, or overall Workspace layout.
  - Adding a dense engineering grid or snap-to-grid behavior.

## 4. Acceptance Criteria

1. The Workspace flow canvas shows a subtle dotted background behind nodes.
2. Dot intensity remains visually light across current themes.
3. The dot pattern is applied to the transformed canvas plane so it follows pan/zoom with nodes/edges.
4. Regression coverage verifies the canvas-grid class remains wired.
5. Test/build/version guard pass.

## 5. Technical Plan

1. Add a reusable Workspace canvas grid class in global styles using a low-opacity radial gradient.
2. Apply the class to the transformed Workspace canvas layer.
3. Add source-level regression coverage for the new class wiring.
4. Update changelog/task metadata and run verification.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/globals.css`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-026.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. Source-level regression test confirms `workspace-canvas-grid` stays attached to the transformed Workspace canvas plane.
2. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
3. `npm run build`
4. `npm run guard:version`

## 8. Observability

- None; this is a visual polish change.

## 9. Risks & Rollback

- Risks:
  - If dot contrast is too strong, the canvas may feel noisy; keep opacity deliberately low.
- Rollback:
  - Remove the grid class from the canvas layer and delete the CSS utility.

## 10. Deliverables

1. Light dotted Workspace coordinate-grid background.
2. Regression coverage for canvas grid wiring.
3. Updated changelog/task metadata.

## 11. Changelog Note

- Add a subtle theme-aware dot grid to the Workspace coordinate plane.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính (not applicable for static visual styling; existing regression suite remains green)

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 13 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
  - Browser QA against `http://127.0.0.1:3000/workspace` was not completed because the in-app browser policy blocked that local target in this session.
- Versioning note:
  - Bumped app version `0.8.3 -> 0.8.4` (`PATCH`) because this is a backward-compatible UI polish change.

## 14. Execution Notes

- Assumptions:
  - The user wanted a visual orientation aid that behaves like part of the canvas coordinate system, not functional snap-to-grid behavior.
- Root cause:
  - The Workspace coordinate plane used a flat background with no subtle spatial texture.
- Verification evidence:
  - The transformed flow plane now carries `workspace-canvas-grid`, so the pattern follows pan/zoom with the node system.
  - Dot contrast and radius were increased from the first pass so the pattern is perceptible on light themes instead of effectively invisible.
  - Existing Workspace source-level assertions were made whitespace-tolerant where current formatting already split the checked phrases across lines.
