# [FAST-VIDEO-053] Fix VIP Background Music Library Discovery and Remote FormData Fallback

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

- Task ID: FAST-VIDEO-053
- Phase: FAST
- Target Phase: Video Tools Lab / Remote VIP
- Domain: Video Pipeline / Workspace / Remote VIP Worker
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports remote VIP voice/render fails immediately after source upload progress with `Failed to parse body as FormData`.
- Owner also reports adding mp3 files to `public/musics` does not make them appear in Video Tools Lab background music choices.
- FAST-VIDEO-052 added background music support but used a static in-client library list and still depended on the custom Node multipart start request for smaller remote uploads.

## 3. Scope

- In scope:
  - Add a server API that lists mp3/music files from `public/musics`.
  - Update Video Tools Lab to load music choices dynamically while keeping the default bundled track fallback.
  - Harden remote VIP start transport so a worker `Failed to parse body as FormData` response falls back to native `fetch(FormData)` before failing the run.
  - Add regression coverage for dynamic music library discovery and remote transport fallback.
- Out of scope:
  - Browser upload of arbitrary music files.
  - Changing remote chunk staging protocol for videos above the staging threshold.
  - Redeploying the EC2 worker from this local change.

## 4. Acceptance Criteria

1. Any `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, or `.ogg` file directly under `public/musics` is exposed as a selectable Video Tools Lab background music option.
2. Video Tools Lab still works if the music-list API fails by using the default test track fallback.
3. Remote VIP start requests retry with native `fetch(FormData)` when the custom Node multipart start request receives a worker-side FormData parse failure.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add `/api/video-processing/background-music` route that scans `public/musics` safely and returns sorted public music sources.
2. Update shared music helper and Video Tools Lab state/UI to use dynamic options.
3. Add remote worker client fallback from Node multipart start upload to fetch-based FormData for worker FormData parse failures.
4. Add focused tests for route listing, UI source guards, and remote fallback.
5. Bump patch version and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/app/api/video-processing/background-music/route.ts`
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/lib/video-processing/background-music.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - focused tests

## 7. Test Plan

1. Unit/API/UI source tests cần chạy:
   - `npm run test -- --run src/app/api/video-processing/background-music/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts`
2. Regression cases:
   - Added mp3 files under `public/musics` appear in the API response.
   - Remote worker FormData parse failure from Node multipart triggers fetch fallback.
3. Kết quả mong đợi:
   - Focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 8. Observability

- Logs/progress: fallback path emits a remote worker progress message explaining that native FormData retry is being used.
- Error codes: preserve `SYS_DUBBING_MUX_FAILED` if both transports fail.

## 9. Risks & Rollback

- Risks: Fetch fallback may be slower than the Node multipart uploader for small videos but is more compatible with Next/worker FormData parsing.
- Rollback strategy: revert this task's API, UI loading, remote fallback, tests, changelog, and version bump.

## 10. Deliverables

1. Dynamic public music library API.
2. Video Tools Lab dynamic music select options.
3. Remote VIP FormData parse fallback.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Fix dynamic background music discovery and remote VIP FormData fallback.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 12.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 12.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể

## 13. Execution Notes

- Root cause:
  - Video Tools Lab used a static client-side music list from FAST-VIDEO-052, so new files copied into `public/musics` were not discoverable.
  - The remote VIP client used the custom Node multipart uploader by default for sub-threshold files; some worker/Next parser paths can respond with `Failed to parse body as FormData`.
- Implementation:
  - Added `/api/video-processing/background-music` to list supported music files from `public/musics`.
  - Updated Video Tools Lab to fetch music options dynamically and expose a Refresh action.
  - Added remote start fallback to native `fetch(FormData)` only for the explicit worker-side FormData parse failure.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/video-processing/background-music/route.test.ts`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/video-processing/background-music/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 26 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
