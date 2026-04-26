# [FAST-GOV-002] Add App Versioning Governance Rules and Sync Leftbar Version Display

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

- Task ID: FAST-GOV-002
- Phase: FAST
- Target Phase: Governance hardening
- Domain: Governance / UX
- Task Type: Docs
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Version policy chưa rõ; leftbar đang hard-code version text dễ lệch với release thực tế.
- Bài toán cần giải quyết: định nghĩa rule update version rõ ràng và hiển thị version trong leftbar theo source-of-truth.
- Tài liệu liên quan:
  - `docs/governance/README.md`
  - `docs/governance/changelog-policy.md`

## 3. Scope

- In scope:
  - Thêm governance doc cho versioning policy (khi nào bump patch/minor/major và artifact cần cập nhật).
  - Cập nhật chỉ mục docs để discoverable.
  - Đồng bộ leftbar version hiển thị từ source-of-truth thay vì hard-code.
- Out of scope:
  - Release automation pipeline.
  - Git tagging workflow.

## 4. Input / Output

- Input: current package/app version.
- Output mong đợi: rule rõ + UI version luôn đồng bộ.

## 5. Acceptance Criteria

1. Có doc versioning rules trong governance.
2. Leftbar hiển thị version từ source-of-truth và không cần sửa tay ở component khi bump version.
3. Changelog/task updated.

## 6. Technical Plan

1. Add `docs/governance/versioning-rules.md`.
2. Update docs index.
3. Update leftbar version render.
4. Verify build.

## 7. Code Change Impact

- Có thay đổi code không: Yes (UI minor).
- Nếu Yes, module impacted:
  - `src/components/layout/leftbar.tsx`
  - governance docs.

## 8. Test Plan

1. `npm run build`.
2. Manual check leftbar footer version text.

## 9. Observability

- N/A.

## 10. Risks & Rollback

- Risks: JSON import path from client bundle.
- Rollback strategy: fallback to static constant.

## 11. Deliverables

1. Versioning governance doc.
2. Synced leftbar version source.
3. Changelog/task updates.

## 12. Changelog Note

- Add versioning governance rules and sync leftbar footer version to source-of-truth.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

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
- Blockers:
- Verification evidence:
  - Added governance doc `docs/governance/versioning-rules.md` with source-of-truth + semver + mandatory checklist.
  - Updated docs indexes for discoverability.
  - Leftbar footer version now reads from `package.json` version instead of hard-coded text.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/leftbar.tsx`
  - `docs/governance/versioning-rules.md`
  - `docs/governance/README.md`
  - `docs/README.md`
- Test commands executed:
  - `npm run build`
- Test results summary:
  - Build pass with existing non-blocking lint warnings in `navigation.ts` and `display-preferences-panel.tsx`.
