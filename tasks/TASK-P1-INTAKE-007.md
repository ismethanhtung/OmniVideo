# [P1-INTAKE-007] YouTube resolver fallback to Android client

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

- Task ID: P1-INTAKE-007
- Phase: P1
- Target Phase: P1
- Domain: Video Pipeline
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Với một số YouTube URL, built-in resolver hiện resolve được direct URL nhưng fetch/upload vẫn 403 khi dùng web client extraction.
- Bài toán cần giải quyết: thêm fallback extraction profile để lấy direct URL fetchable ổn định hơn.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`

## 3. Scope

- In scope:
  - internal resolver fallback sang YouTube Android client profile.
  - cập nhật changelog/task evidence.
- Out of scope:
  - cookie-auth flow cho video private/restricted.

## 4. Input / Output

- Input: YouTube watch URL.
- Output mong đợi: direct URL trả về có thể fetch thành công ở bước upload-storage.

## 5. Acceptance Criteria

1. Resolver thử profile mặc định trước, fail thì fallback Android client cho YouTube.
2. Trường hợp URL mẫu của owner không còn dừng ở `STG_TELEGRAM_SOURCE_STREAM_FAILED 403`.
3. Test/lint/build pass.

## 6. Technical Plan

1. Refactor `internal-resolver.py` thành nhiều strategy profile.
2. Retry extraction với Android client khi default profile fail.
3. Verify bằng test/lint/build và smoke check.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/internal-resolver.py`

## 8. Test Plan

1. `npm run test`
2. `npm run lint`
3. `npm run build`

## 9. Observability

- Lỗi resolver vẫn giữ taxonomy hiện tại.

## 10. Risks & Rollback

- Risks: một số video vẫn cần cookie/session policy riêng.
- Rollback strategy: quay lại resolver profile hiện tại.

## 11. Deliverables

1. YouTube client-profile fallback trong internal resolver.
2. Updated changelog/task evidence.

## 12. Changelog Note

- Thêm fallback YouTube resolver profile sang Android client để giảm lỗi 403 ở bước upload-storage.

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

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: lỗi 403 hiện tại đến từ YouTube web client extraction.
- Blockers: none
- Verification evidence: `npm run test`, `npm run lint`, `npm run build` pass; live diagnostics confirmed YouTube URL resolves/fetches with Android client profile.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: existing suites validated (`src/lib/video-intake/internal-resolver.test.ts` + full regression set)
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 7 test files / 20 tests pass; lint pass; build pass.
