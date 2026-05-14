# FAST-AUDIO-050 Console Log Transcript Translation Provider Exchanges and Larger Chunks

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

- Task ID: FAST-AUDIO-050
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: cần xem request/response thật khi Audio Transcript gọi provider dịch, nhưng không cần UI debug panel.
- Bài toán cần giải quyết: log full request/response vào terminal server, tăng chunk dịch lên khoảng 100 segments/lần, và siết prompt để model dịch giới tính tốt hơn.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Log provider request/response body cho transcript translation ở server console.
  - Tăng chunk target từ khoảng 24 lên 100 segments và tăng char budget tương ứng.
  - Refine prompt với hướng dẫn lập cast/gender map, resolve `他` theo ngữ cảnh, và dùng neutral wording khi mơ hồ.
  - Gỡ phần debug UI/session/API field không còn cần.
- Out of scope:
  - Persist provider exchange vào DB.
  - Log API key hoặc authorization header.
  - Thay đổi transcription Whisper endpoint.

## 4. Input / Output

- Input: transcript segments gửi sang translation provider.
- Output mong đợi: terminal dev server thấy full request/response body; translation request gom khoảng 100 segments khi không vượt char budget.

## 5. Acceptance Criteria

1. Mỗi call transcript translation provider log request body và response body vào console.
2. Chunking dùng target `100` segments/lần cho default và non-default provider.
3. Prompt có chỉ dẫn rõ để suy luận giới tính theo toàn chunk và tránh dịch máy móc `他`.
4. Tests liên quan pass.

## 6. Technical Plan

1. Replace UI debug capture with server-side `console.log` around provider fetch.
2. Raise translation chunk segment/char limits.
3. Strengthen gender prompt and update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/app/api/audio/transcript-translation/route.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/transcript-session.ts`
  - `src/lib/multilingual-audio/transcript-session.test.ts`

## 8. Test Plan

1. Run `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/transcript-session.test.ts src/features/audio/chinese-transcription-panel.test.ts`.
2. Run `npm run guard:version`.

## 9. Observability

- Metrics: none.
- Logs: `[AudioTranscript Translation] provider request/response`.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: console output can be verbose for long transcripts.
- Rollback strategy: remove console logs or gate them behind a local env flag.

## 11. Deliverables

1. Server console logs for provider request/response.
2. Larger translation chunk size around 100 segments.
3. Stronger gender prompt contract and tests.

## 12. Changelog Note

- Add console logging for transcript translation provider exchanges, increase chunk size, and refine gender prompt.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: logs are intended for local `npm run dev` debugging and do not include auth headers.
- Blockers: none.
- Verification evidence: added in section 15.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/lib/multilingual-audio/transcript-session.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/transcript-session.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run guard:version`
- Test results summary:
  - tests pass (`3 files`, `23 tests`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass (`[version-guard] OK`).
