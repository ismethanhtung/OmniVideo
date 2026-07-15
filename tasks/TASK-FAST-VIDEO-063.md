# [FAST-VIDEO-063] Create Video Composer Workbench

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-063
- Phase: FAST
- Target Phase: Video Tools
- Domain: Video Processing / UI
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The owner needs a separate CapCut-like page, visually aligned with Audio Transcript, to assemble a local project from multiple clips and preview changes before making one explicit final save action. Requested first tools are clip merge/order, source-audio controls, uploaded music preview, Retro/Vintage look, and editable text overlay.

## 3. Scope

- In scope:
  - New navigable `Video Composer` page using the Audio Transcript visual shell.
  - Local multi-clip project queue with drag reorder, remove, and sequential preview.
  - Client-side preview controls for original-audio level, uploaded music, vintage grain/tint, and editable text/font/size.
  - A single explicit Save Project action that exports a self-contained project JSON only when the owner chooses to save; no automatic mutations.
- Out of scope:
  - Claiming CSS preview effects are burned into an MP4.
  - Server-side multi-clip render, AI vocal stem separation, and permanent asset persistence in this first page foundation.
  - Replacing Audio Transcript or Video Tools.

## 4. Acceptance Criteria

1. A new navigation entry opens Video Composer without changing the existing Audio Transcript page.
2. The page accepts multiple local clips, shows a reorderable timeline, and previews clips sequentially in timeline order.
3. The preview visibly applies text overlay and Vintage Film styling without rendering/uploading a video.
4. The operator can set original-audio volume, upload/select music for local preview, and toggle music playback.
5. No settings auto-save; only Save Project exports the current project configuration as JSON.
6. Empty/error states leave the page usable and focused UI tests cover the new workflow.

## 5. Technical Plan

1. Register a dedicated app section/navigation route and create a new client-side composer panel with the established Audio Transcript shell.
2. Manage browser object URLs safely for clips/music, local timeline ordering, and sequential preview.
3. Add preview-only creative/audio controls and a deliberate JSON project export.
4. Add focused panel/navigation tests, bump patch version, update task/changelog, and run required checks.

## 6. Test Plan

1. Panel source regression: clips, object URL lifecycle, reorder, Vintage Film, text controls, music upload, and Save Project JSON export.
2. Navigation/router regression: section ID, route slug, and component registration.
3. Required checks: focused tests, `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- All first-version edits remain local until explicit project export; no new server mutation path or background jobs are introduced.

## 8. Risks & Rollback

- Risk: browser preview cannot validate final ffmpeg composition or stem separation.
- Mitigation: labels explicitly call this a local preview/project foundation and do not offer a misleading rendered-MP4 button.
- Rollback: remove the isolated page, navigation registration, tests, task/changelog, and version bump.

## 9. Deliverables

1. New Video Composer page and route.
2. Local timeline, preview, audio/music, vintage, and text-overlay controls.
3. Explicit JSON project save/export and test evidence.

## 10. Changelog Note

- Planned summary: Add a preview-first Video Composer workbench with local project export.

## 11. Execution Notes

- The owner asked for one final save. In this first implementation, Save Project is deliberately an explicit browser download of project JSON, not an automatic render or persistence operation. This avoids representing a UI preview as a completed video render.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-composer-panel.test.ts src/features/video-processing/video-splitter-panel.test.ts` pass (2 files / 8 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox because Turbopack requires an internal port.
- `git diff --check` pass.
- Residual risk: this is a local, preview-first project workbench. It deliberately does not yet promise an MP4 render, music mixdown, or vocal-stem separation.
