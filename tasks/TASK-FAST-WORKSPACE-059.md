# [FAST-WORKSPACE-059] Add Async Polling for Long Remote VIP Jobs

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

- Task ID: FAST-WORKSPACE-059
- Phase: FAST
- Target Phase: Workspace remote VIP runtime reliability
- Domain: Workspace / Audio / Video Pipeline / Remote Worker
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner reports short EC2 voice+render VIP jobs succeed, but a ~40 minute video fails after transcript/translation with `fetch failed`.
- Log shows the remote voice+render stage starts with a 243 MB source and 1721 translated segments, then local fetch fails after about 5 minutes while the server request has been open for about 8:51.
- Current remote worker contract keeps one POST open until Piper voice generation and final render finish, which is brittle for long-running jobs.

## 3. Scope

- In scope:
  - Add async job submission and polling for remote VIP worker requests.
  - Keep existing synchronous response behavior compatible for old workers.
  - Preserve render-only and voice+render execution modes.
  - Add tests covering async submission, polling, success, and failure mapping.
  - Update docs/changelog/version/task evidence.
- Out of scope:
  - S3/object-storage persistence.
  - Multi-process durable job storage.
  - Moving transcript/translation/metadata to EC2.

## 4. Acceptance Criteria

1. Remote VIP client submits worker jobs in async mode and does not keep a single long POST open while EC2 runs Piper/render.
2. Worker POST can return a `jobId`; worker GET polling returns running/done/failed status.
3. Done jobs return the same artifact response shape already consumed by the client.
4. Failed jobs map to `SYS_DUBBING_MUX_FAILED` with a useful message.
5. Existing sync worker responses remain supported for compatibility.
6. Focused tests, build, version guard, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend remote worker client to request async mode, poll worker status, then download artifact.
2. Extend worker route with in-memory job registry for EC2 `next start` runtime.
3. Keep direct sync execution as fallback when async is not requested.
4. Add route/client regression tests.
5. Update docs/changelog/version and run verification.

## 6. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. `npm run build`
3. `npm run guard:version`
4. `git diff --check`

## 7. Changelog Note

- Add async polling for remote VIP worker jobs so long EC2 voice/render runs do not fail because one HTTP request stays open too long.

## 8. Execution Notes

- Assumptions:
  - EC2 worker runs `next start` in a long-lived Node process, so an in-memory job map is acceptable for the current Spot worker MVP.
  - Existing checkpoint behavior already allows retry/resume after transcript/translation.
- Blockers: none at start.
- Verification evidence:
  - Root cause: long EC2 Piper/render work kept a single worker POST open for minutes, and the local `fetch` could fail before the worker returned.
  - Fix: remote client now asks for async jobs, polls worker job status, then downloads the artifact after completion.
  - Follow-up instrumentation: async job polling now returns/logs worker stage telemetry (`voice`, `render`, `artifact`) with segment/file/output metrics so long jobs are diagnosable.
  - Compatibility: synchronous worker responses still work for direct callers and older workers.

## 9. Test Evidence

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Focused remote VIP tests pass (4 files / 36 tests).
  - Production build pass.
  - Version guard pass.
  - Diff whitespace check pass.
- Files changed:
  - Runtime/API: `src/lib/multilingual-audio/remote-vip-worker.ts`, `src/app/api/audio/video-vip-voice-render/route.ts`, `src/lib/multilingual-audio/video-vip-processing.ts`
  - Tests: `src/lib/multilingual-audio/remote-vip-worker.test.ts`, `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
  - Governance: `tasks/TASK-FAST-WORKSPACE-059.md`, `tasks/board.md`
- Residual risks:
  - Worker job state and artifacts are still process-local; an EC2 process restart or Spot interruption still loses an in-flight remote job.
  - This prevents long-open HTTP response failures, but it does not replace object storage for fully durable long-video processing.
