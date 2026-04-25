# [P1-CONN-001] Extend Connection Test to include Telegram and Google Drive storage checks

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

- Task ID: P1-CONN-001
- Phase: P1
- Target Phase: P1
- Domain: Connections / Storage
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Connection Test hiện chỉ kiểm tra MongoDB, chưa kiểm tra thực tế trạng thái storage accounts (Telegram/Drive).
- Bài toán cần giải quyết: bổ sung kiểm tra kết nối Telegram/Drive trong Connection Test panel để user biết account nào usable.
- Tài liệu liên quan: `docs/operations/connection-management.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm API connection health tổng hợp MongoDB + storage providers Telegram/Drive.
  - Cập nhật Connection Test panel hiển thị check chi tiết theo từng storage account.
  - Thêm test cho storage connection check logic.
- Out of scope:
  - Auto-fix secrets/token.
  - Check các provider ngoài Telegram/Drive.

## 4. Input / Output

- Input: storage provider accounts đã lưu (botToken/chatId hoặc accessToken/folderId).
- Output mong đợi: Connection Test hiển thị trạng thái từng provider account và message lỗi rõ ràng.

## 5. Acceptance Criteria

1. Connection Test panel hiển thị MongoDB + Telegram/Drive checks trong cùng màn hình.
2. Mỗi account Telegram/Drive có status `ok/down` với latency và message tương ứng.
3. Không expose secrets ra response/UI.
4. Test/lint/build pass.

## 6. Technical Plan

1. Tạo storage connection check module cho Telegram/Drive.
2. Thêm API route health tổng hợp.
3. Cập nhật Connection Test panel consume API mới và render table checks.
4. Viết tests cho storage check module + chạy verify commands.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/connections/*`, `src/app/api/health/*`, `src/lib/storage-providers/*`, `src/lib/connections/*`

## 8. Test Plan

1. Unit tests cho telegram/drive connection checker.
2. `npm run test`
3. `npm run lint`
4. `npm run build`

## 9. Observability

- Mỗi check trả status + latencyMs + message.
- API trả timestamp chung cho lần kiểm tra.

## 10. Risks & Rollback

- Risks: external provider API timeout/lỗi mạng có thể làm check chậm.
- Rollback strategy: giữ API `/api/health/db` cũ, rollback panel về DB-only mode.

## 11. Deliverables

1. API connection health tổng hợp.
2. UI Connection Test có storage checks.
3. Test evidence đầy đủ.

## 12. Changelog Note

- Extend Connection Test để kiểm tra MongoDB + Telegram/Drive storage accounts.

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

- Assumptions: provider APIs reachable từ server runtime tại thời điểm check.
- Blockers: none
- Verification evidence:
  - Added API `GET /api/health/connections` aggregating MongoDB and Telegram/Drive account checks.
  - Connection Test panel now renders detail table per service/account with status, latency, and message.
  - Storage checks validate Telegram bot token/chat access and Google Drive access token health without exposing secrets.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/connections/storage-checks.test.ts`
- Test commands executed:
  - `npm run test`
  - `npm run lint`
  - `npm run build`
- Test results summary:
  - Vitest: 12 files / 47 tests pass.
  - ESLint: pass, không warnings/errors.
  - Next build: pass.

## 16. Outcome Summary

- Extended Connection Test to include Telegram and Google Drive storage account connectivity.
- Added dedicated storage connection checker module with robust failure messages for secret/auth/access issues.
- Kept response/UI secret-safe while exposing actionable status and latency.
