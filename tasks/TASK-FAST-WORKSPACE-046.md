# [FAST-WORKSPACE-046] Use Superfast Rendering and Mute Original Audio by Default

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

- Task ID: FAST-WORKSPACE-046
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP reliability
- Domain: Workspace / Video Processing / Multilingual Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner requests switching rendering to `superfast` and default original audio volume to `0`.
- Bài toán cần giải quyết: Current ffmpeg encode paths use `veryfast`, and dubbing/VIP/workspace defaults keep original source audio at `0.1`.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`.

## 3. Scope

- In scope:
  - Change ffmpeg x264 render preset from `veryfast` to `superfast` for VIP, preprocess, and edit render paths.
  - Change default/fallback `originalAudioVolume` from `0.1` to `0` for video dubbing and VIP.
  - Update Workspace node defaults, UI fallbacks, sample graph configs, tests, changelog, board, and version.
- Out of scope:
  - Changing voice volume.
  - Changing translation/TTS model/provider behavior.
  - Changing user-entered explicit volume values.

## 4. Input / Output

- Input: New or default Workspace dubbing/VIP runs without explicit original volume.
- Output mong đợi: Render uses ffmpeg `superfast`; original audio mix defaults to muted (`0`) while generated voice remains at `1`.

## 5. Acceptance Criteria

1. VIP/edit/preprocess ffmpeg args use `-preset superfast`.
2. Dubbing and VIP runtime fallback `originalAudioVolume` is `0`.
3. Workspace dubbing/VIP defaults and UI fallbacks show/use `0`.
4. Existing explicit non-zero original audio volume remains honored.
5. Focused tests and version guard pass.

## 6. Technical Plan

1. Update ffmpeg preset literals in render helpers.
2. Update audio volume fallbacks/defaults in runtime and Workspace config.
3. Update tests for preset and default volume behavior.
4. Update changelog/version/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-dubbing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-preprocess.ts`
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit: relevant video processing, dubbing, VIP, and Workspace graph tests.
2. Failure cases cần thử: invalid original volume still falls back to `0`.
3. Kết quả mong đợi: focused tests pass.

## 9. Observability

- Metrics: existing mix metadata continues to report original/voice volume.
- Logs: no new logs.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: `superfast` may increase output file size compared with `veryfast`; muting source audio may remove intentional background audio unless user sets a non-zero value.
- Rollback strategy: Revert preset to `veryfast` and default original volume to `0.1`.

## 11. Deliverables

1. Superfast render preset defaults.
2. Muted original audio defaults.
3. Regression tests and changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Switch render preset to `superfast` and mute original audio by default for dubbing/VIP flows.

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
  - "superfast" means ffmpeg/x264 `-preset superfast`.
- Blockers:
  - None.
- Verification evidence:
  - Focused tests, build, and version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/lib/multilingual-audio/video-preprocess.test.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/video-preprocess.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-dubbing/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (8 files / 106 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
