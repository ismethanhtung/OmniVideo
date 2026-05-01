# [FAST-UX-006] Refactor Leftbar Navigation to Real App Routes

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-UX-006
- Phase: FAST
- Target Phase: Routing UX hardening
- Domain: UI/UX
- Task Type: Refactor
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Leftbar hiện đổi panel theo state nội bộ, chưa phản ánh thành page route thật.
- Bài toán cần giải quyết: Mỗi item trong leftbar phải điều hướng bằng URL route để có thể reload/share/back-forward đúng ngữ nghĩa trang.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Refactor app shell để active section lấy từ route thay vì local section state.
  - Leftbar navigation chuyển sang route-based (`/<sectionId>`).
  - Giữ nguyên panel components hiện có, chỉ thay cơ chế routing.
  - Thêm/cập nhật tests cho navigation-route mapping.
- Out of scope:
  - Redesign UI leftbar/topbar.
  - Refactor logic nghiệp vụ bên trong từng feature panel.

## 4. Input / Output

- Input: Leftbar section ids trong `navigation registry`.
- Output mong đợi: Điều hướng thật bằng route cho từng section, URL đồng bộ với nội dung trang.

## 5. Acceptance Criteria

1. Mỗi leftbar item điều hướng đến route riêng `/<sectionId>`.
2. Reload trực tiếp một route hợp lệ vẫn hiển thị đúng panel tương ứng.
3. Route không hợp lệ fallback về `workspace`.
4. Event điều hướng nội bộ (`omnivideo:navigate`) vẫn hoạt động nhưng được map sang route.
5. Có test cập nhật cho route mapping/registry behavior.

## 6. Technical Plan

1. Bổ sung helper route mapping trong navigation registry.
2. Refactor `AppShell` dùng `next/navigation` để đọc/push route.
3. Cập nhật `Leftbar` click handling theo route path.
4. Thêm route file cho section path và cập nhật tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/components/layout/*`
  - `src/app/*`

## 8. Test Plan

1. Unit tests cho navigation route mapping helper.
2. Chạy focused tests cho layout/navigation.
3. Chạy full test suite nếu cần theo mức ảnh hưởng.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Một số flow đang bắn custom navigate event có thể lệch route nếu id không hợp lệ.
- Rollback strategy: fallback về `workspace` và giữ mapping guard trong helper.

## 11. Deliverables

1. Route-based leftbar navigation.
2. Updated tests cho navigation routing.
3. Task/changelog evidence.

## 12. Changelog Note

- Refactor leftbar from in-memory section switching to real route-based page navigation.

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
  - Vẫn giữ mô hình panel component hiện tại, chỉ thay lớp route.
- Blockers:
  - none.
- Verification evidence:
  - Refactor `AppShell` sang route-driven active section bằng `usePathname` + `useRouter`.
  - Thêm helpers `isAppSectionId` + `toSectionPath` trong navigation registry.
  - Thêm route page động `src/app/[section]/page.tsx` để mỗi mục leftbar có URL riêng.
  - Giữ backward compatibility cho `omnivideo:navigate` bằng cách map event sang route push.
  - Fix route flash on reload: bỏ `activeSection` local state mặc định, derive section trực tiếp từ `pathname` và canonicalize path bằng redirect đồng bộ.
  - Chuẩn hóa route kebab-case (`/published-content`, `/video-intake`, ...) và giữ redirect tương thích từ camelCase cũ (`/publishedContent`).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/navigation.test.ts`
  - `npm run test -- --run src/components/layout/navigation.test.ts` (post-fix no-flash + kebab-case)
- Test results summary:
  - Pass (1 file, 7 tests).
