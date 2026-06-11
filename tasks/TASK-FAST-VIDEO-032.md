# [FAST-VIDEO-032] Add subtitle display modes (Standard, Word Reveal, Karaoke) to Video Narrator and support alignment customization

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [/] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-VIDEO-032
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context

- User wants to enhance the Video Narrator pipeline to support progressive word-based subtitle modes:
  1. Standard: Full segment text appears at once.
  2. Word Reveal: Words appear one-by-one progressively (e.g. Word 1, then Word 1 + Word 2).
  3. Karaoke: Highlights the active word by coloring it.
- After implementing subtitle modes, the user requested additional styling improvements and custom parameters matching Video Tools Lab:
  1. Support customizing positioning (Bottom margin, Left/Right margins, Alignment), text color, font family, font size, and subtitle backgrounds.
  2. Default font size should be `80` (previously 40).
  3. Default bottom margin should be `380` (representing 35% of 1080px frame height, which is slightly below the center).
  4. Fix UI layout alignment issue with Alignment/Background/Worker selectors. Hiding background settings when disabled simplifies the view.
  5. Redesign the Narration Timeline segment list as a 2-column grid matching the Audio Transcript page (Left: Metadata, play/delete buttons, compact timing inputs; Right: clean textarea).

## 3. Scope

- In scope:
  - Add missing subtitle styling parameters (Left/Right margins, Alignment, Background Enabled, BG Color, Opacity, Padding Y) to the backend route form parser in `/api/audio/video-narrator/route.ts`.
  - Pass all these parameters to the `subtitleStyle` object in `VideoVipVoiceRenderInput`.
  - Update frontend `video-narrator-panel.tsx` to append all these states inside `runVideoRender`.
  - Restructure the Subtitle style config panel to be clean, grouped, and collapsable (hiding BG configurations when Background is unchecked).
  - Redesign Narration Timeline segments to match the clean 2-column grid layout of Audio Transcript with textareas for narration text.
  - Update default core styling fallback values in `video-edit-pipeline.ts` (Font size: 80, Margin bottom: 380).
  - Update unit tests in `video-edit-pipeline.test.ts`.
- Out of scope:
  - Modifying other sections of Video Tools Lab.

## 4. Acceptance Criteria

1. API Route parses and propagates all subtitle style parameters (left, right, alignment, bg color, bg opacity, bg padding, bg enabled).
2. The subtitle default font size is 80, and the default bottom margin is 380 (positioning it 35% from the bottom of a 1080px frame).
3. The Subtitle style configuration UI has a clean layout. The background settings (BG color, Opacity, Padding Y) are hidden when background toggle is disabled.
4. Narration Timeline segments display timing and action controls in a left column, and narration text in a textarea in a right column (matching Audio Transcript).
5. All automated unit tests in `video-edit-pipeline.test.ts` pass with updated defaults. Next.js production build succeeds, and version guard pass check is successful.

## 5. Technical Plan

1. Modify `/api/audio/video-narrator/route.ts` to parse additional form data fields and pass them into the `subtitleStyle` object.
2. Update `video-narrator-panel.tsx` to send all style states inside `runVideoRender`.
3. Revamp the Subtitle Style section in `video-narrator-panel.tsx` to align fields, add a side-by-side color picker, and hide conditional background parameters.
4. Refactor the segment map rendering in `video-narrator-panel.tsx` into a 2-column grid layout with textareas.
5. Update default values in `video-edit-pipeline.ts` and adjust the corresponding checks in `video-edit-pipeline.test.ts`.
6. Run unit tests (`npm run test`), and run `npm run build` and `npm run guard:version`.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/api/audio/video-narrator/route.ts`
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `package.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run unit tests: `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts`
2. Run version guard: `npm run guard:version`
3. Run full production build: `npm run build`

## 8. Observability

- Logs from testing and FFmpeg rendering confirming correct output file formats and styles.

## 9. Risks & Rollback

- Risks: Incorrect ASS parameters (e.g. alignment out of bounds) could break rendering. (Mitigated by capping value ranges at parsing stage).
- Rollback: Revert to previous simpler parameter list.

## 10. Deliverables

1. Complete API style mapping.
2. Redesigned, cleaner Subtitle Style UI config panels.
3. Audio Transcript matching segment editor timeline layout.
4. Passing tests, pass builds, and version bumps.

## 11. Changelog Note

- Reopened FAST-VIDEO-032: Added full subtitle styling customization properties (alignment, margins, backgrounds) to the Video Narrator API.
- Rebuilt Video Narrator settings UI with a clean collapsible subtitle style configuration card and a 2-column narration segments timeline editor matching Audio Transcript.

## 12. Task Type Checklist (Stamp [x])

### 12.2 Feature

- [x] Có technical plan chi tiết
- [x] Có test plan chi tiết
- [x] Có định nghĩa API/Data contracts
- [x] Có UX flow (nếu có giao diện)

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
- Test commands executed:
  - `npm run test`
  - `npm run guard:version`
  - `npm run build`
