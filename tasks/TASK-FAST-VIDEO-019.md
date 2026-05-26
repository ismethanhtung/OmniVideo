# [FAST-VIDEO-019] Add Download Button Near Thumbnail Name and Right-Align Upload Title Hint

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
- Task ID: FAST-VIDEO-019
- Phase: FAST
- Target Phase: Thumbnail Studio UX polish
- Domain: Thumbnail Studio
- Task Type: UX Enhancement
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner requests two UI adjustments in Thumbnail Studio editor panel:
  - add a Download action at the `Thumbnail name` area.
  - move the upload title hint (for example `upload 10:07:25`) to the right side.

## 3. Scope
- In scope:
  - add a download button in `Thumbnail name` header section.
  - render current upload/title hint at right side of the same header row.
  - keep existing save/import/delete flows unchanged.
  - update source-level test expectations for this UI.
- Out of scope:
  - redesign thumbnail library card layout.
  - changing thumbnail storage API contracts.

## 4. Acceptance Criteria
1. Thumbnail editor shows a visible `Download` button near `Thumbnail name`.
2. `Download` button points to selected thumbnail attachment download route.
3. Upload/title hint text is shown at the right side of the `Thumbnail name` header.
4. Source-level regression test reflects the new UI strings/controls.

## 5. Technical Plan
1. Add selected-thumbnail attachment download URL computed value.
2. Update `Thumbnail name` header to include right-side upload/title hint + download button.
3. Update `thumbnail-studio-panel.test.ts` with focused assertions.
4. Run targeted tests, bump patch version, update changelog, run guard.

## 6. Test Plan
1. `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Add Thumbnail Studio download button in `Thumbnail name` area and right-side upload/title hint.

## 8. Execution Notes
- Assumptions:
  - Download action should be available only when a thumbnail is selected.
  - The right-side hint should prioritize the selected thumbnail title (`upload hh:mm:ss`) and fall back to current input.
- Blockers: none.
- Implementation summary:
  - Added `selectedThumbnailDownloadUrl` and `selectedThumbnailNameHint`.
  - Updated `Thumbnail name` header row to include right-side hint and `Download` button with `DownloadCloud` icon.
  - Wired button to thumbnail attachment download route with disabled state when nothing is selected.
  - Added source-level assertions in `thumbnail-studio-panel.test.ts`.
  - Bumped version `0.10.57 -> 0.10.58` and updated board/changelog.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/thumbnails/thumbnail-studio-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts` ✅ pass (1 file / 5 tests)
  - `npm run guard:version` ✅ pass
