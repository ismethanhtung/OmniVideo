# [FAST-WORKSPACE-086] Quiet VIP checkpoint polling and parse fenced think JSON

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

- Task ID: FAST-WORKSPACE-086
- Phase: FAST
- Target Phase: Workspace VIP translation reliability
- Domain: Workspace / VIP Translation
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports repeated `GET /api/audio/video-vip-processing?key=...` access logs with a very long workspace VIP key during live progress polling.
- Owner also reports provider output shaped like `<think></think>```json ...` being treated as invalid JSON, causing `chunk-split-retry`.

## 3. Scope

- In scope:
  - Move Workspace VIP checkpoint polling to a short POST endpoint so the long key is not printed in request URLs.
  - Keep the existing GET checkpoint endpoint for compatibility/tests.
  - Parse fenced JSON blocks that appear after provider reasoning tags.
  - Add regression tests for both behaviors.
  - Update version, changelog, board, and verification evidence.
- Out of scope:
  - Fully disabling Next.js dev access logs.
  - Changing translation quality strategy, guide generation, or provider selection.

## 4. Acceptance Criteria

1. Workspace live polling no longer sends the VIP resume key in the URL query string.
2. A POST checkpoint endpoint can read the same checkpoint data by JSON body key.
3. Translation parser accepts valid JSON wrapped after `<think></think>` and fenced with ```json.
4. Focused tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add a checkpoint POST route that reads `{ key }` from the body and returns checkpoint data.
2. Update Workspace polling fetch to call the checkpoint POST route.
3. Extend translation content parsing to extract fenced JSON blocks from anywhere in the provider content.
4. Add route and parser regression tests.

## 6. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-processing/checkpoint/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-processing/checkpoint/route.test.ts` pass (3 files / 37 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Quiet Workspace VIP checkpoint polling URLs and parse provider JSON wrapped after reasoning tags.

## 9. Execution Notes

- Added a body-based checkpoint polling endpoint to keep long VIP resume keys out of the access-log URL.
- Added fenced JSON extraction before balanced-object fallback so provider responses like `<think></think>```json ...` are parsed when the JSON block itself is valid.
