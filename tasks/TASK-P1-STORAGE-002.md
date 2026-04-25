# [P1-STORAGE-002] Storage asset controls, resolver quality metadata, and Douyin URL support

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

- Task ID: P1-STORAGE-002
- Phase: P1
- Target Phase: P1
- Domain: Storage / Video Pipeline
- Task Type: Feature/Bugfix
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Storage Library hiện không mở được Telegram private storage, detail row làm bảng dài, quality selector chưa thể hiện rõ quality thực tế, và Douyin modal URL bị yt-dlp báo unsupported.
- Bài toán cần giải quyết: bổ sung control tải asset từ storage, detail dạng modal, metadata chất lượng thực tế, và normalize Douyin URL trước resolver.
- Tài liệu liên quan: `docs/domains/storage-strategy.md`, `docs/domains/video-pipeline.md`

## 3. Scope

- In scope:
  - Thêm API download asset từ Telegram/Drive khi có provider credentials.
  - Chuyển Storage Library detail row sang modal.
  - Bổ sung metadata format/resolution thực tế từ resolver.
  - Normalize Douyin `modal_id` URL sang URL extractor-friendly.
  - Làm rõ giới hạn quality khi pipeline upload bằng single direct media URL.
- Out of scope:
  - Download + mux video/audio stream bằng ffmpeg để đạt mọi quality DASH.
  - Xóa asset từ provider storage.

## 4. Input / Output

- Input: Stored asset metadata, selected quality, Douyin/TikTok page URL.
- Output mong đợi: Storage Library có nút download/control; detail modal; metadata hiển thị requested/effective quality; Douyin modal URL được thử bằng URL chuẩn hóa.

## 5. Acceptance Criteria

1. Storage Library `Detail` mở modal thay vì mở rộng row.
2. Storage Library có action `Download` dùng API nội bộ cho Telegram/Drive asset khi khả dụng.
3. Asset metadata lưu thêm format/resolution thực tế từ resolver.
4. Douyin URL dạng `jingxuan?modal_id=...` được normalize trước khi gọi yt-dlp.
5. Test/lint/build pass.

## 6. Technical Plan

1. Mở rộng resolver payload/type/asset metadata với effective quality fields.
2. Thêm storage asset download helper + API route.
3. Refactor Storage Library UI sang modal detail và action download/open.
4. Thêm test regression cho Douyin URL normalization và storage download URL behavior.
5. Verify bằng test/lint/build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/*`, `src/lib/storage/*`, `src/features/storage/*`, `src/app/api/storage/assets/*`

## 8. Test Plan

1. `npm run test`
2. `npm run lint`
3. `npm run build`

## 9. Observability

- Download failures trả JSON error code rõ ràng.
- Resolver error giữ `VID_RESOLVER_FAILED` nhưng message giảm nhiễu warning.

## 10. Risks & Rollback

- Risks: Telegram private chat không có web link công khai; download chỉ hoạt động khi bot token còn quyền với file.
- Rollback strategy: bỏ route download và quay về display-only Storage Library.

## 11. Deliverables

1. Download/control action cho stored assets.
2. Detail modal cho Storage Library.
3. Effective quality metadata.
4. Douyin modal URL normalization.

## 12. Changelog Note

- Thêm asset download controls, detail modal, effective quality metadata và normalize Douyin modal URL cho resolver.

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
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: chất lượng cao hơn 720p trên YouTube thường cần DASH video/audio tách riêng; scope hiện tại ưu tiên single URL upload không mux.
- Blockers: none
- Verification evidence: pending

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/internal-resolver.test.ts`
  - `src/lib/video-intake/media-resolver.test.ts`
  - `src/lib/video-intake/asset-metadata.test.ts`
  - `src/lib/storage/storage-location.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 9 test files / 31 tests pass; lint pass; build pass.

## 16. Outcome Summary

- Storage Library detail now opens in a modal and includes requested vs actual quality metadata.
- Storage Library now exposes a `Download` action through `/api/storage/assets/[assetId]/download`.
- Telegram private storage is controllable through bot-token download even when no public `t.me` URL can be inferred.
- Resolver now records actual format fields (`height`, `resolution`, `formatId`, codecs) into asset metadata.
- Douyin `jingxuan?modal_id=...` URLs are normalized to `/video/{modal_id}` before extraction.
- Resolver error output strips Python deprecation noise and adds cookie guidance when Douyin/TikTok require fresh cookies.
