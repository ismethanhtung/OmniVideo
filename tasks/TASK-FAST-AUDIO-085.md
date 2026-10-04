# [FAST-AUDIO-085] Optimize ZeroTTS Long-Form Synthesis with Intelligent Sentence Chunking and Display Human-Readable Generation Speed

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

- Task ID: FAST-AUDIO-085
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS
- Task Type: Improvement / Optimization
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Long-form Vietnamese inputs into ZeroTTS without sentence segmentation caused autoregressive quadratic attention blowup and runaway frame lengths (taking 224s for a 40s speech on Mac CPU). Furthermore, the UI only displayed raw millisecond latency (`224696ms latency`) without formatted human-readable generation time or realtime speed ratio (RTF). The operator also requested a clear technical comparison of why Piper TTS is instantaneous compared to ZeroTTS.

## 3. Scope

- In scope:
  - Add intelligent sentence chunking (`chunk_text(normalize_punctuation(...), max_chunk_sec=12.0)`) and seamless audio concatenation (`concat_with_silence`) to `zerotts-runner.py`.
  - Tune ONNX Runtime threads dynamically based on CPU core count (`min(4, os.cpu_count() or 4)`) instead of hardcoding 2 threads.
  - Update `src/features/audio/piper-tts-sandbox-panel.tsx` to display human-readable generation duration (e.g. `24.9s` / `3m 44s`), generation speed ratio (e.g. `1.3x Realtime`), and explicit Generation Time stats.
  - Update unit test suite in `zerotts.test.ts` and `piper-tts-sandbox-panel.test.ts`.
- Out of scope:
  - Removing ZeroTTS model or replacing with cloud API.

## 4. Input / Output

- Input: Long-form text input (> 100 characters) in ZeroTTS Voice Lab.
- Output: Synthesized audio generated up to 7-9x faster with natural sentence flow, accompanied by human-readable generation latency and realtime factor metrics.

## 5. Acceptance Criteria

1. ZeroTTS runner integrates intelligent sentence chunking for long-form texts, chunking into natural sentences (<= 12-15s per chunk) with clean punctuation and silence concatenation.
2. ONNX Runtime uses optimal multi-threading (`min(4, os.cpu_count() or 4)`).
3. The UI displays human-readable generation duration (`Xs` or `Xm Ys`) and realtime speed factor (`X.Xx Realtime`).
4. Output stats grid includes Generation Time and Speed metrics.
5. All automated unit tests in `zerotts.test.ts` and `piper-tts-sandbox-panel.test.ts` pass.

## 6. Technical Plan

1. In `src/lib/multilingual-audio/zerotts-runner.py`:
   - Import `chunk_text`, `clean_segment_punctuation`, `normalize_punctuation` from `zerotts.chunking`.
   - Import `concat_with_silence` from `zerotts.audio`.
   - In `get_or_create_tts()`, use `intra_op_num_threads = min(4, os.cpu_count() or 4)`.
   - In `synthesize_speech()`:
     - After normalization, check if text has multiple sentences or is long (> 100 chars).
     - Split using `chunk_text(normalize_punctuation(processed_text), max_chunk_sec=12.0)`.
     - Synthesize each chunk with `tts.synthesize()` and concatenate using `concat_with_silence(chunks, gap_sec=sentence_silence, sample_rate=sample_rate)`.
2. In `src/features/audio/piper-tts-sandbox-panel.tsx`:
   - Format `zeroTtsResult.generationDurationMs` cleanly into seconds/minutes.
   - Calculate and display Realtime Speed Factor (`(durationMs / generationDurationMs).toFixed(1) + "x Realtime"`).
   - Add "Gen Time" and "Speed" in the metrics cards.
3. Update tests and verify version guard.

## 7. Code Change Impact

- Impacted files:
  - `src/lib/multilingual-audio/zerotts-runner.py`
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `src/lib/multilingual-audio/zerotts.test.ts`
  - `package.json`, `package-lock.json`, `changelog/changelog.md`, `tasks/board.md`

## 8. Test Plan

- Unit tests: verify chunking logic, multi-sentence synthesis, human-readable UI formatting.
- Performance tests: verify generation time of 500-char text drops from ~224s to ~25-32s on local CPU.

## 9. Observability

- ZeroTTS runner stdout/stderr logs chunk counts and synthesis timings.

## 10. Risks & Rollback

- Risk: Short single-word inputs may have tiny overhead if unnecessarily chunked.
- Mitigation: If text produces only 1 chunk, synthesize directly without extra concatenation.

## 11. Deliverables

- Optimized `zerotts-runner.py` with chunking.
- Human-readable generation metrics in `piper-tts-sandbox-panel.tsx`.
- Updated test suite and documentation.

## 12. Changelog Note

- Planned summary: Optimize ZeroTTS long-form synthesis with intelligent sentence chunking and display human-readable generation speed.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Improvement

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Evidence

- Chunking Benchmark on user text (500 chars, ~32.4s audio):
  - Without chunking: 224.7s (RTF 0.18x)
  - With chunking (4 chunks, 12s budget): 26.4s (RTF 1.23x) -> **8.5x speedup**.
- Test run command: `npm run test -- --run src/lib/multilingual-audio/zerotts.test.ts src/lib/multilingual-audio/zerotts-voices.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts`
- Result: 3 files / 17 tests passed.
- Version Guard command: `npm run guard:version`
- Result: OK (0.11.76).
