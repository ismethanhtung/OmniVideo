# [P1-DB-001] Thiết lập MongoDB foundation + DB health API

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [ ] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P1-DB-001
- Phase: Phase 1
- Target Phase: Phase 1
- Domain: Backend
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Cần kết nối MongoDB thật để có nền tảng dữ liệu cho các bước tiếp theo.
- Bài toán cần giải quyết: Tạo DB singleton, env validation và endpoint health check để kiểm tra kết nối.
- Tài liệu liên quan: docs/architecture/nextjs-mongodb-conventions.md, docs/operations/connection-management.md.

## 3. Scope

- In scope: Cài mongodb dependency, tạo `src/lib/db`, tạo `GET /api/health/db`, nối action cơ bản từ leftbar.
- Out of scope: CRUD domain collections và pipeline business logic.

## 4. Input / Output

- Input: `MONGODB_URI`, `MONGODB_DB_NAME` đã cấu hình.
- Output mong đợi: API health kiểm tra DB chạy được và trả trạng thái rõ ràng.

## 5. Acceptance Criteria

1. Có DB client singleton theo chuẩn Next.js.
2. Có env parsing/validation cho MongoDB vars.
3. Có API `/api/health/db` trả trạng thái, latency, error (nếu có).
4. Có luồng trigger từ UI cho mục `Connection Test`.
5. Build + lint pass.

## 6. Technical Plan

1. Cài dependency `mongodb`.
2. Tạo `src/lib/config/env.ts` và `src/lib/db/mongodb.ts`.
3. Tạo route handler `src/app/api/health/db/route.ts`.
4. Cập nhật leftbar để trigger health check cho item `connectionTest`.
5. Chạy lint/build và cập nhật task/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: package deps, app API route, lib config/db, leftbar UI behavior.

## 8. Test Plan

1. Verify compile/build pass.
2. Verify `/api/health/db` trả JSON hợp lệ.
3. Verify click `Connection Test` gọi endpoint.

## 9. Observability

- Metrics: latencyMs trong health response.
- Logs: N/A (initial)
- Error codes: DB_HEALTH_FAILED.

## 10. Risks & Rollback

- Risks: URI không hợp lệ hoặc DB mạng lỗi.
- Rollback strategy: giữ API health trả trạng thái degraded/error an toàn.

## 11. Deliverables

1. DB foundation files.
2. Health API route.
3. Leftbar integration cho connection test.

## 12. Changelog Note

- Added: MongoDB foundation and DB health check API.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

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

- Assumptions: Tập trung vào DB connectivity baseline trước.
- Blockers: Không.
- Verification evidence: DB health API build thành công và ping MongoDB từ env xác nhận reachable.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: N/A (owner requested tạm thời không ưu tiên test cho phần này)
- Test commands executed: `npm run lint`, `npm run build`, MongoDB ping smoke command
- Test results summary: lint pass, build pass, MongoDB ping thành công (`ok: true`).
