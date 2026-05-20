# [FAST-WORKSPACE-034] Use server-side artifacts for large Workspace media and persist active progress

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

- Task ID: FAST-WORKSPACE-034
- Phase: MVP runtime hardening
- Target Phase: Workspace heavy media reliability
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Workspace long-video flows currently return large MP4 artifacts through browser/base64 and lose active background progress on reload.
- Bài toán cần giải quyết: Reduce browser CPU/RAM pressure for large video artifacts and preserve visible long-running progress state.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/operations/observability.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Add server-side artifact IDs for large Workspace video outputs.
  - Let downstream Workspace nodes submit artifact IDs instead of base64/files when available.
  - Persist active progress tasks, not only finished tasks.
- Out of scope:
  - Full external worker service.
  - Chunked Drive upload.
  - Cloud TTS provider.

## 4. Input / Output

- Input: Workspace video preprocess/dubbing/mirror/edit/store flow.
- Output mong đợi: Large video artifacts stay server-side and active progress survives reload-style hydration.

## 5. Acceptance Criteria

1. Large video API outputs include `artifactId` and omit `videoBase64` when over the configured threshold.
2. Workspace downstream media steps can pass `artifactId` without decoding base64 in the browser.
3. Store generated artifact can upload from `artifactId`.
4. Active progress tasks are persisted and rehydrated from browser storage.
5. Focused tests cover artifact payload behavior, Workspace source wiring, and progress persistence.

## 6. Technical Plan

1. Add a lightweight server artifact registry and helpers.
2. Extend heavy media API routes to read/write artifact IDs.
3. Update Workspace artifact type and FormData wiring.
4. Update progress center persistence to include active tasks.
5. Add focused regression tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/workspace`, Workspace canvas, audio/video API routes, local intake route, progress center.

## 8. Test Plan

1. Unit/source tests for Workspace artifact ID wiring.
2. API route tests for large artifact response behavior.
3. Unit tests for active progress persistence.

## 9. Observability

- Metrics: artifact byte length and generation duration.
- Logs: existing API error responses.
- Error codes: existing media API validation codes.

## 10. Risks & Rollback

- Risks: In-memory artifacts are process-local and expire on server restart.
- Rollback strategy: Revert artifact ID route/workspace changes to base64-only flow.

## 11. Deliverables

1. Code changes.
2. Tests.
3. Changelog and board updates.

## 12. Changelog Note

- Workspace large video artifacts now stay server-side and active progress tasks persist across reload-style hydration.

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

- Assumptions: Server-side artifact registry can be process-local for this MVP hardening step.
- Blockers: None.
- Verification evidence:
  - Added server-side artifact registry and large-output `artifactId` responses for Workspace video routes.
  - Workspace now passes artifact IDs downstream and to local storage upload when available.
  - Active progress tasks and lightweight artifact checkpoints now persist through reload-style hydration.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/server-artifacts.test.ts`
  - `src/lib/ui/progress-center.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/server-artifacts.test.ts src/lib/ui/progress-center.test.ts src/lib/video-intake/storage-adapters.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-dubbing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (5 files / 36 tests).
  - Build pass; existing ESLint circular-config warning remains.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
