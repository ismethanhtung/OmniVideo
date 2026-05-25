# [FAST-VIDEO-016] Add Multi-file Video Merge Mode to Video Splitter Page

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

- Task ID: FAST-VIDEO-016
- Phase: MVP runtime hardening
- Target Phase: Video local tools
- Domain: Video processing / UI / API
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

User requested adding merge capability in Video Splitter page to merge 2, 3, or many videos, and suggested page naming may need update.

## 3. Scope

- In scope:
  - Add merge mode in current video splitter page.
  - Add API route for local multi-file merge via ffmpeg concat demuxer (`-c copy`).
  - Return downloadable merged file artifact via existing temporary download store.
  - Update navigation label/description to reflect split + merge.
  - Add tests for panel/API source expectations.
- Out of scope:
  - Re-encode merge fallback profiles.
  - Frame-rate normalization or transcode repair for incompatible streams.

## 4. Acceptance Criteria

1. UI supports selecting multiple local videos and running merge.
2. Merge API accepts at least 2 files and returns download URL for merged output.
3. Merge path prefers stream copy (`-c copy`) to minimize CPU/RAM.
4. Navigation wording reflects split + merge capability.
5. Regression tests pass.

## 5. Technical Plan

1. Implement `runVideoMerge` runtime helper using ffmpeg concat list.
2. Add `/api/video-processing/merge` route.
3. Extend Video Splitter panel with operation switch (`split` / `merge`) and multi-file input.
4. Update navigation copy.
5. Add/update tests and run focused suite.

## 6. Test Plan

1. Update panel source test for merge controls/API call.
2. Add runtime source test for merge ffmpeg concat copy args.
3. Add API route source test for `/api/video-processing/merge` success/error contract.
4. Run focused tests and version guard.

## 7. Test Evidence

- Commands:
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/lib/video-processing/video-merge.test.ts src/app/api/video-processing/merge/route.test.ts src/components/layout/navigation.test.ts`
  - `npm run guard:version`
