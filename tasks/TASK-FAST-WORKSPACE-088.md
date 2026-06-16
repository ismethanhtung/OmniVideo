# [FAST-WORKSPACE-088] Add VIP Gemini thumbnail generation seed

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

- Task ID: FAST-WORKSPACE-088
- Phase: FAST
- Target Phase: Workspace VIP thumbnail generation experiment
- Domain: Workspace / Thumbnail Generation
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants a new end-of-flow thumbnail generation step after Seed Remote VIP Voice Render.
- Metadata titles are often not usable, so the thumbnail step must allow manual title input.
- The step should allow an optional reference image/base thumbnail and use Google AI Studio/Gemini image generation for a dramatic Vietnamese thumbnail style.

## 3. Scope

- In scope:
  - Add a Workspace thumbnail generation node.
  - Add a new seed based on Upload -> EC2 Voice + Render -> Save Local with a thumbnail generation step after VIP metadata.
  - Add API route for Gemini thumbnail generation that stores output as a thumbnail asset.
  - Support manual title, optional local reference image, optional thumbnail asset reference, provider/model/storage config.
  - Add focused tests and changelog/version updates.
- Out of scope:
  - Full interactive mid-run modal blocking/resume architecture.
  - Advanced thumbnail editor layers after generation.
  - Publishing auto-attachment to social nodes.

## 4. Acceptance Criteria

1. New seed appears in Workspace flow seeds and plans a thumbnail generation step after VIP.
2. Thumbnail generation node requires a manual title and storage provider account.
3. The node can include a local image reference or existing thumbnail asset reference.
4. Gemini generation output is uploaded to Thumbnail Assets as a processed thumbnail.
5. Focused tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add thumbnail generation API route using Google AI Studio-compatible image generation response parsing.
2. Add Workspace node template, flow step planning, seed graph, and runtime execution branch.
3. Add inspector controls for title, provider/model, storage account, reference image file, and reference thumbnail asset.
4. Add graph and API tests.

## 6. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-flow-setup.test.ts src/lib/workspace/workspace-seeds.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (5 files / 96 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add experimental Workspace seed for Gemini thumbnail generation after VIP EC2 voice/render.

## 9. Execution Notes

- Added `thumbnail.gemini-generate` as a processing node with required manual title, image model, thumbnail storage, optional Google provider, optional local reference image, and optional existing thumbnail reference.
- Added `POST /api/thumbnails/gemini-generate` to call Gemini image generation, parse inline image output, upload it via the configured storage provider, and register the result as a processed Thumbnail Asset.
- Added `Seed Remote VIP + Gemini Thumbnail` for Upload Video -> remote VIP EC2 voice/render -> Gemini thumbnail -> Save Local.
- The first implementation uses pre-run setup validation for the manual title stop instead of a full mid-run modal/resume architecture.
