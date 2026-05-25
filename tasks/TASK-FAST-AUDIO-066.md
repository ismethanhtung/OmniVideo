# [FAST-AUDIO-066] Chunk Groq Transcription Uploads and Fix VIP Multiline Progress Detail

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

- Task ID: FAST-AUDIO-066
- Phase: MVP runtime hardening
- Target Phase: VIP transcription resilience and observability
- Domain: Audio / Groq transcription / Workspace progress
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: VIP failed with `PRV_GROQ_TRANSCRIPTION_FAILED` and `Request Entity Too Large` when extracted speech audio exceeded Groq upload size limit for direct file upload in free tier scenarios.
- Lý do bổ sung: Workspace VIP running detail showed literal `\n` instead of real line breaks, reducing readability and stage visibility.
- Mục tiêu: Keep output quality unchanged while avoiding oversize upload failures by chunking transcription requests and fixing multiline progress rendering.

## 3. Scope

- In scope:
  - Add Groq transcription chunking path when extracted audio exceeds direct upload target bytes.
  - Preserve transcript timestamps by offsetting chunk-relative timestamps back to global timeline.
  - Keep existing overlong-segment retry behavior.
  - Fix VIP running detail newline rendering in Workspace.
  - Add regression tests for chunking and multiline source expectation.
- Out of scope:
  - Changing Piper synthesis quality/model.
  - Replacing Groq provider.
  - True server-push streaming for internal VIP stage updates.

## 4. Acceptance Criteria

1. Audio extraction larger than direct upload target no longer attempts one giant Groq upload.
2. Transcription runs in multiple chunk requests with merged absolute timestamps.
3. Workspace VIP running detail renders real line breaks instead of literal `\n` text.
4. Regression tests pass for chunking path and progress rendering source expectation.

## 5. Technical Plan

1. Add chunk planning by estimated bytes-per-second from extracted audio size and duration.
2. Extract chunk clips with small overlap, transcribe each chunk, merge kept window ranges back to absolute timeline.
3. Keep retry-overlong-segment stage unchanged, running on merged transcript.
4. Update Workspace progress detail join separator to real newline.
5. Add/adjust tests and update changelog/version evidence.

## 6. Test Plan

1. `runChineseVideoTranscription` success path asserts `chunkingEnabled=false` for small extracted audio.
2. New regression: extracted audio > 24MB direct target uses multi-chunk transcription and reports `chunkCount > 1`.
3. Workspace source test asserts VIP stage detail uses real newline join.
4. Run focused tests and `npm run guard:version`.

## 7. Execution Notes

- Root cause: Current flow transcribed one extracted MP3 payload directly; for long videos this can exceed Groq direct upload limits even after speech-ready compression.
- Fix strategy: Chunk at transcription stage using overlapping clips and timestamp offset merge to avoid reducing quality.
- Residual risk: Chunk boundaries may slightly alter segmentation around overlap edges; overlap + keep-window filtering is added to minimize boundary artifacts.

## 8. Test Evidence

- Test files updated:
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Commands:
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run guard:version`
