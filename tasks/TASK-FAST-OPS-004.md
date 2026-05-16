# [FAST-OPS-004] Upgrade Background Progress to step-aware real runtime telemetry

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

- Task ID: FAST-OPS-004
- Phase: FAST
- Target Phase: Runtime observability UX
- Domain: Operations / Workspace / Progress Center
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User report: `Background Progress` hiện chỉ hiện một dòng `Workspace flow`, không đủ để quản lý flow nhiều bước.
- User yêu cầu progress có giá trị thật: step-level visibility, thời gian từng bước, trạng thái cụ thể, và dùng phần trăm thực khi có thể đo được như download/processing.

## 3. Scope

- In scope:
  - Nâng model progress center từ task phẳng sang task có step timeline.
  - Hiển thị step status, started/finished time, elapsed duration và thông điệp hành động đang chạy.
  - Dùng progress thật cho các operation có thể đo ngay ở client/browser như file download có `content-length`.
  - Thiết kế hook/contract để runtime backend có thể đẩy progress thật cho các bước media processing đo được.
  - Tích hợp trước cho Workspace flow.
- Out of scope:
  - Xây full distributed queue/worker telemetry platform.
  - Cam kết % thật cho những bước provider/AI không expose progress.

## 4. Acceptance Criteria

1. `Background Progress` hiển thị được toàn bộ step trong một Workspace flow, không chỉ một dòng tổng.
2. Mỗi step có status, mô tả hành động, thời gian bắt đầu/kết thúc và duration.
3. Download step có thể hiển thị % thật dựa trên bytes đã nhận khi response có `content-length`.
4. Các step không đo được progress thật phải thể hiện rõ trạng thái/elapsed time thay vì giả lập %.
5. Kiến trúc mới cho phép bổ sung progress thật cho media processing mà không phải redesign UI lần nữa.
6. Test/build/guard pass.

## 5. Technical Plan

1. Mở rộng `progress-center` model để hỗ trợ child steps, timing, progress mode và status detail.
2. Nâng `Background Progress` modal thành task summary + expandable step timeline.
3. Instrument Workspace runner để tạo/update từng step thay vì chỉ cộng phần trăm theo số step.
4. Thêm streamed download helper để đo bytes nhận thực tế trong Workspace.
5. Tách rõ progress `determinate` và `indeterminate`, đồng thời chuẩn bị contract cho backend media processing progress.
6. Cập nhật tests + docs/changelog sau khi implementation hoàn tất.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module dự kiến impacted:
  - `src/lib/ui/progress-center.ts`
  - `src/components/layout/topbar.tsx`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/components/layout/topbar.test.ts`
  - `src/lib/ui/progress-center.test.ts`
  - `docs/operations/observability.md`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `tasks/TASK-FAST-OPS-004.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. Unit tests cho progress center step lifecycle + progress mode.
2. Regression/source tests cho Workspace step instrumentation.
3. UI/source assertions cho modal step timeline.
4. `npm run test -- --run <impacted tests>`
5. `npm run build`
6. `npm run guard:version`

## 8. Observability

- Ghi rõ step action/status thay vì chỉ summary flow.
- Hiển thị elapsed duration cho tất cả step.
- Phân biệt progress đo thật và progress không xác định.

## 9. Risks & Rollback

- Risks:
  - Progress thật cho ffmpeg/provider jobs cần backend contract mới; nếu làm quá sâu ngay có thể lan rộng scope.
  - UI quá nhiều thông tin có thể rối nếu không tổ chức tốt.
- Rollback:
  - Revert model/UI progress center về task phẳng hiện tại.

## 10. Deliverables

1. Step-aware Background Progress UX cho Workspace flow.
2. Real-byte download progress khi đo được.
3. Nền tảng sẵn sàng cho real processing progress backend ở bước kế tiếp.

## 11. Changelog Note

- Background Progress now exposes a step-aware flow timeline, live per-step timing, honest indeterminate processing states, and lightweight measured download progress where byte totals are available.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Có user problem rõ ràng
- [x] Có scope in/out rõ
- [x] Có acceptance criteria đo được
- [x] Có test plan

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ui/progress-center.test.ts`
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 15 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
  - Browser QA against `http://localhost:3000` was not completed because the in-app browser policy blocked that local target in this session.
- Versioning note:
  - Bumped app version `0.7.0 -> 0.8.0` (`MINOR`) because this task adds a backward-compatible user-facing feature.
