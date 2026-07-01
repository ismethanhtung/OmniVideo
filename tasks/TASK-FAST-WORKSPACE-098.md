# [FAST-WORKSPACE-098] Make VIP Route Duration Hobby-Safe

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

- Task ID: FAST-WORKSPACE-098
- Phase: FAST
- Target Phase: Workspace remote VIP reliability
- Domain: Workspace / VIP Processing / Vercel
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Vercel Hobby rejects `maxDuration = 800` during build because Hobby serverless functions allow only 1-300 seconds.
- The previous deployed-VIP fix used the Pro/Enterprise duration ceiling, which is invalid for the owner's current deployment plan.

## 3. Scope

- In scope:
  - Change long VIP route `maxDuration` exports to the Hobby-safe ceiling of `300`.
  - Update tests and release metadata.
  - Clarify that Hobby can deploy the route but cannot run a single VIP request beyond 5 minutes.
- Out of scope:
  - Implementing a persistent queue or Vercel Workflow.
  - Moving transcript/translation fully to EC2.
  - Changing the user's Vercel plan.

## 4. Acceptance Criteria

1. Vercel Hobby build no longer fails on invalid `maxDuration` for VIP routes.
2. Route tests assert the Hobby-safe duration value.
3. Changelog, board, version, and verification evidence are updated.

## 5. Technical Plan

1. Replace `maxDuration = 800` with `maxDuration = 300` on VIP routes.
2. Update route tests from `800` to `300`.
3. Bump patch version and update changelog/task evidence.
4. Run focused tests, version guard, build, and diff check.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - focused route tests

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
2. Release checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- The app still surfaces upload progress and live checkpoints from FAST-WORKSPACE-097.

## 9. Risks & Rollback

- Risks: `300` allows Hobby deployment but does not make VIP jobs longer than 5 minutes viable as one serverless request.
- Rollback strategy: revert this task's route duration, tests, changelog, task, board, and version updates.

## 10. Deliverables

1. Hobby-safe VIP route duration exports.
2. Updated tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Use Hobby-safe Vercel max duration for VIP routes.

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
  - Vercel Hobby accepts a maximum function duration of `300` seconds, while `800` is the Pro/Enterprise maximum.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused route tests pass (2 files / 35 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - Hobby deployment is now valid, but VIP jobs that exceed 300 seconds still need Pro/Enterprise, Vercel Workflows, or a worker-owned backend path.
