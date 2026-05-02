# FAST-VIDEO-004 Keep Video Tools preview controls outside blur frame

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

- Task ID: FAST-VIDEO-004
- Phase: P2
- Target Phase: P2
- Domain: Video Processing
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Video Tools Lab `Original Preview` dùng video preview để căn blur, nhưng native browser controls có thể phủ lên vùng cần blur khi video đang phát.
- Bài toán cần giải quyết: Cho phép play/pause/seek preview mà control không nằm đè trong khung video đang dùng để vẽ blur region.
- Tài liệu liên quan:
  - `docs/domains/video-pipeline.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thay native controls trong `Original Preview` bằng control bar riêng nằm ngoài frame video.
  - Giữ khả năng play/pause, mute/unmute và seek khi căn blur.
  - Hiển thị và tự load lại `videoEditSetup` đã lưu khi chọn lại Storage Asset.
  - Không làm thay đổi output ffmpeg/edit pipeline.
  - Cập nhật test/changelog/task evidence.
- Out of scope:
  - Thêm timeline editor nâng cao.
  - Thay đổi `Edited Output` preview controls.

## 4. Input / Output

- Input: video local hoặc Storage Asset trong Video Tools Lab.
- Output mong đợi: user có thể phát và seek video để căn blur mà control không che nội dung video.

## 5. Acceptance Criteria

1. `Original Preview` không dùng native `<video controls>` trong frame dùng để vẽ blur.
2. Có external control bar bên dưới preview với play/pause, mute/unmute, seek và thời gian.
3. Vẽ blur region và kéo subtitle sample vẫn thao tác trên đúng frame video.
4. Asset đã từng `Save Setup To Asset` hiển thị badge/trạng thái và auto-apply setup khi chọn lại.
5. Test/build liên quan pass.

## 6. Technical Plan

1. Thêm state/ref handlers cho playback time/duration/mute/play của source preview.
2. Render control bar bên ngoài preview frame và bỏ native controls khỏi `Original Preview`.
3. Hiển thị trạng thái saved setup trong asset picker và cập nhật state local ngay sau khi save.
4. Bổ sung regression test và chạy build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Duration chưa có metadata thì seek slider disabled và không crash.
3. Kết quả mong đợi:
   - Test pass, build pass, warning ngoài scope nếu có vẫn được ghi lại.

## 9. Observability

- Metrics: không thêm.
- Logs: không thêm.
- Error codes: không đổi.

## 10. Risks & Rollback

- Risks:
  - Browser autoplay policy có thể chặn play nếu không bắt đầu từ user gesture; nút play vẫn là user gesture.
- Rollback strategy:
  - Revert về native `controls` nếu external controls gây regression.

## 11. Deliverables

1. External source preview controls.
2. Regression test + changelog evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Move Video Tools Lab Original Preview controls outside the blur drawing frame.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions:
  - Giữ `Edited Output` dùng native controls vì không dùng để vẽ blur.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (3 tests / 1 file).
  - `npm run build` pass with existing warnings outside task scope: unused `Share2`, unused `loading`, unused `FileAudio`, missing `selectedProviderId` hook dependency, unused `Image`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
  - `npm run build`
- Test results summary:
  - Regression test pass (3 tests / 1 file).
  - Production build pass; warnings are existing/outside scope and do not fail build.
