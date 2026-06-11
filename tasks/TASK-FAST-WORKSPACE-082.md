# [FAST-WORKSPACE-082] Intermediate step-aware progress details for Workspace VIP flow

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

- Task ID: FAST-WORKSPACE-082
- Phase: FAST
- Target Phase: Workspace VIP background progress tracking
- Domain: Workspace / Background Progress / Telemetry
- Task Type: Improvement
- Priority: P1
- Size: S
- Owner: Antigravity
- Reviewer: Owner
- Status: Review

## 2. Context

- Currently, when running the "Seed Remote VIP Voice Render" flow in Workspace, intermediate status/telemetry (e.g. segments list, current processing sub-stages) is not displayed in the background progress window until the entire workflow completes.
- The server writes temporary step checkpoint state to local disk at `/tmp/omnivideo-vip-stage-checkpoints/<hash-key>/checkpoint.json`.
- The user wants to see progress in real time, e.g. segments list right after transcription finishes.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/ai-agent-rules.md`.

## 3. Scope

- In scope:
  - Add `GET` endpoint `/api/audio/video-vip-processing` to fetch checkpoint state.
  - Implement client-side polling in `workspace-canvas-panel.tsx` during VIP execution.
  - Parse partial checkpoints and display intermediate segments (both transcription and translation) and stage messages dynamically.
  - Verify with unit tests.
- Out of scope:
  - Rewriting VIP backend to be fully asynchronous or database-queued.
  - Modifying non-VIP dubbing nodes.

## 4. Acceptance Criteria

1. Endpoint `GET /api/audio/video-vip-processing?key=<key>` returns `{ ok: true, data: checkpointState }` or `{ ok: true, data: null }` if key is not found.
2. In `workspace-canvas-panel.tsx`, running the VIP processing step starts polling this endpoint.
3. If checkpoint contains `transcript` segments but no `translation` segments yet, show the original transcribed segments under "Segments (xxxx total)".
4. If checkpoint contains `translation` segments, show the translated segments.
5. The status strings and sub-stage metrics update live (e.g. `[transcript] Complete`, `[translate] Processing...`).
6. Polling correctly terminates when the main VIP request succeeds, fails, or is cancelled.

## 5. Technical Plan

1. Implement `GET` in `src/app/api/audio/video-vip-processing/route.ts`.
2. Add unit tests for `GET` in `src/app/api/audio/video-vip-processing/route.test.ts`.
3. Implement poll-and-update UI logic in `src/features/workspace/workspace-canvas-panel.tsx`.
4. Run tests and verify the UI.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 7. Test Plan

1. Run endpoint tests: `npx vitest run src/app/api/audio/video-vip-processing`
2. Run governance version guard check: `npm run guard:version`
3. Verify production compilation: `npm run build`

## 8. Observability

- Real-time logging of sub-stages (`[transcript]`, `[translate]`, `[voice render]`, `[metadata]`) within the Workspace background progress detail window.

## 9. Risks & Rollback

- Risk: High frequency polling could add slight local file I/O overhead. (Mitigated: 2-second interval is low cost).
- Rollback: Revert to blocking POST fetch without polling.

## 10. Deliverables

1. Intermediate progress checkpoint polling backend + frontend code.
2. Unit tests covering the new GET endpoint.
3. Changelog and version bump.

## 11. Changelog Note

- Add step-aware intermediate checkpoint polling for Workspace VIP process to display live segments and sub-stage progress.
