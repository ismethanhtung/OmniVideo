# [FAST-OPS-008] Clean Next Build ESLint Circular Warning

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
- Task ID: FAST-OPS-008
- Phase: FAST
- Target Phase: Build stability
- Domain: Tooling / Lint
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- `npm run build` completes compile but emits ESLint warning:
  - `Converting circular structure to JSON ... plugins.react closes the circle`.
- This pollutes CI/local build output and obscures real errors.

## 3. Scope
- In scope:
  - Align ESLint setup with Next.js 15-compatible configuration.
  - Remove circular warning from build output.
  - Verify by re-running build.
- Out of scope:
  - Introducing new lint rules.
  - Refactor of app code.

## 4. Acceptance Criteria
1. `npm run build` no longer prints the circular-JSON ESLint warning.
2. Lint/type check in build still succeeds.
3. Dependency/config changes are documented in changelog.

## 5. Technical Plan
1. Replace current flat ESLint config with classic Next-compatible `.eslintrc.json`.
2. Align `eslint-config-next` major version with installed `next` major.
3. Run `npm run build` to confirm clean output.

## 6. Test Plan
1. `npm run build`

## 7. Changelog Note
- Fix ESLint circular-warning noise during `next build`.

## 8. Execution Notes
- Root cause hypothesis: version/config mismatch (`next@15` with `eslint-config-next@16` and flat config path).

## 9. Test Evidence
- `npm run build` ✅
- `npm run guard:version` ✅
