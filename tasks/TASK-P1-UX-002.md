# [P1-UX-002] Refactor app shell và content routing cho homepage

## Progress

- [x] Todo
- [x] Ready
- [x] In Progress
- [x] Review
- [x] Done

## Metadata

- Task ID: P1-UX-002
- Type: UX / Architecture
- Priority: P1
- Owner: AI Agent
- Created: 2026-04-25
- Status: Done

## Problem

`src/app/page.tsx` đang chứa quá nhiều trách nhiệm: state navigation, logic kiểm tra MongoDB, placeholder content và layout render. Nếu hệ thống có nhiều tab trong leftbar, cách này sẽ khiến page chính phình to và khó mở rộng.

## Scope

- Tách `page.tsx` thành entry point mỏng.
- Tạo app shell quản lý layout tổng.
- Tạo content router/registry để render nội dung theo section active.
- Tách Connection Test thành feature panel riêng.
- Tách navigation config khỏi leftbar UI.
- Cải thiện giao diện vùng nội dung bên phải theo phong cách tool vận hành sáng, gọn, dễ mở rộng.

## Acceptance Criteria

- [x] `src/app/page.tsx` không chứa logic feature/tab.
- [x] Leftbar chỉ làm navigation UI.
- [x] Connection Test render ở panel phải thông qua content router.
- [x] Thêm tab mới không cần nhét logic vào `page.tsx`.
- [x] Giao diện ở chế độ light mode và nhất quán với leftbar.
- [x] `npm run lint` pass.
- [x] `npm run build` pass.

## Implementation Notes

- App shell nằm ở `src/components/layout/app-shell.tsx`.
- Content routing nằm ở `src/components/layout/content-router.tsx`.
- Navigation registry nằm ở `src/components/layout/navigation.ts`.
- Connection Test panel nằm ở `src/features/connections/connection-test-panel.tsx`.

## Verification

- `npm run lint`
- `npm run build`

## Changelog

- Thêm entry trong `changelog/changelog.md` cho refactor shell/content routing.
