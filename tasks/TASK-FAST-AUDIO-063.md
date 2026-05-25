# [FAST-AUDIO-063] Add Retry Hard-Constraint Transcript Test in Feature Sandbox

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-063
- Phase: MVP runtime hardening
- Target Phase: Transcript retry diagnostics
- Domain: Audio / Sandbox UX / Transcription
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User cần test nhanh phương án `prompt hard constraint` cho nhánh retry segment dài.
- Bài toán cần giải quyết: Cho phép chạy transcript test từ trang sandbox với upload/chọn asset và quan sát segment output sau retry.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Add `retryPromptHardConstraint` path in Chinese transcription runtime.
  - Wire API form field through `/api/audio/chinese-transcription`.
  - Expand/rename sandbox page for transcript retry test with segment inspection.
  - Add regression tests for retry prompt behavior and nav label updates.
- Out of scope:
  - Forced split/VAD fallback logic.
  - Workspace node config UI for this flag.

## 4. Input / Output

- Input: Video/audio upload or storage asset + optional base prompt.
- Output mong đợi: Transcription run with optional hard-constraint retry prompt and visible segments list on sandbox page.

## 5. Acceptance Criteria

1. Retry flow can append hard-constraint prompt when enabled.
2. `/api/audio/chinese-transcription` accepts `retryPromptHardConstraint`.
3. Feature Sandbox page supports upload/chọn asset + run transcript test + show segments.
4. Regression tests cover retry prompt behavior and navigation metadata.

## 6. Technical Plan

1. Extend transcription request type and retry logic.
2. Add API form-data passthrough.
3. Update sandbox panel UI and rename nav item.
4. Add/update tests and run focused suites + version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/*`, `src/app/api/audio/chinese-transcription/route.ts`, `src/features/audio/piper-tts-sandbox-panel.tsx`, `src/components/layout/navigation.*`.

## 8. Test Plan

1. Unit test: retry prompt appended when enabled.
2. Unit test: nav test for renamed sandbox section.
3. Focused run for changed tests and version guard.

## 9. Observability

- Metrics: transcription step metrics now include `retryPromptHardConstraint`.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: Prompt hint may still not split perfectly on some clips.
- Rollback strategy: disable retry hard-constraint flag usage and keep prior behavior.

## 11. Deliverables

1. Retry hard-constraint implementation path.
2. Feature Sandbox transcript retry tester.
3. Test evidence + changelog/version update.

## 12. Changelog Note

- Add retry hard-constraint transcript testing in Feature Sandbox with upload/storage-asset segment inspection.

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

## 14. Execution Notes

- Assumptions: Current test need is manual/interactive validation speed over full workflow integration.
- Blockers: None.
- Root behavior: retry path can now optionally append hard-constraint instruction to increase segment splitting success on overlong clips.
- UI change: renamed `Piper TTS Sandbox` to `Feature Sandbox` and added transcript retry test block (upload/asset + segments output).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/components/layout/navigation.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 13 tests), including retry prompt append regression and navigation registry assertions.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
