# [FAST-VIDEO-040] Add Vietnamese Video Metadata generation to Video Narrator

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

- Task ID: FAST-VIDEO-040
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Feature Enhancement
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Currently, the Audio Transcript page has a "Generate Metadata" feature that calls `/api/audio/video-metadata` to generate Vietnamese video titles, descriptions, and hashtags based on translated segments.
- The Video Narrator page needs this feature below "Render Settings".
- It should use the narration segments (from the Narration Timeline) as input to generate titles, descriptions, and tags.
- In addition to AI-generated tags, some fixed tags (like `xuhuong`, `short`) should be automatically combined with the output tags.
- The generated metadata must be editable and can be saved back to the storage asset metadata via PATCH.

## 3. Scope

- In scope:
  - Add states in `video-narrator-panel.tsx` for metadata, loading/saving, and drafts.
  - Implement `runVideoMetadata` to call the `/api/audio/video-metadata` endpoint.
  - Automatically combine generated hashtags with fixed tags (`xuhuong`, `short`).
  - Implement `saveVideoMetadata` to PATCH the asset metadata.
  - Render a collapsible "Video Metadata" accordion UI section immediately below "Render Settings".
  - Implement localStorage load/save persistence for the metadata drafts and states.
  - Add static source-code regex tests to verify the metadata generation and UI features.
- Out of scope:
  - Altering the backend API route `/api/audio/video-metadata`.

## 4. Acceptance Criteria

1. A new collapsible "Video Metadata" section is displayed directly below "Render Settings" in the Video Narrator panel.
2. Clicking "Generate VI Metadata" fetches title, description, and hashtags from `/api/audio/video-metadata` based on the narration segments.
3. Fixed tags `xuhuong` and `short` are automatically combined with AI-generated hashtags, deduplicated, and displayed in `#tag1 #tag2` format.
4. The generated metadata elements (Title, Description, Hashtags) are editable in the UI.
5. If a storage asset is selected, clicking "Save to Asset" successfully patch-saves the values to `/api/storage/assets/${selectedAssetId}`.
6. The metadata states are persisted to and hydrated from `localStorage` across page reloads.
7. A static source-code regex test is created at `src/features/video-narrator/video-narrator-panel.test.ts` and successfully passes.

## 5. Technical Plan

1. **Locate `video-narrator-panel.tsx`**:
   - Add state variables: `videoMetadata`, `isGeneratingMetadata`, `isSavingMetadata`, `metadataError`, `metadataSaveMessage`, `metadataTitleDraft`, `metadataDescriptionDraft`, `metadataHashtagsDraft`, `metadataGenerationDurationMs`, and `showMetadataSettings`.
   - Update `localStorage` load and save `useEffect` hooks to persist these drafts and metadata states.
   - Implement `runVideoMetadata` and `saveVideoMetadata` matching `chinese-transcription-panel.tsx`, passing the narration `segments` as `translatedSegments` and mapping/deduplicating hashtags with `xuhuong` and `short`.
   - Add the JSX block for the "Video Metadata" accordion below the "Render Settings" accordion.
2. **Write component test**:
   - Create `src/features/video-narrator/video-narrator-panel.test.ts` asserting the existence of metadata functions, drafts, fixed tags, saving mechanics, and CSS/layout markers in the source file.
3. **Verify**:
   - Run tests: `npm run test`.
   - Bump version to `0.11.11` in `package.json` and `package-lock.json`.
   - Run version guard and production build.

## 6. Code Change Impact

- Code changes: Yes
- Modules impacted:
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `src/features/video-narrator/video-narrator-panel.test.ts`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. Execute `npm run test` (including the new regex source-scan test).
2. Run version guard `npm run guard:version`.
3. Build the project `npm run build`.

## 8. Observability

- Console log outputs and local storage state updates.

## 9. Risks & Rollback

- Risk: Empty segments list.
- Mitigation: Require `segments.length > 0` before triggering metadata generation and show warning.

## 10. Deliverables

1. Collapsible "Video Metadata" block on Video Narrator.
2. Automatic fixed tag addition and deduplication.
3. Save to Asset functionality.
4. Local storage state persistence.
5. New frontend panel test suite.

## 11. Changelog Note

- Add Vietnamese Video Metadata generation and asset-saving to Video Narrator, including auto-appended fixed tags (xuhuong, short) and local storage persistence.

## 12. Execution Notes

- None.

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-narrator/video-narrator-panel.test.ts` (new static source-code regex test suite for metadata generation UI and logic).
- Test commands executed:
  - `npm run test` (Pass: 121 files / 658 tests)
  - `npm run guard:version` (Pass)
  - `npm run build` (Pass)
