# [FAST-VIDEO-036] Keep Video Narrator subtitle render output consistent with preview

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-036
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User showed Source Preview reflecting subtitle styling while Render Output ignored color and `3-word active highlight`.
- Screenshot shows `EC2 Spot Worker` selected. Remote worker can be older than the local app and silently render default subtitle behavior.
- Render Output panel should also be full-bleed like Source Preview.

## 3. Scope

- In scope:
  - Prevent Video Narrator from using remote EC2 path for the local-only `3-word active highlight` subtitle mode.
  - Make Render Output full-bleed like Source Preview.
  - Keep backend route tests covering subtitleStyle mapping.
  - Update changelog/version/task evidence.
- Out of scope:
  - Deploying/updating EC2 worker code.
  - Changing non-Video Narrator remote VIP flows.

## 4. Acceptance Criteria

1. When `3-word active highlight` is selected, Video Narrator render uses the local render path even if the UI had remote selected.
2. Render Output panel has no padding around the video.
3. ASS generation for `3-word active highlight` emits grouped karaoke timing for each 3-word window.
4. Tests/build pass.

## 5. Technical Plan

1. Add an effective render execution mode in Video Narrator frontend and route.
2. Keep sending subtitleStyle through form data and route.
3. Make Render Output full-bleed.
4. Run targeted tests, build, and version guard.

## 6. Test Plan

1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts`
2. `npm run guard:version`
3. `npm run build`

## 7. Execution Notes

- Verification evidence: Targeted tests, build, version guard, and diff check passed.

## 8. Test Evidence

- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` (Pass: 2 files / 29 tests)
  - `npm run build` (Pass)
  - `npm run guard:version` (Pass)
  - `git diff --check` (Pass)
- Test results summary:
  - Regression test verifies `triple-word-highlight` with a remote request uses local render and does not call remote worker.
  - ASS generation test verifies 3-word grouped karaoke timing output.
