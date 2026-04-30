# [FAST-OPS-001] Local intake history parity and lightweight system snapshot modal

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
- Task ID: FAST-OPS-001
- Phase: Phase 1
- Target Phase: P1
- Domain: Intake + Operations UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: In Progress

## 2. Context
- Lý do: Local Intake Run History chưa có mức hiển thị/controls tương đương URL Intake; topbar thiếu quick observability snapshot nhẹ cho runtime.
- Bài toán cần giải quyết: thêm detail/preview/delete cho local history và thêm modal system snapshot load-once + manual reload.
- Tài liệu liên quan: docs/governance/testing-rules.md

## 3. Scope
- In scope: local history UI/API parity, delete per-row, topbar system snapshot modal + API lightweight.
- Out of scope: realtime streaming metrics/polling, deep profiler.

## 4. Acceptance Criteria
1. Local Intake Run History có preview video + Detail/Delete cạnh nhau + detail modal chứa Created và metadata chính.
2. Có thể xoá từng local run từ bảng history.
3. Topbar có thêm nút mở modal System Snapshot cạnh Progress; data chỉ load 1 lần ban đầu, chỉ refresh khi user bấm Reload.
4. Có test cho API snapshot.

## 5. Test Plan
1. `npm run test -- --run src/app/api/system/snapshot/route.test.ts`
2. `npm run build`

## 6. Execution Notes
- Verification evidence: Pending.

## 7. Test Evidence
- Test files added/updated: Pending.
- Test commands executed: Pending.
- Test results summary: Pending.
