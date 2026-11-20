# [FAST-AUDIO-091] Move ZeroTTS Voice Lab to Dedicated Page and Navigation Route

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-091
- Phase: FAST
- Target Phase: Production Navigation / Audio Creation
- Domain: Audio / ZeroTTS Voice Lab
- Task Type: Refactor & Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

ZeroTTS Voice Lab has grown into a full-featured studio including Vietnamese zero-shot voice cloning, 48kHz audio synthesis, background music sync, synchronized video upload, live color grading presets, CapCut VIP captions with 60fps RAF tracking, and full video rendering.
Previously, it was appended inside `http://localhost:3000/piper-tts-sandbox`, making that sandbox congested.
The user requested extracting ZeroTTS Voice Lab into its own dedicated, first-class page and route (`/zerotts-voice-lab`) in OmniVideo.

## 3. Scope

- In scope:
  - Register new app section `zerottsVoiceLab` in `src/components/layout/types.ts`.
  - Add navigation item in `src/components/layout/navigation.ts` with route `/zerotts-voice-lab` (with aliases `/zerotts-lab` and `/zerotts`).
  - Wire route in `src/components/layout/content-router.tsx`.
  - Create dedicated studio component `src/features/audio/zerotts-voice-lab-panel.tsx`.
  - Clean up `src/features/audio/piper-tts-sandbox-panel.tsx` by removing the embedded ZeroTTS code and adding a referral card to the dedicated page.
  - Add unit tests for `zerotts-voice-lab-panel.test.ts` and update navigation / sandbox tests.
  - Update changelog and board.
- Out of scope:
  - Modifying backend ZeroTTS python runner or onnx models.
  - Changing Video Tools or Video Narrator pipelines.

## 4. Input / Output

- Input: User request to separate ZeroTTS Voice Lab from `piper-tts-sandbox` into its own page.
- Output: Navigating to `/zerotts-voice-lab` (or clicking "ZeroTTS Voice Lab" on sidebar) opens the dedicated Voice Lab studio with complete voice cloning, video sync, caption, and render capabilities.

## 5. Acceptance Criteria

1. Route `/zerotts-voice-lab` is accessible and loads `ZeroTtsVoiceLabPanel`.
2. Leftbar navigation contains "ZeroTTS Voice Lab" with distinct icon and description under "Create & Extract".
3. All ZeroTTS Voice Lab features (cloning, BGM, synchronized video, color grade presets, CapCut VIP captions, synthesis, full video render) work in the dedicated panel.
4. `piper-tts-sandbox-panel` no longer duplicates the ZeroTTS section and provides a link to the new dedicated page.
5. All test suites pass.

## 6. Test Evidence

- `zerotts-voice-lab-panel.test.ts`: 12 passed
- `piper-tts-sandbox-panel.test.ts`: 8 passed
- `navigation.test.ts`: 8 passed
- `content-router.test.ts`: 3 passed
- `zerotts.test.ts`: 7 passed (including real ONNX inference)
- Overall vitest run: 100% tests passing
