# [P2-SOCIAL-007] Social account modal guidance and publish-now planning

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

- Task ID: P2-SOCIAL-007
- Phase: P2
- Target Phase: P2
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User feedback yêu cầu Add Account/Plan Publish mở bảng modal như Storage Providers, có hướng dẫn từng nền tảng, và có lựa chọn đăng ngay.
- Bài toán cần giải quyết: social setup khó nếu chỉ đưa token fields trống; publish planning thiếu immediate intent.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Social account form chuyển sang modal.
  - Platform-specific guide trong modal.
  - Publish Records form chuyển sang modal.
  - Thêm `publishMode=publish_now` và `publishNow` API input.
  - Docs giải thích OAuth là hướng đúng, manual token chỉ là fallback.
- Out of scope:
  - OAuth connect flow thật.
  - Real platform publish adapter.

## 4. Input / Output

- Input: user tạo/sửa social account hoặc tạo publish record.
- Output mong đợi: user được hướng dẫn rõ hơn và có thể tạo record immediate intent.

## 5. Acceptance Criteria

1. Add Account mở modal thay vì form inline dưới bảng.
2. Modal account hiển thị hướng dẫn khác nhau theo Facebook/TikTok/Shopee/YouTube.
3. Plan Publish mở modal thay vì form inline.
4. Publish Records có lựa chọn `Publish now`; API lưu `publishMode=publish_now` và `scheduledAt=now`.
5. Docs nêu rõ manual token không phải workflow dài hạn, OAuth refresh flow là hướng đúng.

## 6. Technical Plan

1. Refactor social account form UI sang modal.
2. Add platform guide map and render guide side panel.
3. Refactor publish record form UI sang modal.
4. Extend publish record validation/types/repository with `publishMode`.
5. Update docs, tests, changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/social/*`, `src/lib/social/*`, `docs/domains/social-account-management.md`, `docs/architecture/data-model.md`

## 8. Test Plan

1. Unit test publish-now validation.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Publish records distinguish immediate intent via `publishMode`.

## 10. Risks & Rollback

- Risks: User may expect real posting from `Publish now`.
- Rollback strategy: UI/docs explicitly state real platform posting remains deferred until adapters are enabled.

## 11. Deliverables

1. Account modal with platform guidance.
2. Publish planning modal with publish-now option.
3. Docs and test evidence.

## 12. Changelog Note

- Improve Social Control Center UX with modal setup guidance and publish-now planning intent.

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

- Assumptions: `Publish now` is immediate intent only until real adapters exist.
- Blockers: none
- Verification evidence: filled after verification commands.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/validation.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (85 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
