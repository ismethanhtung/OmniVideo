# P2-VIDEO-001 Mirror Video Node and Video Tools Lab

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

- Task ID: P2-VIDEO-001
- Phase: Phase 2
- Target Phase: MVP Video Processing
- Domain: Video Processing / Workspace
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace đã có contract `edit.mirror` nhưng chưa chạy được, và cần một trang test-only để thử nhanh công cụ xử lý video trước khi đưa vào pipeline đầy đủ.
- Bài toán cần giải quyết: Lật ngang video bằng ffmpeg cho biến thể edit hợp lệ, expose qua Workspace node và Video Tools Lab MVP.
- Tài liệu liên quan:
  - `docs/SYSTEM-SUMMARY.md`
  - `docs/architecture/node-architecture.md`
  - `docs/domains/video-pipeline.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Implement Mirror Video horizontal transform bằng ffmpeg.
  - Thêm API test/runtime cho mirror video.
  - Cho Workspace node `edit.mirror` chạy được trong flow hợp lệ.
  - Thêm Video Tools Lab test-only: upload, preview, mirror, preview/download output.
  - Hiển thị Blur/Audio tool cards ở trạng thái planned trong lab.
- Out of scope:
  - Partial blur xử lý thật.
  - Audio processing mới ngoài các API hiện có.
  - Persist output mirror trực tiếp vào Mongo nếu không nối qua `Save to Storage`.
  - Redesign toàn bộ Workspace UI.

## 4. Input / Output

- Input: file video upload trong lab hoặc runtime file/artifact từ Workspace flow.
- Output mong đợi: MP4 mirror horizontal có audio gốc, preview/download được và có thể lưu tiếp qua `Save to Storage` khi chạy trong Workspace.

## 5. Acceptance Criteria

1. `POST /api/video-processing/mirror` nhận `videoFile` và `axis=horizontal`, trả video base64 MP4 mirror với metadata cơ bản.
2. API trả lỗi đo được khi thiếu file hoặc axis không được hỗ trợ.
3. Workspace `planWorkspaceFlow` chấp nhận flow `source.file -> edit.mirror -> storage.upload` và `audio.video-dubbing -> edit.mirror -> storage.upload`.
4. Workspace runner gọi mirror API, tạo runtime artifact video và cho storage upload artifact sau mirror.
5. Video Tools Lab xuất hiện trong nhóm Test, cho upload video, preview gốc, chạy mirror, preview/download output.
6. Tests tương ứng pass và changelog/task evidence được cập nhật.

## 6. Technical Plan

1. Thêm module `src/lib/video-processing/mirror-video.ts` với ffmpeg args, validation và helper test injection.
2. Thêm route `src/app/api/video-processing/mirror/route.ts` để nhận FormData và trả payload preview.
3. Cập nhật Workspace graph planner, runner và node catalog cho `edit.mirror`.
4. Thêm Video Tools Lab panel và navigation registry.
5. Cập nhật tests, changelog và verification evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/video-processing/*`
  - `src/app/api/video-processing/mirror/*`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/components/layout/*`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/video-processing/mirror-video.test.ts src/app/api/video-processing/mirror/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Missing video file.
   - Unsupported mirror axis.
   - Mirror node missing executable upstream.
3. Kết quả mong đợi:
   - Targeted tests pass.
   - Build pass hoặc ghi rõ warning/lỗi còn lại nếu ngoài scope.

## 9. Observability

- Metrics: không thêm metrics mới trong MVP.
- Logs: API trả `errorCode` rõ cho validation/runtime failure.
- Error codes: `VAL_MIRROR_VIDEO_REQUIRED`, `VAL_MIRROR_AXIS_UNSUPPORTED`, `SYS_MIRROR_VIDEO_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Video lớn có thể làm payload base64 nặng trong trang lab/workspace preview.
  - ffmpeg runtime phụ thuộc binary local/bundled.
- Rollback strategy:
  - Revert route/lib mirror và chuyển `edit.mirror` về `planned`.

## 11. Deliverables

1. Mirror Video lib/API/runtime node.
2. Video Tools Lab MVP trong nhóm Test.
3. Tests và changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Mirror Video processing node and Video Tools Lab MVP for upload, preview, mirror, and download testing.

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
  - MVP chỉ hỗ trợ `axis=horizontal`.
  - Video Tools Lab là test-only trong app shell, không cần route Next.js riêng.
- Blockers: none.
- Verification evidence:
  - Targeted tests pass: 37 tests / 4 files.
  - Build pass; còn warning cũ `display-preferences-panel.tsx` import `Image` chưa dùng và log DNS Mongo `querySrv ECONNREFUSED` trong static generation nhưng exit code 0.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-processing/mirror-video.test.ts`
  - `src/app/api/video-processing/mirror/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/mirror-video.test.ts src/app/api/video-processing/mirror/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
- Test results summary:
  - Targeted tests pass (37 tests / 4 files).
  - Build pass with existing unrelated warning and DNS Mongo log noted above.
