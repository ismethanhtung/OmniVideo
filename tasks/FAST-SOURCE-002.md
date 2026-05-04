# FAST-SOURCE-002 Move Inspiration Vault persistence to MongoDB

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

- Task ID: FAST-SOURCE-002
- Phase: P2
- Target Phase: P2
- Domain: Source Management
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: Inspiration Vault MVP đang persist bằng `localStorage`, không phù hợp khi dữ liệu ý tưởng cần là metadata lâu dài của hệ thống.
- Bài toán cần giải quyết: chuyển nguồn persistence chính của Inspiration Vault sang MongoDB, đồng thời giữ UI hiện tại hoạt động qua API server-side.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`, `docs/architecture/nextjs-mongodb-conventions.md`, `docs/domains/source-management.md`.

## 3. Scope

- In scope: Mongo repository cho `inspiration_vault_items`, API list/create/update/delete, đổi topbar và panel sang API, test tương ứng.
- Out of scope: public/view-only mode, auth/admin mode, rate limit AI, migration tự động từ browser localStorage cũ.

## 4. Input / Output

- Input: Free-form quick capture text/link, exploited checkbox, delete action.
- Output mong đợi: item được lưu/đọc/cập nhật/xoá qua MongoDB và render trong Inspiration Vault.

## 5. Acceptance Criteria

1. Quick capture tạo item qua API và persist vào collection `inspiration_vault_items`.
2. Inspiration Vault load dữ liệu bằng API thay vì đọc trực tiếp `localStorage`.
3. Toggle `Exploited` và `Delete` gọi API rồi cập nhật UI theo dữ liệu server trả về.
4. API trả validation error cho input rỗng và ID không hợp lệ.
5. Có test cho domain/API/repository behavior chính và failure path phù hợp.

## 6. Technical Plan

1. Tách classification/helper hiện có khỏi localStorage persistence, thêm repository MongoDB cho list/create/update/delete.
2. Thêm API route `src/app/api/inspiration-vault` và `src/app/api/inspiration-vault/[itemId]`.
3. Đổi topbar/panel client sang fetch API và dispatch event refresh nội bộ.
4. Cập nhật tests, board, changelog và task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/inspiration-vault`, `src/app/api/inspiration-vault`, `src/features/inspiration-vault`, `src/components/layout/topbar.tsx`.

## 8. Test Plan

1. Unit/API cần chạy: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/lib/inspiration-vault/repository.test.ts src/app/api/inspiration-vault/route.test.ts src/app/api/inspiration-vault/[itemId]/route.test.ts`.
2. Failure cases cần thử: empty capture input, invalid item id.
3. Kết quả mong đợi: tests pass; build không phát sinh lỗi mới trong scope.

## 9. Observability

- Metrics: Không thêm metrics riêng trong fast task.
- Logs: API trả error code rõ ràng.
- Error codes: `VAL_INSPIRATION_INPUT_EMPTY`, `VAL_INSPIRATION_ITEM_ID_INVALID`, `SYS_INSPIRATION_VAULT_API_FAILED`.

## 10. Risks & Rollback

- Risks: Dữ liệu localStorage cũ không tự migrate trong scope này.
- Rollback strategy: revert API wiring và quay lại localStorage helpers nếu cần.

## 11. Deliverables

1. DB-backed Inspiration Vault repository/API.
2. UI wiring qua API.
3. Tests and verification evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Move Inspiration Vault persistence from localStorage to MongoDB-backed API.

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

- Assumptions: Single-user app, no auth gate in this task; public/view-only mode handled as separate design/implementation task.
- Blockers: None.
- Verification evidence: Targeted Inspiration Vault tests pass; production build pass with existing warning outside scope.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/inspiration-vault/inspiration-vault.test.ts`, `src/lib/inspiration-vault/repository.test.ts`, `src/app/api/inspiration-vault/route.test.ts`, `src/app/api/inspiration-vault/[itemId]/route.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/lib/inspiration-vault/repository.test.ts src/app/api/inspiration-vault/route.test.ts 'src/app/api/inspiration-vault/[itemId]/route.test.ts'`; `npm run build`.
- Test results summary: Targeted tests pass (4 files / 15 tests). Build pass; existing Turbopack NFT warning remains outside scope in `src/app/api/video-processing/edit/route.ts` import trace.
