# [FAST-STORAGE-010] Fix TypeScript Const Assertion Error in Storage Delete Helper

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
- Task ID: FAST-STORAGE-010
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
- Build fails with TypeScript error in `asset-delete.ts`:
  - `skippedReason: null as const` is invalid const assertion usage.

## 3. Scope
- In scope:
  - fix invalid const assertion so build compiles cleanly.
- Out of scope:
  - behavior changes in delete flow.

## 4. Acceptance Criteria
1. `npm run build` passes without this TypeScript error.
2. Storage delete helper behavior remains unchanged.

## 5. Technical Plan
1. Replace invalid `null as const` with plain `null`.
2. Run `npm run build`.
3. Run `npm run guard:version`.

## 6. Test Plan
1. `npm run build`
2. `npm run guard:version`

## 7. Changelog Note
- Fix TypeScript const-assertion build error in storage delete helper.

## 8. Execution Notes
- Follow-up fix immediately after FAST-STORAGE-009.

## 9. Test Evidence
- `npm run build` ✅
- `npm run guard:version` ✅
