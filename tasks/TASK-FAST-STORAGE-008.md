# [FAST-STORAGE-008] Make Storage Delete Idempotent When Drive File Is Missing

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
- Task ID: FAST-STORAGE-008
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
- Owner reports Storage Library has cases that cannot be deleted.
- Likely scenario: local asset record exists, but remote Drive file was already removed externally.

## 3. Scope
- In scope:
  - treat Google Drive delete `404 Not Found` as idempotent success for Storage Library delete flow;
  - keep hard-fail behavior for other Drive delete errors (permission/auth/network);
  - add regression tests for helper and route.
- Out of scope:
  - bulk delete UX;
  - drive trash/restore.

## 4. Acceptance Criteria
1. If remote Drive delete returns `404`, local storage asset deletion still succeeds.
2. Intake run cleanup still runs after successful local delete.
3. Non-404 Drive delete errors still return API failure and keep local asset.
4. Regression tests cover 404-idempotent and non-404-failure paths.

## 5. Technical Plan
1. Update Drive delete helper to soft-handle `response.status === 404`.
2. Keep existing error throw path for other non-ok responses.
3. Add helper unit test for 404 behavior.
4. Add route test ensuring delete continues when helper returns not-found skip.
5. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Storage delete now proceeds when remote Drive file is already missing (404).

## 8. Execution Notes
- Assumption: user wants delete action to clean local library even when remote file disappeared.

## 9. Test Evidence
- `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` ✅
- `npm run guard:version` ✅
