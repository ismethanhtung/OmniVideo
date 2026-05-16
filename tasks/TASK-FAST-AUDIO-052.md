# FAST-AUDIO-052 Promote Video Preprocess to Main Audio Transcript

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

- Task ID: FAST-AUDIO-052
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature / Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner đã kiểm thử Video Preprocess trên `Audio Transcript 2 - Test` và muốn promote tính năng tốt này về trang `Audio Transcript` chính.
- Bài toán cần giải quyết: bật Video Preprocess trên trang chính nhưng giữ default an toàn, đồng thời xử lý cảm giác lag khi tick `Enable preprocess` sau khi trang đã có transcript.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Hiển thị `Video Preprocess` trên `Audio Transcript` chính, mặc định tắt và speed mặc định `0.7x`.
  - Giữ `Audio Transcript 2 - Test` làm sandbox riêng.
  - Xác nhận toggle không tự gọi preprocess API và giảm rerender nặng khi state preprocess đổi sau khi đã có transcript.
  - Cập nhật tests/docs/changelog/version evidence liên quan.
- Out of scope:
  - Thêm loại preprocess mới ngoài speed factor.
  - Thay đổi semantics chạy preprocess on-demand hiện tại.
  - Thiết kế lại toàn bộ Audio Transcript UI.

## 4. Input / Output

- Input: source video/audio hiện có + optional preprocess toggle/speed.
- Output mong đợi: trang `Audio Transcript` chính dùng được Video Preprocess on-demand mà không làm đổi flow mặc định hoặc tạo lag không cần thiết khi toggle.

## 5. Acceptance Criteria

1. `Audio Transcript` chính hiển thị block `Video Preprocess`, mặc định `useVideoPreprocess=false` và speed selector khởi tạo `0.7x`.
2. `Audio Transcript 2 - Test` vẫn tồn tại và tiếp tục dùng preprocess sandbox behavior hiện có.
3. Tick `Enable preprocess` không tự gọi `/api/audio/video-preprocess`; preprocess chỉ chạy khi prepare/run cần source processed.
4. Khi state preprocess đổi sau khi đã có transcript, các subtree nặng của kết quả transcript/voice không bị dựng lại không cần thiết.
5. Tests liên quan pass và có evidence cho hành vi mới.

## 6. Technical Plan

1. Bật props preprocess phù hợp cho trang Audio Transcript chính và giữ wrapper sandbox riêng.
2. Tách/memoize các subtree transcript/segments/voice workbench nặng để state preprocess không kéo theo rerender toàn bộ output.
3. Cập nhật tests, docs, changelog và verification evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/content-router.tsx`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `docs/domains/multilingual-audio.md`

## 8. Test Plan

1. Chạy targeted tests:
   - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts`
2. Manual verify:
   - Với trang có transcript/words hiện hữu, tick preprocess không tự gọi API và UI vẫn phản hồi nhanh.
3. Release verify:
   - `npm run build`
   - `npm run guard:version`

## 9. Observability

- Metrics: giữ nguyên preprocess/step timing hiện có.
- Logs: không thêm log mới.
- Error codes: reuse các error code preprocess hiện có.

## 10. Risks & Rollback

- Risks:
  - Memoization sai dependency có thể làm panel con hiển thị dữ liệu cũ.
  - Main page có thêm control mới nên cần giữ default off để không đổi behavior âm thầm.
- Rollback strategy:
  - Tắt preprocess props ở trang chính và revert memoized output split.

## 11. Deliverables

1. Video Preprocess hiển thị trên Audio Transcript chính.
2. Lag toggle được giảm theo hướng render isolation.
3. Tests/docs/changelog/version evidence đầy đủ.

## 12. Changelog Note

- Promote on-demand Video Preprocess to the main Audio Transcript page and isolate heavy output rendering from preprocess toggles.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions:
  - Root cause chính của cảm giác lag là rerender nặng khi state preprocess đổi trên trang đã có nhiều output.
  - Release batch này có feature user-visible nên dùng minor bump chung với `FAST-WORKSPACE-012`.
- Blockers: none.
- Verification evidence:
  - Main Audio Transcript now renders Video Preprocess with default-off behavior and `0.7x` baseline.
  - Browser verification confirmed the main route exposes the preprocess block and toggle state changes independently of any explicit prepare action.
  - Segment rendering was isolated through `TranscriptSegmentsPanel` plus memoized timing derivations.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted audio/workspace suite pass (`5 files`, `58 tests`).
  - Production build pass after rerun outside sandbox because Turbopack's sandboxed PostCSS worker attempted a restricted port bind.
  - Version guard pass (`[version-guard] OK`).
