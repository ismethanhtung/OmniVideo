# [FAST-VIDEO-055] Add VIP Translation Correction Rerun

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

- Task ID: FAST-VIDEO-055
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: Video Pipeline / Workspace / Multilingual Audio
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports VIP flows can finish successfully, but only after reviewing the output/segments does a translation mistake become obvious.
- Example: a gendered line like `Anh đẹp quá.` may need to be corrected to `Nàng đẹp quá.`
- Owner wants to edit the translated segment after the flow completes and run the flow again as quickly as possible.
- Workspace already keeps runtime transcript and translation in memory after a successful VIP run, and VIP processing already supports import-mode translation.

## 3. Scope

- In scope:
  - Add Workspace UI for correcting translated text from a completed VIP node in the current session.
  - Re-run the VIP flow using the existing transcript plus corrected translated segments, skipping transcript and AI translation work.
  - Send corrected translations through the VIP API as structured imported segment JSON.
  - Add VIP runtime support for a trusted transcript override so correction reruns do not transcribe again.
  - Ensure checkpoint fingerprint changes for corrected translations so stale voice/render/metadata are not reused.
  - Add regression coverage for API parsing/runtime skip behavior and Workspace wiring.
- Out of scope:
  - Segment-level partial voice regeneration.
  - Persisting all translated segments across browser reloads.
  - Editing source transcript timings.

## 4. Acceptance Criteria

1. After a successful Workspace VIP run, a correction panel is available for VIP nodes that have runtime transcript and translation data.
2. User can select a segment, edit translated text, and keep a visible pending correction count.
3. Running corrected VIP sends `translationMode=import`, `transcriptOverrideJson`, and structured `importedTranslationSegmentsJson` to `/api/audio/video-vip-processing`.
4. VIP processing uses the transcript override without calling the transcription runner and uses imported translated segments without calling the AI translation runner.
5. Corrected translation content changes the checkpoint fingerprint so the old voice/render/metadata are not reused.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend the VIP API route to accept and validate `transcriptOverrideJson` plus `importedTranslationSegmentsJson`.
2. Extend `runVideoVipProcessing` to use transcript override before falling back to transcription.
3. Add a Workspace correction panel fed by `runtimeTranscriptsByNodeId` and `runtimeTranslationsByNodeId`.
4. Add a corrected rerun path that calls the existing Workspace runner with per-VIP translation override data.
5. Add focused runtime/API/source tests, bump patch version, and update changelog/board evidence.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - focused tests

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Workspace progress should state that corrected VIP translation is being used and transcript/AI translate are skipped.
- VIP logs should identify transcript override usage and imported translation mode.

## 9. Risks & Rollback

- Risks: Corrected rerun still needs voice generation and final render, so it is faster than full rerun but not as fast as segment-level voice patching.
- Rollback strategy: revert this task's UI, API/runtime override handling, tests, changelog, and version bump.

## 10. Deliverables

1. Workspace VIP translation correction panel.
2. Corrected VIP rerun path using transcript override plus imported translation JSON.
3. Regression tests.
4. Release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Add Workspace VIP translation correction reruns that skip transcript and AI translation.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 12.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Added `transcriptOverrideJson` parsing to the VIP API and `transcriptOverride` support in `runVideoVipProcessing`.
  - Added structured `importedTranslationSegmentsJson` parsing so correction reruns can send exact segment text without line-number parsing.
  - Included transcript override content in VIP checkpoint fingerprints and reused import-line hashing, preventing stale voice/render/metadata reuse when corrected text changes.
  - Added a Workspace correction panel for successful VIP runs. It lets the user choose a VIP node, choose a segment, edit translated text, and rerun the flow with corrected VIP payload.
  - Reworded the remote upload fallback line as a compatibility fallback because successful native `FormData` fallback is expected and not a failure.
- Performance behavior:
  - Corrected reruns skip transcription and AI translation.
  - Corrected reruns still regenerate voice, final render, and metadata because a changed translated line changes audio and subtitles.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused VIP/API/Workspace tests pass (3 files / 75 tests).
  - Related VIP/API/Workspace/remote-worker tests pass (4 files / 89 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - Corrected rerun is session-local because Workspace does not persist full translated segment arrays across reloads.
  - Segment-level voice patching is not implemented yet, so corrected reruns still need voice generation and final render.
