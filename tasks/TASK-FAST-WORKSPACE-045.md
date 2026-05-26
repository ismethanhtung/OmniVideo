# [FAST-WORKSPACE-045] Map VIP Translation Network Failures Correctly

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

- Task ID: FAST-WORKSPACE-045
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP reliability
- Domain: Workspace / VIP Processing / Transcript Translation
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner reports the same video works at commit `e6f50bdaa29afe0485110a72ab185eb8258482ea` but fails consistently at commit `e62528459f6e27381ad16841c8e649cae1ab9eb0` with Workspace VIP `SYS_DUBBING_MUX_FAILED` / `fetch failed` at translation.
- Bài toán cần giải quyết: Translation provider network failures thrown by `fetch` before an HTTP response are currently not normalized by the translation adapter, so VIP wraps them as a generic system/mux error.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/operations/observability.md`.

## 3. Scope

- In scope:
  - Normalize translation provider network failures to `PRV_GROQ_TRANSLATION_FAILED`.
  - Preserve VIP checkpoint telemetry, including failed stage and reusable transcript checkpoint.
  - Add regression coverage for chunk and fallback translation network failures.
  - Update changelog, board, and version.
- Out of scope:
  - Changing provider selection, provider account storage, or model defaults.
  - Implementing provider retries or offline queueing.
  - Changing VIP rendering behavior.

## 4. Input / Output

- Input: VIP processing reaches translation and the provider `fetch` rejects with a network-level error.
- Output mong đợi: API/Workspace reports `PRV_GROQ_TRANSLATION_FAILED` with a provider-network message and `failedStage: translation`, not generic `SYS_DUBBING_MUX_FAILED`.

## 5. Acceptance Criteria

1. Translation chunk request network failures throw `ChineseTranscriptionError` with `code=PRV_GROQ_TRANSLATION_FAILED`.
2. Single-segment fallback request network failures throw the same provider error code.
3. VIP checkpoint wrapping preserves the provider error code and `failedStage=translation`.
4. Focused tests pass.
5. Changelog, board, and version guard are updated.

## 6. Technical Plan

1. Add a helper in `transcript-translation.ts` to convert provider `fetch` rejections into `ChineseTranscriptionError`.
2. Wrap both chunk JSON and single fallback provider `fetch` calls with that helper.
3. Add regression tests in `transcript-translation.test.ts`.
4. Run focused translation/VIP route tests and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - package version / changelog / task board

## 8. Test Plan

1. Unit: `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
2. Build: `npm run build`
3. Failure cases cần thử: provider `fetch` rejects during chunk JSON request and single fallback request.
4. Kết quả mong đợi: focused tests pass and failure code is `PRV_GROQ_TRANSLATION_FAILED`.

## 9. Observability

- Metrics: no new metrics.
- Logs: existing translation provider request logs remain.
- Error codes: `PRV_GROQ_TRANSLATION_FAILED` for translation provider network failures.

## 10. Risks & Rollback

- Risks: Network failures still require user/provider remediation, but the error will now point to the correct subsystem.
- Rollback strategy: Revert changes to translation network error mapping and tests.

## 11. Deliverables

1. Translation network error mapping fix.
2. Regression tests.
3. Changelog and board updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Map VIP translation provider network failures to `PRV_GROQ_TRANSLATION_FAILED` instead of generic VIP mux/system errors.

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
  - The observed `fetch failed` happens at provider request time before an HTTP response exists.
- Blockers:
  - None.
- Verification evidence:
  - Focused tests and version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 29 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
- Docs:
  - No docs update required; behavior stays within existing VIP error/checkpoint observability policy.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
