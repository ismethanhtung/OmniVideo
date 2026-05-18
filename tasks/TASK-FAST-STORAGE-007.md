# [FAST-STORAGE-007] Delete Drive Files From Storage Library

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
- Task ID: FAST-STORAGE-007
- Phase: FAST
- Target Phase: Storage management
- Domain: Storage Library
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- `Storage Library` delete currently removes only the app record.
- User wants delete to remove the corresponding Google Drive file as well.

## 3. Scope
- In scope:
  - delete the remote Google Drive file for Drive-backed assets before deleting the local asset record;
  - remove intake run history and trace rows tied to the deleted asset so Video Intake does not keep orphaned `No preview` entries;
  - return an error if Drive deletion fails;
  - preserve current metadata-only delete behavior for non-Drive assets.
- Out of scope:
  - Drive trash/restore workflow;
  - bulk delete.

## 4. Acceptance Criteria
1. Deleting a Drive-backed asset calls Google Drive file deletion for the matching file id.
2. The Mongo asset record is deleted only after the Drive delete succeeds.
3. If Drive delete fails, the API returns an error and keeps the asset record.
4. Non-Drive assets still delete from the app as before.
5. Related intake runs are removed when their output asset is deleted from Storage Library.

## 5. Technical Plan
1. Add a reusable Drive asset delete helper using the stored Drive file id and provider credentials.
2. Change the storage asset DELETE route to load the asset, delete the Drive file when applicable, then delete the app record.
3. Cascade-delete intake runs/traces by deleted output asset id.
4. Add route/helper regression coverage and verify build/version guard.

## 6. Test Plan
1. Unit-test Drive delete URL/auth resolution.
2. Route-test successful Drive delete before metadata deletion.
3. Route-test failed Drive delete preserving metadata.
4. `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts`
5. `npm run build`
6. `npm run guard:version`

## 7. Changelog Note
- Storage Library delete now removes matching Google Drive files before deleting local asset records.

## 8. Execution Notes
- User explicitly wants one-click deletion to remove the matching Drive file as well.
- Follow-up report: after Drive/asset deletion, Video Intake still showed orphaned successful history rows with `No preview`; those linked run records now need deletion too.

## 9. Test Evidence
- `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` ✅
- `npm run build` ✅
  - Existing repo warning remains: ESLint circular-config serialization warning during build output.
- `npm run guard:version` ✅
- `git diff --check` ✅
