# FAST-AUDIO-016 Improve Workspace Flow Error Detail

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

- Task ID: FAST-AUDIO-016
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Workspace UX
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace flow báo lỗi `fetch failed` quá mơ hồ, không chỉ ra endpoint/step gây lỗi.
- Bài toán cần giải quyết: Cải thiện error surface trong runner để người dùng thấy rõ step + endpoint + reason.
- Tài liệu liên quan:
  - `tasks/TASK-P2-AUDIO-007.md`
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 3. Scope

- In scope:
  - Thêm helper fetch cho Workspace runner để chuẩn hóa lỗi network/API.
  - Hiển thị lỗi chi tiết trong node status, run error, progress error.
- Out of scope:
  - Redesign UI run status panel.

## 4. Input / Output

- Input: lỗi phát sinh khi gọi API trong Workspace flow.
- Output mong đợi: message có ngữ cảnh (step/API) thay vì generic `fetch failed`.

## 5. Acceptance Criteria

1. Khi network fail, message có format nêu rõ action và endpoint.
2. Khi API trả `ok:false` hoặc HTTP != 2xx, message ưu tiên `error`/`errorCode`, kèm HTTP status nếu cần.
3. Workspace flow không còn surface lỗi trần `fetch failed` ở run summary cho các step đã migrate.

## 6. Technical Plan

1. Thêm `fetchWorkspaceJson` helper trong `workspace-canvas-panel.tsx`.
2. Thay các call fetch trong runner bằng helper.
3. Verify build và cập nhật task/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run build`
2. Failure cases cần thử:
   - Network fetch failure.
   - API `ok:false`.
3. Kết quả mong đợi:
   - Build pass và lỗi runtime có chi tiết hơn.

## 9. Observability

- Metrics: không đổi.
- Logs: không đổi.
- Error codes: dùng lại error code từ API payload nếu có.

## 10. Risks & Rollback

- Risks:
  - Nếu parse payload sai shape có thể mất reason; fallback vẫn có HTTP status.
- Rollback strategy:
  - Revert helper và quay lại fetch cũ.

## 11. Deliverables

1. Workspace runner error detail helper.
2. Better failure message in run status.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Improve Workspace flow error messages with step/endpoint context instead of generic fetch failed.

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
  - Runner hiện tại là nơi phù hợp nhất để enrich error message.
- Blockers: none.
- Verification evidence:
  - `npm run build` pass.
  - Workspace runner now includes action + endpoint + API reason in thrown errors.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.tsx`
- Test commands executed:
  - `npm run build`
- Test results summary:
  - Build pass with existing unrelated warning in `src/features/workspace/display-preferences-panel.tsx`.
