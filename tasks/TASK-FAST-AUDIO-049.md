# FAST-AUDIO-049 Prompt-driven Gender Consistency for Transcript Translation

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

- Task ID: FAST-AUDIO-049
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: dịch sai giới tính trong chuỗi segment và có lỗi hư text kiểu `thấnàng/nànàng`.
- Bài toán cần giải quyết: bỏ hướng post-processing phức tạp, chuyển sang prompt translation rõ ràng để model giữ giới tính theo ngữ cảnh.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Tăng ràng buộc prompt để model suy luận giới tính theo cue tiếng Trung xuyên segment.
  - Bổ sung prompt rule cấm tạo từ lỗi ghép đại từ vào giữa từ.
  - Cập nhật tests để khóa prompt contract mới.
- Out of scope:
  - NLP coreference model đầy đủ.
  - Post-processing regex để rewrite đại từ sau khi model dịch.

## 4. Input / Output

- Input: transcript segments tiếng Trung theo timeline.
- Output mong đợi: bản dịch tiếng Việt nhất quán giới tính hơn theo cue ngữ cảnh và không sinh từ lỗi ghép.

## 5. Acceptance Criteria

1. Prompt translation có chỉ dẫn cụ thể về cue nam/nữ và tính nhất quán xuyên segment.
2. Prompt translation có guard cấm malformed words như `thấnàng`, `nànàng`.
3. Test translation liên quan pass.

## 6. Technical Plan

1. Cập nhật `buildTranslationPrompt` với rule giới tính theo cue tiếng Trung.
2. Cập nhật fallback system prompt để giữ cùng nguyên tắc giới tính.
3. Bổ sung assertions trong tests cho prompt contract mới.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`

## 8. Test Plan

1. Run `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`.
2. Run `npm run guard:version`.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: model có thể vẫn sai giới tính ở tình huống mơ hồ không có cue rõ.
- Rollback strategy: revert prompt changes và quay lại prompt baseline trước task.

## 11. Deliverables

1. Prompt translation mới ưu tiên nhất quán giới tính theo cue ngữ cảnh.
2. Regression tests cho prompt contract + evidence.

## 12. Changelog Note

- Improve transcript gender consistency with explicit prompt cues and malformed-word guardrails.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: provider follows explicit instruction better than brittle regex replacements.
- Blockers: none.
- Verification evidence: added in section 15.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run guard:version`
- Test results summary:
  - translation tests pass (`1 file`, `14 tests`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass (`[version-guard] OK`).
