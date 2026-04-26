# [P2-SOCIAL-018] Support Multi-Destination Publish Planning in New Publish Record

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

- Task ID: P2-SOCIAL-018
- Phase: P2
- Target Phase: Social Platform MVP
- Domain: Social Account Management
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Publish modal hiện chỉ tạo 1 record cho 1 platform/page mỗi lần; user cần 1 video đăng nhiều nền tảng và nhiều Facebook pages trong một thao tác.
- Bài toán cần giải quyết: UX cần đơn giản nhưng hỗ trợ multi-destination; runtime phải tạo nhiều publish records tương ứng.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/operations/tutorial-docs.md`

## 3. Scope

- In scope:
  - Rework `New Publish Record` UX để thêm nhiều destination trong một form submit.
  - Mỗi destination hỗ trợ chọn account, publish type, và Facebook Page nếu platform là Facebook.
  - Submit một lần tạo nhiều publish records (and publish-now attempts) theo danh sách destination.
  - Hiển thị kết quả tổng hợp success/failure.
  - Add/update tests.
- Out of scope:
  - Worker-based batch queue orchestration.
  - Schedule matrix theo từng destination timestamp khác nhau.

## 4. Input / Output

- Input: 1 video asset + shared metadata + nhiều destinations.
- Output mong đợi: hệ thống tạo nhiều publish records đúng target.

## 5. Acceptance Criteria

1. User có thể thêm nhiều destinations trong cùng modal.
2. 1 destination tương ứng 1 publish request hợp lệ.
3. Facebook destination hỗ trợ chọn Page riêng, kể cả nhiều page trong cùng account.
4. Submit một lần tạo nhiều records và trả feedback tổng hợp.
5. Tests cover new validation/flow.

## 6. Technical Plan

1. Refactor publish form state to destinations array.
2. Add destination row UI + add/remove actions.
3. Update submit handler to batch-create records.
4. Add tests and run full verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- If Yes, module impacted:
  - `src/features/social/publish-records-panel.tsx`
  - social API/type/validation where needed.
  - tests/docs/changelog/tasks.

## 8. Test Plan

1. Unit/contract tests for publish input validation updates.
2. API tests for publish-record create path.
3. `npm run test` and `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: no secret/token logging.

## 10. Risks & Rollback

- Risks: UI complexity increases if destination matrix is not constrained.
- Rollback strategy: revert to single-destination form.

## 11. Deliverables

1. Multi-destination publish form.
2. Batch publish create behavior.
3. Tests/docs/changelog/task updates.

## 12. Changelog Note

- Add multi-destination publish planning in New Publish Record for one-video multi-platform and multi-page posting.

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
- Blockers:
- Verification evidence:
  - New Publish Record now supports multiple destinations in one submit.
  - Each destination can select account + publish type; Facebook destinations require explicit page selection and support multiple pages under the same account.
  - One submit now creates multiple publish records with aggregated result messaging.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/social/publish-records-panel.tsx`
  - `src/lib/social/types.ts`
  - `src/lib/social/validation.ts`
  - `src/lib/social/repository.ts`
  - `src/lib/social/facebook-upload.ts`
  - `src/app/api/social/accounts/[accountId]/facebook-pages/route.ts`
  - `src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts`
  - `src/lib/social/validation.test.ts`
  - `src/lib/social/facebook-auth.test.ts`
  - `src/lib/social/facebook-upload.test.ts`
  - `src/lib/social/tiktok-upload.test.ts`
  - `src/lib/social/youtube-upload.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/social/connection-checks.test.ts src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/validation.test.ts src/app/api/social/publish-records/route.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts'`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (30 tests / 6 files).
  - Full suite pass (124 tests / 31 files).
  - Build pass with existing non-blocking lint warnings in `navigation.ts` and `display-preferences-panel.tsx`.
