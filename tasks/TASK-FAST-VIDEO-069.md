# [FAST-VIDEO-069] ZeroTTS Video Studio Full Render Export with Synchronized Audio, BGM, and Borderless / No-Underline Subtitle Styles

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

- Task ID: FAST-VIDEO-069
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Video Processing & Subtitle Rendering
- Task Type: Feature / Enhancement
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator requested two major capabilities in ZeroTTS Voice Lab:
1. Video rendering export with all current settings applied (video footage + ZeroTTS speech audio + background music + volume controls + burned CapCut VIP subtitles).
2. Additional subtitle versions/styles that have no container border and no underline ("thêm các bản phụ đề (không có border và không cần underline)").

## 3. Scope

- In scope:
  - Create `src/lib/video-processing/zerotts-render.ts`:
    - Core video rendering engine via FFmpeg.
    - Advanced SubStation Alpha (ASS) subtitle generator supporting word-by-word highlight animation matching the web preview, customizable font size, colors, alignment/position, uppercase, borderless styling (outline=0, shadow=1), and underline suppression (underline=0, no `\u1` tags).
    - Multi-track audio mixing combining input video audio (`videoVolume`), ZeroTTS voice (`1.0`), and background music (`bgmVolume` with infinite loop and apad).
    - Probing video resolution, duration, and audio stream existence.
    - Exporting final MP4 with H.264 + AAC.
  - Create API route `src/app/api/video-processing/zerotts-render/route.ts`:
    - Handles POST request with multipart/form-data or JSON payload (video file/base64, speech audio, background music source/file, settings).
    - Returns rendered MP4 binary or JSON response.
  - In `src/features/audio/piper-tts-sandbox-panel.tsx`:
    - Add new clean, borderless, underline-free subtitle styles:
      - `clean_yellow`: Vàng Hiện Đại (Không viền & Không gạch chân)
      - `clean_white`: Trắng Tối Giản (Không viền & Không gạch chân)
      - `clean_emerald`: Xanh Mint TikTok (Không viền & Không gạch chân)
      - `clean_sunset`: Cam Pastel Vintage (Không viền & Không gạch chân)
      - `pure_cinema`: Chữ Nổi Điện Ảnh (Không nền hộp, Không viền, Không gạch chân)
    - Add explicit configuration controls:
      - "Bỏ viền hộp (No border)" toggle (`zeroTtsCaptionNoBorder`)
      - "Bỏ gạch chân (No underline)" toggle (`zeroTtsCaptionNoUnderline`)
    - Update live preview overlay:
      - Remove borders when `zeroTtsCaptionNoBorder` or clean style is active.
      - Remove `underline decoration-...` when `zeroTtsCaptionNoUnderline` or clean style is active.
    - Add "Xuất Video Hoàn Chỉnh (ZeroTTS Video Render)" export button:
      - Triggers `renderZeroTtsVideo` call to `/api/video-processing/zerotts-render`.
      - Displays rendering progress, elapsed time, download button for exported MP4, file size, and inline preview.
  - Unit tests:
    - `src/lib/video-processing/zerotts-render.test.ts`
    - `src/app/api/video-processing/zerotts-render/route.test.ts`
    - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - Version bump to `0.11.83`, changelog entry, board update, and `npm run guard:version`.
- Out of scope:
  - Third-party cloud rendering services (everything runs locally on FFmpeg without external charges).

## 4. Input / Output

- Input: Video file, ZeroTTS speech audio, background music selection, volume sliders, and CapCut subtitle configuration.
- Output: Exported MP4 video with mixed audio and burned subtitles, plus new clean borderless/underline-free subtitle presets.

## 5. Acceptance Criteria

1. ZeroTTS Voice Lab provides new subtitle styles with no border and no underline.
2. User can toggle borderless container and underline-free active word highlighting.
3. Export button renders a complete MP4 video combining video, speech, BGM, and burned subtitles matching the settings.
4. Render handles video without audio gracefully without FFmpeg stream failure.
5. Automated tests pass and `npm run guard:version` succeeds.

## 6. Technical Plan

1. Implement `src/lib/video-processing/zerotts-render.ts` with ASS subtitle generator and FFmpeg pipeline.
2. Implement `src/app/api/video-processing/zerotts-render/route.ts`.
3. Update `src/features/audio/piper-tts-sandbox-panel.tsx` with new styles, toggles, preview updates, and export action.
4. Add comprehensive unit tests.
5. Bump version to `0.11.83` and update changelog.
6. Verify with vitest and version guard.

## 7. Verification Evidence

- `npx vitest run src/lib/video-processing/zerotts-render.test.ts src/app/api/video-processing/zerotts-render/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` (pass, 3 files, 27 tests).
- `npx vitest run src/lib/video-processing/video-composer-render.test.ts src/app/api/video-processing/color-grade/route.test.ts src/lib/multilingual-audio/zerotts-voices.test.ts` (pass, 3 files, 17 tests).
- `npm run guard:version` (pass).

