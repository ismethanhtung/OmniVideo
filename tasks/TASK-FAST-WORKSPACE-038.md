# [FAST-WORKSPACE-038] Add Stage Checkpoints for VIP Processing Resume

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

- Task ID: FAST-WORKSPACE-038
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP resume
- Domain: Workspace / VIP Processing
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports `Continue Failed Flow` reruns the whole VIP node even after transcript/translation stages already completed.
- Bài toán cần giải quyết: Workspace resume works at step/node level. The VIP node is currently one long API step, so internal stages are lost unless the final VIP artifact, translation, and metadata all return successfully.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Add server-side VIP stage checkpoints for transcript, translation, voice, rendered video, and metadata.
  - Pass a stable `vipResumeKey` from Workspace for VIP node retries.
  - Reuse stage checkpoints when the same VIP source/config is retried.
  - Return resume metadata so UI/status can show checkpoint reuse.
  - Add focused tests for checkpoint reuse.
- Out of scope:
  - Full background job queue and polling UI.
  - Persisting checkpoints as durable user-facing assets.

## 4. Input / Output

- Input: Failed Workspace VIP flow followed by `Continue Failed Flow`.
- Output mong đợi: VIP retry resumes from the latest completed internal stage instead of rerunning transcript/translate/voice from scratch.

## 5. Acceptance Criteria

1. Workspace sends `vipResumeKey` for VIP processing requests.
2. VIP processing stores checkpoints after transcript, translation, voice, render, and metadata stages.
3. VIP processing reuses compatible checkpoints on retry and skips completed stage work.
4. Response includes checkpoint reuse details for traceability.
5. Focused tests and version guard pass.

## 6. Technical Plan

1. Add a local server checkpoint store under temp dir keyed by `vipResumeKey` plus input fingerprint.
2. Refactor `runVideoVipProcessing` to read/write checkpoints around each expensive stage.
3. Update route and Workspace payload to pass `vipResumeKey`.
4. Add unit tests with mocked stage runners to verify resume skips completed stages.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/video-vip-processing.ts`, `src/app/api/audio/video-vip-processing/route.ts`, `src/features/workspace/workspace-canvas-panel.tsx`, related tests.

## 8. Test Plan

1. Unit test: first VIP run writes checkpoints.
2. Unit test: retry with same checkpoint skips transcript/translation/voice and resumes later stage.
3. Route/workspace static regression for `vipResumeKey`.
4. Run focused tests and version guard.

## 9. Observability

- Metrics: Existing Workspace progress center.
- Logs: VIP response includes checkpoint stage reuse metadata.
- Error codes: Existing VIP route error mapping.

## 10. Risks & Rollback

- Risks: Local temp checkpoint storage is node-local and can be lost on server restart/temp cleanup.
- Rollback strategy: Remove `vipResumeKey` and checkpoint store usage.

## 11. Deliverables

1. VIP internal stage checkpointing.
2. Workspace resume key propagation.
3. Regression tests and changelog evidence.

## 12. Changelog Note

- Add VIP internal stage checkpoints so Continue Failed Flow can resume completed transcript/translation/voice/render stages.

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

## 14. Execution Notes

- Assumptions: Local temp checkpoint durability is acceptable for immediate `Continue Failed Flow`; durable Mongo/background job is a later hardening step.
- Blockers: None.
- Root cause: `Continue Failed Flow` only had step-level checkpoints. The VIP node was one long step, so internal transcript/translation/voice/render progress was not reusable unless the entire VIP API response completed.
- Fix: VIP now uses a stable Workspace `vipResumeKey` and local server stage checkpoints with input fingerprint invalidation. Retries reuse completed transcript, translation, voice, render, and metadata stages.
- Residual risk: Checkpoints are local temp files. They support immediate retry on the same server process/host, but they are not a durable Mongo-backed job system yet.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused VIP checkpoint tests pass (3 files / 27 tests).
  - Regression covers failure after voice generation followed by retry that skips transcript, translation, and voice.
  - `npm run build` compiles current changes, then fails on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
