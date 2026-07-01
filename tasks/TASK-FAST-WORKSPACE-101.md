# [FAST-WORKSPACE-101] Explain HTTPS Requirement for Direct EC2 Uploads

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

- Task ID: FAST-WORKSPACE-101
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

- Owner reports direct EC2 source upload now starts with `Remote worker endpoint source: Server modal`, then fails immediately with `Direct EC2 source upload failed with a network error`.
- Server modal status still works against `http://43.198.105.63:8787` because status checks are proxied server-side through Vercel.
- Browser direct upload from an HTTPS Vercel page to an HTTP EC2 endpoint is blocked by browser mixed-content rules before the worker receives a request.

## 3. Scope

- In scope:
  - Detect HTTPS app + HTTP worker URL before direct EC2 upload starts.
  - Replace generic XHR network error with a precise mixed-content/HTTPS worker requirement message.
  - Add regression coverage and release metadata.
- Out of scope:
  - Provisioning TLS/domain on EC2.
  - S3/R2 staged upload architecture.
  - Falling back silently to slow Vercel upload.

## 4. Acceptance Criteria

1. When the app is served over HTTPS and the remote worker URL is HTTP, direct EC2 upload fails with a clear message explaining browser mixed-content blocking.
2. HTTP worker URLs still remain usable for localhost/non-HTTPS app runs.
3. The message tells the owner to use an HTTPS worker endpoint or tunnel for direct EC2 upload.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add a direct-upload transport validation helper near the direct EC2 upload code.
2. Call the helper before chunk upload and reuse it for XHR network errors.
3. Add source regression assertions and release metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - focused tests

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
2. Release checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress failure detail should name mixed content instead of a generic network error.

## 9. Risks & Rollback

- Risks: Direct upload will fail fast on deployed HTTPS pages until the worker URL is changed to HTTPS.
- Rollback strategy: revert this task's transport validation helper, test assertions, changelog, board, and version bump.

## 10. Deliverables

1. Clear direct-upload HTTPS requirement error.
2. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Explain HTTPS worker requirement when deployed direct EC2 source uploads are blocked by browser mixed-content rules.

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
  - Direct EC2 upload uses browser XHR.
  - Vercel serves the app over HTTPS.
  - The configured EC2 worker URL is HTTP, so browsers block the request as mixed content before EC2 receives it.
- Fix:
  - Direct EC2 upload now checks the app protocol and worker URL before chunk upload.
  - HTTPS app + HTTP worker URL fails with a specific mixed-content message that points to an HTTPS worker URL requirement.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (1 file / 25 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
