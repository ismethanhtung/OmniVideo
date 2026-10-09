# [FAST-AUDIO-089] Precision Subtitle Word-Level Synchronization & 60fps Playback Tracking for ZeroTTS Video Overlays

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

- Task ID: FAST-AUDIO-089
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio & Subtitle Synchronization
- Task Type: Bugfix / Performance & UX Enhancement
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator reported that during synchronized playback of ZeroTTS voice, video, and background music, the CapCut subtitle text noticeably lagged behind the spoken audio ("text phụ đề chạy không rất khớp với audio, thường là text chậm hơn lời voice, để nói đến đâu phụ đề đến đó").

Root causes identified:
1. Native HTML5 `timeupdate` events trigger only every 250ms–350ms, resulting in 1 to 2 words of lag during 1.0x–1.4x Vietnamese speech.
2. Naive uniform word calculation `progress * words.length` did not account for punctuation pauses (commas 0.2s, sentence silences 0.2s–0.3s) and trailing audio decay. Pauses push the speaker ahead of the linear line, creating cumulative lag.
3. Lack of perceptual lead offset: karaoke styling requires highlighting ~100ms before phoneme onset to feel synchronized to human vision and audition.
4. Backend ZeroTTS chunk synthesis was discarding per-sentence audio durations rather than outputting exact sentence-aligned word timestamps.

## 3. Scope

- In scope:
  - In `src/features/audio/piper-tts-sandbox-panel.tsx`:
    - Add 60fps `requestAnimationFrame` playback tracker for speech audio and video.
    - Implement Syllable & Punctuation Weighted Word Timeline algorithm accounting for character lengths, comma pauses, sentence silence gaps, and audio tail decay.
    - Add perceptual lead calibration offset (default 120ms lead) so words highlight in exact synchronization with speech attack.
    - Support backend `wordTimestamps` when provided by ZeroTTS synthesis.
    - Add timing calibration controls (sync offset slider) in subtitle settings for user fine-tuning if desired.
  - In `src/lib/multilingual-audio/zerotts-runner.py`:
    - Measure individual chunk audio lengths and generate accurate `wordTimestamps` in synthesis output.
  - In `src/lib/multilingual-audio/zerotts.ts`:
    - Support `wordTimestamps` in `ZeroTtsGenerateResult`.
  - Update unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
  - Bump package version to `0.11.82` and update changelog.
- Out of scope:
  - Third-party forced aligner binary dependencies (like Gentle/MFA) that would add heavy disk footprint.

## 4. Input / Output

- Input: Spoken audio playback and spoken text in ZeroTTS Voice Lab.
- Output: Subtitles highlighting words precisely on beat with speech sound ("nói đến đâu phụ đề đến đó") at 60fps without lag.

## 5. Acceptance Criteria

1. High-precision 60fps tracking is used during playback instead of lagging 250ms `timeupdate`.
2. Word timeline accounts for syllable lengths, punctuation pauses (commas, periods), and sentence silences.
3. Subtitle words synchronize tightly with speech audio without cumulative drift.
4. Backend ZeroTTS synthesis includes `wordTimestamps`.
5. All automated unit tests pass and version guard succeeds.

## 6. Technical Plan

1. Update `src/lib/multilingual-audio/zerotts-runner.py` to record chunk durations and calculate segment/word timestamps.
2. Update `src/lib/multilingual-audio/zerotts.ts` type definition for `wordTimestamps`.
3. Update `src/features/audio/piper-tts-sandbox-panel.tsx` with high-precision 60fps RAF loop and punctuation-aware word timeline.
4. Update unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
5. Bump version to `0.11.82` and update changelog.
6. Verify with vitest and version guard.

## 7. Verification Evidence

- `npx vitest run src/features/audio/piper-tts-sandbox-panel.test.ts src/app/api/video-processing/color-grade/route.test.ts` (pass, 2 files, 18 tests)
- `npx vitest run src/lib/multilingual-audio/zerotts-voices.test.ts` (pass, 1 file, 3 tests)
- `npm run guard:version` (pass)

