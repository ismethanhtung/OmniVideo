# P2-SOURCE-001 Inspiration Vault

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

- Task ID: P2-SOURCE-001
- Phase: P2
- Target Phase: P2
- Domain: Source Management
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: Người vận hành cần một nơi lưu và khai thác ý tưởng, link, keyword, nguồn video từ Douyin/Bilibili/các nền tảng khác để phục vụ pipeline nội dung.
- Bài toán cần giải quyết: Việc lưu nguồn thủ công vào form lớn gây chậm; cần quick capture ở topbar, tự phân loại input, quản lý trạng thái đã khai thác và xem lại theo nhóm.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/domains/source-management.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Thêm navigation/page Inspiration Vault, quick capture input ở topbar, logic phân loại URL/keyword/note, UI quản lý item, checkbox exploited, filter/search, local persistence MVP.
- Out of scope: Đồng bộ MongoDB/server API, crawler metadata thật từ Douyin/Bilibili, tự tải video, tích hợp trực tiếp vào workspace pipeline.

## 4. Input / Output

- Input: Free-form text trong topbar hoặc trong trang Inspiration Vault, gồm URL, keyword, creator name hoặc note.
- Output mong đợi: Item được lưu vào vault đúng category, hiển thị trên trang vault, có thể đánh dấu exploited, lọc/tìm kiếm và xoá.

## 5. Acceptance Criteria

1. Topbar có quick capture input nhỏ, nhập URL Bilibili/Douyin hoặc keyword/text sẽ lưu được item vào Inspiration Vault mà không rời trang hiện tại.
2. Hệ thống tự phân loại URL thành Link/Video Source và text không phải URL thành Keyword/Note với platform detection cho Bilibili/Douyin/YouTube/TikTok khi có thể.
3. Trang Inspiration Vault hiển thị item theo dashboard phù hợp UI hiện tại, có search/filter, counters, trạng thái exploited/unexploited và checkbox đánh dấu đã khai thác.
4. Dữ liệu MVP persist qua localStorage để reload vẫn giữ vault.
5. Có test cho classification/storage logic gồm happy path URL, keyword và invalid/empty input.

## 6. Technical Plan

1. Đọc app shell/navigation/topbar/page patterns để gắn route mới đúng phong cách hệ thống.
2. Tạo module domain `src/lib/inspiration-vault` cho type, classify, persistence reducer/helpers và test unit.
3. Thêm panel `src/features/inspiration-vault` với UI quản lý vault, dùng shared local event để nhận quick capture từ topbar.
4. Cập nhật topbar, content router/navigation để expose capture input và route.
5. Chạy targeted tests và build/typecheck nếu khả thi, cập nhật changelog/task board/evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout`, `src/features/inspiration-vault`, `src/lib/inspiration-vault`, tests liên quan.

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/inspiration-vault/*.test.ts src/components/layout/navigation.test.ts`.
2. Failure cases cần thử: empty/whitespace input không tạo item; malformed URL-like input fallback thành keyword/note thay vì crash.
3. Kết quả mong đợi: classification đúng category/platform, storage reducer update exploited/delete đúng, navigation có route hợp lệ.

## 9. Observability

- Metrics: Không thêm metrics runtime trong MVP local-only.
- Logs: Không log dữ liệu user capture để tránh lộ nguồn ý tưởng.
- Error codes: Không thêm API error codes vì chưa có server route.

## 10. Risks & Rollback

- Risks: localStorage chỉ dùng cho single browser, chưa sync DB; auto-classification có thể sai với platform URL mới.
- Rollback strategy: Revert route/panel/topbar changes và xoá local module nếu UX không phù hợp.

## 11. Deliverables

1. Inspiration Vault page.
2. Topbar quick capture input.
3. Local classification/persistence helpers.
4. Unit tests và verification evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Thêm Inspiration Vault với quick capture topbar, tự phân loại link/keyword và quản lý trạng thái đã khai thác.

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

- Assumptions: MVP dùng localStorage vì yêu cầu là thử trang và quick capture; DB/API sẽ là follow-up khi cần đồng bộ lâu dài.
- Blockers: None.
- Verification evidence: Targeted tests pass; production build pass. Warnings còn lại nằm ở file ngoài scope đã có sẵn.
- Files changed: `src/lib/inspiration-vault/inspiration-vault.ts`, `src/lib/inspiration-vault/inspiration-vault.test.ts`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `src/components/layout/topbar.tsx`, `src/components/layout/navigation.ts`, `src/components/layout/types.ts`, `src/components/layout/content-router.tsx`, `src/components/layout/navigation.test.ts`, `tasks/board.md`, `tasks/P2-SOURCE-001.md`, `changelog/changelog.md`.
- Residual risks: Vault hiện chỉ persist local browser, chưa có MongoDB sync/cross-device; platform detection là heuristic MVP.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/inspiration-vault/inspiration-vault.test.ts`, `src/components/layout/navigation.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`; `npm run build`; `git diff --check`.
- Test results summary: Unit/navigation tests pass (2 files / 14 tests). Build pass. `git diff --check` pass. Build reports existing warnings outside P2-SOURCE-001 scope in audio/storage/video-tools/display panels.
