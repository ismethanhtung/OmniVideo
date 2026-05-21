# [FAST-VIDEO-011] Restore asset preview and allow lifecycle tags to wrap in Video Tools Lab picker

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-VIDEO-011
- Phase: FAST
- Target Phase: Video Tools Lab UX polish
- Domain: Video Tools Lab / Asset picker
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User reported two regressions in `Select asset` picker:
  - lifecycle tags should go to new lines when needed;
  - preview thumbnail is missing.
- Root cause:
  - previous badge hardening forced no-wrap globally;
  - picker item no longer rendered per-asset media preview.

## 3. Scope

- In scope:
  - Add wrap-capable mode for `AssetLifecycleBadges`.
  - Enable wrapped lifecycle chips in Video Tools Lab picker.
  - Restore per-item asset preview in picker list.
  - Verify with targeted tests and version guard.
- Out of scope:
  - Redesigning picker layout beyond this fix.
  - Backend thumbnail generation changes.

## 4. Acceptance Criteria

1. Lifecycle tags can wrap inside Video Tools Lab asset picker rows.
2. Each asset row shows a preview media box again.
3. Existing Video Tools Lab source-level tests remain green.
4. `npm run guard:version` passes.

## 5. Technical Plan

1. Extend shared badge component with optional `wrap` behavior.
2. Update picker row markup: preview video column + metadata + wrapped tags row.
3. Run targeted tests and version guard.

## 6. Code Change Impact

- Code changed: Yes
- Modules impacted:
  - `src/components/ui/asset-lifecycle-badges.tsx`
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - release/task tracking files

## 7. Test Plan

1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts`
2. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Per-item preview uses inline download URL and may increase network requests in long lists.
- Rollback:
  - Remove preview column and revert badge wrap mode usage in picker.

## 9. Test Evidence

- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts`
  - `npm run guard:version`
- Results:
  - Tests pass (2 files / 5 tests).
  - Version guard pass after patch bump `0.10.15 -> 0.10.16`.
