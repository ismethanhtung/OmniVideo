# [FAST-VIDEO-049] Add Replicate reference and consistency workflow

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

- Task ID: FAST-VIDEO-049
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

- Owner needs generated storyboard images to keep a consistent visual style and character identity.
- Some Replicate models accept image/file references, but text-to-image models such as `prunaai/z-image-turbo` do not necessarily support reference images.

## 3. Scope

- In scope:
  - Add Replicate schema inspection to detect available input fields.
  - Surface likely file/image/audio reference keys in Feature Sandbox.
  - Add style lock, character lock, continuity notes, and scene prompt tools to compile a consistent prompt.
  - Keep generic JSON runner behavior intact.
- Out of scope:
  - Fine-tuning/LoRA training.
  - Full schema-generated dynamic forms.
  - Persistent style library.

## 4. Acceptance Criteria

1. User can inspect a Replicate model schema and see input fields.
2. User can identify and apply likely file/image reference input keys when a model supports them.
3. User can build a prompt that preserves visual style and character identity when the model is text-only.
4. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Extend Replicate API route with schema inspection.
2. Add consistency/reference controls to Feature Sandbox Replicate Model Lab.
3. Update tests and verification metadata.

## 6. Test Plan

1. `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` pass (2 files / 7 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add Replicate schema inspection and consistency prompt workflow.

## 9. Execution Notes

- Added Replicate schema inspection to surface available input fields and likely reference file keys.
- Added style/character/continuity prompt locks for text-only models.
- Residual risk: prompt locks improve consistency but cannot guarantee perfect identity; true identity/style reference still depends on choosing a Replicate model that accepts an image/reference input or using LoRA/fine-tuning.
