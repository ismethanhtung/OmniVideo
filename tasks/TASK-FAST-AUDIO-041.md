# FAST-AUDIO-041 Add Optional Replicate Spleeter Vocals for Audio Transcript 2

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-041
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Owner muốn Audio Transcript 2 thử tùy chọn tách vocal bằng `soykertje/spleeter` qua Replicate trước khi gửi Groq Whisper.
- Bài toán cần giải quyết: thêm checkbox an toàn chỉ cho Audio Transcript 2, gọi Replicate optional và fallback/error rõ ràng khi thiếu token hoặc provider lỗi.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: checkbox Audio Transcript 2, request flag, Replicate Spleeter client, optional vocals extraction step, tests.
- Out of scope: enabling this option on Audio Transcript 1 or adding VAD/timeline allocator in this task.

## 4. Input / Output

- Input: source video/audio and optional checkbox.
- Output mong đợi: when enabled, Groq transcribes Replicate vocals-only audio; when disabled, existing pipeline remains unchanged.

## 5. Acceptance Criteria

1. Audio Transcript 2 shows a checkbox for Replicate Spleeter vocals extraction.
2. Audio Transcript 1 does not show the checkbox.
3. API passes the checkbox flag into transcription domain.
4. When enabled, pipeline records a `separate-vocals` step and transcribes normalized vocals audio.
5. Missing Replicate token or Replicate failure returns structured Audio Transcript errors.
6. Tests cover UI/source markers and domain success/failure behavior.

## 6. Technical Plan

1. Add transcription request option and error codes for Replicate Spleeter.
2. Implement Replicate client with data URI input, polling, vocals download, and mp3 re-normalization.
3. Expose checkbox only via Audio Transcript 2 wrapper and update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript UI, API route, transcription domain.

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/chinese-transcription.test.ts`.
2. Route/source tests: `src/app/api/audio/chinese-transcription/route.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`.
3. Build + version guard.

## 9. Observability

- Metrics: `separate-vocals` step includes model/provider/output size.
- Logs: none.
- Error codes: add Replicate token/provider errors.

## 10. Risks & Rollback

- Risks: Replicate data URI size/provider limits; option remains opt-in and scoped to Audio Transcript 2.
- Rollback strategy: hide checkbox and skip Spleeter branch.

## 11. Deliverables

1. Audio Transcript 2 Spleeter checkbox.
2. Optional Replicate vocals extraction.
3. Tests, version bump, changelog, task evidence.

## 12. Changelog Note

- Add optional Replicate Spleeter vocals extraction for Audio Transcript 2.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có acceptance criteria rõ ràng
- [x] Có test plan
- [x] Có test evidence

## 14. Execution Notes

- Assumptions: Replicate accepts the `audio` input as a string file reference/data URI and returns `vocals` plus `accompaniment` URLs for `soykertje/spleeter`.
- Blockers: None.
- Verification evidence:
  - Audio Transcript 2 wrapper enables the Spleeter checkbox; Audio Transcript 1 keeps it hidden.
  - The API forwards `useReplicateSpleeterVocals` into the transcription domain.
  - The transcription domain records `separate-vocals` success/failure steps and uses normalized vocals audio for Groq when enabled.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/chinese-transcription.test.ts`, `src/app/api/audio/chinese-transcription/route.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/chinese-transcription-panel.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (3 files / 14 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.21`.
