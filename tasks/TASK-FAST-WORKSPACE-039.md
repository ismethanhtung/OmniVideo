# [FAST-WORKSPACE-039] Add Local Download Output Node for Workspace

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-039
- Phase: MVP runtime hardening
- Target Phase: Workspace output local fallback
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User cần một output node trong Workspace để tải video về máy local ngay trong flow.
- Bài toán cần giải quyết: Workspace hiện có output `Save to Storage` và `Publish Social`, chưa có output chuyên cho tải local.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Thêm output node mới `Download Local` trong catalog Workspace.
  - Planner hỗ trợ step `download-local` với upstream từ `Storage Asset` hoặc `Save to Storage`.
  - Runtime thực thi tải qua `/api/storage/assets/:id/download`.
  - Cho user chọn `Browser Downloads folder` (mặc định) hoặc `Choose folder on every run`.
  - Thêm regression tests cho graph + panel source assertions.
- Out of scope:
  - Lưu cố định quyền thư mục local giữa các lần chạy.
  - Download trực tiếp từ server-side artifact chưa persist thành storage asset.

## 4. Input / Output

- Input: Workspace flow có `Storage Asset`/`Save to Storage` nối vào `Download Local`.
- Output mong đợi: Khi chạy flow, file video được tải về máy local (mặc định qua browser Download hoặc prompt chọn nơi lưu).

## 5. Acceptance Criteria

1. Workspace node catalog có `Download Local` thuộc nhóm output.
2. Node có runtime config `Save mode` gồm 2 mode: `Browser Downloads folder` và `Choose folder on every run`.
3. Planner tạo được step `download-local` và validate upstream producer hợp lệ.
4. Runtime download sử dụng endpoint `/api/storage/assets/${assetId}/download`.
5. Focused tests và version guard pass.

## 6. Technical Plan

1. Mở rộng `workspace-graph.ts` với template node + step type `download-local`.
2. Thêm planning logic cho download step từ producer asset.
3. Thêm runtime execution branch + local-save helper ở `workspace-canvas-panel.tsx`.
4. Thêm/điều chỉnh tests cho graph và panel.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/workspace/workspace-graph.ts`, `src/lib/workspace/workspace-flow-setup.ts`, `src/features/workspace/workspace-canvas-panel.tsx`, tests tương ứng.

## 8. Test Plan

1. `workspace-graph.test.ts`: template + planning cho `download-local`.
2. `workspace-canvas-panel.test.ts`: source assertions cho config/execution branch.
3. `workspace-flow-setup.test.ts`: regression compile/behavior trên step mapping.
4. Chạy `npm run guard:version`.

## 9. Observability

- Metrics: giữ nguyên progress center theo step status.
- Logs: dùng status detail hiện có cho step `download-local`.
- Error codes: dùng error handling hiện có từ fetch wrapper + runtime errors.

## 10. Risks & Rollback

- Risks: `showSaveFilePicker` không hỗ trợ trên một số browser; fallback về browser download mặc định.
- Rollback strategy: remove node `output.download-local` + step handling `download-local`.

## 11. Deliverables

1. Output node `Download Local`.
2. Runtime save mode selector + local download execution.
3. Regression tests, changelog, version bump.

## 12. Changelog Note

- Add `Download Local` output node in Workspace to save output videos directly to local machine with browser-download or choose-folder mode.

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

## 14. Execution Notes

- Assumptions: Browser-managed download là đủ cho nhu cầu tải về thư mục Downloads mặc định; mode chọn folder dùng picker khi môi trường hỗ trợ.
- Blockers: None.
- Implementation notes:
  - Added node template `output.download-local`.
  - Added planner step `download-local`.
  - Added runtime helper `saveWorkspaceFileToLocal` with `showSaveFilePicker` path + fallback link download.
- Residual risk: Folder picker availability phụ thuộc browser engine/permission policy.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-flow-setup.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused workspace suite pass (3 files / 75 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
