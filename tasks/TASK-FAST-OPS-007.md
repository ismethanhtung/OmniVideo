# [FAST-OPS-007] Enrich Dubbing Progress with Segment Timeline Details

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-OPS-007
- Phase: FAST
- Target Phase: Progress observability polish
- Domain: Workspace runtime / Background Progress
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Background Progress currently shows concise Dub completion text (for example: `Dubbing Vietnamese voice dubbing complete.`) but does not surface richer run context.
- User asked to display more detail, specifically segment timeline information with timestamps (similar to Audio Transcript) in the Progress UI.
- Follow-up: user also reported React warning when workflow artifacts render media with empty `src`, and asked for all Dub segments to be accessible instead of hidden behind `not shown` copy.
- Follow-up: user asked to move segment details out of the `Dub · ...` row and use the right/bottom space for richer metadata.

## 3. Scope
- In scope:
  - enrich Workspace Dub step completion detail with segment timeline preview lines;
  - keep task-level progress copy concise while adding richer step-level detail;
  - improve Progress modal step rendering so timestamped segment lines are readable.
  - prevent Workspace runtime artifact previews from rendering media/link elements with an empty `src`/`href`;
  - make all Dub segment lines available behind a `Show all` / `Hide` control.
  - move Dub segments and metadata into a separate detail panel beside/below the flow steps.
- Out of scope:
  - changing dubbing engine logic or transcript segmentation behavior;
  - adding persistent transcript history storage beyond existing progress task persistence.

## 4. Acceptance Criteria
1. Dub completion in Background Progress still shows a concise task-level completion message.
2. Dub step detail includes a readable `Segments (...)` preview with timestamped lines.
3. Progress modal step UI renders the timeline preview in a structured, legible block (not a collapsed one-line paragraph).
4. Dub segment detail no longer emits `more segment(s) not shown`; the UI can expand to all segments.
5. Workflow artifact previews do not pass an empty string to media `src` or download `href`.
6. Dub details panel includes metadata such as file name, size, MIME, runtime, transcript/translation/voice counts, provider/model, and audio mix.
7. Tests are updated to cover new progress-detail rendering, dubbing step description wiring, and server-side artifact preview behavior.

## 5. Technical Plan
1. Add helper logic in Workspace runtime to build compact Dub segment timeline preview text from translated segments.
2. Update progress step completion helper so task-level and step-level descriptions can differ.
3. Upgrade Topbar Progress step renderer to parse and format segment timeline blocks.
4. Add a guarded runtime artifact panel that skips media rendering when only a server-side artifact id is available.
5. Move rich Dub details into a dedicated right/bottom panel.
6. Update source-level regression tests for Workspace panel and Topbar progress modal.

## 6. Test Plan
1. `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Improve Background Progress by showing timestamped Dub segment previews in step details.

## 8. Execution Notes
- Segment data should include all Dub segments; the modal keeps the initial view compact via a toggle.
- Rich Dub metadata lives outside the flow step row so the step list stays scannable.
- Progress modal should remain scannable for non-dubbing tasks.

## 9. Test Evidence
- Test files added/updated:
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 21 tests).
  - `npm run build` pass with the existing ESLint circular-config warning.
  - `npm run guard:version` initially failed until release files were updated; passes after bumping version and changelog.
  - `npm run guard:version` pass after follow-up changes.
