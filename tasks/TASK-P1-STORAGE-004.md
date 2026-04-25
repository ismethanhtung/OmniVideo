# [P1-STORAGE-004] Local upload auto-switch Drive for >20MB, Drive 403 diagnostics, and Storage Library video preview

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

- Task ID: P1-STORAGE-004
- Phase: P1
- Target Phase: P1
- Domain: Storage / Intake UX / Drive Integration
- Task Type: Feature + Bugfix
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User cần tránh upload local file lớn lên Telegram, cần fallback Drive có xác nhận; đồng thời Drive có case connect OK nhưng upload 403; và muốn xem trước video trong Storage Library.
- Bài toán cần giải quyết:
  - UX guard cho local file >20MB: đề xuất switch sang Drive, chờ user xác nhận.
  - Drive upload/check cần báo lỗi chi tiết hơn để debug quyền folder/shared drive.
  - Storage Library cần preview video trực tiếp để phân biệt asset nhanh.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Local Upload Intake: thêm luồng confirm auto-switch Telegram -> Drive khi file >20MB.
  - Drive upload/check: tăng chi tiết lỗi 403, hỗ trợ check quyền folderId và shared drive flag.
  - Storage Library: thêm preview video inline/modal.
- Out of scope:
  - Transcoding/thumbnail generation pipeline.
  - Signed URL/caching CDN layer cho preview.

## 4. Input / Output

- Input: file local dung lượng lớn, Drive account Service Account, asset metadata trong Storage Library.
- Output mong đợi: upload flow có confirm rõ ràng; lỗi Drive 403 có message actionable; có thể preview video từ UI.

## 5. Acceptance Criteria

1. Nếu user chọn Telegram và file local >20MB, UI yêu cầu xác nhận chuyển sang Drive trước khi submit.
2. Nếu user xác nhận, request local intake dùng Drive account active (ưu tiên priority cao).
3. Drive upload/check trả message chi tiết hơn cho lỗi 403 (đặc biệt case folder permission/share drive).
4. Storage Library có khả năng preview video trực tiếp (inline player), không chỉ download.
5. Test/lint/build pass.

## 6. Technical Plan

1. Thêm helper giới hạn Telegram local upload và quyết định switch provider.
2. Cập nhật `local-upload-intake-panel` với confirm modal + auto-select Drive account.
3. Cập nhật Drive upload/check để parse lỗi Google API, thêm `supportsAllDrives`, và validate folder access ở connection check.
4. Mở rộng download route + resolver để phục vụ preview inline.
5. Cập nhật Storage Library UI với player preview.
6. Thêm/cập nhật tests và cập nhật changelog/board evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/video-intake/*`, `src/features/storage/*`, `src/lib/video-intake/*`, `src/lib/connections/*`, `src/lib/storage/*`, `src/app/api/storage/assets/[assetId]/download/*`

## 8. Test Plan

1. Unit test helper local-upload switch logic.
2. Unit test connection check Drive folder permission path.
3. Chạy `npm run test`, `npm run lint`, `npm run build`.

## 9. Observability

- Error codes/messages cho Drive 403 phải actionable (folder permission/share drive/service account email).
- UI message rõ khi auto-switch sang Drive do giới hạn Telegram 20MB.

## 10. Risks & Rollback

- Risks: Preview inline có thể fail với asset provider không hỗ trợ stream/range đầy đủ.
- Rollback strategy: giữ fallback download link như hiện tại.

## 11. Deliverables

1. Local upload guard + confirm auto-switch Drive.
2. Drive diagnostics cải thiện cho upload/check.
3. Storage Library video preview.
4. Test evidence + changelog update.

## 12. Changelog Note

- Add Telegram-large-file local upload guard with Drive confirmation fallback, improve Drive 403 diagnostics, and add Storage Library video preview.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

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

- Assumptions: có ít nhất 1 Drive account active trong trường hợp cần switch.
- Blockers: none
- Verification evidence:
  - Local Upload Intake: nếu chọn Telegram và file >20MB, UI bật confirm modal để user quyết định chuyển sang Drive.
  - Drive upload/check: lỗi 403 trả message chi tiết hơn từ Google API và thêm hint chia sẻ folder cho Service Account email.
  - Storage Library: có inline preview video qua endpoint download `disposition=inline`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/local-upload-routing.test.ts` (new)
  - `src/lib/storage/google-drive-error.test.ts` (new)
  - `src/lib/connections/storage-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- src/lib/video-intake/local-upload-routing.test.ts src/lib/storage/google-drive-error.test.ts src/lib/connections/storage-checks.test.ts`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (14 tests).
  - Full tests: pass (62 tests).
  - Lint: pass.
  - Build: pass.
