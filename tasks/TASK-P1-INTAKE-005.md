# [P1-INTAKE-005] Built-in media resolver with local yt-dlp runtime

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

- Task ID: P1-INTAKE-005
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner không có `VIDEO_RESOLVER_ENDPOINT` ngoài và muốn resolver chạy ngay trong app hiện tại.
- Bài toán cần giải quyết: cài local extractor runtime và xây built-in resolver trong Next.js để URL page như YouTube/TikTok tự resolve thành direct media URL.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/architecture/system-overview.md`

## 3. Scope

- In scope:
  - Cài `yt-dlp` runtime cục bộ trong workspace.
  - Xây built-in resolver gọi local Python runtime từ app.
  - Fallback order: direct URL -> external endpoint nếu có -> internal resolver.
  - Cập nhật tests/docs/changelog/task evidence.
- Out of scope:
  - Chạy thêm service riêng.
  - Hỗ trợ mọi site ngoài phạm vi extractor runtime hiện có.

## 4. Input / Output

- Input: page URL từ YouTube/TikTok/Facebook/Bilibili.
- Output mong đợi: direct media URL + metadata để intake upload tiếp.

## 5. Acceptance Criteria

1. Không cần `VIDEO_RESOLVER_ENDPOINT` để resolve YouTube/TikTok khi local resolver runtime khả dụng.
2. Resolver chạy trong app hiện tại, không cần server thứ hai.
3. Khi local runtime thiếu hoặc fail, lỗi trả rõ nguyên nhân.
4. Test/lint/build pass.

## 6. Technical Plan

1. Cài `yt-dlp` vào workspace local runtime path.
2. Thêm script/helper nội bộ để gọi runtime và parse JSON output.
3. Cập nhật `media-resolver.ts` sang fallback chain phù hợp.
4. Thêm tests cho parse/fallback logic và cập nhật docs/changelog/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/media-resolver.ts` và resolver runtime files.

## 8. Test Plan

1. Unit tests cho fallback resolver logic.
2. `npm run test`
3. `npm run lint`
4. `npm run build`

## 9. Observability

- Error codes: `VID_RESOLVER_FAILED`, `VID_RESOLVER_EMPTY_DIRECT_URL`, `VID_RESOLVER_RUNTIME_MISSING`.

## 10. Risks & Rollback

- Risks: resolver phụ thuộc external site behavior và local runtime.
- Rollback strategy: quay về external endpoint only path.

## 11. Deliverables

1. Built-in resolver runtime.
2. Media resolver fallback chain mới.
3. Updated docs/changelog/task evidence.

## 12. Changelog Note

- Thêm built-in media resolver trong app bằng local `yt-dlp` runtime, bỏ phụ thuộc bắt buộc vào `VIDEO_RESOLVER_ENDPOINT`.

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

- Assumptions: Python 3 khả dụng trên máy local và có thể dùng như local runtime từ Next.js server.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass; smoke test built-in resolver resolved a real YouTube URL successfully.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/internal-resolver.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 7 test files / 20 tests pass; lint pass; build pass.
