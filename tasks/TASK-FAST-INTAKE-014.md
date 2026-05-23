# [FAST-INTAKE-014] Add Visible Download Fallback Signal in Video Intake

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

- Task ID: FAST-INTAKE-014
- Phase: MVP runtime hardening
- Target Phase: Intake download UX clarity
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User bấm `Download`, status báo thành công nhưng browser không hiện dấu hiệu rõ (đặc biệt trong app webview).
- Bài toán cần giải quyết: cần tín hiệu UI rõ ràng + fallback thao tác tay để user chủ động mở link download.

## 3. Scope

- In scope:
  - Trigger download qua iframe ẩn để giữ trang hiện tại.
  - Hiện `Open direct download link` trong Run Status sau khi gửi request.
  - Cập nhật copy trạng thái để không gây hiểu nhầm “đã tải xong”.
  - Cập nhật test source assertions.
- Out of scope:
  - Byte-level download progress từ browser manager.
  - Download manager riêng trong app.

## 4. Input / Output

- Input: User bấm nút Download trên Video Intake.
- Output mong đợi: Có tín hiệu rõ rằng request đã gửi, và luôn có link fallback để mở download trực tiếp.

## 5. Acceptance Criteria

1. Download handler tạo iframe ẩn để trigger URL download.
2. Run Status hiển thị link `Open direct download link`.
3. Status message đổi sang “request sent” thay vì hiểu nhầm “đã tải xong”.
4. Focused tests + version guard pass.

## 6. Technical Plan

1. Add `downloadUrlHint` state.
2. Replace anchor auto-download with hidden iframe trigger.
3. Render fallback link in status panel.
4. Update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/video-intake/video-intake-panel.tsx`, `src/features/video-intake/video-intake-panel.test.ts`

## 8. Test Plan

1. Assert iframe trigger + fallback link copy tồn tại trong panel source.
2. Run focused intake panel test.
3. Run version guard.

## 9. Observability

- Giữ progress center hiện có.
- Cải thiện message semantics để phản ánh đúng trạng thái request.

## 10. Risks & Rollback

- Risks: iframe trigger vẫn phụ thuộc policy browser/webview.
- Rollback strategy: quay lại anchor-trigger path.

## 11. Deliverables

1. Visible download fallback UX.
2. Updated status copy.
3. Regression test + changelog/version updates.

## 12. Changelog Note

- Add explicit Video Intake download fallback signal with direct link and iframe-triggered browser request.

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

- Root cause: status copy quá optimistic và thiếu fallback affordance khi browser/webview không hiện download indicator rõ.
- Fix: status now indicates request-sent and exposes direct link fallback.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/video-intake/video-intake-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused test pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
