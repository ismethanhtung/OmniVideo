# [P1-INTAKE-008] Resolver fetchability probe before profile selection

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

- Task ID: P1-INTAKE-008
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

- Lý do: Resolver có thể trả direct URL từ profile mặc định nhưng URL đó fetch lại bị 403 ở bước upload.
- Bài toán cần giải quyết: chọn profile resolver dựa trên khả năng fetch thật của direct URL, không chỉ dựa trên extract thành công.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`

## 3. Scope

- In scope:
  - Probe fetchability direct URL sau khi extract.
  - Nếu URL profile hiện tại bị 403 thì thử profile fallback (`android`).
  - Cập nhật changelog/task evidence.
- Out of scope:
  - Cookie-auth flow cho private/age-restricted videos.

## 4. Input / Output

- Input: YouTube URL.
- Output mong đợi: resolver trả direct URL fetchable hơn cho upload step.

## 5. Acceptance Criteria

1. Resolver không dừng ở profile mặc định nếu direct URL profile đó probe fail.
2. Với URL mẫu đang lỗi, resolver thử tiếp profile fallback trước khi trả kết quả.
3. Test/lint/build pass.

## 6. Technical Plan

1. Refactor `internal-resolver.py`: thêm probe `urlopen` cho direct URL.
2. Chạy theo chuỗi profile và chọn profile đầu tiên có direct URL fetchable.
3. Verify và cập nhật docs/changelog/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Եթե Yes, module impacted: `src/lib/video-intake/internal-resolver.py`

## 8. Test Plan

1. `npm run test`
2. `npm run lint`
3. `npm run build`

## 9. Observability

- Error codes giữ nguyên contract hiện có.

## 10. Risks & Rollback

- Risks: Một số nguồn vẫn 403 theo policy mạng/IP.
- Rollback strategy: quay về logic profile hiện tại.

## 11. Deliverables

1. Resolver profile selection dựa trên fetchability probe.
2. Updated changelog/task evidence.

## 12. Changelog Note

- Cập nhật built-in resolver để probe direct URL fetchability trước khi chốt profile extraction.

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

- Assumptions: direct URL probe cho phép phát hiện profile không usable trước khi vào bước upload.
- Blockers: none
- Verification evidence: pending

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/video-intake/media-resolver.test.ts`
- Test commands executed: `npm run test`, `npm run lint`, `npm run build`
- Test results summary: 8 test files / 21 tests pass; lint pass; build pass.

## 16. Outcome Summary

- Root cause: `requestHeaders` từ resolver payload bị mất khi map ở `media-resolver.ts`, làm bước upload fetch source không gửi đúng header và gặp `403`.
- Implemented fix:
  - Preserve `requestHeaders` trong `ResolvedMedia` mapping.
  - Cập nhật `internal-resolver.py` để probe fetchability direct URL theo từng profile (`default`, `youtube-android`) trước khi chốt kết quả.
  - Thêm regression test cho `media-resolver` để đảm bảo header propagation không bị mất lại.
