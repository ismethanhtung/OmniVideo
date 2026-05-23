# [FAST-INTAKE-012] Force Video Intake Download as Attachment Instead of Browser Preview

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

- Task ID: FAST-INTAKE-012
- Phase: MVP runtime hardening
- Target Phase: Intake download UX correctness
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User bấm `Download` ở Video Intake nhưng file mở trên tab web thay vì tải về Finder.
- Bài toán cần giải quyết: Response stream chưa ép `Content-Disposition: attachment`; browser có thể chọn inline preview.
- Tài liệu liên quan: `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Thêm `Content-Disposition: attachment` cho cả direct-stream và temp-file stream trong `resolve-file`.
  - Giữ client-side anchor download hint.
  - Cập nhật tests route/UI assertions.
- Out of scope:
  - Rework full download UX flow.
  - Thay đổi logic resolver chất lượng/format.

## 4. Input / Output

- Input: User bấm Download tại Video Intake.
- Output mong đợi: Browser tải file về Downloads/Finder thay vì mở preview tab.

## 5. Acceptance Criteria

1. `GET/POST /api/video-intake/resolve-file` trả header `Content-Disposition` dạng attachment.
2. UI Download link có `download` hint.
3. Focused tests pass.
4. `npm run guard:version` pass.

## 6. Technical Plan

1. Add helper build attachment header from resolved filename.
2. Apply header in both route branches (materialized stream + direct upstream stream).
3. Add client anchor `download` attribute.
4. Update focused tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/api/video-intake/resolve-file/route.ts`, `src/features/video-intake/video-intake-panel.tsx`, related tests.

## 8. Test Plan

1. Route tests assert `content-disposition` contains `attachment`.
2. UI source test asserts `link.setAttribute("download", "")`.
3. Run focused test suite and version guard.

## 9. Observability

- Không đổi metrics/log pipeline.
- Error code mapping giữ nguyên.

## 10. Risks & Rollback

- Risks: Một số browser có thể vẫn preview nếu extension/plugin ép override, nhưng attachment + download hint là chuẩn web.
- Rollback strategy: revert attachment header changes.

## 11. Deliverables

1. Attachment-enforced download response.
2. Client download hint.
3. Regression tests + changelog/version updates.

## 12. Changelog Note

- Force Video Intake manual download responses to `attachment` so browser saves files instead of opening inline preview.

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

## 14. Execution Notes

- Root cause: endpoint stream response thiếu attachment disposition nên browser chọn inline playback.
- Fix: set `content-disposition` attachment with filename for every resolve-file download response.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/video-intake/resolve-file/route.test.ts`
  - `src/features/video-intake/video-intake-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/video-intake/resolve-file/route.test.ts src/features/video-intake/video-intake-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
