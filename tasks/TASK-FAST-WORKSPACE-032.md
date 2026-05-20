# [FAST-WORKSPACE-032] Add Thumbnail Support to Workspace Publish Social Node

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

- Task ID: FAST-WORKSPACE-032
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

- User yêu cầu node `Publish Social` trong Workspace phải hỗ trợ thêm thumbnail khi đăng video để luồng publish hoàn chỉnh hơn.
- Hiện tại `social.publish` chỉ gửi metadata text (title/caption/hashtags) + publish settings, chưa có thumbnail reference.

## 3. Scope

- In scope:
  - thêm cấu hình thumbnail vào inspector node `social.publish`;
  - hiển thị visual thumbnail picker từ thư viện `/api/storage/thumbnail-assets` trong Workspace (ảnh preview + search);
  - truyền thumbnail từ Workspace runtime sang API publish-records;
  - mở rộng social publish validation/types/repository để lưu thumbnail reference;
  - dùng thumbnail khi publish-now adapter có hỗ trợ (ưu tiên YouTube);
  - cập nhật test liên quan.
- Out of scope:
  - chỉnh sửa thumbnail trong Workspace;
  - crop/edit thumbnail trong Workspace;
  - upload thumbnail riêng cho platform chưa có API path ổn định trong repo hiện tại.

## 4. Acceptance Criteria

1. Node `Publish Social` có field thumbnail config trong inspector (optional) và lưu được vào node config.
2. Khi chạy flow, payload gửi tới `/api/social/publish-records` có truyền thumbnail reference nếu user cấu hình.
3. API validation/repository chấp nhận và persist thumbnail reference trên publish record.
4. YouTube publish-now nhận thumbnail reference và áp dụng thumbnail sau upload video; nếu thumbnail không hợp lệ/không upload được thì publish record trả lỗi rõ ràng.
5. Test cập nhật cho graph/UI runtime + validation/repository + upload adapter paths liên quan.

## 5. Technical Plan

1. Mở rộng `social.publish` node config schema/default + inspector form controls cho thumbnail reference.
2. Wire runtime publish request body trong `workspace-canvas-panel` để gửi thumbnail field.
3. Cập nhật social domain (`types`, `validation`, `repository`, API route contracts) để persist field mới.
4. Cập nhật adapter publish-now (YouTube ưu tiên) để consume thumbnail when provided.
5. Bổ sung/cập nhật test và verify build/guard.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module dự kiến impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/social/types.ts`
  - `src/lib/social/validation.ts`
  - `src/lib/social/repository.ts`
  - `src/lib/social/youtube-upload.ts`
  - test files tương ứng.

## 7. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run test -- --run src/lib/social/validation.test.ts src/lib/social/youtube-upload.test.ts`
3. `npm run build`
4. `npm run guard:version`

## 8. Risks & Rollback

- Risks:
  - Thumbnail asset có thể thiếu/quyền đọc lỗi/mime lỗi, dẫn tới publish YouTube fail sau khi video đã upload.
  - Một số platform không hỗ trợ thumbnail update sau upload.
- Rollback:
  - Revert patch task này; giữ publish flow như cũ không thumbnail.

## 9. Deliverables

1. Workspace Publish Social nhận thumbnail reference.
2. Social publish record pipeline hiểu và lưu thumbnail reference.
3. YouTube publish-now có đường apply thumbnail ở runtime.
4. Test evidence + changelog đầy đủ.

## 10. Changelog Note

- Workspace `Publish Social` now supports an optional thumbnail reference and passes it through social publish runtime (with YouTube apply path).

## 11. Task Type Checklist (Stamp [x])

### 11.1 Feature

- [x] Có acceptance criteria đo được
- [x] Có technical plan rõ ràng
- [x] Có test plan cho happy path + failure path chính

## 12. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/workspace/workspace-flow-setup.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/social/validation.test.ts`
  - `src/lib/social/youtube-upload.test.ts`
  - `src/lib/social/facebook-upload.test.ts`
  - `src/lib/social/tiktok-upload.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run test -- --run src/lib/social/validation.test.ts src/lib/social/youtube-upload.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/tiktok-upload.test.ts src/app/api/social/publish-records/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Workspace-related tests pass: 3 files / 69 tests.
  - Social/API tests pass: 5 files / 29 tests.
  - Build pass (repo vẫn có ESLint circular-config warning đã tồn tại từ trước).
  - Version guard pass.
