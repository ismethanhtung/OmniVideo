# [FAST-WORKSPACE-030] Reframe Default Workspace Canvas View

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-WORKSPACE-030
- Phase: FAST
- Target Phase: Workspace polish
- Domain: Workspace canvas UX
- Task Type: Bug / UX polish
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- User reports the initial Workspace canvas view feels too zoomed in and slightly left-biased, with the flow occupying too much of the viewport.
- Desired behavior: show a more zoomed-out initial view than before, then refine it slightly larger and shift the initial framing left after user review.

## 3. Scope
- In scope:
  - adjust the default initial canvas transform;
  - keep wheel zoom and manual panning behavior unchanged.
- Out of scope:
  - automatic fit-to-flow calculation;
  - seed node position redesign.

## 4. Acceptance Criteria
1. Initial Workspace canvas zoom is materially lower than the original default zoom while remaining readable.
2. Initial canvas x-offset shifts left after user review to correct the desired direction.
3. Canvas transform constants are explicit and regression-covered.

## 5. Technical Plan
1. Extract the default canvas view into a named constant.
2. Tune scale down from the original value while keeping nodes readable and shift the initial x offset left.
3. Add source-level regression coverage and verify build/version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Reframe the default Workspace canvas with a more zoomed-out and slightly right-shifted initial view.

## 8. Execution Notes
- Requested adjustment from screenshot: current view looks over-zoomed.
- Follow-up refinement: user confirmed the first pass became slightly too small and corrected the desired horizontal direction to left, with roughly double the prior horizontal shift.

## 9. Test Evidence
- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` ✅
- `npm run build` ✅
  - Existing repo warning remains: ESLint circular-config serialization warning during build output.
- `npm run guard:version` ✅
- `git diff --check` ✅
