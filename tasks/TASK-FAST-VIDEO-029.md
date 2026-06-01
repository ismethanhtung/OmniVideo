# [FAST-VIDEO-029] Default Video Tools Lab to Partial Blur and Keep Bangers Font

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

- Task ID: FAST-VIDEO-029
- Phase: FAST
- Target Phase: Video Tools Lab UX polish
- Domain: Video Tools Lab / Subtitle defaults
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner wants Video Tools Lab default mode to use `Partial blur` instead of `Cover subtitle box`.
- Current subtitle default font is `Bangers`, but after selecting local video file the setup resets font to `Arial`.
- Owner also wants subtitle default size increased to `50`.

## 3. Scope

- In scope:
  - Update Video Tools Lab default toggle state to blur-on and cover-box-off.
  - Fix subtitle default reset path to keep `Bangers` after selecting a file without saved local setup.
  - Change subtitle default font size from `40` to `50`.
  - Update tests and changelog/version/task evidence.
- Out of scope:
  - Workspace/VIP subtitle defaults outside Video Tools Lab.
  - Subtitle rendering engine behavior changes.

## 4. Acceptance Criteria

1. Video Tools Lab opens with `Partial blur` enabled and `Cover subtitle box` disabled.
2. Selecting a local video file with no saved local setup keeps default subtitle font `Bangers` (no reset to `Arial`).
3. Default subtitle font size in Video Tools Lab is `50`.
4. Focused tests, build, and version guard pass or failures are documented.

## 5. Technical Plan

1. Adjust initial state and default-setup/reset logic in `video-tools-lab-panel.tsx`.
2. Update string-based panel test expectations for the new defaults.
3. Update board/changelog/version and run focused verification commands.

## 6. Test Plan

1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note

- Set Video Tools Lab defaults to Partial blur + Bangers 50 and prevent file selection from resetting subtitle font to Arial.

## 8. Execution Notes

- Assumptions: “mặc định” applies to Video Tools Lab default/reset behavior when no saved setup exists.
- Blockers: none at start.

## 9. Test Evidence

- Test files added/updated:
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Focused Video Tools Lab tests pass (1 file / 9 tests).
  - Production build pass.
  - Version guard pass.
  - Diff whitespace check pass.
- Files changed:
  - Runtime/UI: `src/features/video-processing/video-tools-lab-panel.tsx`
  - Tests: `src/features/video-processing/video-tools-lab-panel.test.ts`
  - Governance/version: `tasks/board.md`, `tasks/TASK-FAST-VIDEO-029.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
- Residual risks:
  - Existing saved setups with explicit `coverBoxEnabled=true` vẫn sẽ giữ cover mode theo dữ liệu đã lưu, không bị force về partial blur.
