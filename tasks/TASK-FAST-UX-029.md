# [FAST-UX-029] Fix ZeroTTS Voice Lab Responsive Horizontal Overflow

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata
- Task ID: FAST-UX-029
- Phase: FAST
- Target Phase: UX polish
- Domain: Audio / ZeroTTS Voice Lab
- Task Type: Bugfix / UX
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context
- The ZeroTTS Voice Lab panel (`src/features/audio/piper-tts-sandbox-panel.tsx`) renders a two-column settings/output layout.
- At narrower desktop widths, the left settings column and the output header overflowed horizontally: preset button rows (Speech Speed, BGM Volume, Video Volume), the synchronized-video upload cell, the long audio path `<select>`, and the rendered metadata rows pushed past their containers.
- Root causes: fixed-width grid tracks with no `min-w-0` on grid children, non-wrapping `flex` header rows, an over-wide `max-w-[180px]` truncation limit, and a `lg:grid-cols-6` metrics grid that packed six tiles into a narrow right column.

## 3. Scope
- In scope:
  - add `min-w-0` to both grid columns;
  - widen grid tracks responsively (`340px` at `lg`, `380px` at `xl`);
  - allow preset button rows and header rows to `flex-wrap`;
  - constrain the video upload label text with `min-w-0` + `max-w-full` truncation;
  - defer the 6-column metrics grid to `xl`.
- Out of scope:
  - any ZeroTTS synthesis/rendering behavior changes;
  - redesigning the panel visual language.

## 4. Acceptance Criteria
1. ZeroTTS Voice Lab produces no horizontal overflow of the settings column or its child rows across desktop widths (1024–1920px).
2. Preset button rows and title rows wrap instead of overflowing.
3. Video upload filename and rendered banners truncate/wrap within their containers.
4. A regression test guards the responsive layout classes.

## 5. Technical Plan
1. Apply responsive grid + `min-w-0` to the two-column wrapper.
2. Add `flex-wrap` and gap tokens to header/preset rows.
3. Constrain truncating label text.
4. Add/adjust the regression test and release metadata.

## 6. Test Plan
1. `npx vitest run src/features/audio/piper-tts-sandbox-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Fix ZeroTTS Voice Lab responsive horizontal overflow.

## 8. Execution Notes
- Verified against a running dev build via headless Chromium (CDP) at 1440px: overflowing elements dropped from 14 to only native `<select>` option clipping (which does not affect layout).

## 9. Test Evidence
- Test file updated:
  - `src/features/audio/piper-tts-sandbox-panel.test.ts` (added responsive-overflow guard).
- Test commands executed:
  - `npx vitest run src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - `piper-tts-sandbox-panel.test.ts` passes (17 tests);
  - `npm run guard:version` passes after patch bump `0.11.83 -> 0.11.84`.
