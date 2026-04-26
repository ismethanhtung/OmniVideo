# [P2-SOCIAL-019] Social Publishing UX Progress and Records Controls

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

- Task ID: P2-SOCIAL-019
- Phase: P2
- Target Phase: Social Platform MVP
- Domain: Social Account Management
- Task Type: Feature/Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Social publishing UX đang thiếu xác nhận delete, thiếu filter/pagination, publish-now bắt user giữ modal, chưa có topbar progress center, Published Content bị duplicate React keys, Drive setup layout chưa cùng chuẩn, và app version vẫn ở 0.1.0.
- Bài toán cần giải quyết: Chuẩn hóa thao tác dài chạy nền, giúp user theo dõi tiến trình rõ ràng và sửa các lỗi regression trực tiếp trong social/storage UI.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/governance/versioning-rules.md`
  - `docs/operations/tutorial-docs.md`

## 3. Scope

- In scope:
  - Add confirmation modal before deleting Social Accounts.
  - Add Publish Records pagination and filters for platform/status.
  - Add shared topbar progress center and connect publish-now/local-upload flows to it.
  - Allow New Publish Record modal to be hidden while publish-now continues in background.
  - Fix Published Content duplicate key warning.
  - Move Drive OAuth guidance into a right-side panel layout matching social setup guidance.
  - Bump app version from `0.1.0`.
- Out of scope:
  - Server-side durable background worker queue.
  - True byte-level upload progress streaming from backend adapters.
  - Shopee real publish adapter.

## 4. Input / Output

- Input: User feedback list for Social Accounts, Publish Records, progress UX, Published Content, versioning, and Drive setup layout.
- Output mong đợi: UI safer, clearer, filterable, paginated, and progress-aware.

## 5. Acceptance Criteria

1. Social Account delete asks for explicit confirmation before calling DELETE.
2. Publish Records supports page navigation plus platform/status filters backed by API query params.
3. Publish-now multi-destination flow shows percent/progress bar and can continue after closing the modal.
4. Topbar has a progress button that opens a modal of active/recent long-running tasks.
5. Local Upload Intake registers visible background progress.
6. Published Content asset footprint chips have unique React keys even with duplicate failed destination statuses.
7. Drive OAuth setup guidance is displayed on the right side of the provider modal.
8. App version source-of-truth is bumped and UI remains package-driven.
9. Tests cover changed API/query/progress behavior and regression risk.

## 6. Technical Plan

1. Add shared client progress store and topbar modal.
2. Wire publish-now and local upload submit flows into progress store with visible progress bars.
3. Update social records repository/API for filters and pagination.
4. Patch delete confirmation, duplicate keys, Drive layout, and version files.
5. Add tests, run focused/full verification, and update changelog/board/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/topbar.tsx`
  - `src/features/social/*`
  - `src/features/storage/storage-providers-panel.tsx`
  - `src/features/video-intake/local-upload-intake-panel.tsx`
  - `src/lib/social/repository.ts`
  - `src/app/api/social/publish-records/route.ts`
  - `src/lib/ui/*`
  - version/changelog/task files.

## 8. Test Plan

1. Unit/API tests for Publish Records filter/pagination query handling.
2. Unit tests for progress store state transitions.
3. Regression verification for Published Content duplicate key logic via deterministic key helper.
4. Run focused tests and `npm run test`; run build if time permits.

## 9. Observability

- Metrics: progress center displays active/recent local UI tasks.
- Logs: no secrets/tokens logged.
- Error codes: preserve existing social/local upload error codes.

## 10. Risks & Rollback

- Risks: Client progress is milestone-based until backend worker progress events exist.
- Rollback strategy: remove progress-center wiring and fall back to existing page-level status messages.

## 11. Deliverables

1. Safer Social Accounts delete UX.
2. Filtered/paginated Publish Records.
3. Topbar progress center and background publish/local upload feedback.
4. Published Content key fix, Drive layout adjustment, version bump.
5. Tests/changelog/task evidence.

## 12. Changelog Note

- Improve Social publishing UX with delete confirmation, Publish Records filters/pagination, shared progress center, duplicate-key fix, Drive guidance layout, and version bump.

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

## 14. Execution Notes

- Assumptions:
  - Progress center can start as client-side milestone progress because publish/local upload APIs are currently synchronous request flows.
- Blockers:
- Verification evidence:
  - Social Account delete now opens a confirm modal before DELETE.
  - Publish Records now calls API with page/pageSize/platform/status and renders Previous/Next controls plus filters.
  - Publish-now registers a topbar progress task, updates by completed destination count, and the modal can be hidden while requests continue.
  - Local Upload Intake registers topbar progress milestones for upload/pipeline submission.
  - Published Content footprint keys include index/publishedAt fallback to avoid duplicate failed chips.
  - Drive OAuth setup guidance is now a right-side panel in the Storage Provider modal.
  - App version source-of-truth bumped to `0.2.0`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ui/progress-center.test.ts`
  - `src/app/api/social/publish-records/route.test.ts`
  - `src/features/social/published-content-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/app/api/social/publish-records/route.test.ts src/features/social/published-content-panel.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass: 3 files / 5 tests.
  - Full test suite pass: 33 files / 128 tests.
  - Build pass; existing warnings remain for unused imports in `src/components/layout/navigation.ts` and `src/features/workspace/display-preferences-panel.tsx`.
