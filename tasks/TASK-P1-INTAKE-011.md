# [P1-INTAKE-011] Support raw cookie/header env for TikTok/Douyin resolver

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: P1-INTAKE-011
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline / Resolver
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context

- Lý do: User có raw cookie/header block từ browser nhưng không muốn tạo file cookies hoặc export theo format Netscape.
- Bài toán cần giải quyết: cho phép resolver nhận trực tiếp cookie/header qua env để chạy TikTok/Douyin intake.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Bổ sung env mới cho resolver nhận raw cookie/header text.
  - Parse được cả dạng `cookie=<...>` và block key-value nhiều dòng từ DevTools.
  - Cập nhật error guidance + docs `.env.example`/`README.md`.
  - Thêm regression tests cho parser mới.
- Out of scope:
  - Secure vault/secret manager.
  - Thay đổi external resolver endpoint.

## 4. Input / Output

- Input: raw cookie/header block copy từ browser.
- Output mong đợi: chỉ cần paste vào env là resolver dùng được cho TikTok/Douyin.

## 5. Acceptance Criteria

1. Có env config mới để nhận cookie/header thẳng từ text raw.
2. Parser chấp nhận ít nhất:
   - chuỗi cookie 1 dòng.
   - block nhiều dòng dạng `cookie` + giá trị, kèm các header khác.
3. Resolver merge header env này vào extraction options và không phá behavior cũ (`VIDEO_RESOLVER_COOKIES_FILE` / `VIDEO_RESOLVER_COOKIES_FROM_BROWSER`).
4. Có regression test cho parser mới và test pass.

## 6. Technical Plan

1. Mở rộng `internal-resolver.py` để parse env raw headers.
2. Cập nhật message guidance `internal-resolver.ts`.
3. Bổ sung tests `internal-resolver-py.test.py` + update TypeScript tests nếu cần.
4. Cập nhật `.env.example`, `README.md`, task evidence, board và changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.py`, `src/lib/video-intake/internal-resolver.ts`, `src/lib/video-intake/internal-resolver-py.test.py`, `README.md`, `.env.example`

## 8. Test Plan

1. Chạy python regression tests cho resolver parser.
2. Chạy `npm run test`.
3. Chạy `npm run lint` và `npm run build`.

## 9. Observability

- Giữ error code `VID_RESOLVER_FAILED`.
- Error guidance nêu rõ env mới nhận raw cookie/header.

## 10. Risks & Rollback

- Risks: raw cookie hết hạn nhanh hoặc user paste sai format.
- Rollback strategy: giữ đường cấu hình cũ bằng cookies file/browser fallback.

## 11. Deliverables

1. Resolver support env raw cookie/header.
2. Regression tests.
3. Docs/changelog/task evidence đầy đủ.

## 12. Changelog Note

- Thêm cấu hình env raw cookie/header cho resolver TikTok/Douyin để không cần file cookies.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: user sẽ paste cookie/header raw vào env và restart app.
- Blockers: none
- Verification evidence: pending

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: pending
- Test commands executed: pending
- Test results summary: pending
