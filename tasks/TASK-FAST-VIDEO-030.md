# [FAST-VIDEO-030] Expand Video Tools Lab previews and align subtitle controls

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-030
- Phase: FAST
- Target Phase: Video Tools Lab UX polish
- Domain: Video Tools Lab
- Task Type: UI Polish
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner reports Video Tools Lab preview videos still do not use the full horizontal width.
- Owner wants `Background padding Y` and `Độ rộng Subtitle mẫu (%)` on one row.

## 3. Scope
- In scope:
  - Make Original Preview frame/video full-width within the preview column.
  - Make Edited Output frame/video full-width within the preview column.
  - Raise the preview/output max-height cap so full-width video is not visually constrained by the old 420px limit.
  - Put subtitle background padding Y and sample subtitle width controls in the same two-column grid row.
  - Update source-level Video Tools Lab tests.
  - Update version, changelog, and board.
- Out of scope:
  - Changing video processing output or subtitle ASS export math.
  - Redesigning the full Video Tools Lab page.

## 4. Acceptance Criteria
1. Original Preview video frame uses full available horizontal width.
2. Edited Output video frame uses full available horizontal width.
3. Original Preview and Edited Output use a higher max-height cap than the old `420px` limit.
4. `Background padding Y` and `Độ rộng Subtitle mẫu (%)` render in the same grid row.
5. Focused Video Tools Lab tests and version guard pass.

## 5. Technical Plan
1. Replace centered inline preview wrappers with full-width wrappers/classes.
2. Move subtitle sample width input into the same two-column grid as background padding Y.
3. Add source-level test assertions for full-width preview classes and same-row controls.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
2. `npm run guard:version`
3. `git diff --check`

## 7. Observability
- No new observability required; visual layout polish only.

## 8. Risks & Rollback
- Risk: full-width preview frame changes the visual coordinate space used for dragging overlays; this is aligned with the requested full-width preview behavior.
- Rollback: restore centered inline-block preview wrappers and move subtitle width input back to its own row.

## 9. Deliverables
- Updated Video Tools Lab layout.
- Updated Video Tools Lab source-level tests.
- Governance/version/changelog updates.

## 10. Changelog Note
- Expand Video Tools Lab preview videos to full width and align subtitle controls.

## 11. Execution Notes
- Assumption: “phần dưới” refers to `Edited Output` below `Original Preview`.

## 12. Test Evidence
- `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (1 file / 10 tests).
- `npm run guard:version` pass.
- `git diff --check` pass.
