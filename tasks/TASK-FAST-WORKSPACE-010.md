# [FAST-WORKSPACE-010] End-to-end video metadata flow (title/description/hashtags)

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

- Task ID: FAST-WORKSPACE-010
- Phase: P4
- Target Phase: P4
- Domain: Workspace + Intake + Social Publish
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer:
- Status: Review

## 2. Context

- Lý do: Metadata video đang thiếu chặt chẽ xuyên suốt flow, đặc biệt description/hashtags tiếng Việt cho publish.
- Bài toán cần giải quyết: Thu thập metadata từ intake, sinh metadata VI bằng AI sau translation, hiển thị đúng chỗ detail, và auto dùng khi publish/push video.
- Tài liệu liên quan:
  - docs/SYSTEM-SUMMARY.md
  - docs/governance/ai-agent-rules.md
  - docs/governance/testing-rules.md
  - docs/domains/video-pipeline.md

## 3. Scope

- In scope:
  - Bổ sung description vào intake input và metadata persistence.
  - Thêm workspace node lá để AI sinh title/description/hashtags tiếng Việt từ translated transcript.
  - Hiển thị metadata mới trong storage detail và runtime workspace.
  - Tự điền metadata publish từ metadata AI khi publish node không override.
- Out of scope:
  - Refactor toàn bộ schema lịch sử cũ trong DB.
  - Migration dữ liệu cũ.

## 4. Input / Output

- Input: title/description nguồn (có thể ngoại ngữ), translated transcript segments.
- Output mong đợi: metadata tiếng Việt (title/description/hashtags) được lưu và dùng khi publish.

## 5. Acceptance Criteria

1. URL/local intake nhận và lưu thêm `description` vào source + asset metadata.
2. Workspace có node lá `Generate VI Metadata` chạy sau `Translate Transcript` và lưu kết quả title/description/hashtags tiếng Việt trong runtime.
3. Khi publish trong workspace, nếu node publish không nhập title/caption/hashtags thì tự dùng metadata VI đã generate.
4. Storage detail hiển thị được description + hashtags nếu có.

## 6. Technical Plan

1. Mở rộng kiểu dữ liệu/validation/persistence cho intake metadata description.
2. Thêm module + API generate metadata VI bằng AI provider, và nối flow step mới trong workspace graph + runtime.
3. Cập nhật UI inspector/detail/publish autopopulate logic.
4. Viết test cho validation mới và workspace plan step mới.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - src/lib/video-intake/*
  - src/lib/workspace/*
  - src/lib/multilingual-audio/*
  - src/app/api/audio/*
  - src/features/workspace/*
  - src/features/storage/*

## 8. Test Plan

1. Unit/Integration cần chạy:
  - vitest cho video-intake validation/local-validation/workspace-graph.
2. Failure cases cần thử:
  - Metadata node thiếu transcript translation upstream.
  - Input metadata rỗng/không hợp lệ vẫn fallback an toàn.
3. Kết quả mong đợi:
  - Test pass, flow publish fallback metadata hoạt động.

## 9. Observability

- Metrics: số segment translate, số hashtag generate.
- Logs: trạng thái node generate metadata.
- Error codes: PRV_GROQ_METADATA_FAILED / VAL_METADATA_INVALID.

## 10. Risks & Rollback

- Risks: prompt metadata tạo kết quả không đồng đều theo model.
- Rollback strategy: tắt node metadata hoặc publish override thủ công.

## 11. Deliverables

1. Code + tests cho metadata flow end-to-end.
2. Task evidence + changelog entry.

## 12. Changelog Note

- Added metadata generation node and metadata-aware publish fallback.

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

- Assumptions: dùng chung provider/prompt style với transcript translation.
- Blockers:
- Verification evidence:

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - src/lib/video-intake/validation.test.ts
  - src/lib/video-intake/local-validation.test.ts
  - src/lib/workspace/workspace-graph.test.ts
- Test commands executed:
  - npm run test -- src/lib/video-intake/validation.test.ts src/lib/video-intake/local-validation.test.ts src/lib/workspace/workspace-graph.test.ts
  - npm run build
- Test results summary:
  - 3 test files / 48 tests passed.
  - next build passed (typecheck + compile), còn warning eslint cũ không thuộc scope task.
