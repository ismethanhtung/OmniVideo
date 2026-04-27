# P2-AUDIO-005 Groq Segment Translation for Audio Transcript

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

- Task ID: P2-AUDIO-005
- Phase: P2
- Target Phase: P2
- Domain: Multilingual Audio / Workspace
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Audio Transcript đã có source-language segments với timestamps; bước tiếp theo cần dịch sang tiếng Việt nhưng giữ nguyên timeline để phục vụ lồng tiếng/subtitle.
- Bài toán cần giải quyết: Gọi Groq chat LLM để dịch segment-level transcript theo ngữ cảnh, preserve `id/start/end`, render song ngữ/toggle trong UI, và thêm Workspace node tương ứng.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/architecture/node-architecture.md`
  - Groq model docs verified 2026-04-27: `llama-3.1-8b-instant` supports JSON Object Mode and 131,072-token context.

## 3. Scope

- In scope:
  - API dịch transcript segments bằng Groq chat completions.
  - Model selector, default `llama-3.1-8b-instant`.
  - UI translation block under Audio Transcript result with source/translation toggle.
  - Preserve timestamps and segment ids.
  - Workspace node `text.translate-transcript` after Audio Transcript node.
  - Tests for adapter mapping, API validation, workspace planning.
- Out of scope:
  - Chunking very long transcripts.
  - Human review editor.
  - TTS/Kling AI voice generation.

## 4. Input / Output

- Input: transcript segments `{id,start,end,text}`, source language, target language, model.
- Output mong đợi: translated segments `{id,start,end,sourceText,translatedText}` preserving order and timestamps.

## 5. Acceptance Criteria

1. Audio Transcript page can translate transcript segments to Vietnamese with default model `llama-3.1-8b-instant`.
2. Translation output preserves segment `id`, `start`, and `end`.
3. UI can toggle segment table between source and Vietnamese translation.
4. API rejects empty segments and provider failures with stable error codes.
5. Workspace supports `Audio Transcript -> Translate Transcript` node flow and runs translation after transcription.
6. Tests cover happy path and failure path.

## 6. Technical Plan

1. Add `src/lib/multilingual-audio/transcript-translation.ts` with Groq adapter and JSON normalization.
2. Add API route `POST /api/audio/transcript-translation`.
3. Extend Audio Transcript UI with translation controls/results/toggle.
4. Add Workspace node template, planner step, runtime execution branch.
5. Update docs/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - `src/app/api/audio/transcript-translation/route.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/workspace/workspace-graph.test.ts`
2. Failure cases cần thử:
   - Empty segments.
   - Groq provider error.
   - Workspace translate node without upstream transcript.
3. Kết quả mong đợi:
   - Targeted tests pass, build pass, full test pass.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes:
  - `VAL_TRANSLATION_SEGMENTS_REQUIRED`
  - `PRV_GROQ_TRANSLATION_FAILED`

## 10. Risks & Rollback

- Risks:
  - Very long transcripts can exceed model context/output; chunking is follow-up.
  - LLM translation quality may need manual review prompt tuning.
- Residual risks:
  - Adaptive chunking handles request-too-large and untranslated CJK retry, but extremely long videos can still hit cumulative TPM/RPM limits and may need queued/background translation later.
- Rollback strategy:
  - Remove translation API/UI/node without impacting transcription.

## 11. Deliverables

1. Translation API.
2. Audio Transcript translation UI.
3. Workspace translation node.
4. Tests/docs/changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Groq LLM segment translation with timestamp preservation for Audio Transcript and Workspace.

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

## 14. Execution Notes

- Assumptions:
  - Translation target defaults to Vietnamese (`vi`).
  - Default model id is `llama-3.1-8b-instant`.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (30 tests / 4 files).
  - `npm run build` pass. Existing warning remains: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.
  - `npm run test` pass (189 tests / 45 files).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/app/api/audio/transcript-translation/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests pass: 30 tests / 4 files.
  - Full suite pass: 189 tests / 45 files.
  - Build pass with existing unused `Image` warning.
