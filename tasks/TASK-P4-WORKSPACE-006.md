# P4-WORKSPACE-006 Free-form Workspace flow execution with per-node runtime config

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

- Task ID: P4-WORKSPACE-006
- Phase: P4
- Target Phase: P4
- Domain: Workspace
- Task Type: Refactor
- Priority: P1
- Size: L
- Owner: Cascade
- Reviewer: thanhtung
- Status: Done

## 2. Context

- Lý do: Workspace canvas chỉ chạy được 3 flow cứng (`upload-to-storage`, `asset-to-social`, `upload-to-social`) do `getWorkspaceExecutableUploadToSocialPlan` dùng `nodes.find(...)` cho mỗi template (giả định 1 instance/loại) và runtime state ở component là single-slot. Người vận hành không thể fan-out 1 storage tới nhiều Publish Social khác platform, hoặc dùng nhiều `source.asset` song song.
- Bài toán cần giải quyết: chuyển executor sang generic graph planner, mỗi node mang runtime config riêng, hỗ trợ topology bất kỳ miễn đúng logic cấu trúc node.
- Tài liệu liên quan: `docs/architecture/node-architecture.md`, `docs/domains/video-pipeline.md`.

## 3. Scope

- In scope:
    - Generic `planWorkspaceFlow(graph)` với topo-sort + cycle detection.
    - Per-node runtime config (storageAccountId, socialAccountId, publishType, privacy, fbPageId, caption, title, tags, assetId, publishMode).
    - File picker map ngoài graph theo nodeId (File không serializable).
    - Inspector form đọc/ghi `node.config`.
    - Generic executor chạy `plan.steps` theo thứ tự, status hiển thị per-node.
    - Backward-compat shim cho 3 sample seed flows.
- Out of scope:
    - Backend pipeline runner mới (vẫn dùng `/api/video-intake/local-runs` + `/api/social/publish-records`).
    - Multi-storage fan-out cho 1 source.file (giới hạn API hiện tại).
    - Persist runtime config bí mật ở MongoDB (chỉ giữ trong localStorage draft).

## 4. Input / Output

- Input: graph hiện tại trong workspace draft (nodes + edges + per-node config).
- Output: chạy được mọi topology hợp lệ; ví dụ Upload→Storage→[YT publish, FB publish] phát hai publish records riêng biệt với config riêng.

## 5. Acceptance Criteria

1. `planWorkspaceFlow` trả về `ok=true` cho topology Upload→Storage→[Publish A, Publish B] (2 publishes fan-out) và sinh đúng 3 steps.
2. Khi chạy flow trên, mỗi Publish Social node dùng `socialAccountId` + `publishType` riêng từ `node.config`.
3. Source.file thiếu downstream `storage.upload` → planner báo lỗi rõ ràng và executor không chạy.
4. Cycle trong graph → planner trả `ok=false` với error chứa "cycle".
5. Multi `source.asset`→multi `social.publish` chạy song song độc lập, lỗi 1 publish không ngăn các publish khác.
6. Inspector lưu config vào `node.config` và persist qua localStorage draft.
7. Existing 3 seed sample graphs vẫn chạy không hồi quy.

## 6. Technical Plan

1. Thêm `planWorkspaceFlow`, `WorkspaceFlowPlan`, `WorkspaceFlowStep` trong `workspace-graph.ts`.
2. Thêm `updateWorkspaceNodeConfig` helper.
3. Refactor `getWorkspaceExecutableUploadToSocialPlan` thành adapter trên planner (giữ legacy tests pass).
4. Refactor `WorkspaceCanvasPanel`: state global runtime → per-node config + `runtimeFilesByNodeId` map; `runWorkspaceFlow` lặp `plan.steps`; `runStatusByNodeId` thay 3 step cứng.
5. Cập nhật Inspector form để mutate node.config.
6. Viết test mới cho fan-out, cycle, multi-asset, missing-storage.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
    - `src/lib/workspace/workspace-graph.ts`
    - `src/lib/workspace/workspace-graph.test.ts`
    - `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/workspace/workspace-graph.test.ts`; full `npm run test`; `npm run build`.
2. Failure cases cần thử: cycle, source.file không có storage, source.file→nhiều storage, publish không có upstream producer.
3. Kết quả mong đợi: planner phân loại đúng + run executor end-to-end pass smoke trên 3 seed flows + 1 fan-out flow.

## 9. Observability

- Metrics: per-node run status hiển thị trên canvas + Progress Center entries cho từng publish.
- Logs: console errors khi step fail kèm nodeId.
- Error codes: tận dụng error code từ `/api/video-intake/local-runs` và `/api/social/publish-records`.

## 10. Risks & Rollback

- Risks: refactor lớn ảnh hưởng UX hiện tại; runtime config trong localStorage draft có thể chứa accountIds cũ không tồn tại.
- Rollback: revert commit; backward-compat adapter `getWorkspaceExecutableUploadToSocialPlan` giữ contract cho test cũ.

## 11. Deliverables

1. `planWorkspaceFlow` + helper code.
2. Refactored panel UI.
3. Test cases mới + cập nhật test cũ.
4. Changelog entry.

## 12. Changelog Note

- Workspace giờ chạy được mọi node-graph hợp lệ (không còn giới hạn 3 flow seed); per-node runtime config; fan-out 1 storage → nhiều Publish Social khác platform.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Refactor (mapped to Bugfix slot)

- [x] Có mô tả root cause cũ
- [x] Có thiết kế thay thế
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: backend `/api/video-intake/local-runs` vẫn ghép upload+save trong 1 call; `/api/social/publish-records` chấp nhận N publish records song song.
- Blockers: none.
- Verification evidence: thấy ở mục 15.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
    - `src/lib/workspace/workspace-graph.test.ts` (5 test mới: fan-out, multi-asset, missing storage downstream, orphan publish, cycle, plus updateWorkspaceNodeConfig).
    - `src/lib/workspace/workspace-graph.ts` (planner + adapter).
    - `src/features/workspace/workspace-canvas-panel.tsx` (per-node config + generic executor).
- Test commands executed:
    - `npx vitest run src/lib/workspace/workspace-graph.test.ts` → 16 tests pass.
    - `npm run test` → 154 tests / 37 files pass.
    - `npm run build` → pass (warning duy nhất `display-preferences-panel.tsx` `Image` unused, đã có từ trước).
- Test results summary: planner đúng cho mọi topology cần thiết; UI build sạch; legacy 3 sample seed graphs vẫn chạy được.
