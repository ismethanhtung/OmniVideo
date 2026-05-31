# [FAST-VIDEO-027] Fix Thumbnail Download Filename and VIP Output Naming

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
- Task ID: FAST-VIDEO-027
- Phase: FAST
- Target Phase: Video/Thumbnail output naming consistency
- Domain: Storage Download / VIP Processing
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Thumbnail Studio download currently returns `.mp4` filename even for image assets.
- VIP output naming currently uses `-vip.mp4`; owner requested naming based on source file with `-done.mp4` suffix.

## 3. Scope
- In scope:
  - Fix generic asset download filename generation to respect actual mime type extension.
  - Update VIP output filename suffix from `-vip.mp4` to `-done.mp4`.
  - Add/update focused tests for both behaviors.
- Out of scope:
  - Renaming existing persisted assets already generated in storage.
  - Additional naming policy beyond requested suffix.

## 4. Acceptance Criteria
1. Thumbnail/image download returns an image extension (for example `.png`) rather than `.mp4`.
2. Non-image downloads still produce a valid extension based on mime type or safe fallback.
3. VIP processing output filename uses source base name with `-done.mp4` suffix.
4. Focused tests pass.

## 5. Technical Plan
1. Refactor `safeFilename` in `asset-download.ts` to infer extension from mime type and avoid forced `.mp4`.
2. Update VIP `sanitizeOutputName` suffix to `-done.mp4`.
3. Add unit tests for filename inference and VIP output naming.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/storage/asset-download.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Fixed thumbnail download filename extension by mime type and switched VIP output naming suffix to `-done.mp4`.

## 8. Execution Notes
- Assumptions:
  - `-done.mp4` is the only required naming change for new VIP outputs.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/storage/asset-download.ts`
  - `src/lib/storage/download-filename.ts`
  - `src/lib/storage/download-filename.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/storage/download-filename.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (2 files / 13 tests).
  - Version guard pass.
