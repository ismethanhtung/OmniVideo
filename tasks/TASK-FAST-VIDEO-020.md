# [FAST-VIDEO-020] Soften Vietsub Black Background and Add Independent Subtitle Background Height

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-020
- Phase: FAST
- Target Phase: Video Tools Lab subtitle UX
- Domain: Video Pipeline / Video Tools Lab
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context
- Owner wants Vietsub subtitle background color `black` to appear less dark by default.
- Owner also needs subtitle background height configurable independently from text size, so small text can still use a taller background box.
- Change must work in Video Tools Lab preview and be persisted in saved setup.

## 3. Scope
- In scope:
  - Soften default subtitle black background intensity.
  - Add new subtitle background vertical padding/height control independent from font size.
  - Wire new setting through Video Tools Lab UI, preview, save/load setup, API payload, and ASS runtime generation.
  - Add/update focused tests for API/runtime/UI-source assertions.
- Out of scope:
  - Full subtitle style redesign.
  - Workspace inspector parity for new control.

## 4. Acceptance Criteria
1. Default subtitle black background is visibly less dark than previous default.
2. Video Tools Lab has a new subtitle background height/padding control separate from subtitle font size.
3. Subtitle preview responds to the new height/padding control.
4. Save/load setup preserves the new subtitle background height/padding value.
5. Runtime ASS subtitle generation uses the new value to affect subtitle background box height without forcing larger text.
6. Focused tests pass and release evidence is updated.

## 5. Technical Plan
1. Extend subtitle style type and ASS generator to support independent background vertical padding.
2. Parse new field in `/api/video-processing/edit` and forward it to runtime style input.
3. Add Video Tools Lab state/control/preview/save-load/payload wiring for new setting and adjusted default opacity.
4. Update focused tests and source assertions.
5. Bump patch version, update changelog, and run `npm run guard:version`.

## 6. Test Plan
1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Soften default Vietsub black subtitle background and add independent subtitle background height control in Video Tools Lab.

## 8. Execution Notes
- Assumptions:
  - A vertical padding model (`backgroundPaddingY`) best matches the user need for independent background height.
  - Existing saved setups without the new field should keep backward-compatible defaults.
- Blockers: none.

## 9. Test Evidence
- Pending implementation.
