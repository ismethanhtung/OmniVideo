# [FAST-AUDIO-088] Add CapCut-Style Subtitle Overlays to ZeroTTS Video and Video Color Grading Studio in Feature Sandbox

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

- Task ID: FAST-AUDIO-088
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio & Video Post-Processing
- Task Type: Feature / Enhancement
- Priority: P1
- Size: L
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator requested two major enhancements:
1. In ZeroTTS Voice Lab: Display the spoken text as CapCut-style VIP subtitles overlaying the synchronized video, including trendy styling (CapCut Yellow Pop, Cinematic White, TikTok Neon), active karaoke word highlighting, custom placement (bottom, center, top), font sizes, and casing.
2. In Feature Sandbox: A professional Video Color Grading & Lighting Studio capable of creating moody/dark melancholic cinematic looks, fixing overexposed/bleached camera footage, providing 1-click pro presets (Moody Dark, Anti-Overexposure, 90s Vintage, Cold Nordic, Golden Hour, Deep Noir), manual sliders (brightness, contrast, saturation, gamma, vignette, color temperature), live dual-mode before/after preview, and export rendering via FFmpeg.

## 3. Scope

- In scope:
  - Add CapCut-Style VIP Subtitle Overlay to ZeroTTS Voice Lab in `src/features/audio/piper-tts-sandbox-panel.tsx`:
    - CapCut styles: Yellow Pop, Cinematic White, TikTok Neon, Retro Classic.
    - Active word highlight / karaoke sync based on speech audio currentTime.
    - Position (bottom 85%, center, top), font size (14px, 18px, 24px, 30px), uppercase toggle, and subtitle enable toggle.
  - Add Video Color Grading & Lighting Studio to Feature Sandbox:
    - Video upload and project asset selector.
    - 1-click Pro Cinematic Presets: Moody Dark, Anti-Overexposure, 90s Vintage, Cold Nordic, Golden Hour, Deep Noir, Original.
    - Manual Pro Sliders: Brightness (-50% to +50%), Contrast (0.5x to 2.0x), Saturation (0.0x to 2.0x), Gamma (0.5x to 1.5x), Vignette (0% to 100%), Color Temperature (-50 to +50).
    - Interactive 60fps live CSS filter preview with Before / After split comparison.
    - Server-side FFmpeg rendering API route `/api/video-processing/color-grade` for MP4 export.
  - Automated unit tests in `piper-tts-sandbox-panel.test.ts` and `color-grade/route.test.ts`.
  - Bump package version to `0.11.80` and update changelog.
- Out of scope:
  - Complex 3D LUT cube imports.

## 4. Input / Output

- Input 1: Spoken text and video in ZeroTTS Voice Lab.
- Output 1: CapCut-styled synchronized karaoke captions rendered directly on video.
- Input 2: Video file and grading parameters in Video Color Grading Studio.
- Output 2: Realtime graded video preview and downloadable graded MP4 video.

## 5. Acceptance Criteria

1. ZeroTTS Voice Lab offers CapCut Subtitle Overlay with customizable styles (Yellow Pop, Cinematic, Neon), active karaoke word highlighting, position, and sizing.
2. Feature Sandbox includes a Video Color Grading & Lighting Studio with Moody Dark, Anti-Overexposure, and other pro presets.
3. Live Before / After preview works fluidly without lag.
4. Export rendering endpoint `/api/video-processing/color-grade` produces graded MP4 with FFmpeg filters.
5. All automated unit tests pass and version guard succeeds.

## 6. Technical Plan

1. Create `/api/video-processing/color-grade/route.ts` using FFmpeg `eq`, `vignette`, and color balance filters.
2. Create `/api/video-processing/color-grade/route.test.ts`.
3. In `src/features/audio/piper-tts-sandbox-panel.tsx`:
   - Add CapCut Subtitle Overlay states and rendering logic in ZeroTTS Voice Lab.
   - Add Video Color Grading & Lighting Studio workbench section with presets, sliders, before/after compare, and render action.
4. Update unit tests in `piper-tts-sandbox-panel.test.ts`.
5. Bump version to `0.11.80`, update changelog, run tests and version guard.

## 7. Code Change Impact

- Files:
  - `src/app/api/video-processing/color-grade/route.ts`
  - `src/app/api/video-processing/color-grade/route.test.ts`
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `package.json`, `package-lock.json`, `changelog/changelog.md`, `tasks/board.md`

## 8. Test Plan

- Unit tests for color grade route API validation and filter building.
- Unit tests for CapCut subtitle overlay and Color Grading Studio controls.
- Version guard verification.

## 9. Observability

- Realtime preview state logging and FFmpeg render status telemetry.

## 10. Risks & Rollback

- Risk: FFmpeg missing filters on older binary.
- Mitigation: Standard `eq` and `vignette` filters are supported across all ffmpeg-static builds.

## 11. Deliverables

- CapCut Subtitle Overlay in ZeroTTS Voice Lab.
- Video Color Grading Studio in Feature Sandbox.
- FFmpeg rendering route.

## 12. Changelog Note

- Add CapCut-style VIP subtitle overlays to ZeroTTS video and introduce Video Color Grading & Lighting Studio in Feature Sandbox.
