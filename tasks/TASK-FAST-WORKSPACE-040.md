# [FAST-WORKSPACE-040] Fix VIP Blur Before Mirror Order

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

- Task ID: FAST-WORKSPACE-040
- Phase: MVP runtime hardening
- Target Phase: VIP video render correctness
- Domain: Workspace / VIP Processing / Video Edit
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports VIP output appears to blur the mirrored side of the frame. Inspection confirms VIP final render currently applies `hflip` before blur.
- Bài toán cần giải quyết: VIP render should apply blur/mask on source coordinates first, then mirror output video, matching the expected Video Tools Lab edit order.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`.

## 3. Scope

- In scope:
  - Change VIP final render video filter order from `speed -> mirror -> blur -> subtitles` to `speed -> blur -> mirror -> subtitles`.
  - Preserve existing speed, subtitle, audio mix, and blur region config behavior.
  - Add regression test for filter order.
- Out of scope:
  - Changing saved Storage Asset mask setup format.
  - Changing Video Tools Lab pipeline behavior.
  - Reprocessing existing generated assets.

## 4. Input / Output

- Input: VIP node with `mirrorEnabled=true` and blur/mask config.
- Output mong đợi: Blur uses pre-mirror source coordinates, then mirrored video is produced.

## 5. Acceptance Criteria

1. VIP ffmpeg filter applies blur before `hflip`.
2. Subtitle overlay remains after mirror so subtitles appear on final frame.
3. Audio speed/mix behavior remains unchanged.
4. Regression test covers filter ordering.
5. Focused tests and version guard pass.

## 6. Technical Plan

1. Refactor VIP final render filter builder order.
2. Export or otherwise test the VIP final render args builder.
3. Add regression assertion for `boxblur` before `hflip` before `ass`.
4. Update changelog, board, version, and evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes.
- Nếu Yes, module impacted: `src/lib/multilingual-audio/video-vip-processing.ts`, `src/lib/multilingual-audio/video-vip-processing.test.ts`, version/changelog/task board.

## 8. Test Plan

1. Unit regression: VIP render filter order has `boxblur` before `hflip` before `ass`.
2. Run focused VIP processing tests.
3. Run `npm run guard:version`.

## 9. Observability

- Metrics: unchanged.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: Existing VIP outputs generated before this fix remain unchanged; only new renders use corrected order.
- Rollback strategy: Revert filter order change and test.

## 11. Deliverables

1. Correct VIP blur/mirror filter order.
2. Regression test.
3. Changelog, board, and version evidence.

## 12. Changelog Note

- Fix VIP final render so blur is applied before mirror, matching expected source-coordinate mask behavior.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: VIP's own mirror should be considered an output transform. Mask/blur regions should target the source frame before that output mirror.
- Blockers: None.
- Root cause: VIP final render built the video chain as `setpts,hflip` before applying blur regions, so mask coordinates targeted the mirrored frame.
- Fix: VIP final render now applies speed, then blur, then optional `hflip`, then subtitles. Audio speed/mix behavior is unchanged.
- Residual risk: Existing generated assets remain unchanged; rerun VIP to regenerate with corrected mask order.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - VIP processing tests pass (1 file / 3 tests), including filter order regression for `setpts -> boxblur -> hflip -> ass`.
  - Focused VIP/API tests pass (2 files / 9 tests).
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
