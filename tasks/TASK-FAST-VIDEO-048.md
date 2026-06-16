# [FAST-VIDEO-048] Add complete Z Image Turbo Replicate preset

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

- Task ID: FAST-VIDEO-048
- Phase: FAST
- Target Phase: Feature Sandbox provider experiments
- Domain: AI Provider / Feature Sandbox
- Task Type: Fix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Replicate Model Lab default input for `prunaai/z-image-turbo` only includes a prompt.
- Owner provided the fuller useful model input shape including width, height, speed, output format, quality, guidance scale, and inference steps.

## 3. Scope

- In scope:
  - Replace the default `prunaai/z-image-turbo` JSON with the fuller preset.
  - Add a quick reset action for the Z Image Turbo preset.
  - Update focused tests.
- Out of scope:
  - Schema introspection for every Replicate model.
  - Per-model dynamic generated forms.

## 4. Acceptance Criteria

1. Replicate Model Lab opens with the complete Z Image Turbo preset JSON.
2. User can restore that preset after editing.
3. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Update Replicate default input constant.
2. Add preset reset button in Feature Sandbox UI.
3. Update tests and task/changelog evidence.

## 6. Test Plan

1. `npm run test -- --run src/features/audio/piper-tts-sandbox-panel.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/features/audio/piper-tts-sandbox-panel.test.ts` pass (1 file / 2 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add complete Z Image Turbo Replicate preset to Feature Sandbox.

## 9. Execution Notes

- Updated the default Replicate input JSON for `prunaai/z-image-turbo` to include the fuller image generation parameters.
- Added a `Z Image Turbo` preset reset button.
