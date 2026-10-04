# [FAST-AUDIO-084] Add Background Music Selection and Synchronized Audio Playback to ZeroTTS Voice Lab

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

- Task ID: FAST-AUDIO-084
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator requested adding an option in ZeroTTS Voice Lab to play background music alongside the synthesized speech. The repository already has `public/musics` containing music files and an API route `/api/video-processing/background-music`. ZeroTTS Voice Lab needs a dropdown selector (defaulting to "Không" / None, followed by all music tracks in `public/musics`), volume control, and synchronized audio playback so that when speech audio plays, the selected background music plays concurrently in sync.

## 3. Scope

- In scope:
  - Add background music discovery hook in `piper-tts-sandbox-panel.tsx` fetching from `/api/video-processing/background-music`.
  - Add "Background Music" dropdown in ZeroTTS Voice Lab with default "Không (Không chạy nhạc nền)" and options for files in `public/musics`.
  - Add BGM volume control slider (10% to 100%, default 25%).
  - Implement synchronized audio playback: when speech `<audio>` plays, background music plays at configured volume; pauses, seeks, and resets synchronously.
  - Show active BGM badge and indicator in ZeroTTS audio output player card.
  - Update unit and UI test suite.
- Out of scope:
  - Re-encoding video files or changing VIP pipeline defaults in this task.

## 4. Input / Output

- Input: User selection of background music track from `public/musics/` and volume level.
- Output: Synchronized audio playback with speech and background music playing together.

## 5. Acceptance Criteria

1. ZeroTTS Voice Lab settings include a "Background Music (Nhạc nền)" selector.
2. Default selection is "Không (Không chạy nhạc nền)".
3. Options dynamically list all music tracks from `public/musics/` via `/api/video-processing/background-music`.
4. Supports BGM volume adjustment (default 25%) so the voice is clearly audible over the music.
5. When user plays synthesized speech audio, background music starts in sync; when paused, seeking, or finished, music pauses, seeks, or resets.
6. Audio output section displays current music status indicator.
7. Automated tests verify presence of Background Music controls and synchronized playback wiring.

## 6. Technical Plan

1. In `src/features/audio/piper-tts-sandbox-panel.tsx`:
   - Add state `zeroTtsBackgroundMusic`, `zeroTtsBgmVolume`, and `zeroTtsBgmList`.
   - Fetch `/api/video-processing/background-music` on component mount.
   - Render dropdown selector and volume slider in Voice & Synthesis Settings.
   - Attach synchronized audio event handlers (`onPlay`, `onPause`, `onSeeked`, `onEnded`, `onTimeUpdate`) to speech audio element.
2. Update tests in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
3. Run test suites, bump version, update changelog and task board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Modules impacted: `src/features/audio/piper-tts-sandbox-panel.tsx`, `src/features/audio/piper-tts-sandbox-panel.test.ts`, changelog, tasks.

## 8. Test Plan

1. Unit tests: `piper-tts-sandbox-panel.test.ts` verifying background music dropdown, options, volume slider, and audio sync handlers.
2. Verification commands: `npx vitest run`, `npm run guard:version`.

## 9. Observability

- Logs: Background music selection, volume setting, sync event handlers.

## 10. Risks & Rollback

- Risks: Music file not found or browser autoplay restriction.
- Mitigation: Audio playback only triggers upon user-initiated play action of speech audio element.
- Rollback: Revert panel changes and changelog.

## 11. Deliverables

1. Background music selector and synchronized player in ZeroTTS Voice Lab.
2. Updated test cases and changelog entry.

## 12. Changelog Note

- Planned summary: Add background music selection and synchronized playback to ZeroTTS Voice Lab.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Evidence

- Test run command: `npm run test -- --run src/lib/multilingual-audio/zerotts.test.ts src/lib/multilingual-audio/zerotts-voices.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts`
- Result: 3 files / 16 tests passed.
- Version Guard command: `npm run guard:version`
- Result: OK (0.11.75).
