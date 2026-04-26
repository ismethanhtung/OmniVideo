# [P4-WORKSPACE-004] Make Workspace execution graph-flexible with Inspector node config

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

- Task ID: P4-WORKSPACE-004
- Phase: P4
- Target Phase: P4
- Domain: Workspace / Video Pipeline
- Task Type: Feature/Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace runner bị cứng vào 3-node path, trong khi `Upload Video -> Save to Storage` là flow hợp lệ; config cũng đang nằm trên main panel thay vì Inspector.
- Bài toán cần giải quyết: Làm executor linh hoạt theo graph và đưa cấu hình runtime vào node Inspector.
- Tài liệu liên quan: `docs/architecture/node-architecture.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Hỗ trợ executable modes: `upload-to-storage`, `asset-to-social`, `upload-to-social`.
  - Thêm input node `source.asset` cho video đã có trong Storage Library.
  - Thêm seed flows tương ứng.
  - Chuyển runtime config vào Inspector theo node đang chọn.
- Out of scope:
  - Edit/audio node execution.
  - Arbitrary DAG executor cho mọi node type.

## 4. Input / Output

- Input: Workspace graph + config theo node.
- Output mong đợi: Flow hợp lệ chạy theo graph thật, không ép đủ 3 node.

## 5. Acceptance Criteria

1. `Upload Video -> Save to Storage` chạy upload-only.
2. `Storage Asset -> Publish Social` publish từ video có sẵn.
3. `Upload Video -> Save to Storage -> Publish Social` chạy end-to-end.
4. Node config nằm trong Inspector rightbar.
5. Tests/build pass.

## 6. Technical Plan

1. Mở rộng workspace templates với `source.asset`.
2. Mở rộng executable graph planner theo mode.
3. Refactor Workspace UI để Inspector render config theo selected node.
4. Cập nhật tests/docs/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/workspace/workspace-graph.ts`, `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit tests executable modes.
2. Targeted workspace tests.
3. Full tests + build.

## 9. Observability

- Workspace run log vẫn hiển thị stage upload/storage/publish.
- API trace vẫn dùng `job_runs`, `step_runs`, `publish_records`.

## 10. Risks & Rollback

- Risks: Runner vẫn chỉ hỗ trợ các node available, không chạy planned edit/audio nodes.
- Rollback strategy: revert executable mode planner về upload-to-social only.

## 11. Deliverables

1. Flexible executable planner.
2. Inspector node runtime config.
3. Existing asset input node.
4. Tests/evidence.

## 12. Changelog Note

- Make Workspace runner graph-flexible and move runtime config into Inspector.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: `source.asset` dùng asset metadata có sẵn từ `/api/storage/assets`.
- Blockers: none.
- Verification evidence:
  - Planner accepts upload-only, existing-asset publish, and upload-to-social paths.
  - Inspector renders config for `source.file`, `source.asset`, `storage.upload`, and `social.publish`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests: pass (12 tests / 2 files).
  - Build: pass. Existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - Full tests: pass (148 tests / 37 files).
