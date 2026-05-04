# FAST-OPS-003 Fix Vercel Runtime ERR_REQUIRE_ESM

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

- Task ID: FAST-OPS-003
- Phase: P2
- Target Phase: P2
- Domain: Operations
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Vercel production trả `500` cho toàn bộ app/api với lỗi `ERR_REQUIRE_ESM`.
- Root cause: runtime launcher `require()` server bundle `.js` trong khi project khai báo `"type": "module"` khiến bundle bị xử lý như ESM.

## 3. Scope

- In scope: sửa package runtime mode để Vercel launcher nạp được app/server routes.
- Out of scope: refactor module system toàn repo.

## 4. Acceptance Criteria

1. Không còn `"type": "module"` trong `package.json`.
2. `npm run build` pass.
3. `npm test` pass.

## 5. Test Evidence

- Test commands executed: `npm test`; `npm run build`.
- Test results summary: pass.
