# [FAST-AUDIO-075] Apply AI Provider RPM Throttle to VIP Only

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

- Task ID: FAST-AUDIO-075
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: AI Providers / VIP Processing
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner accidentally reverted part of the previous broader rate-limit implementation.
- The previous broad wiring also appeared suspicious because transcript behavior looked like it could run twice or change unexpectedly.
- Owner asked to simplify and temporarily apply rate limiting only to the Workspace VIP node.

## 3. Scope

- In scope:
  - Keep transcript behavior unchanged in VIP.
  - Apply configured AI Provider `rateLimitRpm` only to VIP translation and metadata AI calls.
  - Remove route-level RPM wiring from non-VIP transcript/translation/metadata endpoints.
  - Add focused regression tests for VIP-only wiring.
- Out of scope:
  - Global distributed quota coordination.
  - Changing the speech-to-text provider used by VIP transcript.
  - Applying RPM throttling to every feature sandbox/API route.

## 4. Acceptance Criteria

1. Workspace VIP passes provider RPM limit into translation and metadata stages.
2. Workspace VIP transcript call remains unchanged and does not receive selected provider credentials/rate-limit settings.
3. Non-VIP transcript/translation/metadata routes do not create or pass provider RPM limiters.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Add/update VIP route and VIP processing tests for translation/metadata-only rate-limit wiring.
2. Run focused tests for VIP API route, VIP processing, transcript translation, and video metadata.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Blockers: none.
- Added VIP-only translation/metadata rate-limit wiring.
- Kept VIP transcript call unchanged.
- Removed rate-limit creation/passing from non-VIP transcript/translation/metadata routes.
- Verification evidence: focused tests, version guard, build, and diff check passed.

## 7. Test Evidence

- Test files added/updated:
  - `src/lib/ai-providers/rate-limit.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ai-providers/rate-limit.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (7 files / 76 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
