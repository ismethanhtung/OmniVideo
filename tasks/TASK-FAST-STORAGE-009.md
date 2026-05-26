# [FAST-STORAGE-009] Allow Local Storage Delete When Drive Remote Context Is Missing

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-STORAGE-009
- Phase: FAST
- Target Phase: Storage management
- Domain: Storage Library
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Storage Library delete can fail with `Google Drive fileId or access token is missing for this asset.` on some assets.
- Behavior is inconsistent because some assets still have complete remote context while others do not.

## 3. Scope
- In scope:
  - make Drive remote delete best-effort when `fileId` or access token is missing;
  - keep local metadata delete path unblocked in those cases;
  - add regression tests for missing fileId/token skip behavior.
- Out of scope:
  - remote recovery/relink workflow;
  - provider credential diagnostics UI.

## 4. Acceptance Criteria
1. Drive-backed asset delete does not fail when remote file id is missing.
2. Drive-backed asset delete does not fail when access token cannot be resolved.
3. Existing hard-fail behavior remains for explicit non-404 remote delete failures.
4. Regression tests cover both missing-context skip paths.

## 5. Technical Plan
1. Update `deleteRemoteAssetIfNeeded` to return a skip result instead of throwing for missing fileId/token.
2. Reuse existing route flow so local delete proceeds naturally.
3. Add helper tests for missing fileId and missing token cases.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Storage delete now proceeds when Drive fileId/token context is missing for an asset.

## 8. Execution Notes
- This is an idempotent-delete reliability fix for mixed historical asset metadata.

## 9. Test Evidence
- `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` ✅
- `npm run guard:version` ✅
