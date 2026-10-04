# [FAST-AUDIO-083] Add ZeroTTS Voice Cloning and Synthesis Lab to Feature Sandbox

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

- Task ID: FAST-AUDIO-083
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Multilingual Audio / ZeroTTS
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

The operator wants to use ZeroTTS (`https://github.com/zeroweight-ai/ZeroTTS`) for Vietnamese voice cloning and high-quality CPU-friendly TTS inside OmniVideo's Feature Sandbox. The operator has a 10s sample voice and tested on ZeroWeight platform with perfect results. Feature Sandbox needs a dedicated ZeroTTS Voice Lab section that supports voice cloning (custom voice packs / .zip / .npz / reference audio files) as well as preset voices (`maichi`, `duy`, `ngoc`, `phuong`, `quang`, `tuan`, `lan`), Vietnamese text normalization (`normalize_vi_text`), custom tuning parameters (speed, temperature, noise scale, sentence silence), audio preview player, and download actions.

## 3. Scope

- In scope:
  - Add backend ZeroTTS execution service and Python runner (`zerotts-runner.py`, `zerotts.ts`) supporting preset voices and custom voice packs (.zip / .npz) / reference audio.
  - Add ZeroTTS voice discovery API (`/api/audio/zerotts-voices`) and synthesis API (`/api/audio/zerotts`).
  - Add `ZeroTTS Voice Lab` in Feature Sandbox (`piper-tts-sandbox-panel.tsx`) with:
    - Voice Mode selection: Preset voices vs. Custom Cloned Voice (upload .zip/.npz/sample audio, or select local file).
    - Sample audio / voice pack upload with inline player for the 10s reference audio.
    - Quick Vietnamese sample phrases (conversational, news, storytelling).
    - Text normalization toggle (`normalize_vi_text` for dates, numbers, time).
    - Speed, temperature, and silence controls.
    - Full waveform/audio player with duration, byte size, format metadata, and download WAV action.
    - Actionable setup guidance and status diagnostics (Python `zerotts` package status, local voice packs discovery).
  - Add unit, failure, and UI tests for ZeroTTS services and panel.
- Out of scope:
  - Modifying VIP pipeline or Workspace node defaults in this task.
  - Full retraining or fine-tuning of neural models locally.

## 4. Input / Output

- Input: Text to synthesize (Vietnamese/English), voice mode (preset vs custom voice pack/sample audio), speed factor, normalization flag, sampling parameters.
- Output: Generated WAV audio buffer/base64, duration, byte count, and generation latency.

## 5. Acceptance Criteria

1. Feature Sandbox panel contains a dedicated "ZeroTTS Voice Lab" section.
2. Supports selecting preset voices (`maichi`, `duy`, `ngoc`, `phuong`, `quang`, `tuan`, `lan`) and custom cloned voice packs (.zip/.npz) or uploading 10s voice sample / voice pack file.
3. Supports Vietnamese text normalization (`normalize_vi_text`) to cleanly synthesize dates, currency, and times.
4. API endpoint `/api/audio/zerotts` correctly handles synthesis and returns structured JSON with WAV base64, durationMs, and byteLength.
5. API endpoint `/api/audio/zerotts-voices` lists available presets and discovered custom voice files.
6. Clean error handling with informative diagnostic messages when Python environment or dependencies need setup.
7. Automated tests cover runner execution, voice listing, API routing, and Feature Sandbox UI integration.

## 6. Technical Plan

1. Create `src/lib/multilingual-audio/zerotts-runner.py` for Python CLI execution with graceful fallback and structured stdout JSON communication.
2. Create `src/lib/multilingual-audio/zerotts.ts` with typed options, input validation, and execution wrapper.
3. Create `src/lib/multilingual-audio/zerotts-voices.ts` to scan presets and local voice packs.
4. Create API routes `src/app/api/audio/zerotts/route.ts` and `src/app/api/audio/zerotts-voices/route.ts`.
5. Update `src/features/audio/piper-tts-sandbox-panel.tsx` to include the ZeroTTS Voice Lab.
6. Write tests in `src/lib/multilingual-audio/zerotts.test.ts`, `src/lib/multilingual-audio/zerotts-voices.test.ts`, and update `piper-tts-sandbox-panel.test.ts`.
7. Bump patch version in `package.json`, update `changelog/changelog.md`, and verify with `npm run test` and `npm run guard:version`.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Modules impacted: `src/lib/multilingual-audio`, `src/app/api/audio`, `src/features/audio`, `changelog`, `tasks`.

## 8. Test Plan

1. Unit tests: `zerotts.test.ts` for input validation, parameter construction, and error codes; `zerotts-voices.test.ts` for preset list and directory scan.
2. Failure tests: missing text, invalid voice path, execution timeout, missing Python environment.
3. UI tests: `piper-tts-sandbox-panel.test.ts` verifies ZeroTTS section presence, voice controls, and API calls.
4. Required checks: `vitest run`, `npm run guard:version`, `npm run build`.

## 9. Observability

- Logs: Step duration, sample rate, voice name/path, text character count.
- Error codes: `ZERO_TTS_INVALID_INPUT`, `ZERO_TTS_EXECUTION_FAILED`, `ZERO_TTS_ENVIRONMENT_ERROR`.

## 10. Risks & Rollback

- Risks: Python environment or `zerotts` package may not be globally installed in every deployment.
- Mitigation: Clear diagnostic errors, fallback detection, and instructions displayed in UI.
- Rollback: Revert the ZeroTTS files, panel addition, tests, and changelog entry.

## 11. Deliverables

1. ZeroTTS runner script and TypeScript client.
2. ZeroTTS API endpoints.
3. ZeroTTS Voice Lab section in Feature Sandbox.
4. Test suites and changelog entry.

## 12. Changelog Note

- Planned summary: Add ZeroTTS Voice Cloning and Synthesis Lab to Feature Sandbox with preset and custom voice pack support.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Tích hợp mô hình ZeroTTS (`zeroweight-ai/ZeroTTS`) với preset voices (`maichi`, `duy`, `ngoc`, `phuong`, `quang`, `tuan`, `lan`) và hỗ trợ clone voice bằng file mẫu 10s hoặc voice pack (`.zip`, `.npz`).
- Tự động chuẩn hóa tiếng Việt (`normalize_vi_text`) mở rộng số, ngày tháng, thời gian và tiền tệ.
- Cung cấp giao diện trực quan với player nghe thử mẫu giọng 10s và nghe kết quả 48kHz kèm tải về file WAV.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/zerotts.test.ts`
  - `src/lib/multilingual-audio/zerotts-voices.test.ts`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/zerotts.test.ts src/lib/multilingual-audio/zerotts-voices.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` (3 files / 15 tests pass).
  - `npm run test` (141 files / 788 tests pass).
- Version guard command/result:
  - `npm run guard:version` passed with release version `0.11.74`.
