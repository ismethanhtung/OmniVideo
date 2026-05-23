# [FAST-INTAKE-011] Stream Browser-Native Video Intake Download for Large Files

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

- Task ID: FAST-INTAKE-011
- Phase: MVP runtime hardening
- Target Phase: Intake large-file download reliability
- Domain: Video Intake
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User báo `Download` ở Video Intake bị đứng 90% hoặc fail với `bilibili-html5-*`, đặc biệt với file lớn (~300MB), trong khi format khác chạy nhanh.
- Bài toán cần giải quyết: UI hiện tải bằng `fetch(...).blob()` rồi mới trigger browser download; cách này giữ toàn bộ file trong JS memory và dễ fail với media lớn.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Thêm `GET /api/video-intake/resolve-file` nhận query params để browser tải stream trực tiếp.
  - Refactor route dùng chung logic resolve/stream cho GET + POST.
  - Đổi nút Download ở Video Intake sang browser-native download URL (không `response.blob()`).
  - Cập nhật regression tests cho GET route và UI behavior.
- Out of scope:
  - Thay đổi logic resolver nội bộ yt-dlp cho format selection.
  - Xây background download manager/progress byte-level realtime cho browser transfer.

## 4. Input / Output

- Input: URL Bilibili với `formatSelector=bilibili-html5-*`, ví dụ `BV1o4Lv6vEbu`.
- Output mong đợi: Browser nhận stream tải trực tiếp từ endpoint download, không giữ full file trong JS memory; giảm treo/fail ở mốc 90%.

## 5. Acceptance Criteria

1. `resolve-file` hỗ trợ cả `POST` (JSON) và `GET` (query).
2. Download action ở Video Intake không dùng `response.blob()` nữa.
3. Browser được trigger tải trực tiếp qua URL `/api/video-intake/resolve-file?...`.
4. Existing bilibili-html5 materialization path vẫn giữ nguyên phía server.
5. Focused tests + version guard pass.

## 6. Technical Plan

1. Tách hàm xử lý chung `handleResolveDownloadRequest(...)` trong route.
2. Implement parser query (`readQuery`) và export thêm handler `GET`.
3. Đổi UI Download handler sang `URLSearchParams` + anchor click.
4. Cập nhật route tests và panel source tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/app/api/video-intake/resolve-file/route.ts`, `src/features/video-intake/video-intake-panel.tsx`, tests tương ứng.

## 8. Test Plan

1. Route tests: POST path existing + GET query path pass.
2. UI regression: source assertions cho browser-native download URL path.
3. Run focused tests.
4. Run version guard.

## 9. Observability

- Metrics: giữ progress task hiện có (Preparing/Starting browser download).
- Logs: lỗi resolve vẫn map qua `SYS_WORKSPACE_URL_RESOLVE_FAILED`.
- Error codes: không thay đổi taxonomy.

## 10. Risks & Rollback

- Risks: browser-native download không trả chi tiết lỗi như fetch JSON trong client.
- Rollback strategy: revert GET mode và quay về blob download.

## 11. Deliverables

1. GET-compatible resolve-file route + shared resolver flow.
2. Browser-native download trigger trong Video Intake.
3. Regression tests + changelog/version updates.

## 12. Changelog Note

- Switch Video Intake manual download to browser-native streaming download path for large files and add GET query support on resolve-file endpoint.

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

- Assumptions: bottleneck nằm phía client blob buffering thay vì path materialization phía server.
- Blockers: None.
- Root cause: `response.blob()` giữ toàn bộ download trong JS memory, dễ treo/fail cho file lớn trước khi browser bắt đầu write thực tế.
- Fix: chuyển sang browser-native download stream bằng URL endpoint GET; server vẫn materialize bilibili-html5 như trước.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/video-intake/resolve-file/route.test.ts`
  - `src/features/video-intake/video-intake-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/video-intake/resolve-file/route.test.ts src/features/video-intake/video-intake-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused route/UI tests pass.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
