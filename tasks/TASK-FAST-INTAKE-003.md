# [FAST-INTAKE-003] Improve Video Intake run history detail and failed cleanup

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

- Task ID: FAST-INTAKE-003
- Phase: Phase 1
- Target Phase: P1
- Domain: Video Intake
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Review

## 2. Context

- Lý do: Intake Run History đang hiển thị ít dữ liệu hơn Storage Library, thiếu preview/detail tốt và thiếu thao tác dọn các run failed.
- Bài toán cần giải quyết: nâng cấp bảng history để xem nhanh dữ liệu run/asset liên quan, chuyển Created vào detail, và thêm nút Delete Failed cạnh Refresh.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Mở rộng API history để trả asset summary liên quan cho run thành công khi có `assetId`.
  - Thêm detail modal cho Intake Run History, trong đó có Created và các metadata chính giống Storage Library.
  - Thêm video preview cho run có asset download được.
  - Thêm API/UI `Delete Failed` để xoá các URL intake run failed và step/event trace liên quan.
- Out of scope:
  - Không thay đổi pipeline intake runtime.
  - Không xoá storage assets thành công.
  - Không áp dụng cho Local Upload Intake trong task này.

## 4. Input / Output

- Input: Danh sách URL intake runs từ MongoDB.
- Output mong đợi: History hiển thị đầy đủ hơn, có modal detail/preview, và có thể dọn failed runs bằng một nút cạnh Refresh.

## 5. Acceptance Criteria

1. Intake Run History không còn cột `Created`; `Created` nằm trong detail modal.
2. Run thành công có asset video thì hiển thị preview inline giống Storage Library và detail có metadata chính: provider/account/status/quality/size/duration/run/source ids.
3. Có nút `Delete Failed` cạnh `Refresh`; khi xác nhận thì xoá các URL intake job_runs failed cùng step_runs/run_events liên quan và reload history.
4. Có test cập nhật cho API delete failed path hoặc helper repository tương ứng.

## 6. Technical Plan

1. Mở rộng repository/API `listIntakeJobRuns` để enrich history bằng asset summary từ `outputSummary.assetId`.
2. Thêm repository function xoá failed URL intake runs kèm `step_runs` và `run_events`, expose qua `DELETE /api/video-intake/runs?status=failed`.
3. Cập nhật `VideoIntakePanel` UI: preview column, detail modal, extra metadata columns, Delete Failed action.
4. Thêm/cập nhật test và chạy targeted test/build checks.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/repository.ts`, `src/app/api/video-intake/runs/route.ts`, `src/features/video-intake/video-intake-panel.tsx`, tests liên quan.

## 8. Test Plan

1. Unit/API cần chạy: targeted test cho API/repository delete failed và existing video-intake tests liên quan.
2. Failure cases cần thử: DELETE không đúng `status=failed` phải trả validation error.
3. Kết quả mong đợi: tests pass; build/typecheck không phát sinh lỗi mới.

## 9. Observability

- Metrics: Không thêm metric mới.
- Logs: Giữ error response hiện tại trên API.
- Error codes: Thêm validation/system error code cho delete failed nếu cần.

## 10. Risks & Rollback

- Risks: Xoá failed runs là destructive với history lỗi; giảm rủi ro bằng confirm ở UI và chỉ áp dụng URL intake failed runs.
- Rollback strategy: revert API DELETE handler/repository deletion và UI Delete Failed/detail additions.

## 11. Deliverables

1. UI Intake Run History cải thiện.
2. API/repository xoá failed URL intake runs.
3. Test evidence và changelog entry.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Cập nhật Video Intake Run History với preview/detail giống Storage Library và nút Delete Failed để dọn failed runs.

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

- Assumptions: `outputSummary.assetId` là liên kết chính giữa URL intake run và asset đã persist.
- Blockers: None.
- Verification evidence: `npm run test -- --run src/app/api/video-intake/runs/route.test.ts` pass; `npm run build` pass with two pre-existing warnings outside scope (`Download` unused in Video Tools Lab, `Image` unused in Display Preferences).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/app/api/video-intake/runs/route.test.ts`
- Test commands executed: `npm run test -- --run src/app/api/video-intake/runs/route.test.ts`; `npm run build`
- Test results summary: Route test pass (1 file / 2 tests); Next build pass. Build warnings are existing unused imports outside this task scope.
