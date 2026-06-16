# [FAST-VIDEO-046] Tune Video Tools and Workspace defaults

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

- Task ID: FAST-VIDEO-046
- Phase: FAST
- Target Phase: Video workflow default tuning
- Domain: Video Pipeline / Workspace
- Task Type: Fix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Video Tools Lab currently defaults partial blur strength to 50, which is too strong.
- Workspace thumbnail generation should default to Google AI Studio with the requested Gemini model.

## 3. Scope

- In scope:
  - Change Video Tools Lab default blur strength from 50 to 35.
  - Change Workspace thumbnail Gemini model defaults to `models/gemini-3.1-flash-lite`.
  - Keep configured provider selection behavior intact.
  - Update tests.
- Out of scope:
  - Provider account migration.
  - Thumbnail prompt redesign.

## 4. Acceptance Criteria

1. New Video Tools Lab partial blur regions default to strength 35.
2. Workspace thumbnail generation defaults to Google AI Studio env provider behavior.
3. Workspace thumbnail model default is `models/gemini-3.1-flash-lite`.
4. Tests and version guard pass.

## 5. Technical Plan

1. Update Video Tools Lab blur default state.
2. Update Workspace thumbnail template/seed/UI/API fallback model defaults.
3. Update focused tests and verification evidence.

## 6. Test Plan

1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/render-video/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts` pass (5 files / 72 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Tune Video Tools Lab blur and Workspace Gemini thumbnail defaults.

## 9. Execution Notes

- Changed Video Tools Lab partial blur default strength from 50 to 35.
- Changed Workspace Gemini thumbnail default model to `models/gemini-3.1-flash-lite`, updated API fallback, seed/template defaults, setup validation, and inspector placeholder.
- Kept Workspace default provider behavior on Google AI Studio env (`GEMINI_API_KEY`) and renamed the inspector option to make that clear.
