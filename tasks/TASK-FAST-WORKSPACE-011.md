# [FAST-WORKSPACE-011] Move Flow Seed Controls into Inspector with Extensible Seed Registry

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

- Task ID: FAST-WORKSPACE-011
- Phase: FAST
- Target Phase: Workspace UX hardening
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Flow seed `Seed VI Voice Mask Publish` đang đặt ở header, chưa tập trung trong Inspector và khó mở rộng khi có thêm nhiều seed.
- Bài toán cần giải quyết: đưa seed controls vào Inspector và chuẩn hóa seed thành registry để thêm seed mới dễ dàng.
- Tài liệu liên quan:
  - `docs/domains/video-pipeline.md`
  - `docs/governance/ai-agent-rules.md`

## 3. Scope

- In scope:
  - Di chuyển hành vi seed flow từ header vào Inspector panel.
  - Tạo seed registry dùng chung cho Workspace.
  - Bổ sung test cho seed registry.
- Out of scope:
  - Thêm seed flow mới ngoài `VI Voice Mask Publish`.
  - Thay đổi planner/executor runtime flow.

## 4. Input / Output

- Input: Workspace canvas panel hiện tại có seed button hard-code ở header.
- Output mong đợi: Inspector có mục Flow Seeds, seed được quản lý qua registry để mở rộng.

## 5. Acceptance Criteria

1. `Seed VI Voice Mask Publish` hiển thị trong Inspector thay vì header.
2. Seed definitions được quản lý bằng một registry riêng để hỗ trợ thêm nhiều seed sau này.
3. Bấm seed trong Inspector vẫn reset graph + run-state như hành vi cũ.
4. Có test đảm bảo registry seed hợp lệ.

## 6. Technical Plan

1. Tạo `src/lib/workspace/workspace-seeds.ts` chứa `WORKSPACE_SEED_TEMPLATES`.
2. Refactor `workspace-canvas-panel.tsx` để dùng `onApplySeed(seed)` và render `Flow Seeds` trong Inspector.
3. Thêm test `workspace-seeds.test.ts`.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/workspace-seeds.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`

## 8. Test Plan

1. Chạy `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`.
2. Verify seed registry có entry `vi-voice-mask-publish`.
3. Verify graph từ seed builder có nodes > 0.

## 9. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Nếu wiring callback sai có thể khiến seed không apply được từ Inspector.
- Rollback strategy: Revert về nút seed header cũ và bỏ registry mới.

## 11. Deliverables

1. Seed registry file cho Workspace.
2. Inspector hiển thị seed controls.
3. Test coverage cho registry seed.

## 12. Changelog Note

- Move `Seed VI Voice Mask Publish` into Inspector and introduce extensible workspace seed registry.

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
  - Inspector là nơi phù hợp để gom các thao tác shaping flow như seeds.
- Blockers:
  - Không có.
- Verification evidence:
  - Seed button ở header đã được loại bỏ.
  - Inspector khi chưa chọn node có thêm section `Flow Seeds`.
  - `WORKSPACE_SEED_TEMPLATES` đang quản lý seed hiện tại và callback apply hoạt động qua `onApplySeed`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-seeds.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`
- Test results summary:
  - Pass (2 files / 34 tests).
