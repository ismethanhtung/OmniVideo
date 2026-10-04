# [FAST-AUDIO-087] Add Video Upload and Synchronized Video Playback with Volume Control to ZeroTTS Voice Lab

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

- Task ID: FAST-AUDIO-087
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS & Video Sync
- Task Type: Feature / Enhancement
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

In ZeroTTS Voice Lab, users can synthesize Vietnamese speech and sync with Background Music tracks. The operator requested the capability to also upload a video file and play it synchronously with the synthesized ZeroTTS speech, including volume control for the video's original audio track defaulting to 0.15 (15%), mirroring the background music controls.

## 3. Scope

- In scope:
  - Add video upload input and active video state in `src/features/audio/piper-tts-sandbox-panel.tsx`.
  - Add Video Volume control (slider 0% to 100%, preset buttons 0%, 10%, 15%, 25%, 50%) defaulting to `0.15` (15%).
  - Implement bidirectional/master synchronized playback between ZeroTTS speech audio, background music, and the uploaded video (play, pause, seek, loop, ended).
  - Render synchronized video preview player and status indicator in the ZeroTTS output card.
  - Safely manage object URLs with cleanup on replacement to avoid memory leaks.
  - Update unit test suite in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
  - Bump package version to `0.11.79` and update changelog.
- Out of scope:
  - Full server-side video rendering/ffmpeg multiplexing (covered in Video Composer / VIP nodes).

## 4. Input / Output

- Input: User uploads a video file (`.mp4`, `.webm`, `.mov`) in ZeroTTS Voice Lab and configures video volume.
- Output: Synchronized video playback alongside ZeroTTS speech and background music with independent volume control.

## 5. Acceptance Criteria

1. ZeroTTS Voice Lab provides a video upload input allowing user to select a video file and view the selected filename/size.
2. Video Volume control defaults to `0.15` (15%) with preset buttons (0%, 10%, 15%, 25%, 50%) and slider.
3. When ZeroTTS speech audio plays, pauses, seeks, or ends, the uploaded video responds in exact sync.
4. The output card displays the synchronized video player with status badge showing video name and active volume percentage.
5. All automated unit tests in `piper-tts-sandbox-panel.test.ts` pass and version guard passes.

## 6. Technical Plan

1. In `src/features/audio/piper-tts-sandbox-panel.tsx`:
   - Add state: `zeroTtsVideoFile: File | null`, `zeroTtsVideoUrl: string | null`, `zeroTtsVideoVolume: string` (default `"0.15"`).
   - Add ref: `zeroTtsVideoRef: useRef<HTMLVideoElement | null>`.
   - Add handlers: `handleZeroTtsVideoFileChange`, `handleZeroTtsRemoveVideo`.
   - Update `handleZeroTtsSpeechPlay`, `handleZeroTtsSpeechPause`, `handleZeroTtsSpeechSeeked`, `handleZeroTtsSpeechEnded` to sync `zeroTtsVideoRef.current`.
   - Update volume effect for `zeroTtsVideoVolume`.
   - Add Video Upload & Volume controls in the Settings grid.
   - Add `<video>` preview and status banner in the Output card.
2. Update unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts`.
3. Bump version to `0.11.79`, update changelog, run `npm run guard:version`.

## 7. Code Change Impact

- Files:
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `package.json`, `package-lock.json`, `changelog/changelog.md`, `tasks/board.md`

## 8. Test Plan

- Unit tests: verify video upload controls, default volume 0.15, synchronized playback handlers, and video player presence.
- Run vitest suite.

## 9. Observability

- Console traces on video loading and sync playback events.

## 10. Risks & Rollback

- Risk: Large video object URLs holding memory.
- Mitigation: Revoke `URL.revokeObjectURL` when video is replaced or removed.

## 11. Deliverables

- Video upload and synchronized video player with default 0.15 volume in ZeroTTS Voice Lab.
- Complete unit test coverage.

## 12. Changelog Note

- Add video upload and synchronized playback with default 0.15 volume control to ZeroTTS Voice Lab.
