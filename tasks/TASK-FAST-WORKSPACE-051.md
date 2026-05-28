# [FAST-WORKSPACE-051] Add VIP render mode selector (veryfast/superfast)

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

- Task ID: FAST-WORKSPACE-051
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP runtime controls
- Domain: Workspace / Video Pipeline
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner wants VIP node to expose render mode choice for ffmpeg preset.
- Current VIP render path uses fixed preset and cannot be adjusted per-run.

## 3. Scope

- In scope:
  - Add VIP runtime config selector for render mode: `veryfast` or `superfast`.
  - Pass selected mode through Workspace -> API -> VIP runtime renderer.
  - Keep backward-compatible default behavior.
  - Add regression tests.
- Out of scope:
  - Changing non-VIP nodes' presets.
  - Advanced ffmpeg preset tuning beyond these two modes.

## 4. Input / Output

- Input: VIP node config render mode.
- Output: VIP final render uses selected x264 preset.

## 5. Acceptance Criteria

1. VIP node runtime config shows render mode selector with `veryfast` and `superfast`.
2. Default mode remains current behavior (`superfast`) when unset.
3. API forwards selected render mode to VIP runtime.
4. VIP render ffmpeg args use selected preset.
5. Regression tests cover selector wiring and runtime arg behavior.
6. `npm run guard:version` passes.

## 6. Technical Plan

1. Extend VIP node template config with render mode field.
2. Add selector in Workspace VIP node runtime config UI.
3. Forward field in Workspace run form data and parse in VIP API route.
4. Apply render mode in VIP final render arg builder.
5. Update tests and run focused validation + guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - related tests

## 8. Test Plan

1. Unit/source tests:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure case:
  - Invalid mode input falls back to default preset safely.

## 9. Observability

- Include selected render mode in existing VIP run-start log metadata.

## 10. Risks & Rollback

- Risk: invalid preset value from old config causing ffmpeg failure.
- Rollback: force preset to `superfast`.

## 11. Deliverables

1. VIP render mode selector.
2. Full wiring to runtime.
3. Regression tests and changelog.

## 12. Changelog Note

- Add VIP render mode selector for `veryfast` and `superfast` presets.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - `superfast` stays default to preserve current performance profile.

## 15. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts` pass (4 files / 90 tests).
- `npm run guard:version` pass.
