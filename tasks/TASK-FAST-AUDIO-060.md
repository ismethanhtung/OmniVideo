# FAST-AUDIO-060 Segment-Level Retry for Overlong Chinese Transcription Segments

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

- Task ID: FAST-AUDIO-060
- Phase: P2
- Target Phase: P2
- Domain: Multilingual Audio / Transcription
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Groq/Whisper đôi khi trả về một segment tiếng Trung quá dài, gộp nhiều câu vào một timestamp range, làm hỏng dịch, subtitle và voice timing downstream.
- Bài toán cần giải quyết: Detect segment có nhiều hơn 40 ký tự Hán, cắt đúng audio range của segment đó và gọi lại transcription tối đa 5 lần. Nếu vẫn không tách được thì báo lỗi rõ ràng.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Detect overlong Chinese/Han transcription segments after initial Groq transcription.
  - Cut extracted speech-ready audio by segment timestamp and retry only suspicious clips.
  - Replace suspicious segment with retried segment(s), offset timestamps back to original timeline.
  - Fail with a stable error when retries are exhausted.
  - Add regression tests.
- Out of scope:
  - Changing translation or TTS algorithms.
  - Reprocessing the entire source video for suspicious segments.
  - UI controls for configuring threshold/retry count.

## 4. Input / Output

- Input: Chinese transcription result with one or more segments containing more than 40 Han characters.
- Output mong đợi: Suspicious segment is replaced by shorter retried segment(s), or the pipeline fails with an explicit retry-exhausted error after 5 attempts.

## 5. Acceptance Criteria

1. Segment with `> 40` Han characters triggers segment-level audio clipping and Groq retry.
2. Retry calls are capped at 5 attempts per suspicious segment.
3. Successful retry can replace one suspicious segment with multiple shorter segments while preserving original timeline offsets.
4. If all retry attempts still return a segment with `> 40` Han characters, transcription fails with a clear segment retry exhausted error.
5. Regression tests cover successful split and exhausted retry failure.

## 6. Technical Plan

1. Add reusable extracted-audio segment clipping helper using ffmpeg.
2. Add suspicious Han-character detection and retry orchestration in `runChineseVideoTranscription` after initial Groq response.
3. Normalize replacement segments/words with timestamp offsets and stable segment ids.
4. Add tests for success and failure paths.
5. Update changelog/version and run targeted tests plus version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/*`, `package.json`, `package-lock.json`, task/changelog.

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
2. Failure cases cần thử: retry exhausted after 5 attempts still returns overlong Han segment.
3. Kết quả mong đợi: Tests pass and verify retry count, clipping input, timestamp offsets, and error code.

## 9. Observability

- Metrics: transcription step records suspicious segment count and retry request count.
- Logs: no new console logs; API error response includes stable code/message through existing route handling.
- Error codes: `PRV_GROQ_SEGMENT_RETRY_EXHAUSTED`.

## 10. Risks & Rollback

- Risks: ffmpeg clip boundaries may cut too tightly for edge cases; retry adds provider cost only for suspicious segments.
- Rollback strategy: Remove suspicious segment retry path and keep initial Groq transcription behavior.

## 11. Deliverables

1. Segment-level retry implementation.
2. Regression tests.
3. Task, board, changelog, and version updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add segment-level Groq retry for overlong Chinese transcription segments by clipping and retranscribing only suspicious audio ranges.

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

- Assumptions: Han-character count is the best deterministic signal for merged Chinese transcript segments in this pipeline.
- Blockers: None.
- Verification evidence: Targeted tests pass; version guard pass; build attempted and blocked by unrelated existing type error in `src/app/api/video-processing/edit/route.ts`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/chinese-transcription.test.ts`, `src/lib/multilingual-audio/audio-extraction.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`; `npm run guard:version`; `npm run build`.
- Test results summary: Targeted tests pass (2 files / 11 tests). Build fails in unrelated `src/app/api/video-processing/edit/route.ts` type error outside this task scope.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
