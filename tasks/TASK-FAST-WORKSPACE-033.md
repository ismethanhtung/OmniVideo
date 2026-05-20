# [FAST-WORKSPACE-033] Improve Workspace Metadata Tags and Publish Records Thumbnail UX

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-033
- Phase: FAST
- Target Phase: Workspace social publishing polish
- Domain: Workspace / Social Publish
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User muốn node metadata để ý thêm nhóm tag nội dung review/tóm tắt/truyện/hoạt hình khi title/description/transcript cho thấy đúng loại nội dung đó.
- User muốn trang Publish Records hiển thị rõ Title, Hashtags, Caption đã generate và cho chọn thumbnail khi tạo record.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`, `docs/domains/thumbnail-studio.md`.

## 3. Scope

- In scope:
  - cập nhật generate Vietnamese metadata prompt/post-processing để thêm tag ưu tiên khi content match;
  - cập nhật Publish Records UI để hiện metadata title/hashtags/caption trong table/detail;
  - thêm thumbnail picker từ thumbnail library vào New Publish Record;
  - truyền `thumbnailAssetId` khi tạo publish record;
  - cập nhật tests, changelog, version evidence.
- Out of scope:
  - chỉnh sửa thumbnail trong Publish Records;
  - thay đổi publish adapter runtime ngoài việc gửi field đã có;
  - thay đổi schema DB mới.

## 4. Input / Output

- Input: Source metadata + transcript/generated metadata và thumbnail assets có sẵn.
- Output mong đợi: Metadata có tag ưu tiên phù hợp; Publish Records hiển thị metadata text và lưu thumbnail selection.

## 5. Acceptance Criteria

1. Metadata generation prompt nêu rõ nhóm tag ưu tiên: `review phim`, `review full`, `truyện ngắn`, `hoạt hình`, `review truyện`, `tóm tắt truyện`, `tóm tắt phim`, `hoạt hình trung quốc`.
2. Metadata post-processing tự thêm tag ưu tiên khi source/generated text cho thấy content là review/tóm tắt phim, truyện, truyện ngắn, hoạt hình hoặc hoạt hình Trung Quốc.
3. Publish Records table/detail hiển thị Title, Hashtags, Caption của record thay vì chỉ ẩn trong form/detail thiếu field.
4. New Publish Record có thể chọn thumbnail asset bằng visual picker và gửi `thumbnailAssetId` tới API.
5. Test coverage cập nhật cho metadata tag inference và Publish Records UI/source contract.

## 6. Technical Plan

1. Thêm helper infer preferred metadata tags trong `video-metadata.ts`, áp dụng sau khi parse AI response và bổ sung prompt rule.
2. Mở rộng `publish-records-panel.tsx` state/type/loadAll/form submit để load thumbnail assets, chọn thumbnail, hiển thị thumbnail summary.
3. Cập nhật table/detail metadata rendering cho title/hashtags/caption.
4. Thêm/cập nhật tests cho metadata helper và Publish Records UI contract.
5. Bump version, cập nhật changelog/board/task evidence và chạy verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-metadata.ts`
  - `src/features/social/publish-records-panel.tsx`
  - tests liên quan.

## 8. Test Plan

1. Unit/source tests: `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/social/publish-records-panel.test.ts`
2. Failure cases cần thử: metadata không match preferred tags không bị thêm tag sai; form submit gửi thumbnail only when selected.
3. Kết quả mong đợi: tests pass, build pass nếu chạy được, version guard pass.

## 9. Observability

- Metrics: không thêm.
- Logs: không thêm.
- Error codes: không thêm.

## 10. Risks & Rollback

- Risks: tag inference deterministic có thể thêm tag rộng hơn mong muốn nếu transcript chứa tín hiệu mơ hồ.
- Rollback strategy: revert task patch để quay về prompt/Publish Records UI trước đó.

## 11. Deliverables

1. Metadata preferred tag generation.
2. Publish Records metadata display.
3. Publish Records thumbnail picker + payload wiring.
4. Tests/changelog/task evidence.

## 12. Changelog Note

- Improve Workspace-generated metadata tags and Publish Records metadata/thumbnail UX.

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
  - Preferred tags are stored as plain tag strings without `#`, consistent with existing hashtag storage.
  - Thumbnail assets come from existing `/api/storage/thumbnail-assets` API.
- Blockers:
  - Browser automation rejected opening `http://localhost:3001/publish-records` due local browser policy; UI verification relies on build + source tests.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/social/publish-records-panel.test.ts` pass (2 files / 7 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains).
  - `npm run guard:version` pass.
  - Dev server started on `http://localhost:3001` after port `3000` was already in use.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-metadata.test.ts`
  - `src/features/social/publish-records-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/social/publish-records-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass: 2 files / 7 tests.
  - Build pass with existing ESLint circular-config warning.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
