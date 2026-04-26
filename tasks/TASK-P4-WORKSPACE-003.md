# [P4-WORKSPACE-003] Execute upload-to-social flow directly from Workspace

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

- Task ID: P4-WORKSPACE-003
- Phase: P4
- Target Phase: P4
- Domain: Workspace / Video Pipeline / Social Publish
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User yêu cầu Workspace không chỉ là giao diện; cần chạy flow liên tục ngay trong Workspace.
- Bài toán cần giải quyết: Nối runtime thật hiện có cho workflow tối thiểu `upload video -> save storage -> publish social` từ Workspace, không điều hướng sang panel khác.
- Tài liệu liên quan: `docs/architecture/node-architecture.md`, `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm executable graph check cho flow `source.file -> storage.upload -> social.publish`.
  - Thêm sample executable flow trong Workspace.
  - Thêm form runtime ngay trong Workspace để chọn file, storage account, social account, publish type và metadata publish.
  - Chạy tuần tự API thật: local upload intake trước, publish record `publish_now` sau.
  - Hiển thị node-level run progress/result/error trong Workspace.
  - Tests cho executable graph helper.
- Out of scope:
  - Chạy edit/audio nodes planned.
  - Chạy URL/Douyin rework graph đầy đủ.
  - Queue runner tổng quát cho mọi graph shape.

## 4. Input / Output

- Input: File video local + storage account active + social account connected + publish config.
- Output mong đợi: File được upload vào storage, tạo asset metadata, rồi publish_now sang social bằng API hiện có; kết quả hiển thị trong Workspace.

## 5. Acceptance Criteria

1. Workspace có nút seed executable `Upload -> Social` flow.
2. Workspace phát hiện graph hiện tại có executable path `source.file -> storage.upload -> social.publish`.
3. User chọn file/storage/social/publish metadata ngay trong Workspace và bấm Run Flow.
4. Run Flow gọi `/api/video-intake/local-runs`, lấy `assetId`, rồi gọi `/api/social/publish-records` với `publishNow=true`.
5. Progress/error/result hiển thị trong Workspace, không cần chuyển trang.
6. Nếu graph không executable hoặc thiếu input/account, UI báo lỗi rõ.
7. Tests + build pass.

## 6. Technical Plan

1. Thêm helper `createUploadToSocialSampleGraph` và `getWorkspaceExecutableUploadToSocialPlan`.
2. Cập nhật Workspace UI runtime panel với account loading, input form và node run log.
3. Implement `runWorkspaceFlow` gọi tuần tự existing APIs và hiển thị kết quả.
4. Cập nhật tests graph helper.
5. Cập nhật docs/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/workspace/workspace-graph.ts`, `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit: executable upload-to-social sample graph valid.
2. Unit: helper rejects missing executable path.
3. Targeted workspace tests.
4. Full tests + build.

## 9. Observability

- UI run log hiển thị từng stage: validate, upload-storage, publish-social.
- API runtime giữ trace hiện có trong `job_runs`, `step_runs`, `publish_records`.

## 10. Risks & Rollback

- Risks: Publish-now phụ thuộc account/platform/token thật; lỗi provider sẽ hiển thị từ API.
- Rollback strategy: tắt runtime form, giữ canvas graph helpers.

## 11. Deliverables

1. Workspace executable flow helper/sample.
2. Workspace runtime form and run log.
3. Tests and verification evidence.
4. Changelog/task updates.

## 12. Changelog Note

- Add direct Workspace execution for upload-to-social flow using existing local intake and publish-now APIs.

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

- Assumptions: Flow đầu tiên chạy thật là local upload file -> storage -> publish_now social. Edit/audio nodes vẫn planned.
- Blockers: none.
- Verification evidence:
  - Workspace has `Seed Upload Social` for executable `source.file -> storage.upload -> social.publish` graph.
  - Workspace runtime form loads active Telegram/Drive storage accounts and connected social accounts.
  - `Run Workspace Flow` posts file to `/api/video-intake/local-runs`, reads returned `assetId`, then posts publish-now payload to `/api/social/publish-records`.
  - Run log shows upload/storage/publish node statuses and provider/API errors inline.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests: pass (11 tests / 2 files).
  - Build: pass. Existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - Full tests: pass (147 tests / 37 files).
