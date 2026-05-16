# [FAST-WORKSPACE-016] Add pre-run Flow Setup modal for Workspace nodes

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

- Task ID: FAST-WORKSPACE-016
- Phase: FAST
- Target Phase: Workspace runtime UX hardening
- Domain: Workspace / UX
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Trước khi chạy flow, user phải click từng node trong Inspector để điền cấu hình như `Storage Asset`, `Save to Storage`, hoặc `Publish Social`, gây nhiều thao tác và dễ bỏ sót.
- Bài toán cần giải quyết: Khi user bấm `Run Flow`, Workspace nên mở một modal cấu hình tập trung cho toàn bộ node thực sự tham gia flow, hiển thị rõ node nào đang được cấu hình, node nào còn thiếu input, và chỉ cho chạy khi setup đã sẵn sàng.
- Tài liệu liên quan:
  - `docs/architecture/node-architecture.md`
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/governance/definition-of-ready-done.md`
  - `docs/governance/versioning-rules.md`

## 3. Scope

- In scope:
  - Đổi hành vi `Run Flow` thành mở pre-run `Flow Setup` modal thay vì execute ngay.
  - Hiển thị toàn bộ node executable theo thứ tự flow, với label/type/node id rõ ràng để tránh nhầm khi có nhiều node cùng loại.
  - Tái dùng đúng per-node config hiện tại, không tạo nguồn state/config thứ hai.
  - Hiển thị readiness summary và issue cụ thể cho các input bắt buộc trước khi chạy.
  - Cho phép cấu hình trực tiếp trong modal rồi chạy flow từ CTA cuối modal.
  - Cập nhật docs, changelog, task evidence và version metadata.
- Out of scope:
  - Đổi graph planner/executor semantics hiện tại.
  - Tạo wizard nhiều bước hoặc persist config ngoài workspace draft hiện có.
  - Refactor toàn bộ Inspector config UI hiện có.

## 4. Input / Output

- Input: Workspace graph executable + config/runtime inputs theo node.
- Output mong đợi: User bấm `Run Flow` -> modal gom toàn bộ node config mở ra -> user hoàn tất setup -> flow chỉ chạy khi không còn issue cấu hình.

## 5. Acceptance Criteria

1. Khi graph executable hợp lệ, bấm `Run Flow` mở `Flow Setup` modal thay vì chạy ngay.
2. Modal liệt kê các node tham gia flow theo thứ tự thực thi, mỗi card hiển thị rõ label, node type và node id.
3. Mỗi card tái dùng cấu hình node hiện có; chỉnh trong modal cập nhật đúng `node.config`/runtime file map dùng chung với Inspector.
4. Modal hiển thị summary số node ready / cần attention và issue cụ thể cho các case chính: thiếu file, thiếu URL, thiếu Storage Asset, thiếu storage account, thiếu social account, thiếu Facebook Page, hoặc thiếu trace tags khi flow intake/upload cần tags.
5. CTA chạy flow trong modal bị disable khi còn issue và chỉ execute khi setup đã sẵn sàng.
6. Inspector cũ vẫn hoạt động như trước; modal là lớp pre-run UX bổ sung, không làm mất khả năng chỉnh từng node.
7. Có tests cho thứ tự node setup, validation issue chính và source-level coverage của modal wiring.
8. Docs/changelog/task evidence/version metadata được cập nhật đầy đủ và verify pass.

## 6. Technical Plan

1. Tách helper thu thập node theo execution plan và helper đánh giá setup issue sang module Workspace thuần để unit test được.
2. Thêm state + handler cho `Flow Setup` modal, đổi CTA `Run Flow` hiện tại thành mở modal.
3. Dựng modal với summary panel, danh sách card theo node, và reuse `NodeRuntimeConfig` để giữ một nguồn config duy nhất.
4. Chặn CTA `Run now` khi còn issue; khi hợp lệ thì đóng modal và gọi runner hiện có.
5. Bổ sung tests, cập nhật docs/changelog/version rồi chạy verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/workspace-flow-setup.ts`
  - `src/lib/workspace/workspace-flow-setup.test.ts`
  - `docs/architecture/node-architecture.md`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`

## 8. Test Plan

1. Unit tests helper setup:
   - node order theo `plan.steps`
   - duplicate nodes được de-duplicate nhưng giữ thứ tự đầu tiên
   - issue cho thiếu file, asset, storage account, social account, Facebook page, và trace tags khi cần
2. Source-level Workspace UI test:
   - có `Flow Setup` modal
   - `Run Flow` route qua handler mở modal
   - modal reuse `NodeRuntimeConfig`
3. Verify build/runtime guard:
   - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
   - `npm run build`
   - `npm run guard:version`

## 9. Observability

- Metrics: không thêm metric mới; runner/progress center hiện tại giữ nguyên.
- Logs: không log secrets hoặc config nhạy cảm; validation issue chỉ hiển thị trong UI.
- Error codes: không đổi API error taxonomy.

## 10. Risks & Rollback

- Risks:
  - Modal có thể dài với flow lớn; cần layout scroll rõ ràng và summary giúp định hướng.
  - Nếu validation quá chặt so với executor, modal có thể chặn flow hợp lệ; helper phải mirror đúng runtime prerequisite hiện tại.
- Rollback strategy:
  - Revert modal + setup helper, trả `Run Flow` về execute trực tiếp.

## 11. Deliverables

1. Pre-run `Flow Setup` modal trong Workspace.
2. Helper setup-order/readiness có unit tests.
3. Docs/changelog/task/version updates.
4. Test/build/guard evidence.

## 12. Changelog Note

- Workspace: add a pre-run Flow Setup modal that centralizes all executable-node configuration before running.

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
  - `node.config` hiện tại vẫn là source of truth cho runtime config.
  - Pre-run modal chỉ gom UX, không thay đổi graph planner hoặc API orchestration.
  - Vì đây là feature mới backward-compatible cho user, release bump dự kiến là `minor` theo `docs/governance/versioning-rules.md`.
- Blockers: none.
- Verification evidence:
  - `Run Flow` giờ mở `Flow Setup` modal thay vì execute ngay.
  - Modal gom các executable nodes theo thứ tự planner đầu tiên, hiển thị rõ `label + node type + node id`.
  - `NodeRuntimeConfig` được reuse trong modal nên Inspector và modal vẫn dùng chung `node.config`/runtime file state.
  - Readiness summary chặn `Run Flow` khi còn issue cho file, URL, Storage Asset, storage account, social account, Facebook Page hoặc trace tags cần thiết.
  - Browser smoke verification không hoàn tất vì in-app browser policy chặn truy cập local dev URL `http://127.0.0.1:3000`.
  - Version bump đã thực hiện từ `0.5.0` lên `0.6.0` theo nhánh `minor` cho feature backward-compatible.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-flow-setup.test.ts` (new)
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `npm run test`
- Test results summary:
  - Focused Workspace tests pass (2 files / 10 tests).
  - Build pass; warning cũ ngoài scope vẫn còn: ESLint circular-config warning.
  - Version guard pass.
  - Full suite hiện có 2 failure ngoài scope của task này:
    - `src/components/layout/navigation.test.ts` kỳ vọng label `Audio Transcript 2` nhưng code hiện tại là `Audio Transcript 2 - Test`.
    - `src/lib/multilingual-audio/transcript-translation.test.ts` kỳ vọng prompt cũ có câu `Never insert pronouns inside another word`, trong khi prompt hiện tại đã đổi.
