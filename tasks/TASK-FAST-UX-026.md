# [FAST-UX-026] Polish Folder Selector and Remove Navigation Leave Warnings

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

- Task ID: FAST-UX-026
- Phase: FAST
- Target Phase: UX polish
- Domain: UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Native `datalist` folder control render xấu và lệch với dropdown style còn lại; AppShell vẫn hỏi xác nhận khi rời Workspace/Audio Transcript dù user không còn muốn bị chặn.
- Bài toán cần giải quyết: Dùng dropdown chuẩn đồng nhất với Storage Provider, vẫn giữ đường tạo folder mới, và bỏ leave warning khi chuyển section.
- Tài liệu liên quan:
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thay folder `datalist` bằng `<select>` chuẩn ở Video Intake và Local Upload Intake.
  - Giữ khả năng tạo folder mới qua option `New folder...` + input riêng khi cần.
  - Bỏ confirm leave warning khi chuyển khỏi Workspace và Audio Transcript.
  - Cập nhật tests/changelog/version.
- Out of scope:
  - Thay đổi metadata folder đã lưu.
  - Thiết kế lại navigation toàn app.

## 4. Acceptance Criteria

1. Folder selector dùng select styling cùng pattern với dropdown Storage Provider, không còn `datalist`.
2. User vẫn có thể chọn folder cũ hoặc chọn `New folder...` để nhập folder mới.
3. Chuyển khỏi Workspace và Audio Transcript không còn hiện warning `You have in-progress work...`.
4. Tests cập nhật và verification evidence đầy đủ.

## 5. Technical Plan

1. Refactor state/control folder ở hai intake panels sang select + new-folder mode.
2. Gỡ logic confirm trong `AppShell`.
3. Cập nhật source-level regression tests.
4. Chạy focused tests/build/guard và cập nhật changelog/task.

## 6. Test Plan

1. UI source tests chứng minh dùng select, có `New folder...`, không còn `datalist`.
2. AppShell test chứng minh không còn leave warning.
3. Chạy focused tests, `npm run build`, `npm run guard:version`.

## 7. Observability

- Metrics/logs/error codes: không đổi.

## 8. Risks & Rollback

- Risks: folder mới cần một bước chọn rõ ràng hơn so với gõ trực tiếp.
- Rollback strategy: revert control refactor và restore confirm branch nếu cần.

## 9. Deliverables

1. Folder dropdown polish.
2. Navigation without leave warnings.
3. Updated tests/changelog/version evidence.

## 10. Changelog Note

- Polish folder selectors and remove cross-page leave confirmation warnings.

## 11. Execution Notes

- Assumptions: `New folder...` là cách phù hợp nhất để giữ khả năng tạo folder mới mà vẫn dùng dropdown chuẩn.
- Verification evidence:
  - Replaced native `datalist` controls with standard `select` controls plus conditional new-folder input.
  - Removed the AppShell leave-confirmation branch entirely, so Workspace and Audio Transcript navigation no longer prompts.
  - Focused tests pass; build pass with existing ESLint circular-config warning; version guard pass.
  - Browser QA against `http://127.0.0.1:3000/video-intake` was not completed because the in-app browser policy blocked that local target in this session.

## 12. Test Evidence

- Test files added/updated:
  - `src/components/layout/app-shell.test.ts`
  - `src/features/video-intake/video-intake-panel.test.ts`
  - `src/features/video-intake/local-upload-intake-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/app-shell.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 7 tests).
  - Build pass; existing repo warning remains: ESLint circular-config serialization warning.
  - Version guard pass after bumping app version to `0.9.1`.
  - Browser QA not completed because the local target was blocked by in-app browser policy.
