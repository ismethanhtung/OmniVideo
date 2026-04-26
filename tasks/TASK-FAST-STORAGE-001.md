# [FAST-STORAGE-001] Enforce Drive folder target for Service Account uploads

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

- Task ID: FAST-STORAGE-001
- Phase: FAST
- Target Phase: Storage reliability hardening
- Domain: Storage Strategy
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Upload Drive bằng Service Account có thể fail với lỗi quota 0GB khi không chỉ định folder target.
- Bài toán cần giải quyết: fail sớm với lỗi actionable khi thiếu `folderId` cho Service Account flow, tránh lỗi quota khó hiểu ở bước upload.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Thêm runtime guard cho Drive upload path: Service Account bắt buộc có folder target (`folderId` hoặc `GOOGLE_DRIVE_FOLDER_ID`).
  - Đồng bộ guard vào Connection Test để báo trạng thái `down` ngay khi thiếu folder target.
  - Thêm regression tests cho guard logic.
- Out of scope:
  - Refactor lớn UI Storage Providers.
  - Migration dữ liệu provider cũ.

## 4. Input / Output

- Input: Drive storage provider dùng `driveServiceAccountJson` có thể thiếu `folderId`.
- Output mong đợi: hệ thống trả lỗi rõ `folderId required` trước bước upload session; Connection Test phản ánh lỗi cùng thông điệp.

## 5. Acceptance Criteria

1. Drive upload path fail sớm với error code rõ ràng khi dùng Service Account nhưng thiếu folder target.
2. Drive upload path vẫn chạy bình thường khi có folder target hoặc khi dùng OAuth access token.
3. Connection Test trả `down` + message actionable cho Drive Service Account thiếu folder target.
4. Regression tests mới/updated pass.

## 6. Technical Plan

1. Tạo helper chuẩn hóa Drive upload target cho Service Account/OAuth token flow.
2. Áp dụng helper vào `storage-adapters` và `storage-checks`.
3. Viết tests cho helper + update test cho storage connection checks, sau đó chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/storage/*`, `src/lib/video-intake/storage-adapters.ts`, `src/lib/connections/storage-checks.ts`.

## 8. Test Plan

1. Unit tests cho helper Drive upload target.
2. Unit tests cho storage connection checks với case Service Account thiếu folder target.
3. Chạy test scope đã đổi để verify regression.

## 9. Observability

- Metrics: none.
- Logs: giữ nguyên flow hiện tại.
- Error codes: thêm `STG_DRIVE_FOLDER_REQUIRED`.

## 10. Risks & Rollback

- Risks: Một số Drive account Service Account cũ thiếu `folderId` sẽ fail ngay sau bản vá.
- Rollback strategy: revert helper guard và restore behavior cũ.

## 11. Deliverables

1. Runtime guard cho Drive Service Account folder target.
2. Connection Test guard đồng bộ.
3. Regression tests.

## 12. Changelog Note

- Enforce `folderId` requirement for Google Drive Service Account upload/check paths to avoid quota root upload failure.

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

- Assumptions: Service Account flow không nên upload vào root vì account không có quota lưu trữ.
- Blockers: none.
- Verification evidence:
  - Thêm helper `src/lib/storage/drive-upload-target.ts` để xác định mode Service Account và enforce folder target.
  - `src/lib/video-intake/storage-adapters.ts` fail sớm với `STG_DRIVE_FOLDER_REQUIRED` khi Service Account thiếu `folderId`/`GOOGLE_DRIVE_FOLDER_ID`.
  - `src/lib/connections/storage-checks.ts` báo `down` sớm cùng thông điệp cho case Service Account thiếu folder target.
  - Regression tests pass cho helper mới và storage connection checks.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/drive-upload-target.test.ts` (new)
  - `src/lib/connections/storage-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/storage/drive-upload-target.test.ts src/lib/connections/storage-checks.test.ts`
- Test results summary:
  - Pass (13 tests / 2 files).
