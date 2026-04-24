# [SETUP-ARCH-001] Chuẩn hóa Architecture Docs (Next.js + MongoDB)

## 1. Metadata

- Task ID: SETUP-ARCH-001
- Phase: Setup
- Target Phase: Setup
- Domain: Architecture
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Cần nền kiến trúc rõ ràng trước khi code business logic.
- Bài toán cần giải quyết: Viết system overview, node architecture, data model và integration boundaries.
- Tài liệu liên quan: docs/architecture/*, docs/domains/*.

## 3. Scope

- In scope: Tài liệu kiến trúc và dữ liệu.
- Out of scope: Implement code runtime cụ thể.

## 4. Input / Output

- Input: Yêu cầu workspace node-based và quản lý metadata đầy đủ.
- Output mong đợi: Kiến trúc có thể dùng làm blueprint thi công phase 1 trở đi.

## 5. Acceptance Criteria

1. Có system overview theo layer rõ ràng.
2. Có node contract chuẩn cho pipeline mở rộng.
3. Có data model MongoDB với collection/index/rules cốt lõi.
4. Có integration boundaries cho provider/storage/social.

## 6. Technical Plan

1. Viết kiến trúc tổng quan theo runtime components.
2. Viết node architecture và execution semantics.
3. Viết data model metadata-first.
4. Viết chuẩn adapter boundary.

## 7. Test Plan

1. Kiểm tra consistency giữa architecture docs và domain docs.
2. Kiểm tra data model bao phủ requirements MVP.
3. Kiểm tra không có thiết kế hard-coded provider.

## 8. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 9. Risks & Rollback

- Risks: Over-design vượt quá nhu cầu phase setup.
- Rollback strategy: Giữ tài liệu ở mức implementation-ready cho MVP.

## 10. Deliverables

1. Bộ file architecture docs.
2. Các domain docs làm rõ từng mảng.

## 11. Changelog Note

- Added: Architecture and domain specifications for Next.js + MongoDB.

## 12. Execution Notes

- Assumptions: triển khai service tách web/orchestrator/worker theo tiến độ.
- Blockers: Không.
- Verification evidence: File architecture/domain đã tạo.
