# FAST-ACCESS-001 Public demo access guard and AI rate limits

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-ACCESS-001
- Phase: P2
- Target Phase: P2
- Domain: Access Control / Operations
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: Dự án single-user cần public demo mode để người ngoài xem UI và thử một số tính năng an toàn, nhưng không được ghi DB hoặc đốt token/provider không kiểm soát.
- Bài toán cần giải quyết: thêm server-side access guard cho public-demo, owner override để chủ dự án dùng bình thường, và rate limit cho API demo AI/stateless được phép.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`, `docs/architecture/nextjs-mongodb-conventions.md`, `docs/operations/observability.md`.

## 3. Scope

- In scope: app mode config, owner token cookie/header, API guard helpers, write/API provider allow/block policy, rate limit helper, UI read-only hints/disable controls for topbar and Inspiration Vault, tests/docs/changelog.
- Out of scope: full user auth, OAuth login, persistent distributed rate limit store, per-user billing/account system, complete UI polish across every panel.

## 4. Input / Output

- Input: `OMNIVIDEO_APP_MODE`, optional `OMNIVIDEO_OWNER_TOKEN`, public visitor requests, owner token requests.
- Output mong đợi: public visitors are read-only for DB mutations and rate-limited for allowed demo AI/stateless APIs; owner can bypass restrictions.

## 5. Acceptance Criteria

1. Default `owner` mode preserves existing behavior without requiring a token.
2. In `public-demo` mode, DB-writing APIs return `403 DEMO_WRITE_DISABLED` unless owner token is valid.
3. In `public-demo` mode, allowed demo AI/stateless APIs can run but are rate-limited per client IP/feature.
4. Owner requests in `public-demo` can bypass demo write/rate restrictions using cookie or `x-omnivideo-owner-token`.
5. UI can detect public-demo/owner state and disable obvious mutation controls for Inspiration Vault/topbar capture.
6. Tests cover mode detection, owner token handling, mutation block, allowed rate limit, and owner bypass.

## 6. Technical Plan

1. Add access config/helper module for app mode, owner detection, guard responses, and in-memory fixed-window rate limit.
2. Add `/api/app/access` for UI access state and owner cookie login/logout.
3. Apply guards to write APIs and demo-allowed AI/stateless APIs.
4. Add UI access provider hook and wire topbar/Inspiration Vault read-only state.
5. Update docs/changelog/task evidence and run targeted tests/build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: API routes under `src/app/api`, layout/topbar/Inspiration Vault UI, new `src/lib/access-control` module.

## 8. Test Plan

1. Unit/API cần chạy: `src/lib/access-control/*.test.ts`, `src/app/api/app/access/route.test.ts`, representative guarded route tests.
2. Failure cases cần thử: public write blocked, invalid owner token, demo rate limit exceeded.
3. Kết quả mong đợi: tests pass; build pass with no new warnings in scope.

## 9. Observability

- Metrics: In-memory counters expose no external metrics in this fast task.
- Logs: API error responses include stable error codes.
- Error codes: `DEMO_WRITE_DISABLED`, `DEMO_RATE_LIMITED`, `VAL_OWNER_TOKEN_INVALID`.

## 10. Risks & Rollback

- Risks: In-memory rate limit resets per server instance and is not globally distributed; acceptable MVP but not final for high-traffic deployment.
- Rollback strategy: set `OMNIVIDEO_APP_MODE=owner` to disable public-demo restrictions, or revert guard imports.

## 11. Deliverables

1. Public demo access policy implementation.
2. Owner bypass mechanism.
3. Tests and docs with setup instructions.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add public-demo mode with server-side write guards, owner bypass, and rate-limited demo AI/stateless APIs.

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

- Assumptions: Public deployment runs a single Next.js runtime or accepts best-effort in-memory rate limits for MVP; owner token is set out-of-band through env and not exposed to public visitors.
- Blockers: None.
- Verification evidence: `npm test` pass; `npm run build` pass with existing Turbopack warning outside scope.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/access-control/access-control.test.ts`, `src/app/api/app/access/route.test.ts`, `src/app/api/inspiration-vault/route.test.ts`, `src/app/api/audio/voice-generation/route.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/access-control/access-control.test.ts src/app/api/app/access/route.test.ts src/app/api/inspiration-vault/route.test.ts src/app/api/audio/voice-generation/route.test.ts`; `npm test`; `npm run build`.
- Test results summary: Targeted tests pass (4 files / 13 tests). Full test suite pass (81 files / 360 tests). Build pass; existing Turbopack NFT warning remains outside scope in `src/app/api/video-processing/edit/route.ts` import trace.
