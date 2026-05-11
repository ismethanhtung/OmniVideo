# FAST-AUDIO-036 Light Timeline Workbench and Restore 1.25x Min Speed

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

- Task ID: FAST-AUDIO-036
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User wants the new Audio Timeline Workbench on a white background, without the vertical playhead, and wants min speed restored from `1.3x` to `1.25x`.
- Bài toán cần giải quyết: adjust timeline visual treatment and speed constants consistently across runtime, UI, and tests.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: workbench background/playhead cleanup, `1.25x` min speed restore, tests, changelog/version/task updates.
- Out of scope: changing timeline data model or backend voice generation behavior beyond speed floor.

## 4. Input / Output

- Input: existing generated voice timeline metadata.
- Output mong đợi: white timeline workbench with no vertical playhead and min speed `1.25x`.

## 5. Acceptance Criteria

1. Timeline workbench no longer uses the dark `bg-neutral-950` surface.
2. Vertical playhead is removed from the workbench.
3. Runtime timeline min speed is `1.25x`.
4. UI voice speed display floor is `1.25x`.
5. Tests verify the updated speed floor and workbench markers.

## 6. Technical Plan

1. Remove `voicePreviewTime`/playhead rendering and change workbench colors to light theme.
2. Update min speed constants, display floor, and Piper test expectations to `1.25x`.
3. Run targeted tests, build, version guard, then update governance files.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript UI and Piper timeline settings/tests.

## 8. Test Plan

1. Targeted tests: `chinese-transcription-panel.test.ts`, `piper-tts.test.ts`.
2. Build and version guard.
3. `git diff --check`.

## 9. Observability

- Metrics: unchanged.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: Light timeline may need further visual polish after real dense content review.
- Rollback strategy: revert workbench color class changes and speed constant.

## 11. Deliverables

1. Light timeline workbench without playhead.
2. Min speed restored to `1.25x`.
3. Test/changelog/version evidence.

## 12. Changelog Note

- Switch Audio Timeline Workbench to a light surface, remove the vertical playhead, and restore min speed to `1.25x`.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: generated audio should still update active segment while playing, even without rendering a vertical playhead.
- Blockers: None.
- Verification evidence:
  - Timeline workbench now uses a light background and no vertical playhead.
  - Removed `voicePreviewTime` state because the playhead no longer renders.
  - Restored runtime and UI min speed floor to `1.25x`.
  - Targeted tests, build, and version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (2 files / 22 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
