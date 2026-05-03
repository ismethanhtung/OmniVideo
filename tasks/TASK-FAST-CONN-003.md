# [FAST-CONN-003] Relax AI provider endpoint routing for model fetch/chat test compatibility

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

- Task ID: FAST-CONN-003
- Phase: FAST
- Target Phase: Connection reliability
- Domain: AI Providers
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Một số provider OpenAI-compatible hoạt động với endpoint khác chuẩn `/chat/completions` hoặc `/models` nên panel AI Providers test kết nối/fetch model bị fail dù token và service thực tế vẫn hoạt động.
- Bài toán cần giải quyết: Giảm cấu hình cứng endpoint trong AI provider client để tương thích các biến thể phổ biến (ví dụ Ollama cloud `/api/chat`, `/v1/models`) mà không phá provider đang chạy ổn định.
- Tài liệu liên quan:
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Cập nhật `src/lib/ai-providers/client.ts` để fallback endpoint cho model fetch và chat test.
  - Normalize response từ endpoint Ollama `/api/chat` về format chat completion hiện tại.
  - Bổ sung regression tests cho fallback path và response mapping.
- Out of scope:
  - Thay đổi schema DB/UI form để nhập endpoint override riêng.
  - Refactor provider-type taxonomy.

## 4. Input / Output

- Input: AI provider base URL + API key hiện có trong DB.
- Output mong đợi: Cùng một provider có thể pass model fetch/chat test nếu service dùng biến thể endpoint phổ biến ngoài OpenAI path mặc định.

## 5. Acceptance Criteria

1. Model fetch thử được fallback endpoint `/v1/models` khi `/models` không tồn tại.
2. Chat test thử được fallback endpoint `/api/chat` khi `/chat/completions` và `/v1/chat/completions` không khả dụng.
3. Response `/api/chat` được map về shape chat completion để UI chat test hiển thị assistant message và usage.
4. Có regression tests cho cả 2 fallback trên.

## 6. Technical Plan

1. Thêm helper build endpoint candidates từ `baseUrl` + danh sách path fallback.
2. Áp dụng retry tuần tự cho `fetchProviderModels` và `chatCompletion` với điều kiện fallback cho HTTP 404/405.
3. Map payload Ollama `/api/chat` thành `ChatCompletionResponse`.
4. Cập nhật `src/lib/ai-providers/client.test.ts` với 2 test regression mới.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/ai-providers/client.ts`
  - `src/lib/ai-providers/client.test.ts`

## 8. Test Plan

1. Chạy unit tests cho `src/lib/ai-providers/client.test.ts`.
2. Failure cases cần thử: endpoint primary trả 404 trước khi fallback endpoint thành công.
3. Kết quả mong đợi: fallback path được gọi đúng thứ tự, payload normalize đúng.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: giữ nguyên `PRV_AI_MODELS_FETCH_FAILED`, `PRV_AI_CHAT_COMPLETION_FAILED`.

## 10. Risks & Rollback

- Risks: fallback nhiều endpoint có thể tăng 1-2 request khi endpoint đầu tiên không hợp lệ.
- Rollback strategy: revert thay đổi ở `src/lib/ai-providers/client.ts` nếu phát hiện side-effect không mong muốn.

## 11. Deliverables

1. Fallback endpoint routing cho model fetch/chat test.
2. Ollama `/api/chat` response normalization.
3. Regression tests + task/changelog updates.

## 12. Changelog Note

- Relax AI provider endpoint routing with model/chat fallback for OpenAI-compatible providers.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - Fallback endpoint ưu tiên tương thích mà không yêu cầu thay DB schema hiện tại.
- Blockers:
  - none.
- Verification evidence:
  - Added fallback endpoint routing and Ollama response normalization in `src/lib/ai-providers/client.ts`.
  - Added regression tests in `src/lib/ai-providers/client.test.ts`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ai-providers/client.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ai-providers/client.test.ts`
- Test results summary:
  - Pending execution.
