# [P1-INTAKE-006] Step-level intake trace and resolver header propagation

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

- Task ID: P1-INTAKE-006
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner cần thấy rõ run fail ở step nào trong UI. Built-in resolver hiện chỉ trả direct URL, chưa truyền các request headers cần thiết nên source fetch có thể 403.
- Bài toán cần giải quyết: hiển thị step-level trace trong Run Status và propagate resolver headers vào source fetch cho upload.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/architecture/data-model.md`

## 3. Scope

- In scope:
  - Thêm API run detail + step_runs trace.
  - Hiển thị step progress trong Video Intake Run Status.
  - Built-in resolver trả `requestHeaders`.
  - Source fetch dùng resolver headers khi tải binary/stream.
  - Cập nhật tests/changelog/task.
- Out of scope:
  - Visual timeline phức tạp cho run history.
  - Provider retry orchestration nhiều attempt.

## 4. Input / Output

- Input: `runId`, source URL page/direct.
- Output mong đợi: UI hiển thị step trace rõ ràng; upload dùng đúng headers từ resolver khi source yêu cầu.

## 5. Acceptance Criteria

1. Run Status hiển thị danh sách step theo thứ tự pipeline với trạng thái `success/running/failed/pending`.
2. Nếu fail, UI chỉ rõ node nào fail và error code/detail của node đó.
3. Built-in resolver trả request headers khi có.
4. Fetch source media dùng request headers từ resolver.
5. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng types/internal resolver/media resolver để mang `requestHeaders`.
2. Cập nhật storage adapter source fetch để merge resolver headers.
3. Thêm repository/API run detail trả `job_run` + `step_runs`.
4. Cập nhật Video Intake panel render step trace.
5. Verify + cập nhật docs/changelog/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: video-intake resolver/storage adapters/repository/API/UI.

## 8. Test Plan

1. Unit test parse internal resolver headers.
2. Unit test source fetch header merge helper nếu phù hợp.
3. `npm run test`
4. `npm run lint`
5. `npm run build`

## 9. Observability

- Metrics: step-level status hiển thị từ `step_runs`.
- Logs: giữ `run_events`, `step_runs`.
- Error codes: giữ nguyên contract hiện tại.

## 10. Risks & Rollback

- Risks: một số source vẫn có thể yêu cầu cookie/session ngắn hạn ngoài header cơ bản.
- Rollback strategy: bỏ header propagation và run detail UI.

## 11. Deliverables

1. Run detail API + UI step trace.
2. Resolver header propagation.
3. Updated tests/docs/changelog/task evidence.

## 12. Changelog Note

- Thêm step-level intake trace trong Run Status và propagate request headers từ built-in resolver vào source fetch/upload.

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

- Assumptions: built-in resolver headers sẽ cải thiện YouTube/googlevideo fetch thành công đáng kể.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass; smoke test built-in resolver returned YouTube direct URL plus request headers.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/internal-resolver.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 7 test files / 20 tests pass; lint pass; build pass.
