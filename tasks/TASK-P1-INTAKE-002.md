# [P1-INTAKE-002] Storage account selection and intake history

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

- Task ID: P1-INTAKE-002
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / Storage
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Video Intake hiện chọn provider type tĩnh thay vì storage account thật trong DB; Storage Providers form luôn mở; Video Intake chưa có run history để kiểm tra lỗi.
- Bài toán cần giải quyết: Chỉ cho intake chọn account storage active đã cấu hình, dùng secret của account đó khi upload, và thêm lịch sử run.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/storage-strategy.md`

## 3. Scope

- In scope:
  - Storage Providers form chỉ hiển thị sau khi bấm New.
  - Video Intake load active Telegram/Drive storage accounts và chọn theo account.
  - Pipeline dùng secret từ storage account được chọn.
  - Thêm API và UI lịch sử Video Intake runs.
  - Cập nhật tests/docs/changelog/task board.
- Out of scope:
  - Implement resolver service cho YouTube/TikTok.
  - Implement S3/local upload adapter trong intake.
  - Secret encryption production.

## 4. Input / Output

- Input: Video URL, tags, title, active storageProviderAccountId.
- Output mong đợi: Intake run dùng đúng storage account, và run history hiển thị status/error/output.

## 5. Acceptance Criteria

1. `New Storage Account` form mặc định ẩn và chỉ mở khi user bấm New.
2. Video Intake Storage Provider dropdown lấy từ active storage accounts đã lưu, không hard-code Telegram/Drive option.
3. Nếu chưa có active upload account thì nút Run Intake bị disable và có thông báo rõ.
4. Upload Telegram/Drive dùng secrets của storage account được chọn.
5. Video Intake có bảng lịch sử run gần nhất.
6. Failure `VID_RESOLVER_REQUIRED` vẫn fail rõ nhưng UI giải thích cần resolver cho page URL.
7. Tests mới/cũ pass; build/lint pass.

## 6. Technical Plan

1. Mở rộng storage provider repository để lấy raw active upload account server-side.
2. Mở rộng intake input/validation/runner/storage adapters để nhận `storageProviderAccountId`.
3. Thêm GET `/api/video-intake/runs` và history UI.
4. Refactor Storage Providers panel form collapse.
5. Cập nhật tests/docs/changelog/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: storage providers UI/repository, video intake UI/API/runner/adapters/types/tests.

## 8. Test Plan

1. Unit: validate `storageProviderAccountId` hợp lệ/không hợp lệ.
2. Unit: storage account raw resolver chỉ nhận active Telegram/Drive.
3. Unit: storage adapter dùng account secrets.
4. Run `npm run test`, `npm run build`, `npm run lint`.

## 9. Observability

- Metrics: lịch sử run hiển thị status/duration/error từ `job_runs`.
- Logs: giữ `run_events`, `step_runs`.
- Error codes: `VAL_STORAGE_PROVIDER_ACCOUNT_*`, `VID_RESOLVER_REQUIRED`.

## 10. Risks & Rollback

- Risks: Intake hiện vẫn cần external resolver cho YouTube/TikTok page URL.
- Rollback strategy: revert intake account selection path về provider type env fallback.

## 11. Deliverables

1. Collapsed Storage Providers create form.
2. Storage account dropdown trong Video Intake.
3. Intake run history panel.
4. Updated tests/docs/changelog/task.

## 12. Changelog Note

- Video Intake chọn storage account thật, thêm lịch sử run và collapse form Storage Providers.

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

- Assumptions: Intake upload adapter hiện chỉ hỗ trợ Telegram/Drive, nên dropdown chỉ hiện active account thuộc hai loại này.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/validation.test.ts`, `src/lib/storage-providers/validation.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 5 test files / 16 tests pass; lint pass; Next build pass.
