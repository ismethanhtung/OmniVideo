# FAST-REL-001 Release OmniVideo 0.3.0

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-REL-001
- Phase: P2
- Target Phase: P2
- Domain: Release
- Task Type: Release
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Release batch includes Inspiration Vault, topbar quick capture, focused progress tracking, and related UX polish.
- Versioning rules require a bump when release scope includes runtime/user-facing features.

## 3. Scope

- In scope: bump app version, update lockfile, document release, verify, commit, tag, and push.
- Out of scope: new product behavior beyond the existing release batch.

## 4. Acceptance Criteria

1. `package.json` and `package-lock.json` are bumped from `0.2.0` to `0.3.0`.
2. Changelog has a release entry with the included task IDs.
3. Build and relevant tests pass before release.
4. Git commit and annotated tag `v0.3.0` are created and pushed.

## 5. Technical Plan

1. Apply `minor` bump via `npm version minor --no-git-tag-version`.
2. Add release notes to changelog and close this task in board.
3. Run `npm test` and `npm run build`.
4. Stage intended files, commit, tag, and push main plus tag.

## 6. Test Plan

1. Run full Vitest suite with `npm test`.
2. Run production build with `npm run build`.
3. Confirm leftbar version source remains package-driven.

## 7. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 8. Risks & Rollback

- Risks: GitHub Release object cannot be created if `gh` is unavailable in this environment.
- Rollback strategy: revert release commit and delete local/remote tag if required.

## 9. Deliverables

1. Version bump to `0.3.0`.
2. Release changelog entry.
3. Commit and `v0.3.0` tag pushed to remote.

## 10. Changelog Note

- Release `v0.3.0` for Inspiration Vault and focused progress/topbar UX batch.

## 11. Execution Notes

- Bump decision: `minor`, because the batch includes a new user-facing feature (`Inspiration Vault`) and backward-compatible UX/runtime additions.
- `gh` is not installed, so GitHub Release object creation is not available from this environment.
- Release readiness hardening fixed stale test expectations, lazy-loaded asset-only dependencies in the transcription API validation path, and restored the Drive thumbnail helper expected by tests.

## 12. Test Evidence

- Test files added/updated: `src/lib/video-intake/drive-thumbnail.test.ts` covered by restored helper; stale expectations updated in `src/features/video-processing/video-tools-lab-panel.test.ts`; existing transcription tests covered `audioSizeBytes`.
- Test commands executed: `npm test`; `npm run build`.
- Test results summary: `npm test` pass (76 files / 344 tests). `npm run build` pass with existing warnings outside release scope.
