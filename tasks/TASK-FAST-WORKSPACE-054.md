# [FAST-WORKSPACE-054] Add Remote EC2 Voice Render VIP Seed

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
- Task ID: FAST-WORKSPACE-054
- Phase: FAST
- Target Phase: Workspace remote VIP runtime
- Domain: Workspace / Audio / Video Pipeline / Operations
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner wants a new safe Workspace seed similar to `Seed Asset VIP Processing 2`.
- New seed flow: `Upload Video -> VIP Processing -> Save to Local`.
- Existing VIP seeds and local VIP runtime must remain unchanged.
- In the new seed, only VIP voice generation and final render should run on an EC2 Spot worker.
- Owner requires a one-file launcher like `openclaw-spot.sh`, specifically using Spot `c8g.xlarge` in AWS Hong Kong.
- Piper runtime requires both an ONNX model file and `model.onnx.json`; the launcher must allow configuring those model sources.

## 3. Scope
- In scope:
  - Add a remote voice/render execution mode for VIP processing.
  - Add a new Workspace seed that uses the remote mode without changing existing seeds.
  - Add an API route that an EC2 worker can run for voice+render only after local transcript/translation.
  - Add a one-file EC2 Spot launcher for `ap-east-1` / `c8g.xlarge`.
  - Add tests for the new route, remote-mode request wiring, seed registration, and planner behavior.
- Out of scope:
  - Moving transcript/translation/metadata to EC2.
  - S3/object-storage artifact streaming.
  - Fully durable remote checkpoint persistence beyond the existing stage result contract.
  - Changing existing local VIP behavior.

## 4. Acceptance Criteria
1. Existing `Seed Asset VIP Processing 2` remains unchanged and still uses local VIP runtime.
2. New seed builds `source.file -> video.vip-processing -> output.download-local` with remote voice/render enabled.
3. Workspace runtime sends remote-enabled VIP runs to the existing VIP API with a remote mode flag.
4. VIP API runs transcript/translation locally, delegates only voice+render to the configured remote worker, then generates metadata locally.
5. EC2 launcher provisions a Spot `c8g.xlarge` in `ap-east-1`, installs runtime dependencies, uploads the repo, configures Piper model files, and starts a worker endpoint.
6. Focused tests and version guard pass or failures are documented with evidence.

## 5. Technical Plan
1. Extract/export a voice+render-only VIP helper and expose it through a worker API route.
2. Add a remote worker client used by the main VIP API when `voiceRenderExecutionMode=remote`.
3. Add Workspace node config and seed defaults for remote mode while preserving local defaults.
4. Add the EC2 Spot one-file launcher script with configurable model URLs and worker token.
5. Add focused tests and update docs/changelog/version.

## 6. Test Plan
1. Unit/API route tests for remote voice/render worker endpoint.
2. API route test proving remote mode delegates voice+render but still returns the normal VIP response shape.
3. Workspace seed/graph tests for the new seed.
4. Workspace source test for remote-mode payload wiring.
5. Run focused tests and `npm run guard:version`.

## 7. Changelog Note
- Add a remote EC2 voice/render mode for VIP processing with a safe Workspace seed and one-file Spot launcher.

## 8. Execution Notes
- Assumptions:
  - The remote worker will run the same repo code uploaded by the launcher, so voice/render parity is maintained.
  - The owner will provide ARM64-compatible Piper model files via URL or pre-place them on the instance.
  - The worker URL/token are configured through environment variables in the local app.
- Blockers: none at start.

## 9. Test Evidence
- Test files added/updated:
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
  - `bash -n omnivideo-vip-spot.sh`
  - `zsh -n omnivideo-vip-spot.sh`
- Test results summary:
  - Focused remote VIP/Workspace tests pass (5 files / 96 tests).
  - `npm run build` pass.
  - Version guard pass.
  - `git diff --check` pass.
  - Shell syntax checks pass for the EC2 launcher.
  - Follow-up launcher fix: token generation no longer uses a `tr | head` pipe that can exit silently under `pipefail`; Google Drive sharing links are downloaded with `gdown` using the parsed file id for compatibility with `gdown` versions that do not support `--fuzzy`.
- Files changed:
  - Runtime/API: `src/lib/multilingual-audio/video-vip-processing.ts`, `src/lib/multilingual-audio/remote-vip-worker.ts`, `src/app/api/audio/video-vip-processing/route.ts`, `src/app/api/audio/video-vip-voice-render/route.ts`
  - Workspace: `src/lib/workspace/workspace-graph.ts`, `src/lib/workspace/workspace-seeds.ts`, `src/features/workspace/workspace-canvas-panel.tsx`
  - Operations: `omnivideo-vip-spot.sh`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
- Residual risks:
  - Current remote MVP still sends source/result inline through HTTP payloads; large files should move to object-storage pointers in a follow-up.
  - `c8g.xlarge` is ARM64, so Piper binary/model compatibility depends on the uploaded model/runtime working on Linux ARM64.
