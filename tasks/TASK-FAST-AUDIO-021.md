# FAST-AUDIO-021 Optimize Piper TTS Voice Generation Performance

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

- Task ID: FAST-AUDIO-021
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Audio Transcript stuck too long at `Generating voice...`; Piper TTS should be fast but currently generates voice very slowly and heats the machine.
- Bài toán cần giải quyết: identify root cause in Audio Transcript voice generation path and optimize Piper invocation/work scheduling without degrading segment timing quality.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`, `docs/operations/test-execution-playbook.md`.

## 3. Scope

- In scope: inspect Audio Transcript Piper TTS flow, optimize slow/high-CPU behavior, add regression tests for the root cause and timing/performance guardrails, update task/changelog evidence.
- Out of scope: replacing Piper with another TTS provider, changing non-Audio Transcript pages unless they share the same runtime helper, production deployment.

## 4. Input / Output

- Input: existing Audio Transcript segments and Piper voice generation runtime.
- Output mong đợi: voice generation avoids pathological slow work, remains bounded for multi-segment transcripts, and exposes enough evidence/errors to diagnose failures.

## 5. Acceptance Criteria

1. Root cause of the slow/hot `Generating voice...` path is documented in this task.
2. Piper voice generation no longer performs unnecessary repeated heavyweight work per segment/request where it can be safely reused or batched.
3. Multi-segment voice generation preserves segment timing alignment within existing behavior expectations.
4. Failure path for missing/failed Piper runtime remains explicit and test-covered.
5. Regression tests cover the optimized path and at least one failure case.

## 6. Technical Plan

1. Trace the Audio Transcript UI/API path for `Generate voice` and profile obvious repeated Piper/ffmpeg work.
2. Implement minimal targeted optimization in shared audio runtime/helpers.
3. Add/update unit or route tests for regression coverage.
4. Run targeted tests, version guard, and build/test where practical.
5. Update task board, task evidence, and changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript UI/API, Piper TTS runtime helpers, tests.

## 8. Test Plan

1. Unit/Integration cần chạy: targeted audio/Piper tests and any touched route/component tests.
2. Failure cases cần thử: Piper runtime command failure or invalid input path returns explicit error.
3. Kết quả mong đợi: tests pass and optimized behavior is asserted by regression coverage.

## 9. Observability

- Metrics: per-step voice generation timing if existing trace supports it.
- Logs: keep or improve existing route/runtime error messages.
- Error codes: preserve current API error semantics unless a clearer code already exists.

## 10. Risks & Rollback

- Risks: changing segment batching may affect alignment/duration smoothing.
- Rollback strategy: revert helper/API changes and keep previous sequential generation path.

## 11. Deliverables

1. Root-cause note in task execution notes.
2. Optimized Piper TTS generation implementation.
3. Regression tests and command evidence.
4. Changelog and board update.

## 12. Changelog Note

- Fix Piper Audio Transcript voice generation performance by avoiding pathological repeated work and adding regression coverage.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: user is using the Audio Transcript page voice generation button with Piper selected/default.
- Blockers: none currently.
- Verification evidence:
  - Root cause confirmed: previous implementation spawned Piper once per segment/sentence chunk, repeatedly loading Python + ONNX model and causing slow/hot generation on longer transcripts.
  - Optimized path batches all segment/sentence chunks into one Piper `--input_file` / `--output_dir` process per request, then preserves existing concat/timeline alignment.
  - Real local Piper batch smoke generated 5 WAV files in 1.329s with one process.
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (2 files / 19 tests).
  - `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
  - `npm run guard:version` pass.
  - `npm test` pass (85 files / 370 tests).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/app/api/audio/voice-generation/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `npm test`
  - Real local Piper batch smoke command with 5 Vietnamese text lines
- Test results summary:
  - Targeted Piper/voice generation tests pass (2 files / 19 tests).
  - Full test suite pass (85 files / 370 tests).
  - Build pass; existing Turbopack warning is outside task scope.
  - Piper batch smoke returned code 0, generated 5 WAV files, elapsed 1.329 seconds.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
