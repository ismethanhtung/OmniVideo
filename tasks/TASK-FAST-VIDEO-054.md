# [FAST-VIDEO-054] Fix VIP Background Music Render Failure

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

- Task ID: FAST-VIDEO-054
- Phase: FAST
- Target Phase: Video Tools Lab / Remote VIP
- Domain: Video Pipeline / Multilingual Audio / Remote VIP Worker
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports the remote VIP worker now accepts the uploaded source and reaches `stage: render`, but fails with `VIP render failed: Conversion failed!` when a background music track is configured.
- Worker progress shows `backgroundMusicTrackCount: 1`, so the current failure is in the final ffmpeg render/mix stage rather than EC2 reachability or upload transport.
- The existing ffmpeg audio graph loops repeat music with `-stream_loop -1` and delays all music tracks with `adelay=...:all=1`, which can create fragile or infinite audio graphs on worker ffmpeg builds.

## 3. Scope

- In scope:
  - Make VIP background music ffmpeg filters finite by trimming music tracks to the render timeline.
  - Avoid unnecessary `adelay` for tracks starting at zero and use a more compatible stereo delay syntax for scheduled tracks.
  - Pass one-pass render timeline duration when background music disables chunked rendering.
  - Preserve voice, optional original audio, and configured music volume behavior.
  - Improve ffmpeg failure details so future worker render failures include useful stderr context instead of only `Conversion failed!`.
  - Add regression coverage for finite repeat music filters and scheduled music delay syntax.
- Out of scope:
  - Adding arbitrary music uploads.
  - Re-enabling chunked render while background music is configured.
  - Redeploying the EC2 worker from this local checkout.

## 4. Acceptance Criteria

1. Repeat background music tracks are trimmed to the VIP output timeline before mixing, preventing infinite audio graph behavior.
2. A background music track at `0:00` does not emit an unnecessary `adelay=0:all=1` filter.
3. A scheduled background music track uses `adelay=<ms>|<ms>` after trimming to its remaining timeline duration.
4. One-pass VIP renders pass the known voice/output duration into ffmpeg args when background music is configured.
5. ffmpeg non-zero exits include an actionable stderr tail in the thrown error.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Update `buildVipFinalRenderArgs` audio filter construction for background music to trim, reset timestamps, apply volume, and conditionally delay.
2. Update one-pass `renderVipCompositeVideo` to pass `timelineDurationSeconds` based on the generated voice duration when background music is present.
3. Expand ffmpeg error reporting to keep the concise error line plus recent stderr context.
4. Update regression tests for repeat/scheduled music ffmpeg filters.
5. Bump patch version and update changelog/board evidence.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - release/task metadata

## 7. Test Plan

1. Focused test command:
   - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts`
2. Related regression test command:
   - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/background-music/route.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts`
3. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- ffmpeg render errors should include recent stderr lines in the API/worker error message for diagnosis.
- Existing remote worker progress phases remain unchanged.

## 9. Risks & Rollback

- Risks: Music tracks that start after the output duration are effectively trimmed to a near-empty window; this is acceptable because they cannot be heard in the final video.
- Rollback strategy: revert this task's runtime/test/changelog/version changes to return to FAST-VIDEO-053 behavior.

## 10. Deliverables

1. More compatible and finite VIP background music ffmpeg graph.
2. Regression tests for repeat and scheduled music args.
3. Better ffmpeg stderr failure messages.
4. Release metadata and verification evidence.

## 11. Changelog Note

- Tom tat dong changelog du kien: Fix VIP background music ffmpeg render failures and surface render stderr.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.2 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [x] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Root cause:
  - The background music ffmpeg graph used `-stream_loop -1` for repeat tracks without trimming those music inputs to a finite render duration.
  - Every music track also used `adelay=...:all=1`, including `adelay=0`, which is unnecessary and less compatible across ffmpeg builds.
  - ffmpeg failures surfaced only the final `Conversion failed!` line, hiding the actionable filter stderr context.
- Implementation:
  - Trimmed music tracks to the known VIP output timeline with `atrim`, reset timestamps with `asetpts`, and skipped configured tracks that start after the output duration.
  - Removed zero-delay filters and changed scheduled delays to `adelay=<ms>|<ms>`.
  - Anchored background-music `amix` graphs to the generated voice input with `duration=first`.
  - Passed generated voice duration into one-pass renders when background music is configured.
  - Added ffmpeg stderr tail formatting for non-zero exits.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/background-music/route.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused VIP processing tests pass (1 file / 28 tests).
  - Related VIP/music/worker tests pass (7 files / 110 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - The EC2 worker still must be redeployed/restarted with this code and must contain the selected files under `public/musics`.
