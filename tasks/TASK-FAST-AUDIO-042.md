# FAST-AUDIO-042 Fix Replicate Spleeter Community Model Endpoint

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

- Task ID: FAST-AUDIO-042
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

- Lý do: Audio Transcript 2 Spleeter option fails with `PRV_REPLICATE_SPLEETER_FAILED: The requested resource could not be found.`
- Bài toán cần giải quyết: `soykertje/spleeter` is a Replicate community model and must be invoked through the generic predictions endpoint with a version id.
- Tài liệu liên quan: Replicate HTTP API docs.

## 3. Scope

- In scope: fix Replicate endpoint/version payload and regression tests.
- Out of scope: changing model choice or adding VAD.

## 4. Input / Output

- Input: extracted mp3 audio bytes and Replicate token.
- Output mong đợi: Spleeter prediction is created through the correct endpoint.

## 5. Acceptance Criteria

1. Replicate Spleeter client posts to `/v1/predictions`.
2. Request body includes the full `soykertje/spleeter` version id.
3. Regression test verifies endpoint and payload.
4. Existing Spleeter transcription tests still pass.

## 6. Technical Plan

1. Replace official-model endpoint usage with generic predictions endpoint.
2. Add full latest model version id from Replicate version page.
3. Add client unit test for endpoint/payload.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Replicate Spleeter client.

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/replicate-spleeter.test.ts`.
2. Existing flow tests: `src/lib/multilingual-audio/chinese-transcription.test.ts`.
3. Build + version guard.

## 9. Observability

- Metrics: unchanged.
- Logs: none.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: Replicate may still reject large data URI audio; endpoint error is fixed separately from payload-size limits.
- Rollback strategy: revert Replicate client endpoint change.

## 11. Deliverables

1. Correct Replicate community model invocation.
2. Regression tests and changelog evidence.

## 12. Changelog Note

- Fix Replicate Spleeter endpoint for Audio Transcript 2.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: latest Replicate version id is `cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a`.
- Blockers: None.
- Verification evidence:
  - Replicate Spleeter now posts to `https://api.replicate.com/v1/predictions`.
  - Request payload includes version `cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a`.
  - Regression test verifies endpoint, version id, audio data URI payload, and vocals download.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/replicate-spleeter.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/replicate-spleeter.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (2 files / 5 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.22`.
