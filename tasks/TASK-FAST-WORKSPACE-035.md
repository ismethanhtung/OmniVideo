# [FAST-WORKSPACE-035] Preserve subtitle PlayRes for server-side artifact edit path

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-035
- Phase: MVP runtime hardening
- Target Phase: Workspace subtitle rendering stability
- Domain: Workspace
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Subtitle vị trí bị lệch xuống khi chạy `Mask Logo/Subtitles` sau khi source video đi qua server-side `artifactId` path.
- Bài toán cần giải quyết: Không để fallback `1920x1080` làm sai `subtitlePlayResX/Y` cho video không cùng tỷ lệ.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Chuẩn hóa `subtitlePlayResX/Y` trong `/api/video-processing/edit` bằng probe metadata từ input video path.
  - Giữ nguyên workflow `artifactId` để tránh tải nặng browser.
  - Thêm regression test cho artifact mode + subtitle style.
- Out of scope:
  - Refactor toàn bộ artifact registry để lưu video dimensions.
  - Thay đổi UX của Video Tools Lab.

## 4. Input / Output

- Input: Request edit video từ Workspace với `responseMode=artifact` hoặc `binary`.
- Output mong đợi: `runVideoEditPipelineFromPath` luôn nhận `playResX/playResY` đúng với source dimensions khi burn subtitle.

## 5. Acceptance Criteria

1. Với edit route path xử lý từ file tạm (`responseMode=binary|artifact`), nếu subtitles bật thì route probe dimensions từ source và ghi đè `playResX/playResY`.
2. Cách probe chỉ đọc metadata bằng `ffmpeg -hide_banner -i <path>`; không decode full video trên browser.
3. Có regression test xác nhận artifact mode không giữ sai fallback `1920x1080` khi probe trả dimensions khác.

## 6. Technical Plan

1. Thêm helper probe dimensions trong `src/app/api/video-processing/edit/route.ts`.
2. Parse stream video size từ ffmpeg stderr và trả `{width,height}` hợp lệ.
3. Trước khi gọi `runVideoEditPipelineFromPath`, nếu subtitles enabled thì overwrite `style.playResX/Y` theo dimensions probe.
4. Thêm test mới ở `route.test.ts` để khóa regression.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/api/video-processing/edit/*`.

## 8. Test Plan

1. Route tests cho upload/binary/artifact mode.
2. Regression test riêng cho artifact mode subtitle PlayRes override.

## 9. Observability

- Metrics: không thêm metric mới.
- Logs: dùng luồng error hiện hữu; probe lỗi sẽ fallback an toàn.
- Error codes: không đổi.

## 10. Risks & Rollback

- Risks: Parse stderr không match trên một số định dạng hiếm -> route fallback behavior cũ.
- Rollback strategy: Revert helper probe + override logic trong edit route.

## 11. Deliverables

1. API edit route patch.
2. Regression test.
3. Task board + changelog + version bump.

## 12. Changelog Note

- Fixed subtitle PlayRes drift for Workspace server-side artifact edit flow by probing source dimensions before ASS generation.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: ffmpeg binary có sẵn theo runtime hiện có của repo.
- Blockers: None.
- Verification evidence:
  - Route edit artifact path đã probe dimensions từ source path thay vì giữ fallback cứng.
  - Regression test xác nhận `playResX/playResY` truyền vào pipeline theo dimensions probe.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/video-processing/edit/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/video-processing/edit/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
