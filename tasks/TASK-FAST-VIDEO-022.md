# [FAST-VIDEO-022] Persist Video Tools Lab Local Upload Setup Across Reload

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
- Task ID: FAST-VIDEO-022
- Phase: FAST
- Target Phase: Video Tools Lab local setup persistence
- Domain: Video Pipeline / Video Tools Lab
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner reports Video Tools Lab settings saved for local uploaded video files are lost after page reload.
- Existing code saves local setup into localStorage but does not rehydrate setup when the same local file is selected again.

## 3. Scope
- In scope:
  - Rehydrate local Video Tools Lab setup when user selects a local file with a saved key.
  - Keep current asset-based setup behavior unchanged.
  - Add regression test assertion for local setup rehydrate path.
- Out of scope:
  - Changing local storage schema version.
  - Modifying Workspace-side setup attachment logic.

## 4. Acceptance Criteria
1. Saving setup while using local file (without selected asset) still writes to local storage successfully.
2. After page reload, selecting the same local file auto-applies previously saved setup.
3. If no local setup exists for the file, panel falls back to default setup behavior.
4. Regression tests and guard checks pass.

## 5. Technical Plan
1. Import local setup loader into Video Tools Lab panel.
2. On local file picker change, try loading setup and apply it immediately when present.
3. Keep fallback path unchanged when no local setup is found.
4. Update tests to assert the new load path.
5. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Fix Video Tools Lab local upload setup persistence across page reload.

## 8. Execution Notes
- Assumptions:
  - Local file identity key (`name::size::lastModified`) remains stable for the same file between uploads.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (1 file / 9 tests).
  - Version guard pass.
