# [FAST-AUDIO-053] Show Inline Asset Videos in Audio Transcript Source Picker

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
- Task ID: FAST-AUDIO-053
- Phase: FAST
- Target Phase: Audio UX polish
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- `Source Video` asset picker currently uses a `Preview` button per asset and only renders the video after an extra click.
- User wants the video itself shown directly instead of the preview CTA.

## 3. Scope
- In scope: replace per-asset `Preview` button/lazy panel with always-visible inline video in the Source Video asset picker.
- Out of scope: redesign of the picker or changes to dubbing preview.

## 4. Acceptance Criteria
1. Asset picker rows no longer render `Preview` / `Hide` CTA.
2. Each asset row renders an inline video sourced from the asset download endpoint.
3. Asset selection behavior remains unchanged.
4. Focused tests pass.

## 5. Test Plan
1. `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`

## 6. Test Evidence
- Test files added/updated: `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`
- Test results summary: pass (1 file / 8 tests).
