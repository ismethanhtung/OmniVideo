# FAST-AUDIO-017 Add Storage Asset Picker to Audio Transcript Source

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-017
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Audio Transcript UX/API
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Trang Audio Transcript hiện chỉ nhận upload local file ở Source Video, chưa chọn được video đã có trong Storage Library.
- Bài toán cần giải quyết: Bổ sung luồng chọn storage asset giống New Publish Record (`Select asset` + `Browse`) và cho API transcription nhận `assetId`.
- Tài liệu liên quan:
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/features/social/publish-records-panel.tsx`
  - `src/app/api/audio/chinese-transcription/route.ts`

## 3. Scope

- In scope:
  - Thêm asset picker cho Source Video trong Audio Transcript.
  - Cho phép submit transcription từ `videoFile` hoặc `assetId`.
  - Cập nhật test route validation cho contract mới.
- Out of scope:
  - Refactor shared component picker giữa nhiều màn hình.
  - Đổi UX tổng thể Audio Transcript.

## 4. Input / Output

- Input: User cần dùng video đã có trong storage để chạy transcript.
- Output mong đợi: Audio Transcript cho phép chọn asset từ storage và chạy transcription không cần upload file mới.

## 5. Acceptance Criteria

1. Source Video hiển thị picker dạng `Select asset` / `Browse` tương tự New Publish Record.
2. User có thể chạy transcription khi chọn `assetId` dù không upload file.
3. API `/api/audio/chinese-transcription` chấp nhận `videoFile` hoặc `assetId`; thiếu cả hai trả lỗi validate 400 rõ ràng.

## 6. Technical Plan

1. Cập nhật route transcription để hỗ trợ đọc video bytes từ storage asset.
2. Cập nhật panel Audio Transcript: load assets, chọn asset, submit `assetId`.
3. Cập nhật test route cho validate contract mới và chạy test liên quan.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/app/api/audio/chinese-transcription/route.ts`
  - `src/app/api/audio/chinese-transcription/route.test.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy:
  - `npm run test -- src/app/api/audio/chinese-transcription/route.test.ts`
2. Failure cases cần thử:
  - Thiếu cả `videoFile` và `assetId` trả `400`.
3. Kết quả mong đợi:
  - Test pass, contract validate đúng thông điệp mới.

## 9. Observability

- Metrics: không đổi.
- Logs: không đổi.
- Error codes: dùng `VAL_AUDIO_FILE_REQUIRED` cho validate source input.

## 10. Risks & Rollback

- Risks:
  - Tải asset bytes từ storage có thể fail nếu asset pointer hỏng.
- Rollback strategy:
  - Revert route/UI về mode upload-only.

## 11. Deliverables

1. Audio Transcript source picker hỗ trợ storage asset.
2. API transcription hỗ trợ `assetId`.
3. Regression test validate source input contract.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Storage Library asset picker for Audio Transcript source and allow transcription by `assetId`.

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
  - Reuse pattern từ New Publish Record là phù hợp UX kỳ vọng.
- Blockers: none.
- Verification evidence:
  - `npm run test -- src/app/api/audio/chinese-transcription/route.test.ts` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/chinese-transcription/route.test.ts`
- Test commands executed:
  - `npm run test -- src/app/api/audio/chinese-transcription/route.test.ts`
- Test results summary:
  - Pass.
