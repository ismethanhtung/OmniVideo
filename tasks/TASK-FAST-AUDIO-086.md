# [FAST-AUDIO-086] Default Voice Match Strength to 1.0x and Implement Warm Model In-Memory Reuse with Idle Timeout for ZeroTTS on Mac

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

- Task ID: FAST-AUDIO-086
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS
- Task Type: Optimization / Reliability
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator raised two suggestions to boost ZeroTTS generation speed while ensuring safety for their fanless MacBook Air M1 (avoiding thermal throttling, excessive memory swap, and hardware degradation):
1. Keep the model in memory (`ZeroTTS.from_pretrained()` once and reuse it across requests) instead of reloading the ~858MB model from disk on every invocation.
2. Set default Voice Match Strength to 1.0x (`CFG: 1x`).

Investigation revealed:
- `zerotts-runner.py` had a logic trap that forcibly overrode `cfg_scale` to `1.25` for custom voice packs when `effective_cfg <= 1.0`. In ZeroTTS architecture, `cfg_scale > 1.0` doubles per-frame computational complexity by evaluating both conditional and unconditional branches. Setting `cfg_scale = 1.0` halves the CPU computation and cuts inference time in half (~31s down to ~15s).
- Running a daemon permanently on an 8GB M1 Mac could cause memory pressure and SSD swap thrashing. A warm resident daemon with an auto-shutdown idle timeout (15 minutes) ensures instant synthesis when actively in use, while automatically releasing ~1.2GB of RAM back to macOS when idle.
- In `zerotts.ts`, if the daemon was not ready on the first call, it spawned the daemon while simultaneously launching CLI inference, causing two heavy 858MB models to load concurrently in RAM. Awaiting daemon readiness prevents this duplicate load spike.
- Regarding local audio-to-zip cloning: ZeroWeight AI intentionally did not release the PerceiverIO audio encoder in their open-source release, keeping wav-to-latents extraction proprietary on `platform.zeroweight.ai`.

## 3. Scope

- In scope:
  - Set default Voice Match Strength to `1.0x` in `src/features/audio/piper-tts-sandbox-panel.tsx`.
  - Remove forced `cfg_scale = 1.25` override for custom voices in `src/lib/multilingual-audio/zerotts-runner.py`.
  - Add 15-minute idle auto-shutdown watchdog and graceful `/shutdown` endpoint to `run_daemon_server` in `zerotts-runner.py` to protect MacBook Air M1 RAM and thermals.
  - Optimize `generateZeroTtsSpeech` in `zerotts.ts` to cleanly await daemon readiness and prevent concurrent dual model loading.
  - Update unit tests in `zerotts.test.ts` and `piper-tts-sandbox-panel.test.ts`.
  - Bump package version to `0.11.77` and document changes in `changelog/changelog.md`.
- Out of scope:
  - Local wav-to-zip audio encoder (the model weights are closed-source by ZeroWeight AI).

## 4. Input / Output

- Input: Voice synthesis requests in Feature Sandbox ZeroTTS Voice Lab.
- Output: 2x faster synthesis inference via CFG 1.0x bypass, sub-second model response time via warm daemon reuse, and automatic memory cleanup after 15 minutes of inactivity.

## 5. Acceptance Criteria

1. `piper-tts-sandbox-panel.tsx` sets `zeroTtsCfgScale` default to `"1.0"`.
2. `zerotts-runner.py` respects `cfg_scale = 1.0` without overriding to `1.25` for custom voice packs.
3. `zerotts-runner.py` daemon server implements an idle watchdog terminating the process after 15 minutes (900s) of inactivity.
4. `zerotts.ts` awaits daemon readiness before fallback, preventing dual concurrent Python processes.
5. All test suites pass and `npm run guard:version` succeeds.

## 6. Technical Plan

1. Modify `src/lib/multilingual-audio/zerotts-runner.py`:
   - Delete `if is_custom_voice and effective_cfg <= 1.0: effective_cfg = 1.25`.
   - Update `run_daemon_server` with `idle_timeout_sec=900`, `idle_watchdog` thread, and `/shutdown` endpoint.
2. Modify `src/features/audio/piper-tts-sandbox-panel.tsx`:
   - Set `useState("1.0")` for `zeroTtsCfgScale`.
   - Update UI descriptions for 1.0x (Tối ưu tốc độ gấp đôi) vs 1.25x-1.4x (Bám sát mẫu hơn).
3. Modify `src/lib/multilingual-audio/zerotts.ts`:
   - Await `ensureZeroTtsDaemon` if daemon is not ready before falling back to CLI.
4. Update unit test files.
5. Bump version to `0.11.77` and run tests.

## 7. Code Change Impact

- Files:
  - `src/lib/multilingual-audio/zerotts-runner.py`
  - `src/lib/multilingual-audio/zerotts.ts`
  - `src/features/audio/piper-tts-sandbox-panel.tsx`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `src/lib/multilingual-audio/zerotts.test.ts`
  - `package.json`, `package-lock.json`, `changelog/changelog.md`, `tasks/board.md`

## 8. Test Plan

- Test CFG scale 1.0 behavior in runner.
- Test daemon health check and idle shutdown capability.
- Run vitest suite across audio and sandbox tests.
- Verify version guard.

## 9. Observability

- Daemon prints startup, request handling, and idle shutdown logs to stdout/stderr.

## 10. Risks & Rollback

- Risk: Daemon port collision if port 50123 is bound.
- Mitigation: Safe fallback to direct CLI execution if HTTP daemon request fails.

## 11. Deliverables

- Optimized ZeroTTS execution with CFG 1.0x and memory-safe idle daemon.
- Complete unit test suite and changelog update.

## 12. Changelog Note

- Default ZeroTTS Voice Match Strength (CFG) to 1.0x for 2x faster CPU synthesis.
- Implement warm in-memory model reuse with 15-minute idle auto-shutdown to protect MacBook Air M1 Unified RAM.
