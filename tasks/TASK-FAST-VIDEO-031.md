# [FAST-VIDEO-031] Support large video files in Video Splitter using streaming multipart parser

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

- Task ID: FAST-VIDEO-031
- Phase: FAST
- Target Phase: Video tools scalability
- Domain: Video Processing / Video Tools Lab
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User reports "Failed to parse body as FormData" error when trying to split large video files (e.g. 3GB, 9 hours).
- Next.js/V8 default form-data parser tries to buffer the entire file in memory as an `ArrayBuffer`, which fails for files >2GB due to V8's hard limit of 2GB for ArrayBuffers/TypedArrays.
- We need to stream the file content directly to disk without loading the entire file bytes in memory.

## 3. Scope

- In scope:
  - Add `busboy` package for streaming multipart request body parsing.
  - Refactor `POST /api/video-processing/split` to stream incoming video file chunks directly to `/tmp/.../source.mp4`.
  - Refactor `runVideoSplit` in `src/lib/video-processing/video-split.ts` to accept the file path of the already written source video instead of reading all file bytes into memory.
  - Update `video-split.test.ts` to mock or use path-based split behavior.
  - Bump version and update changelog.
- Out of scope:
  - Rewriting other route handlers that do not handle large videos (e.g. storage asset presets) unless simple.
  - Supporting chunked browser uploads with client-side chunking.

## 4. Acceptance Criteria

1. API `/api/video-processing/split` accepts large files (> 2GB) without throwing "Failed to parse body as FormData" or exceeding memory limits.
2. The split operation streams the incoming file to disk.
3. Unit tests pass with path-based split behavior.
4. Version guard and production build checks pass.

## 5. Technical Plan

1. Install `busboy` and `@types/busboy` as dependencies.
2. Refactor `src/app/api/video-processing/split/route.ts` to parse the request body using `busboy` and `Readable.fromWeb`.
3. Refactor `runVideoSplit` in `src/lib/video-processing/video-split.ts` to accept a local input file path instead of `fileBytes` array buffer.
4. Update unit tests in `src/lib/video-processing/video-edit-pipeline.test.ts` or other tests affected by `runVideoSplit` signature changes.
5. Bump version in `package.json` and `package-lock.json` (`0.10.112 -> 0.10.113`).
6. Update `changelog/changelog.md` and `tasks/board.md`.
7. Verify all tests pass, build, and version guard checks succeed.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/api/video-processing/split/route.ts`
  - `src/lib/video-processing/video-split.ts`
  - related tests (e.g. `video-edit-pipeline.test.ts`)
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run unit tests for video processing: `npm run test -- --run src/lib/video-processing/`
2. Run build: `npm run build`
3. Run version guard: `npm run guard:version`

## 8. Observability

- Logs reflect successful streaming and split completion.

## 9. Risks & Rollback

- Risks: Stream parsing logic might fail if the boundary is malformed, but `busboy` is standard and very robust.
- Rollback: Revert to in-memory `request.formData()` parsing.

## 10. Deliverables

1. Streamed body parser in split route handler.
2. Zero-memory footprint file upload path for Video Splitter.
3. Updated tests, changelog, and board.

## 11. Changelog Note

- Refactored Video Splitter API to use streaming multipart parser (`busboy`), preventing "Failed to parse body as FormData" memory exhaustion errors on video uploads larger than 2GB.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-processing/multipart-parser.ts` (new)
  - `src/lib/video-processing/multipart-parser.test.ts` (new)
  - `src/lib/video-processing/video-split.ts`
  - `src/lib/video-processing/video-split.test.ts`
  - `src/app/api/video-processing/split/route.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/multipart-parser.test.ts`
  - `npm run test -- --run src/lib/video-processing/video-split.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - All unit tests for streaming multipart parser and path-based video split passed.
  - Next.js production build compiled and finalized successfully.
  - Version guard checked successfully.
- Versioning note:
  - Bumped app version from `0.10.112` to `0.10.113` (PATCH).
