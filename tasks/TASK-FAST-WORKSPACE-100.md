# [FAST-WORKSPACE-100] Hydrate Remote VIP Browser Config from Server Env

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-100
- Phase: FAST
- Target Phase: Workspace remote VIP reliability
- Domain: Workspace / Remote VIP Worker / Video Pipeline
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports deployed Workspace VIP still uploads the source video to Vercel slowly after direct EC2 staging was added.
- The Background Progress log says the remote worker endpoint is not set in the node or Server modal and only server env fallback may be used.
- Browser-side direct EC2 staging cannot run from a server-only env fallback unless the browser can resolve the EC2 endpoint and worker token before upload.

## 3. Scope

- In scope:
  - Add an owner-safe API route that exposes the configured remote VIP worker endpoint/token from server env to the browser runtime.
  - Hydrate Workspace remote VIP runtime config from that API when node/Server modal config is absent.
  - Ensure direct EC2 source staging uses the hydrated env config before falling back to Vercel upload.
  - Add regression tests and release metadata.
- Out of scope:
  - Changing EC2 worker deployment or network security groups.
  - Direct EC2 staging for vocals-only mode.
  - Replacing Vercel with a queue/orchestrator service.

## 4. Acceptance Criteria

1. If node and Server modal remote worker config are empty but server env has `OMNIVIDEO_REMOTE_VIP_WORKER_URL`, the browser resolves it before VIP source upload starts.
2. Remote `remote-voice-render` VIP browser-file runs can direct-upload to EC2 using the hydrated env endpoint/token.
3. Public demo visitors cannot read server env worker config.
4. Regression tests cover env config exposure and Workspace direct-upload gating.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add a remote VIP browser-config API route backed by server env and guarded for owner/public-demo access.
2. Add a Workspace helper to fetch and normalize the server env browser config.
3. Hydrate `remoteVipWorkerConfig` before logging and direct-upload gating, then set the lightweight Vercel form fields.
4. Add route/source regression tests and release metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/app/api/audio/remote-vip-worker/browser-config/route.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - focused tests

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/app/api/audio/remote-vip-worker/browser-config/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Release checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress should report `Remote worker endpoint source: env.` when the deployed browser hydrates endpoint/token from server env.
- Direct path should report `Uploading source video directly to EC2` instead of `Uploading source video to Vercel`.

## 9. Risks & Rollback

- Risks: In owner mode, the worker token becomes available to the browser for direct upload, matching the existing Server modal behavior.
- Rollback strategy: revert this task's browser-config API, Workspace hydration call, tests, changelog, board, and version bump.

## 10. Deliverables

1. Server-env-to-browser remote VIP config hydration.
2. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Hydrate remote VIP browser config from server env so deployed direct EC2 uploads can run without manually filling the Server modal.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 12.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 12.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể

## 13. Execution Notes

- Root cause:
  - Direct EC2 staging was gated by a browser-visible endpoint.
  - On Vercel, the worker URL/token can be present only as server env, so the browser fell back to uploading the source to Vercel even though the server could later use the env fallback.
- Fix:
  - Workspace still uses node config first and Server modal browser config second.
  - If neither is available, Workspace hydrates the server env endpoint/token through an owner-guarded browser-config route before deciding whether to direct-upload to EC2.
  - Progress text now distinguishes `Server modal` from `env`.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/remote-vip-worker/browser-config/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/remote-vip-worker/browser-config/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (2 files / 28 tests).
  - Build pass.
  - Version guard pass after changelog update.
  - Diff check pass.
