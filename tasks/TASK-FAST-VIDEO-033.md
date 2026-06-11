# [FAST-VIDEO-033] Polish Video Narrator subtitle controls and add three-word highlight mode

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

- Task ID: FAST-VIDEO-033
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User wants the Video Narrator page to feel consistent with Audio Transcript and Video Tools Lab.
- User can see subtitles in rendered output but needs controls for color, font size, position, and related style settings.
- User wants an additional subtitle mode: show 3 words at a time and highlight the current word in yellow, chunking longer sentences as 3 + 3 + remaining words.
- Related docs: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Refine Video Narrator layout styling to match existing tool pages.
  - Add usable subtitle controls in Video Narrator for mode, font, size, text color, margins, alignment, and background.
  - Pass Video Narrator subtitle controls through `/api/audio/video-narrator` into render `subtitleStyle`.
  - Add `triple-word-highlight` subtitle ASS generation mode.
  - Add tests for subtitle ASS output and API style parsing.
  - Update changelog and app version.
- Out of scope:
  - Rebuilding Video Tools Lab controls.
  - Changing transcription, Gemini script generation, Piper synthesis, or remote worker transport.

## 4. Input / Output

- Input: Video Narrator render request with narration segments and subtitle settings.
- Output: Rendered subtitle ASS/video uses selected styling and supports the new 3-word active highlight mode.

## 5. Acceptance Criteria

1. Video Narrator visually uses the same bordered tool-shell and two-column workbench pattern as Audio Transcript / Video Tools Lab.
2. Video Narrator exposes subtitle controls for display mode, font family, font size, text color, left/right/bottom margins, alignment, background enabled/color/opacity/padding.
3. Selected subtitle controls persist in local storage and are included in the render `FormData`.
4. `/api/audio/video-narrator` reads the new subtitle style fields and passes them to render input.
5. New subtitle mode shows at most 3 words per active line/window and highlights the active timed word in yellow.
6. Tests cover the new subtitle mode and backend subtitle style mapping.

## 6. Technical Plan

1. Add a shared subtitle mode type and implement `triple-word-highlight` in `buildSubtitleAssContent`.
2. Extend Video Narrator route parsing for subtitle margins, alignment, background, and new mode.
3. Refactor Video Narrator panel classes and controls to align with the existing tool page style.
4. Add/update Vitest coverage for ASS output and API route render payload.
5. Update task board, changelog, and package version; run targeted tests, build, and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Modules impacted:
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/app/api/audio/video-narrator/route.ts`
  - `src/app/api/audio/video-narrator/route.test.ts`
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 8. Test Plan

1. Run `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts`.
2. Run `npm run guard:version`.
3. Run `npm run build`.

## 9. Observability

- Render output includes standard API errors if subtitle input is invalid.
- Test evidence records commands and results.

## 10. Risks & Rollback

- Risks: ASS override tags for highlighted words could affect background layer rendering if malformed.
- Rollback strategy: Revert new subtitle mode to existing `standard` mode and keep style controls.

## 11. Deliverables

1. Polished Video Narrator subtitle controls.
2. Backend subtitle style mapping.
3. Three-word active highlight subtitle mode.
4. Tests, changelog, version update.

## 12. Changelog Note

- Added Video Narrator subtitle styling controls and a 3-word active highlight subtitle mode.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: Use the existing ASS renderer and Video Tools Lab control semantics for margins/background.
- Blockers: None.
- Verification evidence: Targeted tests, version guard, and production build passed.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/app/api/audio/video-narrator/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` (Pass: 2 files / 29 tests)
  - `npm run guard:version` (Pass)
  - `npm run build` (Pass)
- Test results summary:
  - New `triple-word-highlight` ASS mode verified for 3-word windows and yellow active-word override tags.
  - Video Narrator route verified to pass subtitle mode, font, color, margins, alignment, and background settings into `subtitleStyle`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
