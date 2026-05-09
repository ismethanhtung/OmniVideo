# FAST-AUDIO-023 Tighten Segment Auto-Scroll and Voice Speed Guardrails

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

- Task ID: FAST-AUDIO-023
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

- Lý do: User requested segment auto-scroll only inside Segments container, stricter voice speed bounds, and better readability for voice speed/timestamp labels.
- Bài toán cần giải quyết: keep UX scoped to segment list while constraining timeline speed-up to safe range.
- Tài liệu liên quan: `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: segment-local auto-scroll; timeline speed clamp; segment voice metadata visual polish.
- Out of scope: non-Audio Transcript pages and provider logic changes.

## 4. Input / Output

- Input: generated voice timeline segments.
- Output mong đợi: easier-to-read segment diagnostics and bounded speed-up behavior.

## 5. Acceptance Criteria

1. Active-segment auto-scroll only affects the Segments container.
2. Speed factor when >1 is clamped within `1.2x` to `1.75x`.
3. Segment `Voice speed` and `Voice` timestamp labels are more legible.
4. Regression tests updated and passing.

## 6. Technical Plan

1. Replace `scrollIntoView` behavior with container-scoped `scrollTo` logic.
2. Add speed clamp helper and apply to strict/balanced timeline alignment.
3. Improve segment metadata badge styles.
4. Update tests and verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/audio/chinese-transcription-panel.tsx`, `src/lib/multilingual-audio/piper-tts.ts`, related tests.

## 8. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 9. Observability

- Metrics: existing alignment timeline/speed metadata.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: stricter speed clamp can increase overflow in very dense segments.
- Rollback strategy: revert clamp/scroll CSS changes.

## 11. Deliverables

1. Segment-local auto-scroll.
2. Speed clamp `1.2x..1.75x` for accelerated segments.
3. Improved segment voice diagnostics styling.
4. Tests/evidence/changelog/version sync.

## 12. Changelog Note

- Tighten Audio Transcript segment auto-scroll scope and timeline speed guardrails.

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

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: segment scroll should never move the global page viewport.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (3 files / 23 tests).
  - `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
  - `npm run guard:version` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (3 files / 23 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
