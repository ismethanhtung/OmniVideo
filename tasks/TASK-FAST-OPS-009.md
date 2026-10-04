# [FAST-OPS-009] Fix Turbopack Build Symlink Asset Tracing Panic and Typecheck for ZeroTTS

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

- Task ID: FAST-OPS-009
- Phase: FAST
- Target Phase: Build & Production Deployment
- Domain: Build Pipeline / Turbopack
- Task Type: Bug Fix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Running `npm run build && npm start` failed during `next build --turbopack` with a TurbopackInternalError:
`Failed to write page endpoint /_error` caused by `Symlink .venv/bin/python3 is invalid, it points out of the filesystem root`.
Turbopack's AST static analyzer inspected `path.join(process.cwd(), ".venv", "bin", "python3")` inside `src/lib/multilingual-audio/zerotts.ts` and attempted to trace `.venv` as a directory asset. Because `.venv/bin/python3` is a Python virtual environment symlink pointing to the system/homebrew Python installation (`/opt/homebrew/...`) outside the workspace root, Turbopack panicked.
Additionally, Next.js type-checking flagged `applyDemoRateLimit(request, "zerotts")` because `"zerotts"` was missing from the `DemoFeature` union type in `src/lib/access-control/access-control.ts`.

## 3. Scope

- In scope:
  - Dynamically construct runtime virtualenv paths in `src/lib/multilingual-audio/zerotts.ts` using dynamic segments to prevent Turbopack's AST parser from tracing `.venv` as a bundled static directory asset.
  - Add `"zerotts"` to `DemoFeature` union in `src/lib/access-control/access-control.ts`.
  - Verify `npm run build` succeeds completely with Turbopack (all 54 static/dynamic routes compiled).
  - Update `changelog/changelog.md`, `package.json`, and `package-lock.json` to `0.11.78`.
- Out of scope:
  - Disabling Turbopack.

## 4. Input / Output

- Input: `npm run build && npm start`.
- Output: Clean production Turbopack build without panic or TypeScript errors.

## 5. Acceptance Criteria

1. Turbopack no longer traces `.venv` or fails on `.venv/bin/python3` symlink.
2. `DemoFeature` includes `"zerotts"` without type errors.
3. `next build --turbopack` exits with code 0 (all 54 routes compiled).
4. `npm run guard:version` passes.

## 6. Technical Plan

1. In `src/lib/multilingual-audio/zerotts.ts`, use dynamic segment reduction (`getRuntimePythonCandidate`) so Turbopack does not parse `.venv` as a static build asset.
2. In `src/lib/access-control/access-control.ts`, add `"zerotts"` to `DemoFeature`.
3. Verify production build with `npm run build`.
4. Update task board, bump version to `0.11.78`, and update changelog.

## 7. Code Change Impact

- Files:
  - `src/lib/multilingual-audio/zerotts.ts`
  - `src/lib/access-control/access-control.ts`
  - `package.json`, `package-lock.json`, `changelog/changelog.md`, `tasks/board.md`

## 8. Test Plan

- Run `npm run build` with Turbopack.
- Run `npx vitest run src/lib/multilingual-audio/zerotts.test.ts`.
- Run `npm run guard:version`.

## 9. Observability

- Turbopack build prints `✓ Finished writing to disk`, `✓ Compiled successfully`, and summary of 54 routes.

## 10. Risks & Rollback

- Risk: Python path resolution could fail at runtime if dynamic logic changes string.
- Mitigation: Tested candidate path resolving properly to `.venv/bin/python3`.

## 11. Deliverables

- Fixed build pipeline compatible with Turbopack and virtualenv symlinks.
- Updated version and changelog.

## 12. Changelog Note

- Fix Turbopack build panic on `.venv/bin/python3` symlink and resolve `"zerotts"` DemoFeature type checking in production build.
