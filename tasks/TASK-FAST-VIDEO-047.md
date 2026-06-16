# [FAST-VIDEO-047] Add Replicate generic runner to Feature Sandbox

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

- Task ID: FAST-VIDEO-047
- Phase: FAST
- Target Phase: Feature Sandbox provider experiments
- Domain: AI Provider / Feature Sandbox
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants to test arbitrary Replicate models such as `prunaai/z-image-turbo`.
- Replicate models can be image, chat/text, audio separation, or other prediction shapes with model-specific input schemas.

## 3. Scope

- In scope:
  - Add a server-side Replicate prediction sandbox API.
  - Add a generic Feature Sandbox UI with model target, mode, JSON input, optional file-to-input-key injection, and output preview/raw JSON.
  - Support owner/model latest-version resolution, explicit version refs, and official/deployment endpoints.
  - Add focused tests.
- Out of scope:
  - Full schema-driven dynamic forms for every Replicate model.
  - Persistent token storage.
  - Long-running webhook/polling orchestration.

## 4. Acceptance Criteria

1. Feature Sandbox can run `prunaai/z-image-turbo`-style owner/model refs using latest version resolution.
2. User can paste arbitrary Replicate input JSON.
3. User can attach a local file to any input key as a data URL for small test files.
4. UI displays status, logs, raw prediction JSON, and previews URL/data URL outputs when possible.
5. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add `POST /api/replicate/predictions` route.
2. Add Replicate runner section to Feature Sandbox.
3. Add route/UI tests and update changelog/version.

## 6. Test Plan

1. `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts` pass (3 files / 12 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add a generic Replicate prediction runner to Feature Sandbox.

## 9. Execution Notes

- Added a generic Replicate prediction API for Feature Sandbox tests.
- Added a Replicate Model Lab UI with target/mode, arbitrary input JSON, optional file-to-key injection, media previews, and raw JSON output.
- Residual risk: long-running Replicate jobs can still return `starting`/`processing`; this first sandbox version uses Replicate wait mode and does not implement persistent polling or webhooks.
