# [FAST-VIDEO-028] Prefer Original Source Title for VIP Output Filename

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
- Task ID: FAST-VIDEO-028
- Phase: FAST
- Target Phase: VIP output naming correctness
- Domain: Workspace VIP / API / Runtime naming
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Even after changing suffix to `-done.mp4`, some VIP outputs still use intermediate technical names (for example `part-001-done.mp4`).
- Owner requested output naming to follow original source video name whenever possible.

## 3. Scope
- In scope:
  - Thread `sourceTitle` through VIP API source resolution.
  - Update VIP output naming to prefer `sourceTitle` over technical `fileName`.
  - Add tests for naming preference behavior.
- Out of scope:
  - Renaming existing already-generated files.

## 4. Acceptance Criteria
1. VIP output filename prefers original source title when available.
2. Suffix remains `-done.mp4`.
3. Runtime falls back safely to sanitized source file name if source title is unavailable.
4. Focused tests pass.

## 5. Technical Plan
1. Add `sourceTitle` in VIP API source resolution for file/asset/artifact paths.
2. Update VIP `sanitizeOutputName` call sites to prefer source title.
3. Add/adjust tests in VIP runtime and API route.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- VIP output naming now prioritizes original source title before fallback to technical file names.

## 8. Execution Notes
- Assumptions:
  - Original title can be sourced from uploaded filename stem or storage asset metadata title.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (2 files / 21 tests).
  - Version guard pass.
