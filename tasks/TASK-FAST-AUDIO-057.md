# [FAST-AUDIO-057] Remove Redundant Audio Transcript 2 Test Page

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
- Task ID: FAST-AUDIO-057
- Phase: FAST
- Target Phase: Audio Transcript UX cleanup
- Domain: Navigation / Audio Transcript
- Task Type: Cleanup
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner confirmed `Audio Transcript 2 - Test` has completed testing purpose and asked to remove it if it does not differ from the main `Audio Transcript` page.
- Code review shows `Audio Transcript 2 - Test` was only a thin wrapper around `ChineseTranscriptionPanel` with preprocess defaults, not an independent feature page.

## 3. Scope
- In scope:
  - remove `Audio Transcript 2 - Test` from leftbar navigation;
  - remove route/section wiring for `chineseTranscription2`;
  - delete the obsolete v2 wrapper panel file;
  - update affected tests and verify build/guard.
- Out of scope:
  - changing Audio Transcript core processing logic;
  - changing transcription APIs.

## 4. Acceptance Criteria
1. Leftbar no longer displays `Audio Transcript 2 - Test`.
2. Route mapping no longer resolves `/audio-transcript-2`.
3. `chineseTranscription2` section id and router registration are removed.
4. Navigation and related tests pass after cleanup.

## 5. Technical Plan
1. Remove `chineseTranscription2` from section type, nav config, slug mapping, and legacy mapping.
2. Remove content-router registration/import for v2 panel and delete the v2 wrapper component file.
3. Update navigation/audio transcript tests and run verification commands.

## 6. Test Plan
1. `npm run test -- --run src/components/layout/navigation.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Remove redundant `Audio Transcript 2 - Test` page and route wiring after test completion.

## 8. Execution Notes
- `Audio Transcript 2 - Test` had no unique domain logic; it only passed props into the same panel used by `Audio Transcript`.
- Main `Audio Transcript` behavior and preprocess controls remain intact.

## 9. Test Evidence
- Test files added/updated:
  - `src/components/layout/navigation.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/navigation.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - targeted test suites pass;
  - `npm run build` passes with existing ESLint circular-config warning;
  - `npm run guard:version` passes.
