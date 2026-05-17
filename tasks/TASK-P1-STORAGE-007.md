# [P1-STORAGE-007] Add Lightweight Folder Metadata and Asset Search

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: P1-STORAGE-007
- Phase: P1
- Target Phase: Storage organization MVP
- Domain: Storage Strategy
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Video nguồn chủ yếu đi vào từ Video Intake và Local Upload Intake, nhưng UI hiện chỉ có `Tags comma-separated`; asset video sau đó bị trộn lẫn và các picker không có search/filter theo nhóm nội dung.
- Bài toán cần giải quyết: Chuyển UX intake sang “folder logic” nhẹ, lưu cùng metadata của source/asset, cho artifact đã xử lý kế thừa folder gốc và thêm nhãn `processed`, đồng thời cho mọi video asset picker tìm kiếm theo folder/title/tags.
- Tài liệu liên quan:
  - `docs/domains/source-management.md`
  - `docs/domains/storage-strategy.md`
  - `docs/architecture/data-model.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thay input `Tags comma-separated` trên Video Intake và Local Upload Intake bằng `Folder`.
  - Cho phép chọn folder đã dùng hoặc gõ folder mới.
  - Lưu folder vào source và asset metadata; vẫn dùng tags hệ thống nhẹ (`raw`, `processed`) để truy vết.
  - Cho artifact Workspace kế thừa folder của source asset upstream và gắn thêm `processed`.
  - Thêm search theo folder/title/tags/source URL trong các video asset picker hiện có.
  - Hiển thị folder/tag context trong picker cards.
  - Cập nhật tests/docs/changelog/version.
- Out of scope:
  - Folder thật trên Google Drive.
  - Cây folder lồng nhau.
  - Bulk migration wizard cho asset cũ chưa có folder.

## 4. Input / Output

- Input:
  - User nhập/chọn folder khi intake video, ví dụ `kiến thức sức khoẻ`.
  - User mở video asset picker và gõ query như `kiến thức`.
- Output mong đợi:
  - Asset nguồn mang folder `kiến thức sức khoẻ` và tag `raw`.
  - Asset đã xử lý từ source đó vẫn mang folder `kiến thức sức khoẻ` và có thêm tag `processed`.
  - Picker lọc ra đúng asset liên quan khi tìm theo folder/title/tags.

## 5. Acceptance Criteria

1. Video Intake và Local Upload Intake hiển thị `Folder`, có thể chọn folder đã dùng hoặc nhập folder mới.
2. URL/local source mới lưu `folder`; asset nguồn mới lưu `metadata.folder` và `metadata.tags` gồm folder + `raw`.
3. Artifact lưu từ Workspace kế thừa folder upstream khi có và lưu tags gồm folder + `processed`.
4. Các picker video asset trong Workspace, Audio Transcript, Video Tools Lab, và Publish Records có ô search và lọc được theo folder/title/tags/source URL.
5. Search không phân biệt hoa/thường và hỗ trợ so khớp tiếng Việt không dấu.
6. Có test cho helper folder/search, validation/persistence metadata, và UI wiring; docs/changelog được cập nhật.

## 6. Technical Plan

1. Thêm helper thuần cho normalize folder, build system tags, và search asset.
2. Mở rộng intake types/validation/repository để lưu folder vào source + asset metadata và cung cấp danh sách folder đã biết.
3. Cập nhật intake UIs/API để dùng folder thay cho tags text tự do.
4. Cập nhật Workspace artifact persistence để kế thừa folder upstream + `processed`.
5. Thêm search UI vào mọi video asset picker và hiện folder/tag context.
6. Viết tests, cập nhật docs/changelog, bump version và verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/video-intake/*`
  - `src/lib/storage/*`
  - `src/app/api/video-intake/*`
  - `src/app/api/storage/*`
  - `src/features/video-intake/*`
  - `src/features/workspace/*`
  - `src/features/audio/*`
  - `src/features/video-processing/*`
  - `src/features/social/*`

## 8. Test Plan

1. Unit tests cho folder normalization, system tags, và accent-insensitive search.
2. Validation tests cho folder required/normalized behavior.
3. Metadata/repository tests cho asset source folder persistence.
4. Source-level UI tests cho Folder input và picker search wiring.
5. Run focused tests, `npm run build`, `npm run guard:version`.

## 9. Observability

- Metrics: none mới.
- Logs: giữ nguyên.
- Error code mới dự kiến: `VAL_SOURCE_FOLDER_REQUIRED`.

## 10. Risks & Rollback

- Risks:
  - Asset cũ không có folder sẽ vẫn chỉ tìm được bằng title/source URL/tags hiện hữu.
  - Workspace flow không có upstream `source.asset` phải fallback folder an toàn để validation local intake vẫn pass.
- Rollback strategy:
  - Revert folder/search UI + metadata helpers; dữ liệu mới thêm là additive và không phá schema cũ.

## 11. Deliverables

1. Folder UX trên hai intake pages.
2. Folder metadata propagation từ source → raw asset → processed artifact.
3. Searchable video asset pickers.
4. Updated docs/tests/changelog/version evidence.

## 12. Changelog Note

- Add lightweight folder metadata for intake videos, preserve it on processed artifacts, and make video asset pickers searchable.

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
  - `Folder` là group label logic cấp một, chưa phải provider folder thật.
  - Tags vẫn tồn tại như nhãn hệ thống metadata (`raw`, `processed`) thay vì input tự do do user nhập.
- Blockers:
- Verification evidence:
  - Added pure folder/search helpers with accent-insensitive matching and lifecycle tag normalization.
  - Intake forms now use `Folder` with known-folder suggestions; URL/local validators persist normalized folder metadata and generate lifecycle tags.
  - Workspace stored artifacts inherit upstream folder when available and persist `processed`; video asset pickers across Workspace/Audio/Video Tools/Social now expose search by title/folder/tags/source URL.
  - Focused tests pass; production build pass with existing ESLint circular-config warning; version guard pass.
  - Browser QA against `http://127.0.0.1:3000/video-intake` was not completed because the in-app browser policy blocked that local target in this session.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/storage/asset-folder.test.ts`
  - `src/lib/video-intake/validation.test.ts`
  - `src/lib/video-intake/local-validation.test.ts`
  - `src/lib/video-intake/asset-metadata.test.ts`
  - `src/lib/video-intake/media-resolver.test.ts`
  - `src/app/api/storage/folders/route.test.ts`
  - `src/features/video-intake/video-intake-panel.test.ts`
  - `src/features/video-intake/local-upload-intake-panel.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/social/publish-records-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/storage/asset-folder.test.ts src/lib/video-intake/validation.test.ts src/lib/video-intake/local-validation.test.ts src/lib/video-intake/asset-metadata.test.ts src/app/api/storage/folders/route.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/features/social/publish-records-panel.test.ts src/lib/video-intake/media-resolver.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (12 files / 58 tests).
  - Build pass; existing repo warning remains: ESLint circular-config serialization warning.
  - Version guard pass after bumping app version to `0.9.0`.
  - Browser QA not completed because the local target was blocked by in-app browser policy.
