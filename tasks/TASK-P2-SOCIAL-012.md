# [P2-SOCIAL-012] Enable YouTube publish-now upload adapter

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

- Task ID: P2-SOCIAL-012
- Phase: P2
- Target Phase: P2
- Domain: Social Publish
- Task Type: Feature/Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: UI `Publish now` tạo publish record nhưng chưa đăng video thật lên YouTube, gây hiểu nhầm nghiêm trọng.
- Bài toán cần giải quyết: khi user chọn YouTube connected account và bấm `Publish now`, hệ thống phải upload thật hoặc trả lỗi rõ ràng trên publish record.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/architecture/data-model.md`

## 3. Scope

- In scope: YouTube resumable upload adapter, publish-now execution path, failed/published record status, UI copy, docs, tests.
- Out of scope: Facebook/TikTok/Shopee publish adapters, background scheduler, refresh-token renewal, public visibility automation.

## 4. Input / Output

- Input: video asset có thể download, YouTube social account `connected`, publish record `publishMode=publish_now`.
- Output mong đợi: YouTube upload thật bằng `youtube.upload` token; record chuyển `published` kèm `platformPostId` hoặc `failed` kèm `errorCode`/`errorDetail`.

## 5. Acceptance Criteria

1. `POST /api/social/publish-records` với `publish_now` và YouTube connected account gọi upload adapter.
2. Upload thành công chuyển record sang `published`, lưu `platformPostId` và `publishedAt`.
3. Upload thất bại chuyển record sang `failed`, lưu lỗi để UI hiển thị.
4. Platform chưa có adapter không được giả vờ đăng thành công.
5. UI modal/record table diễn đạt đúng rằng YouTube upload thật, platform khác chưa có adapter.

## 6. Technical Plan

1. Thêm `uploadVideoToYouTube` dùng YouTube resumable upload API.
2. Thêm `executePublishNow` trong social repository.
3. Gọi `executePublishNow` sau khi tạo publish record nếu `publishMode=publish_now`.
4. Cập nhật capability/docs/copy cho trạng thái adapter YouTube.
5. Thêm unit tests cho upload adapter happy path, missing access token và refresh-token flow.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/*`, `src/app/api/social/publish-records/route.ts`, `src/features/social/publish-records-panel.tsx`

## 8. Test Plan

1. Unit test YouTube resumable upload happy path.
2. Unit test missing access token failure.
3. `npm run test`.
4. `npm run build`.

## 9. Observability

- Publish record status: `queued`, `published`, `failed`.
- Error codes: `AUTH_YOUTUBE_ACCESS_TOKEN_MISSING`, `PRV_SOCIAL_PUBLISH_ADAPTER_NOT_IMPLEMENTED`, `PRV_YOUTUBE_UPLOAD_FAILED`, storage download errors.

## 10. Risks & Rollback

- Risks: initial adapter reads video into memory before upload; large-file streaming optimization remains future work.
- Rollback strategy: disable `executePublishNow` call and return to planned records only.

## 11. Deliverables

1. YouTube publish-now upload adapter.
2. Publish record execution path with visible success/failure status.
3. Docs and task evidence.

## 12. Changelog Note

- Enable YouTube `Publish now` to upload real videos and update publish records with published/failed status.

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

- Assumptions: YouTube uploads should start as `private` so user can review copyright/visibility in YouTube Studio.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/youtube-upload.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (90 tests / 22 files); build pass with existing unused `Image` warning in `src/features/workspace/display-preferences-panel.tsx`.
