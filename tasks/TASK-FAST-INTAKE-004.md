# [FAST-INTAKE-004] Add Again Retry Action in Video Intake Run History

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-INTAKE-004
- Phase: FAST
- Target Phase: Intake UX polish
- Domain: Video Intake
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Lý do: Trong Video Intake history, run failed cần retry nhanh mà không phải nhập lại URL/settings.
- Bài toán cần giải quyết: thêm action `Again` tại history row để chạy lại pipeline từ dữ liệu run cũ.

## 3. Scope
- In scope: thêm nút Again trong Intake Run History và trigger lại submit flow bằng sourceUrl/source settings cũ.
- Out of scope: thay đổi API contract của intake pipeline.

## 4. Acceptance Criteria
1. Mỗi dòng history có nút `Again`.
2. Nhấn `Again` sẽ tự điền lại dữ liệu nguồn từ run và chạy lại pipeline.
3. Khi thiếu dữ liệu retry thì hiển thị lỗi rõ ràng.
4. Có test evidence cho source-level behavior mới.

## 5. Test Plan
1. `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts`

## 6. Test Evidence
- Test files added/updated: src/features/video-intake/video-intake-panel.test.ts
- Test commands executed: npm run test -- --run src/features/video-intake/video-intake-panel.test.ts
- Test results summary: Pass (to be filled after execution)
