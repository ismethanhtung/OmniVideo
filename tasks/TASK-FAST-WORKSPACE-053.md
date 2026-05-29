# [FAST-WORKSPACE-053] Prioritize Saved Video Tools Setup Over Node Defaults in VIP Flow

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-WORKSPACE-053
- Phase: FAST
- Target Phase: Workspace VIP setup fidelity
- Domain: Workspace / Video Pipeline
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner confirms local setup can be saved/loaded, but generated output still follows unexpected config instead of saved setup.
- Suspected cause: Workspace node default config values override saved Video Tools Lab setup even when user has not changed node fields.

## 3. Scope
- In scope:
  - Fix mask/VIP config resolution precedence so saved setup is applied when node fields are still default.
  - Keep explicit node overrides higher priority when user changed values.
  - Add regression tests for this precedence behavior.
- Out of scope:
  - Redesigning node config UX.
  - Changing Video Tools Lab save schema.

## 4. Acceptance Criteria
1. Workspace VIP/edit runtime uses saved Video Tools Lab setup values when node config fields are untouched defaults.
2. If user changes node config value away from template default, node value overrides saved setup.
3. Focused tests and guard checks pass.

## 5. Technical Plan
1. Resolve template-default values per node field from `WORKSPACE_NODE_TEMPLATES`.
2. Update mask config resolution helpers to compare against template defaults instead of static global defaults.
3. Add/adjust tests to guard local-setup precedence behavior.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Fix Workspace VIP/edit config precedence so saved Video Tools Lab setup is actually applied unless node field is explicitly overridden.

## 8. Execution Notes
- Assumptions:
  - Node template defaults represent "not overridden" state.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (1 file / 22 tests).
  - Version guard pass.
