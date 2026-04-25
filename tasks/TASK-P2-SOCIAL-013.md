# [P2-SOCIAL-013] Fix Publish Records UX, YouTube privacy, and Shorts guardrails

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

- Task ID: P2-SOCIAL-013
- Phase: P2
- Target Phase: P2
- Domain: Social Publish
- Task Type: Bugfix/Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Publish Records modal mặc định schedule, không phản hồi rõ khi upload đang chạy, có thể khiến user bấm publish nhiều lần. YouTube upload cũng hard-code private và chưa chặn video không đủ điều kiện Shorts.
- Bài toán cần giải quyết: publish UX phải chống double-submit, cho chọn visibility, và không upload nhầm Shorts thành video thường.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/architecture/data-model.md`

## 3. Scope

- In scope: Publish Records modal UX, `privacyStatus`, YouTube Shorts eligibility validation, tests, docs.
- Out of scope: YouTube Studio post-upload polling, automatic crop/trim, thumbnail/subtitle upload, non-YouTube publish adapters.

## 4. Input / Output

- Input: user tạo publish record từ storage asset.
- Output mong đợi: modal mặc định `Publish now`, có feedback khi đang upload, submit disabled trong request, privacy được lưu/gửi lên YouTube, Shorts chỉ upload khi asset đủ điều kiện.

## 5. Acceptance Criteria

1. Form mặc định chọn `Publish now`.
2. `Scheduled At` chỉ hiển thị khi chọn `Schedule / plan`.
3. Khi submit, modal hiển thị trạng thái đang upload/create và disabled submit/cancel để tránh double publish.
4. User chọn được YouTube privacy `private`, `unlisted`, `public`.
5. YouTube upload dùng `privacyStatus` đã chọn.
6. `youtube_short` bị chặn nếu thiếu metadata duration/width/height, dài hơn 3 phút, hoặc video ngang.
7. Tests cover privacy validation, upload metadata, Shorts eligible path, Shorts invalid aspect ratio.

## 6. Technical Plan

1. Extend publish record input/document with `privacyStatus`.
2. Add UI form state for privacy and submit/loading lock.
3. Add YouTube Shorts guardrails before asset download/upload.
4. Add `#Shorts` hint to short upload description when absent.
5. Update docs/task/changelog and run verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/social/publish-records-panel.tsx`, `src/lib/social/*`

## 8. Test Plan

1. Unit tests for publish record privacy validation.
2. Unit tests for YouTube upload privacy metadata.
3. Unit tests for Shorts eligibility and invalid aspect ratio.
4. `npm run test`.
5. `npm run build`.

## 9. Observability

- Publish record now stores `privacyStatus`.
- UI shows upload/create status inside modal.
- Shorts validation errors use `VAL_YOUTUBE_SHORT_*`.

## 10. Risks & Rollback

- Risks: assets without width/height/duration metadata cannot be uploaded as Shorts until metadata extraction is improved.
- Rollback strategy: remove Shorts guardrails only if a later metadata probe is added before upload.

## 11. Deliverables

1. Safer Publish Records modal.
2. YouTube privacy selection.
3. YouTube Shorts upload guardrails.

## 12. Changelog Note

- Fix Publish Records double-submit UX, add YouTube privacy selection, and block invalid YouTube Shorts uploads.

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

- [x] Có câu hỏi nghiên cứu rõ
- [x] Có kết quả/khuyến nghị cụ thể
- [x] Có quyết định next step
- [x] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: YouTube API uploads use the same `videos.insert` endpoint for Shorts; classification is driven by video duration/aspect ratio.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/validation.test.ts`, `src/lib/social/youtube-upload.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (93 tests / 22 files); build pass with existing unused `Image` warning in `src/features/workspace/display-preferences-panel.tsx`.
