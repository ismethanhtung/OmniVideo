# [FAST-UX-005] Use Text-Only Semantic Status Colors in Dense Tables/Lists

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

- Task ID: FAST-UX-005
- Phase: FAST
- Target Phase: Runtime UX readability
- Domain: UI/UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Badge cho mọi status làm các bảng/list dày trở nên rối; cần phân tách chỗ nào dùng badge, chỗ nào chỉ tô màu text.
- Bài toán cần giải quyết: Giữ badge ở signal-level status (account/header), chuyển dense rows sang text-color semantic.
- Tài liệu liên quan:
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Tạo `StatusText` dùng chung.
  - Chuyển các status trong dense social lists/tables và intake run tables sang text-only semantic color.
  - Giữ `StatusBadge` ở account-level status.
- Out of scope:
  - Thay đổi luồng dữ liệu/API status.
  - Redesign layout trang.

## 4. Input / Output

- Input: status strings (`published`, `failed`, `planned`, `success`, `connected`, ...).
- Output mong đợi: UI dễ scan hơn; dense surfaces dùng màu chữ, không lạm dụng badge.

## 5. Acceptance Criteria

1. Account-level status (vd social account connected/needs_auth) vẫn dùng badge.
2. Published Content dense rows/list chuyển sang màu chữ semantic.
3. Video Intake và Local Upload Intake run status (`success/failed/...`) trong run history và step trace có màu chữ semantic.
4. Có test cho helper mapping status tone.

## 6. Technical Plan

1. Tách shared status tone mapping + text class helper.
2. Thêm `StatusText` component và refactor các vị trí dense.
3. Chạy test + build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/ui/status-tone.ts` (new)
  - `src/components/ui/status-text.tsx` (new)
  - `src/features/social/*`
  - `src/features/video-intake/*`

## 8. Test Plan

1. Unit tests cho status mapping helper.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: Một số status hiếm có thể đang neutral.
- Rollback strategy: fallback neutral text class.

## 11. Deliverables

1. Shared text-only status component.
2. Dense UI status surfaces chuyển sang text-only color.
3. Test evidence và changelog/task updates.

## 12. Changelog Note

- Refine semantic status UI: keep badges for account-level states, use text-only semantic colors in dense lists/tables.

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
- Blockers:
- Verification evidence:
  - Added shared tone helper `src/lib/ui/status-tone.ts` and text-only UI `src/components/ui/status-text.tsx`.
  - Kept badge style for account-level signal (`Social Accounts`, account header in `Published Content`).
  - Switched dense rows/lists to text-only semantic colors in:
    - `Published Content` local records status + YouTube remote fetch status + footprint status.
    - `Publish Records` table status column.
    - `Video Intake` run status, step status, and run history status.
    - `Local Upload Intake` run status, step status, and run history status.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ui/status-tone.ts` (new)
  - `src/lib/ui/status-tone.test.ts` (new)
  - `src/components/ui/status-text.tsx` (new)
  - `src/features/social/status-badge-style.ts` (updated)
  - `src/features/social/published-content-panel.tsx` (updated)
  - `src/features/social/publish-records-panel.tsx` (updated)
  - `src/features/video-intake/video-intake-panel.tsx` (updated)
  - `src/features/video-intake/local-upload-intake-panel.tsx` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/ui/status-tone.test.ts src/features/social/status-badge.test.ts src/features/social/published-content-panel.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (9 tests / 3 files).
  - Full suite pass (136 tests / 35 files).
  - Build pass; existing lint warnings remain in unrelated files (`src/components/layout/navigation.ts`, `src/features/workspace/display-preferences-panel.tsx`).
