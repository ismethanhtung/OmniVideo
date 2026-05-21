# [FAST-VIDEO-009] Title-based Workspace output naming and Bilibili auth-integrated intake

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

- Task ID: FAST-VIDEO-009
- Phase: MVP runtime hardening
- Target Phase: Video pipeline naming and intake quality stability
- Domain: Video pipeline + Intake
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do:
  - Workspace output artifact name đang nối theo chuỗi transform (`0.7x-vi-dub-mirror-edit.mp4`), khó dùng làm title asset.
  - Bilibili intake thường bị giới hạn chất lượng khi thiếu cookie/token xác thực.
- Bài toán cần giải quyết:
  - Đổi tên title khi `Store Generated Artifact` sang title nghiệp vụ.
  - Cho phép truyền auth cookie/browser từ Video Intake để resolver có thể lấy format chất lượng cao hơn.

## 3. Scope

- In scope:
  - Workspace store-artifact đặt `title` theo metadata/source title, fallback hợp lý.
  - Mở rộng intake payload/validation/resolver path với `resolverCookieHeader` và `resolverCookiesFromBrowser`.
  - Tích hợp UI Video Intake cho cookie header + browser cookie source + remember local state.
  - Bổ sung test regression cho các thay đổi.
- Out of scope:
  - Lưu secret cookie vào DB run history.
  - OAuth-like Bilibili account system riêng.

## 4. Input / Output

- Input:
  - Workspace flow: preprocess -> dubbing -> mirror -> edit -> store.
  - Video Intake URL + optional resolver auth.
- Output mong đợi:
  - Asset title khi store artifact dùng title hợp lệ (không còn technical suffix chain).
  - Intake/Format listing có thể dùng cookie header/browser cookie hint để tăng khả năng lấy quality cao.

## 5. Acceptance Criteria

1. `Store Generated Artifact` gửi `title` theo ưu tiên: generated VI metadata title -> source node title -> source asset title -> file stem.
2. Video Intake và Format listing API chấp nhận optional resolver auth (`resolverCookieHeader`, `resolverCookiesFromBrowser`) với validation rõ ràng.
3. Internal resolver exec path nhận resolver auth per-request và hỗ trợ cookie fallback cho Bilibili.
4. UI Video Intake có controls cho resolver auth và remember-on-browser để tránh nhập lặp.
5. Test liên quan pass cho validation/intake formats/resolve-file/media-resolver/workspace naming.

## 6. Technical Plan

1. Bổ sung resolver auth fields vào intake types + validation.
2. Truyền resolver auth từ API/UI xuống internal resolver calls.
3. Mở rộng internal resolver cookie fallback platform cho Bilibili.
4. Sửa store-artifact title selection logic trong Workspace runtime.
5. Cập nhật test files tương ứng.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/video-intake/video-intake-panel.tsx`
  - `src/lib/video-intake/*`
  - `src/app/api/video-intake/*`

## 8. Test Plan

1. Unit tests cho intake validation/media resolver/path params.
2. API tests cho intake formats + resolve-file.
3. Source-level Workspace test cho title mapping.

## 9. Observability

- Logs: dùng error code hiện có trên intake APIs.
- Security: không persist raw cookie header vào DB snapshot.

## 10. Risks & Rollback

- Risks: Cookie header sai định dạng gây resolver fail.
- Rollback strategy: revert resolver auth payload propagation + fallback về public no-cookie flow.

## 11. Deliverables

1. Workspace naming fix.
2. Video Intake auth integration for Bilibili quality scenarios.
3. Tests + changelog + version bump.

## 12. Changelog Note

- Workspace store-artifact now uses business title fallback chain; Intake now supports optional resolver cookie/browser auth for higher-quality Bilibili extraction paths.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

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

- Assumptions:
  - Người dùng tự chịu trách nhiệm cookie/token hợp lệ từ browser platform.
  - Bilibili quality uplift phụ thuộc quyền account/cookie.
- Blockers: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/validation.test.ts`
  - `src/lib/video-intake/media-resolver.test.ts`
  - `src/app/api/video-intake/formats/route.test.ts`
  - `src/app/api/video-intake/resolve-file/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/video-intake/internal-resolver-py.test.py`
- Test commands executed:
  - `npm run test -- --run src/lib/video-intake/validation.test.ts src/lib/video-intake/media-resolver.test.ts src/app/api/video-intake/formats/route.test.ts src/app/api/video-intake/resolve-file/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass.
  - Guard version pass.
