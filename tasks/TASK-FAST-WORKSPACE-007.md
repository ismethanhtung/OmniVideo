# [FAST-WORKSPACE-007] Add Facebook Page Picker for Workspace Publish Node

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-007
- Phase: FAST
- Target Phase: Workspace runtime UX hardening
- Domain: Workspace / Social Publish
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Trong `social.publish` Inspector, user phải nhập tay `facebookPageId`, dễ sai và không ergonomic.
- Bài toán cần giải quyết: Đồng bộ trải nghiệm với `New Publish Record` bằng cách load list Facebook Pages để user chọn trực tiếp.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/architecture/node-architecture.md`

## 3. Scope

- In scope:
  - Cập nhật Inspector node `social.publish` để hiển thị dropdown `Facebook Page`.
  - Load page list từ API `GET /api/social/accounts/[accountId]/facebook-pages`.
  - Auto-prefill page mặc định khi chọn account/publish type Facebook.
  - Bổ sung test cho helper client load pages.
- Out of scope:
  - Thay đổi API contract backend `facebook-pages`.
  - Quản trị Facebook Pages ngoài flow publish.

## 4. Input / Output

- Input: Chọn social account + publish type tại Workspace Inspector.
- Output mong đợi: User chọn được Facebook Page từ dropdown thay vì nhập ID thủ công.

## 5. Acceptance Criteria

1. Với node `social.publish` và publish type Facebook, Inspector hiển thị `Facebook Page` dropdown.
2. Dropdown gọi API pages theo selected account và hiển thị danh sách page để chọn.
3. Khi đổi account sang Facebook, config tự chọn page mặc định (configured page hoặc page đầu).
4. Không còn bắt buộc user nhập tay `facebookPageId` text input ở Inspector.
5. Có test cho logic load page list client helper.

## 6. Technical Plan

1. Thêm helper client để fetch Facebook pages payload từ API.
2. Mở rộng state Workspace để cache/loading pages theo account.
3. Đổi runtime config field `Facebook Page ID` sang select + wiring default page.
4. Viết test cho helper mới và chạy focused test.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/social/facebook-pages-client.ts`
  - `src/lib/social/facebook-pages-client.test.ts`

## 8. Test Plan

1. Chạy unit test mới cho helper fetch pages.
2. Kiểm tra failure case payload không `ok`.
3. Chạy test liên quan workspace graph để tránh regressions runtime flow contracts.

## 9. Observability

- Metrics: none.
- Logs: không log token/secrets.
- Error codes: reuse API error từ endpoint `/facebook-pages`.

## 10. Risks & Rollback

- Risks: Load page list fail có thể khiến dropdown trống; cần giữ behavior fail-safe.
- Rollback strategy: Revert UI picker về text input hiện tại.

## 11. Deliverables

1. Workspace Inspector có Facebook Page dropdown.
2. Client helper + tests cho load pages.
3. Task + board + changelog + test evidence cập nhật đầy đủ.

## 12. Changelog Note

- Update Workspace social.publish runtime config to select Facebook Page from account page list.

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

- Assumptions: API `GET /api/social/accounts/[accountId]/facebook-pages` đang hoạt động như New Publish Record.
- Blockers: none.
- Verification evidence:
  - `social.publish` Inspector đổi từ `Facebook Page ID` text input sang `Facebook Page` dropdown.
  - Khi đổi social account/publish type sang Facebook, UI tự load page list từ API và prefill page mặc định.
  - Page list được cache theo account trong Workspace panel để tránh fetch lặp.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/facebook-pages-client.test.ts` (new)
- Test commands executed:
  - `npm run test -- --run src/lib/social/facebook-pages-client.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
- Test results summary:
  - Focused tests pass (19 tests / 2 files).
  - Build pass; warning cũ còn tồn tại ở `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
