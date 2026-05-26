# [FAST-WORKSPACE-048] Refine VIP Detail Output and Subtitle Wrapping

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

- Task ID: FAST-WORKSPACE-048
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP UX clarity
- Domain: Workspace / Video Pipeline
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner wants VIP completion detail to stop listing voice chunk rows and instead show metadata + tags.
- Owner also reported long subtitle lines sometimes remain unbroken on burned subtitle output even when voice timing is correct.

## 3. Scope

- In scope:
  - Remove voice-chunk detail lines from Workspace VIP summary/detail output.
  - Show generated metadata fields (`title`, `description`, `tags`) in VIP completion detail.
  - Add explicit subtitle line-wrap in ASS builder for long translated segments.
- Out of scope:
  - Voice synthesis chunking/alignment logic.
  - ffmpeg render order or encoding defaults.

## 4. Input / Output

- Input: VIP run result with translation/voice/metadata payload.
- Output:
  - Progress detail no longer includes `Voice chunk N...` lines.
  - Metadata and tags are visible in completion detail.
  - Long subtitle text emits ASS `\N` line breaks.

## 5. Acceptance Criteria

1. Workspace VIP completion detail does not include voice chunk lines.
2. Workspace VIP completion detail includes metadata title/description/tags.
3. Subtitle ASS generation wraps long lines into multiple lines (`\N`) based on subtitle layout width.
4. Regression tests cover both display change and subtitle wrapping behavior.
5. `npm run guard:version` passes.

## 6. Technical Plan

1. Update VIP detail formatter in Workspace panel.
2. Add metadata/tag lines and remove chunk-detail output paths.
3. Add subtitle wrapping helper in ASS builder and apply before escaping.
4. Update workspace and video edit tests.
5. Run focused tests, then version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - related tests

## 8. Test Plan

1. Unit tests:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
2. Failure case:
  - Long subtitle sentence gets wrapped into ASS line breaks.

## 9. Observability

- No new telemetry channel.
- Existing progress detail text is refined for clearer VIP completion output.

## 10. Risks & Rollback

- Risk: Aggressive wrapping can split lines earlier than expected.
- Rollback: remove wrapping helper and revert to raw translated segment text.

## 11. Deliverables

1. Workspace VIP detail output cleaned (metadata-focused).
2. Subtitle wrapping for long lines.
3. Updated regression tests and changelog.

## 12. Changelog Note

- Refine Workspace VIP detail display and wrap long ASS subtitle lines.

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
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - Metadata should be surfaced in both summary and stage detail context for easier verification.
- Blockers:
  - None.
- Verification evidence:
  - Focused tests and guard version pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 36 tests).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
