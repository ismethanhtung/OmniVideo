# [P4-WORKSPACE-001] Workspace Canvas MVP for extensible node-flow pipelines

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

- Task ID: P4-WORKSPACE-001
- Phase: P4
- Target Phase: P4
- Domain: Workspace / Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Khi reload app mặc định đang mở `profile`, nhưng section này không có trong navigation registry nên hiện `Unknown section`.
- Bài toán cần giải quyết: Biến vùng này thành Workspace thật để bắt đầu dựng node-flow pipeline theo hướng extensible, chưa chạy video edit thật.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/architecture/node-architecture.md`, `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Register section `workspace` làm default app section.
  - Thêm domain module cho workspace node templates, graph draft, helper thao tác graph và local draft parsing.
  - Thêm UI Workspace Canvas gồm catalog, canvas, edge wiring cơ bản, inspector và sample Douyin rework flow.
  - Persist draft vào `localStorage`.
  - Thêm unit/regression tests cho graph helpers và navigation default.
- Out of scope:
  - Chạy pipeline thật từ workspace graph.
  - Lưu graph vào MongoDB `pipeline_definitions`.
  - Implement ffmpeg/AI/audio/social runner cho các planned nodes.

## 4. Input / Output

- Input: Yêu cầu Workspace Canvas MVP đã được chốt trong proposed plan.
- Output mong đợi: Reload app vào Workspace thay vì Unknown section; user có thể thêm/chọn/kết nối node và xem contract/config preview.

## 5. Acceptance Criteria

1. Reload app mặc định hiển thị Workspace page, không còn `Unknown section`.
2. Leftbar có Workspace nav item và content router render `WorkspaceCanvasPanel`.
3. Workspace có node catalog theo nhóm input/processing/output với trạng thái `available/planned`.
4. User có thể thêm node, chọn node, tạo edge cơ bản, clear draft và seed sample Douyin rework flow.
5. Inspector hiển thị contract, ports, config schema summary, retry/timeout/idempotency/observability và traceability notes.
6. Draft được serialize/deserialize an toàn qua `localStorage`; malformed draft fallback về empty graph.
7. Có tests cho graph helpers và navigation regression.
8. `npm run test` và `npm run build` pass hoặc có evidence rõ nếu bị lỗi ngoài scope.

## 6. Technical Plan

1. Tạo `src/lib/workspace/workspace-graph.ts` với types, catalog, graph helpers, sample graph, draft parser/serializer và validator.
2. Tạo `src/features/workspace/workspace-canvas-panel.tsx` dùng catalog/canvas/inspector và localStorage draft persistence.
3. Cập nhật navigation/types/content router để đăng ký `workspace` làm default section.
4. Thêm tests cho workspace graph và navigation default.
5. Cập nhật task/board/changelog và chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/*`, `src/features/workspace/*`, `src/lib/workspace/*`

## 8. Test Plan

1. Unit: workspace graph helper add/connect/validate/sample draft.
2. Unit: draft parser fallback khi malformed localStorage JSON.
3. Regression: `DEFAULT_SECTION_ID` resolve được qua `getNavItem`, `workspace` nav item tồn tại.
4. Full verification: `npm run test`, `npm run build`.

## 9. Observability

- Metrics: N/A cho canvas-only MVP.
- Logs: Không thêm runtime logs vì chưa có runner.
- Error codes: N/A; UI dùng validation message nội bộ cho graph draft.

## 10. Risks & Rollback

- Risks: Canvas chưa phải drag/drop thật; user có thể kỳ vọng runner thật nhưng milestone này chỉ là foundation.
- Rollback strategy: revert section mapping về placeholder hoặc ẩn `workspace` item nếu UI phát sinh regression.

## 11. Deliverables

1. Workspace default section.
2. Workspace node catalog + graph draft domain module.
3. Workspace Canvas panel với catalog/canvas/inspector/sample flow.
4. Tests + verification evidence.
5. Changelog + board updates.

## 12. Changelog Note

- Add Workspace Canvas MVP with extensible node templates, local draft graph editing, and default workspace route.

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

- Assumptions:
  - Canvas MVP chưa chạy video processing thật.
  - Draft persistence dùng browser-local `localStorage` trước khi có Mongo persistence.
  - Node processing nâng cao giữ trạng thái `planned` để UI không gây hiểu nhầm.
- Blockers: none.
- Verification evidence:
  - Reload default now resolves `workspace` via navigation registry.
  - Workspace panel supports catalog add, node select, basic edge linking, delete, clear, reset, sample Douyin flow, inspector contract view, and localStorage draft persistence.
  - Planned processing/social nodes are marked `planned`; available intake/storage-adjacent nodes are marked `available`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (7 tests / 2 files).
  - Full tests: pass (143 tests / 37 files).
  - Build: pass. Existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
