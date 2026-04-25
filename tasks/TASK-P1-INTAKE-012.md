# [P1-INTAKE-012] Local video upload intake page with Mongo metadata persistence and top bar

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

- Task ID: P1-INTAKE-012
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / UI Shell
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Cần thêm một trang intake mới để upload video từ máy local lên storage provider, đồng thời lưu đầy đủ metadata liên quan vào MongoDB giống pipeline intake hiện có.
- Bài toán cần giải quyết: hỗ trợ luồng upload local video end-to-end (UI + API + persistence + trace) và bổ sung top bar có dark/light mode phù hợp layout hiện tại.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/architecture/data-model.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm section UI riêng cho local video upload intake.
  - Thêm API local-upload intake nhận multipart và chạy pipeline upload storage.
  - Persist đầy đủ metadata/trace vào `sources`, `job_runs`, `step_runs`, `run_events`, `assets`.
  - Bổ sung top bar cao `h-12` đồng bộ line với header leftbar và có toggle dark/light mode.
- Out of scope:
  - Chunked upload lớn nhiều phần.
  - Video transcode hoặc quality ladder sau khi upload local.
  - Thay đổi schema collection ngoài phạm vi metadata cần cho intake local.

## 4. Input / Output

- Input: video file local + title/tags + storage account Telegram/Drive.
- Output mong đợi: file được upload lên storage, MongoDB có đủ metadata và trace run/step/event tương ứng.

## 5. Acceptance Criteria

1. Có section mới cho local video upload, cho phép chọn file local và chọn storage account active (Telegram/Drive).
2. API local upload chạy thành công sẽ lưu đủ dữ liệu vào MongoDB:
   - `sources` với `sourceType=file`.
   - `job_runs`, `step_runs`, `run_events` đầy đủ trạng thái pipeline.
   - `assets` có metadata video/source/storage pointer liên quan.
3. Trường hợp upload thất bại trả về error code rõ ràng và vẫn ghi trace thất bại vào `job_runs` + `step_runs` + `run_events`.
4. App shell có top bar cao bằng header leftbar (`h-12`), có dark/light mode toggle hoạt động ổn định.
5. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng backend `video-intake` với local upload pipeline (validation, upload adapter binary, metadata persistence).
2. Thêm API route multipart cho local intake và tích hợp vào module feature UI mới.
3. Cập nhật navigation/content router thêm section local intake.
4. Bổ sung top bar component + app-level state cho theme toggle.
5. Viết/cập nhật tests cho validation/metadata/upload flow local; chạy verify commands.
6. Cập nhật task evidence + changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/video-intake/*`, `src/lib/video-intake/*`, `src/components/layout/*`, `src/app/api/video-intake/*`

## 8. Test Plan

1. Unit tests cho local intake validation/metadata mapping/upload adapter logic.
2. Failure cases:
   - Không có file hoặc file rỗng.
   - `storageProviderAccountId` invalid hoặc account không active.
   - Provider upload failed.
3. Chạy `npm run test`, `npm run lint`, `npm run build`.

## 9. Observability

- Giữ trace theo node step trong `step_runs`.
- Error codes mới cho local upload path phải nhất quán naming.
- `inputSnapshot` của local intake có đủ thông tin file tối thiểu (name/type/size, account, tags).

## 10. Risks & Rollback

- Risks: upload local file lớn có thể dùng nhiều memory khi gửi tới provider.
- Rollback strategy: giữ nguyên URL intake path hiện hữu; nếu cần có thể tạm ẩn section local intake khỏi navigation.

## 11. Deliverables

1. Local upload intake section (UI + API + runner).
2. Mongo metadata persistence đầy đủ cho local path.
3. Top bar `h-12` với dark/light mode toggle.
4. Test updates + verification evidence.

## 12. Changelog Note

- Thêm local video upload intake pipeline và top bar dark/light cho app shell.

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

- Assumptions: local upload trong phạm vi file video thông dụng và giới hạn memory phù hợp MVP.
- Blockers: none
- Verification evidence:
  - Local upload intake route mới `POST /api/video-intake/local-runs` nhận multipart và chạy local pipeline runner.
  - Local pipeline persist metadata đầy đủ vào MongoDB qua `createFileSource`, `createJobRun`, `createStepRun`, `createRunEvent`, `createAsset`.
  - UI section `Local Upload Intake` hoạt động end-to-end với storage account selection, run status, step trace, history.
  - App shell có top bar `h-12` đồng bộ leftbar header, gồm dark/light toggle + quick actions.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/local-validation.test.ts`
  - `src/lib/video-intake/asset-metadata.test.ts`
  - `src/lib/video-intake/pipeline-definition.test.ts`
- Test commands executed:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Vitest: 10 files / 39 tests pass.
  - ESLint: pass, không warnings/errors.
  - Next build: pass, routes local intake compile thành công.

## 16. Outcome Summary

- Added local-upload intake page and multipart API pipeline to upload local video bytes directly to Telegram/Drive.
- Added MongoDB persistence for local intake across `sources`, `job_runs`, `step_runs`, `run_events`, `assets`.
- Added top bar (`h-12`) aligned with leftbar header including dark/light toggle, quick section switch, and refresh action.
