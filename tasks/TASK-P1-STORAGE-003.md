# [P1-STORAGE-003] Support Google Drive Service Account JSON key upload for storage provider

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

- Task ID: P1-STORAGE-003
- Phase: P1
- Target Phase: P1
- Domain: Storage / Drive Integration
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User muốn cấu hình Google Drive storage theo Service Account JSON key thay vì OAuth user token để thao tác nhanh gọn.
- Bài toán cần giải quyết: cho phép upload JSON key khi tạo Drive storage provider và dùng key đó để lấy access token server-side lúc upload/check connection.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Update Storage Providers UI cho Drive: upload/paste Service Account JSON key.
  - Update validation/types để nhận secrets dạng `driveServiceAccountJson`.
  - Implement token exchange từ Service Account JSON key và dùng vào Drive upload + connection checks.
  - Giữ backward-compatible với account Drive cũ dùng accessToken.
- Out of scope:
  - Secret manager/encryption at-rest.
  - Domain-wide migration script cho toàn bộ account Drive cũ.

## 4. Input / Output

- Input: JSON key của Google Service Account + optional folderId.
- Output mong đợi: account Drive tạo thành công và upload/check chạy bằng Service Account token flow.

## 5. Acceptance Criteria

1. Khi tạo Drive storage account, user có thể upload file JSON key hoặc paste JSON key trực tiếp.
2. Validation Drive chấp nhận `driveServiceAccountJson` (ưu tiên) hoặc legacy `accessToken` (backward-compatible).
3. Luồng upload Drive dùng Service Account token nếu có JSON key.
4. Connection Test Drive dùng Service Account token nếu có JSON key.
5. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng storage-provider types/validation cho `driveServiceAccountJson`.
2. Thêm module Drive Service Account token exchange.
3. Cập nhật storage adapters + connection checks dùng token resolver mới.
4. Cập nhật UI modal tạo provider Drive để nhận JSON key upload/paste.
5. Thêm tests cho validation và service-account token flow.
6. Cập nhật task evidence + board/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/storage/*`, `src/lib/storage-providers/*`, `src/lib/video-intake/storage-adapters.ts`, `src/lib/connections/*`, `src/lib/storage/*`

## 8. Test Plan

1. Unit tests cho Drive validation + Service Account token helper.
2. `npm run test`
3. `npm run lint`
4. `npm run build`

## 9. Observability

- Drive check/upload trả message rõ nguyên nhân khi JSON key invalid hoặc token exchange fail.
- Không expose raw Service Account private key ra UI/API response.

## 10. Risks & Rollback

- Risks: JSON key format sai hoặc key bị revoke gây token exchange fail.
- Rollback strategy: fallback dùng legacy accessToken path.

## 11. Deliverables

1. Drive provider UI hỗ trợ JSON key upload/paste.
2. Drive runtime token resolver từ Service Account.
3. Test evidence + changelog update.

## 12. Changelog Note

- Add Drive Service Account JSON key flow for storage provider creation and runtime upload/check.

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

- Assumptions: server runtime có thể gọi Google OAuth token endpoint.
- Blockers: none
- Verification evidence:
  - UI Drive provider modal hỗ trợ cả upload file JSON key và paste JSON key.
  - Runtime upload/check cho Drive hỗ trợ resolve token theo thứ tự: `accessToken` (legacy) -> `driveServiceAccountJson`.
  - Nếu token exchange lỗi, hệ thống trả message rõ nguyên nhân (`Drive auth failed` / `STG_DRIVE_AUTH_FAILED`).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/drive-service-account.test.ts` (new)
  - `src/lib/connections/storage-checks.test.ts` (updated)
  - `src/lib/storage-providers/validation.test.ts` (updated)
- Test commands executed:
  - `npm run test -- src/lib/storage/drive-service-account.test.ts src/lib/connections/storage-checks.test.ts src/lib/storage-providers/validation.test.ts`
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Targeted tests: pass (15 tests).
  - Full tests: pass (54 tests).
  - Lint: pass (0 warning/error).
  - Build: pass.
