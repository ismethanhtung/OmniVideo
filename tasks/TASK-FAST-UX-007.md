# [FAST-UX-007] Redesign AI Provider Chat Test Modal in English

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-UX-007
- Phase: FAST
- Target Phase: UX polish
- Domain: UI/UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Modal `Chat thử API` hiện đang dùng copy tiếng Việt lẫn tiếng Anh và bố cục khá dày, khó scan nhanh khi test provider.
- Bài toán cần giải quyết: Redesign modal theo hướng rõ ràng hơn và chuẩn hóa copy tiếng Anh để dùng nhất quán trong AI Providers panel.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Redesign UI của chat-test modal trong AI Providers panel.
  - Chuyển toàn bộ text trong modal sang tiếng Anh.
  - Cập nhật tooltip trigger button liên quan modal.
  - Thêm/ cập nhật test cho thay đổi UI text/structure.
- Out of scope:
  - Thay đổi API contract `chat-test`.
  - Refactor các panel khác ngoài AI Providers.

## 4. Input / Output

- Input: Existing chat-test modal in `src/features/ai-providers/ai-providers-panel.tsx`.
- Output mong đợi: Modal dễ đọc hơn, copy tiếng Anh nhất quán, giữ nguyên flow chat-test hiện tại.

## 5. Acceptance Criteria

1. Chat-test modal hiển thị tiêu đề/subcopy tiếng Anh và không còn text tiếng Việt trong modal.
2. Modal có layout rõ hơn gồm: header context, empty-state hint, chat timeline, composer actions, model/temp controls.
3. Trigger tooltip cho chat-test action dùng tiếng Anh nhất quán.
4. Có test evidence cập nhật cho thay đổi UI modal.

## 6. Technical Plan

1. Cập nhật constants/copy text tiếng Anh cho chat-test modal.
2. Refactor JSX modal sang layout dễ scan (header/body/footer controls) nhưng giữ state + API flow.
3. Thêm source-level regression test cho modal text/structure.
4. Chạy focused tests để xác nhận pass.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/ai-providers/ai-providers-panel.tsx`
  - `src/features/ai-providers/ai-providers-panel.test.ts`

## 8. Test Plan

1. Unit/source test cho modal text + structure markers.
2. Chạy focused Vitest file cho AI Providers modal.
3. Failure case: đảm bảo fallback assistant empty-response text cũng đã chuyển tiếng Anh.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: none.

## 10. Risks & Rollback

- Risks: đổi copy có thể làm lệch kỳ vọng người dùng quen tiếng Việt ở panel này.
- Rollback strategy: revert modal text/layout commit về phiên bản trước nếu feedback cần bilingual.

## 11. Deliverables

1. Updated AI Providers chat-test modal UI/copy in English.
2. Regression test for chat-test modal source markers.
3. Task/changelog updates with verification evidence.

## 12. Changelog Note

- Redesign AI Provider chat-test modal with English-first copy and clearer structure.

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
  - Chỉ redesign modal `chat-test`, không đổi visual system global.
- Blockers:
  - none.
- Verification evidence:
  - Updated modal copy/layout in `ai-providers-panel.tsx`.
  - Added source-level regression tests in `ai-providers-panel.test.ts`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/ai-providers/ai-providers-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/ai-providers/ai-providers-panel.test.ts`
- Test results summary:
  - Pass (2 tests / 1 file).
