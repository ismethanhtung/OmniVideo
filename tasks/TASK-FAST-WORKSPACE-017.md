# [FAST-WORKSPACE-017] Fix Flow Setup polish, mask setup hydration, and preprocess enable toggle

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

- Task ID: FAST-WORKSPACE-017
- Phase: FAST
- Target Phase: Workspace runtime UX hardening
- Domain: Workspace / UX / Runtime Config
- Task Type: Feature/Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do:
  - `edit.mask-region` chưa phản ánh rõ video-edit setup đã lưu theo từng Storage Asset trong UI node config.
  - Nút đóng `X` trong Flow Setup modal đang to hơn pattern modal còn lại trong app.
  - Node `video.preprocess` chưa có toggle enable/disable như trang Audio Transcript.
- Bài toán cần giải quyết:
  - Làm cho node blur/subtitle dễ lấy lại setting đã lưu theo video.
  - Đồng nhất kích thước/nét của close icon button trong Flow Setup modal.
  - Bổ sung `Enable preprocess` nhưng vẫn giữ flow ổn định khi toggle.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/governance/versioning-rules.md`
  - `docs/architecture/node-architecture.md`

## 3. Scope

- In scope:
  - Cập nhật `edit.mask-region` runtime config để lấy được setting saved theo Storage Asset upstream (UI và runtime behavior).
  - Chuẩn hóa close button của Flow Setup modal theo modal style hiện có trong app.
  - Thêm `Enable preprocess` cho node `video.preprocess`, cho phép bypass preprocess runtime khi tắt.
  - Bổ sung/cập nhật tests liên quan.
- Out of scope:
  - Refactor toàn bộ workspace runner hoặc graph planner semantics.
  - Thay đổi API contract backend video-processing/edit hoặc video-preprocess.

## 4. Input / Output

- Input: Flow có `source.asset` + `edit.mask-region`, và/hoặc node `video.preprocess`.
- Output mong đợi:
  - User thấy và áp dụng được saved setup theo video asset cho blur/subtitle.
  - Close button modal đồng nhất với modal khác.
  - User có thể bật/tắt preprocess trong node config trước khi run.

## 5. Acceptance Criteria

1. `edit.mask-region` hiển thị/áp dụng được saved `videoEditSetup` theo Storage Asset upstream khi node chưa override custom rõ ràng.
2. Trong runtime step edit, giá trị blur/subtitle ưu tiên config user; nếu chưa override thì dùng saved setup của asset.
3. Flow Setup modal close button có size/padding/icon scale đồng nhất với pattern modal của app.
4. Node `video.preprocess` có toggle `Enable preprocess`.
5. Khi preprocess tắt, step preprocess không transform video (passthrough) nhưng downstream flow vẫn chạy.
6. Focused tests pass; build pass; guard pass.

## 6. Technical Plan

1. Thêm helper resolve mask effective config (node override vs saved asset setup).
2. Cập nhật UI `edit.mask-region` để nạp saved setup rõ ràng và cho phép apply nhanh.
3. Cập nhật step `preprocess-video` runtime để hỗ trợ disabled passthrough.
4. Chuẩn hóa close button class cho Flow Setup modal.
5. Cập nhật tests + changelog + version bump + verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`

## 8. Test Plan

1. Workspace source-level tests cho modal + preprocess toggle string/wiring.
2. Workspace graph test cho `video.preprocess` default config include enabled=true.
3. Verify:
   - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
   - `npm run build`
   - `npm run guard:version`

## 9. Observability

- Metrics: không thêm metric mới.
- Logs: không thêm log mới chứa data nhạy cảm.
- Error codes: giữ nguyên.

## 10. Risks & Rollback

- Risks:
  - Rule chọn ưu tiên saved setup vs node override có thể gây hiểu nhầm nếu không hiển thị rõ.
  - Passthrough preprocess cần xử lý ổn object URL/file để downstream không lỗi.
- Rollback strategy:
  - Revert patch workspace runtime config + preprocess toggle.

## 11. Deliverables

1. `edit.mask-region` hydrate saved setup usable.
2. `video.preprocess` enable toggle.
3. Flow Setup close button polish.
4. Task/changelog/version/tests updated.

## 12. Changelog Note

- Workspace: hydrate mask/subtitle setup from asset metadata, align Flow Setup close button style, and add enable toggle for Video Preprocess.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions:
  - Saved `videoEditSetup` từ asset là nguồn fallback mong muốn khi node config chưa override.
  - Preprocess disable nghĩa là skip transform, không phá downstream behavior.
- Blockers: none.
- Verification evidence:
  - `edit.mask-region` runtime/UI đã resolve effective config theo thứ tự ưu tiên: node override -> saved asset `videoEditSetup` -> defaults.
  - Inspector/Flow Setup node `Mask Logo/Subtitles` hiển thị rõ khi đang dùng setup đã lưu theo Storage Asset upstream.
  - Flow Setup modal close button đã đồng bộ style với modal pattern hiện có (`p-1.5`, icon `h-3.5 w-3.5`).
  - Node `video.preprocess` có toggle `Enable preprocess`; khi tắt, runner bypass transform và passthrough source video artifact cho downstream.
  - Version bump đã thực hiện từ `0.6.0` lên `0.7.0` theo nhánh `minor`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 47 tests).
  - Build pass; warning cũ ngoài scope vẫn còn: ESLint circular-config warning.
  - Version guard pass.
