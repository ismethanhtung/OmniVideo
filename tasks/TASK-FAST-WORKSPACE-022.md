# [FAST-WORKSPACE-022] Add interactive blur/subtitle setup in Flow Setup modal (Video Tools style)

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-022
- Phase: FAST
- Target Phase: Workspace pre-run UX parity
- Domain: Workspace / Flow Setup / Video Edit
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User yêu cầu ở `Pre-run configuration` phải cấu hình được `Blur + subtitle overlay` theo kiểu trực quan như trang `Video Tools Lab`, đặc biệt hỗ trợ kéo chọn vùng blur và chỉnh subtitle trực tiếp.

## 3. Scope

- In scope:
  - Thêm interactive setup block cho node `edit.mask-region` ngay trong `NodeRuntimeConfig` (nên tự xuất hiện trong Flow Setup modal vì modal tái dùng NodeRuntimeConfig).
  - Hỗ trợ preview source asset, kéo vẽ multi blur region, chọn/sửa region, kéo subtitle sample để cập nhật alignment + margins.
  - Đồng bộ thay đổi trực tiếp vào node config hiện có (`blurRegionsJson`, `subtitleAlignment`, `subtitleMargin*`).
- Out of scope:
  - Rebuild toàn bộ Video Tools Lab thành shared package.
  - Thêm persist mới cho subtitle preview placement riêng.

## 4. Acceptance Criteria

1. Trong Flow Setup modal, node `Blur + subtitle overlay` có block interactive để kéo vẽ blur regions trực tiếp trên preview video.
2. User có thể chọn region đã vẽ và chỉnh nhanh tọa độ/kích thước.
3. User có thể kéo subtitle sample trên preview để cập nhật `subtitleAlignment`, `subtitleMarginLeft`, `subtitleMarginRight`, `subtitleMarginBottom`.
4. Thay đổi interactive được ghi vào node config và dùng ngay cho runtime step edit.
5. Test/build/guard pass.

## 5. Technical Plan

1. Tạo helper parse/serialize blur region JSON và utility clamp/ID.
2. Tạo component `WorkspaceMaskInteractiveSetup` dùng trong `NodeRuntimeConfig` cho `edit.mask-region`.
3. Wire component vào flow setup + inspector (vì chung NodeRuntimeConfig).
4. Cập nhật source-level tests.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-022.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - UI interactive mới tăng complexity tại NodeRuntimeConfig.
  - Kéo subtitle sample dùng mapping heuristic zone (top/bottom, left/center/right), có thể chưa 100% giống lab ở mọi edge-case.
- Rollback:
  - Revert component `WorkspaceMaskInteractiveSetup` và wiring liên quan.

## 9. Deliverables

1. Interactive blur/subtitle setup trong Flow Setup modal cho `edit.mask-region`.
2. Tests + task + changelog update.

## 10. Changelog Note

- Workspace Flow Setup now supports interactive blur region drawing and draggable subtitle sample alignment for mask/subtitle node setup, following Video Tools Lab style.

## 11. Task Type Checklist (Stamp [x])

### 11.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 12. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Pending run.
