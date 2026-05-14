# OmniVideo Changelog

## FAST-AUDIO-051 - Audio Transcript 2 Clone and Video Speed Preprocess

- Added a new `Audio Transcript 2` page in navigation (`/audio-transcript-2`) as a clone track for testing new transcript features.
- Added a `Video Preprocess` block right after `Source Video` on Audio Transcript 2 with selectable speed options, defaulting to `0.6x`.
- Wired preprocess speed into transcription runtime through `videoSpeedFactor` (`UI -> API -> extraction`) so ffmpeg applies audio tempo before Groq transcription.
- Updated Dub preview to apply source video playback rate from preprocess speed, so preview timeline matches generated voice timing (e.g. `0.5x` shows a 7-minute source as ~14-minute playback).
- Replaced playback-rate-only preview fallback with real server-side video preprocessing (`/api/audio/video-preprocess`) that renders a new slowed video stream using ffmpeg `setpts` + `atempo`; Dub preview now consumes this processed source URL so video duration itself expands (not just play speed).
- Aligned video dubbing runtime with preprocess semantics by preprocessing source bytes before transcription/mux when `videoSpeedFactor` is provided, preventing downstream timeline drift.
- Added a compact `Processing summary` block under Dub preview controls, including processed video size and step timing from preprocess through extract/transcribe/translate/voice/metadata.
- Updated Video Preprocess to be optional via `Enable preprocess` toggle, added `0.7x` and `0.8x` speed options, and switched Audio Transcript 2 default speed to `0.7x`.
- Expanded summary with `Total time` and `Completed timed steps`, and relabeled metadata timing as optional metadata generation time.
- Removed eager preprocess execution: users can now pick speed first, then preprocess runs on demand (`Prepare source` or first `Play sync preview`) instead of auto-running immediately on toggle.
- Fixed Video Preprocess UX so speed selector is always editable (even when preprocess toggle is off); toggle now controls whether selected speed is applied, not whether speed can be chosen.
- Added test coverage for navigation registration, speed-aware ffmpeg args, transcription speed propagation, and preprocess UI wiring.
- Verification (FAST-AUDIO-051): `npm run test -- --run src/components/layout/navigation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (4 files / 22 tests); `npm run guard:version` pass.

## FAST-AUDIO-050 - Console Log Translation Provider Exchanges and Larger Chunks

- Removed the previous in-page provider debug surface from Audio Transcript translation and switched to server-side console logging for provider request/response bodies.
- Raised transcript translation chunk targets to about `100` segments per request with a larger source character budget.
- Strengthened the gender prompt to infer a cast/gender map across the chunk, resolve ambiguous `他` from context, and use neutral Vietnamese wording when gender is unclear.
- Verification (FAST-AUDIO-050): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/transcript-session.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (3 files / 23 tests); `npm run guard:version` pass.

## FAST-AUDIO-049 - Prompt-driven Gender Consistency for Transcript Translation

- Simplified translation flow for gender handling: remove brittle pronoun-rewrite behavior and enforce consistency through prompt rules.
- Added explicit Chinese gender cue guidance in prompt (`她/师妹/...` as female, `他/师兄/...` as male) and continuity requirements across nearby segments.
- Added malformed-word guard instruction to prevent merged-token outputs such as `thấnàng` and `nànàng`.
- Updated tests to verify the new gender prompt contract and fallback prompt behavior.
- Verification (FAST-AUDIO-049): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts` pass (1 file / 14 tests); `npm run guard:version` pass.

## FAST-AUDIO-048 - Raise Audio Transcript Voice Speed Floor to 1.40x

- Bumped app version from `0.4.21` to `0.4.22` as a patch release for Audio Transcript voice pacing.
- Raised runtime timeline speed floor from `1.35x` to `1.40x` (`timelineMinSpeedFactor`).
- Raised Audio Transcript `Voice speed` display floor from `1.35x` to `1.40x`.
- Updated Piper timeline test expectations for the new speed floor behavior.
- Verification (FAST-AUDIO-048): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (2 files / 26 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-AUDIO-047 - Raise Audio Transcript Voice Speed Floor to 1.35x

- Bumped app version from `0.4.20` to `0.4.21` as a patch release for Audio Transcript voice pacing.
- Raised runtime timeline speed floor from `1.25x` to `1.35x` via `timelineMinSpeedFactor`.
- Raised Audio Transcript `Voice speed` UI display floor from `1.25x` to `1.35x`.
- Updated Piper timeline tests to match the new floor behavior in strict and balanced alignment.
- Verification (FAST-AUDIO-047): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (2 files / 26 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-AUDIO-046 (Follow-up) - Auto Fallback to .venv Piper When Bundled Runtime Is Incomplete

- Bumped app version from `0.4.19` to `0.4.20` as a patch release for local Piper runtime compatibility.
- Updated `Piper executable = piper` auto-resolution:
  - Use bundled `piper/piper` only when all required dylibs exist beside it.
  - Automatically fallback to `piper/.venv/bin/piper` when bundled dylibs are missing.
- Keeps previous empty-phoneme hardening, while preventing `CFG_PIPER_TTS_RUNTIME_MISSING` on machines that only have `.venv` runtime complete.
- Verification (FAST-AUDIO-046 follow-up): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (2 files / 24 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-AUDIO-046 - Harden Piper Voice Generation Against Empty-Phoneme Wave Header Failures

- Bumped app version from `0.4.18` to `0.4.19` as a patch release for Audio Transcript voice generation stability.
- Changed default `Piper executable` resolution to prefer bundled local binary `piper/piper` when available, instead of prioritizing `.venv/bin/piper`.
- Added guard in text chunking to drop non-speakable punctuation-only chunks before synthesis.
- Added silence WAV fallback for segments that end up with no speakable chunks, so voice generation no longer crashes on edge text with `wave.Error: # channels not specified`.
- Verification (FAST-AUDIO-046): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (2 files / 23 tests).

## FAST-AUDIO-038 - Repair Suspicious Word Timestamp Voice Timing

- Bumped app version from `0.4.17` to `0.4.18` as a patch release for Audio Transcript voice timing reliability.
- Added suspicious word timestamp detection so impossible long word spans, such as one Chinese character lasting many seconds, are not trusted as TTS voice anchors.
- Voice generation now repairs affected segment timing by anchoring to reliable nearby words, or estimating a conservative late segment window when all words are suspicious.
- Audio Transcript shows per-segment `Timing repaired` diagnostics so repaired segments are visible during review.
- Verification (FAST-AUDIO-038): `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (2 files / 11 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-037 - Harden Dub Preview Media Playback Errors

- Bumped app version from `0.4.16` to `0.4.17` as a patch release for Audio Transcript Dub preview stability.
- Wrapped Dub preview play and resume flows in guarded media playback handling so rejected browser `play()` promises no longer become unhandled runtime errors.
- Added video/audio source `onError` handling and a local Dub preview error message for unsupported or unavailable media sources.
- Verification (FAST-AUDIO-037): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts` pass (1 file / 5 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-036 - Light Timeline Workbench and Restore 1.25x Min Speed

- Bumped app version from `0.4.15` to `0.4.16` as a patch release for Audio Transcript timeline controls.
- Switched Audio Timeline Workbench from a dark canvas to a white/light surface.
- Removed the vertical playhead line from the workbench while preserving audio playback segment highlighting.
- Restored Piper timeline min speed floor and Audio Transcript speed display floor from `1.3x` to `1.25x`.
- Verification (FAST-AUDIO-036): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (2 files / 22 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-035 - Add Pro Audio Timeline Workbench

- Bumped app version from `0.4.14` to `0.4.15` as a patch release for Audio Transcript voice management.
- Added an Audio Timeline Workbench after voice generation with a ruler, zoom control, playhead, multi-lane chunk layout, status colors, and chunk click-to-segment navigation.
- Added timeline filters for all/warnings/overlap/fast/slow chunks plus diagnostic counters and an issue list for actionable chunk review.
- Timeline blocks are derived from real `alignment.timeline` metadata, including scheduled start/end, speed factor, warnings, overlap detection, and parent segment mapping.
- Verification (FAST-AUDIO-035): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts` pass (3 files / 25 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-034 - Enforce 1.3x Minimum Speech Tempo

- Bumped app version from `0.4.13` to `0.4.14` as a patch release for Audio Transcript voice pacing.
- Fixed min speed semantics: timeline-aligned Piper speech now uses at least `atempo=1.3` for every valid speech chunk, even when raw Piper audio already fits inside the timeline slot.
- Balanced timeline alignment now also applies the `1.3x` floor before adding any silence/pause needed to preserve placement.
- Verification (FAST-AUDIO-034): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (3 files / 25 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-033 - Split Merged Transcript Segments for Voice Timing

- Bumped app version from `0.4.12` to `0.4.13` as a patch release for Audio Transcript voice timing.
- Voice generation now splits merged translated segments into multiple Piper chunks when sentence boundaries and source word timing gaps indicate separate utterances.
- Added `sourceSegmentId` metadata so sub-chunks keep diagnostics attached to the original transcript segment in the Audio Transcript UI.
- Segment-row voice diagnostics now aggregate sub-chunks by parent segment, avoiding false missing-voice states while preserving accurate internal voice timing.
- Verification (FAST-AUDIO-033): `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (4 files / 28 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-032 - Increase Min Speed to 1.3 and Scientific TTS Normalization

- Bumped app version from `0.4.11` to `0.4.12` as a patch release for Audio Transcript voice pacing and scientific-term readability.
- Raised timeline minimum speed floor from `1.25x` to `1.3x` and updated Audio Transcript speed display floor accordingly.
- Expanded Vietnamese TTS text normalization for scientific terms, including `isothiocyanate -> ai sô thio xai a nết`, `myrosinase -> mai rô si nâyz`, and `enzyme/enzym -> en zim`.
- Strengthened translation prompt guidance so model output stays readable for Vietnamese TTS on biochemical terms.
- Verification (FAST-AUDIO-032): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (3 files / 31 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-031 - Harden Groq Timestamp Bounds by Audio Duration

- Bumped app version from `0.4.10` to `0.4.11` as a patch release for Audio Transcript timestamp hardening.
- Audio extraction now records the actual extracted audio duration from ffmpeg and passes it into Groq transcription normalization.
- Groq transcript segments are clamped to extracted audio duration, and word timestamps starting beyond the audio duration are dropped, preventing impossible final segments like `03:47.670 -> 04:17.650` on a `03:49` source.
- Transcription result/step metrics now include `audioDurationSeconds` when available for diagnostics.
- Verification (FAST-AUDIO-031): `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (6 files / 34 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-030 - Raise Voice Speed Floor and TTS Translation Normalization

- Bumped app version from `0.4.9` to `0.4.10` as a patch release for Audio Transcript voice pacing and Vietnamese TTS text quality.
- Raised Piper timeline acceleration floor from `1.10x` to `1.25x` and updated the Audio Transcript speed display floor to match.
- Added Vietnamese TTS normalization for translated text, including `wasabi -> wa sa bi` and compact measurement units like `50cm -> 50 xen ti mét`, `12kg -> 12 ki lô gam`, and `5ml -> 5 mi li lít`.
- Strengthened the translation prompt to request TTS-friendly phonetic spellings and spoken measurement units.
- Verification (FAST-AUDIO-030): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (3 files / 31 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-029 - Fix Strict Voice Timeline Drift

- Bumped app version from `0.4.8` to `0.4.9` as a patch release for Audio Transcript strict voice sync.
- Fixed strict Piper timeline assembly so generated chunks are delayed to absolute source timestamps and mixed, instead of being concatenated serially where earlier chunks could push later speech behind the displayed `Voice` time.
- Strict voice output is now padded/trimmed to the transcript target duration after mixing, keeping physical audio placement aligned with word-aware timeline metadata.
- Verification (FAST-AUDIO-029): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts` pass (4 files / 26 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass.

## FAST-AUDIO-028 - Align Voice Segment Onsets with Word Timestamps

- Bumped app version from `0.4.7` to `0.4.8` as a patch release for Audio Transcript word-aware voice timing.
- Added word-aware voice segment timing so generated voice starts at the first source word timestamp inside a segment instead of blindly using the segment container start.
- Audio Transcript now sends word-aware voice segments to `/api/audio/voice-generation`; if no word timing exists, it falls back to the original segment timestamps.
- Verification (FAST-AUDIO-028): `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (4 files / 25 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-AUDIO-027 - Snap Active Segment to Exact Bottom Edge

- Bumped app version from `0.4.6` to `0.4.7` as a patch release for segment-follow precision.
- Active segment follow scroll now snaps to exact bottom edge of the Segments viewport (removed previous safety gap/padding behavior).
- Verification (FAST-AUDIO-027): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts` pass (1 file / 3 tests); `npm run guard:version` pass.

## FAST-AUDIO-023 - Tighten Segment Auto-Scroll and Voice Speed Guardrails

- Bumped app version from `0.4.3` to `0.4.4` as a patch release for Audio Transcript playback UX guardrails.
- Segment auto-scroll now only scrolls inside the `Segments` container instead of shifting the full page viewport.
- Segment auto-follow now keeps the active segment near the bottom edge of the `Segments` container.
- Timeline speed-up is now clamped when accelerating speech to `min 1.1x` and `max 1.75x`, preventing extreme factors like `2.96x`.
- Segment-level `Voice speed` and generated `Voice` timestamp labels were restyled for better readability with green emphasis.
- Verification (FAST-AUDIO-023): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (3 files / 23 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-AUDIO-024 - Refine Bottom-Follow Scroll and Speed Floor

- Follow-up refinement keeps active segment auto-scroll anchored to the bottom region of the `Segments` frame using container-relative coordinates.
- Segment `Voice speed` display no longer shows `1.00x`; display floor is now `1.10x`.
- Verification (FAST-AUDIO-024): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (2 files / 19 tests); `npm run guard:version` pass.

## FAST-AUDIO-022 - Restore Audio Transcript Timestamp Sync and Segment Playback UX

- Bumped app version from `0.4.2` to `0.4.3` as a patch release for Audio Transcript timestamp sync and playback diagnostics.
- Root cause: Audio Transcript forced Piper voice generation to `alignmentMode: "balanced"`; that mode intentionally compresses long pauses, so late source timestamps could be unreachable in the generated audio even when `preserveTimestampGaps` was enabled.
- Audio Transcript now requests strict timestamp alignment so generated voice keeps source timestamp scale; strict timeline metadata now includes generated start/end, speed factor, pause-before, and drift per segment.
- Words, Run steps, and Transcript panels now default hidden with show/hide controls; segment rows show generated voice speed/timestamp, highlight and auto-scroll while voice plays, and mark missing generated voice/text in red.
- Verification (FAST-AUDIO-022): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (3 files / 23 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass; `npm test` pass (85 files / 373 tests).

## FAST-AUDIO-021 - Optimize Piper TTS Voice Generation Performance

- Bumped app version from `0.4.1` to `0.4.2` as a patch bugfix release for Audio Transcript Piper voice generation performance.
- Root cause: Audio Transcript synthesized every translated segment, and every sentence chunk inside a segment, by spawning a fresh Piper process. With the repo-local Python Piper runtime, that repeatedly loaded Python + ONNX model and then ran ffmpeg probes/alignment, causing long `Generating voice...` waits and high CPU/heat on longer transcripts.
- Voice generation now batches all segment/sentence chunks into one Piper `--input_file` / `--output_dir` invocation per request, preserving existing sentence chunking and timeline alignment while avoiding repeated model-load churn.
- Verification (FAST-AUDIO-021): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (2 files / 19 tests); `npm test` pass (85 files / 370 tests); `npm run build` pass with existing Turbopack warning outside scope; `npm run guard:version` pass; real Piper batch smoke generated 5 WAV files in 1.329s with one process.

## Release v0.4.1 - View Mode Error Visibility

- Bump app version from `0.4.0` to `0.4.1` as a patch release for View Mode UX bugfixes without public API contract changes.
- Release scope includes restored full View Mode messages, delayed Inspiration Vault locked warning display, and red failed/error message treatment across affected social/storage/video-intake panels.
- Verification (FAST-ACCESS-004): `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts src/features/storage/storage-library-panel.test.ts src/features/storage/storage-providers-panel.test.ts src/features/social/social-accounts-panel.test.ts src/features/social/publish-records-panel.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts` pass (7 files / 12 tests); `npm test` pass (85 files / 368 tests); `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Task IDs: `FAST-ACCESS-003`, `FAST-ACCESS-004`.

## Release v0.4.0 - View Mode Public Demo

- Bump app version from `0.3.0` to `0.4.0` as a minor release because the batch adds backward-compatible public View Mode behavior and owner access.
- Release scope includes DB-backed Inspiration Vault, public-demo server guards, owner access, View Mode locked-state polish, and demo rate limiting.
- Verification (FAST-ACCESS-002): `npm test` pass (81 files / 360 tests); `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Task IDs: `FAST-SOURCE-002`, `FAST-ACCESS-001`, `FAST-ACCESS-002`.

## FAST-ACCESS-002 - Polish View Mode Locked-State Copy

- Renamed public topbar label from `Demo` to `View Mode`.
- Replaced long public-demo locked messages with short copy: `Some features are disabled in View Mode.`
- Locked topbar capture and Inspiration Vault controls now show red feedback when clicked/focused in View Mode.
- Server guard messages now use the same short View Mode copy while preserving stable error codes.
- Verification (FAST-ACCESS-002): `npm run test -- --run src/lib/access-control/access-control.test.ts src/app/api/app/access/route.test.ts src/app/api/inspiration-vault/route.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (4 files / 13 tests); `npm test` pass (81 files / 360 tests); `npm run build` pass with existing warning outside scope.

## FAST-ACCESS-003 - Restore Full View Mode Lock Messages

- Restored specific lock reasons and appended `Some features are disabled in View Mode.` instead of replacing the original messages.
- `DEMO_WRITE_DISABLED`, `DEMO_PROVIDER_ACCOUNT_DISABLED`, and `DEMO_RATE_LIMITED` now keep their specific message context.
- AI Providers now surfaces View Mode errors from save/delete/status/test/chat/model actions with red error treatment instead of silent or muted feedback.
- Verification (FAST-ACCESS-003): `npm run test -- --run src/lib/access-control/access-control.test.ts src/app/api/inspiration-vault/route.test.ts src/features/ai-providers/ai-providers-panel.test.ts src/app/api/app/access/route.test.ts` pass (4 files / 12 tests); `npm test` pass (81 files / 361 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-ACCESS-004 - Fix View Mode Error Visibility

- Inspiration Vault no longer shows a red View Mode warning just because the visitor is in read-only mode; it appears only after a locked action is attempted.
- Publish Records, Storage Library, Social Accounts, Storage Providers, Published Content, Platform Tasks, Video Intake, and Local Upload Intake now render failed status/messages/error codes in red instead of muted gray.
- Bumped app version from `0.4.0` to `0.4.1` as a patch bugfix release.
- Verification (FAST-ACCESS-004): targeted panel tests pass (7 files / 12 tests); `npm test` pass (85 files / 368 tests); `npm run build` pass with existing Turbopack warning outside scope.

## FAST-UX-024 - Auto-sort exploited Inspiration items to bottom

- Inspiration Vault now sorts each category table with unexploited rows first and exploited rows last.
- After toggling `Exploited`, the updated row automatically drops to the bottom section of that category list.
- Verification (FAST-UX-024): `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts` pass (1 file / 2 tests).

## FAST-GOV-004 - Mandatory Automated Version Guard

- Added `scripts/version-guard.mjs` to enforce release integrity for runtime changes.
- Added `npm run guard:version` command for local/CI gate usage.
- Guard fails when runtime behavior changes without synchronized updates in `package.json`, `package-lock.json`, and `changelog/changelog.md`.
- Updated governance docs and task template to require `guard:version` evidence before Done for runtime changes.
- Verification (FAST-GOV-004): `npm run guard:version` pass.

## FAST-ACCESS-001 - Public Demo Access Guard and AI Rate Limits

- Thêm `public-demo` mode qua `OMNIVIDEO_APP_MODE=public-demo` để public visitors chỉ view/read-only theo mặc định.
- Thêm owner access endpoint `GET/POST/DELETE /api/app/access`, HTTP-only owner cookie, và header bypass `x-omnivideo-owner-token`.
- Gắn server-side write guard cho các route ghi DB/secrets/provider/social/storage/video-intake/Inspiration Vault; public write attempts trả `DEMO_WRITE_DISABLED`.
- Cho phép một số API demo/stateless như audio transcription, voice/Piper, video dubbing, metadata, mirror/edit chạy trong public-demo với fixed-window rate limit per IP/feature.
- Chặn public demo requests dùng saved AI provider account để tránh đụng provider secrets và usage tracking DB.
- Thêm UI hint/unlock owner access ở topbar và disable mutation controls trong Inspiration Vault khi đang public-demo read-only.
- Cập nhật docs `docs/operations/public-demo-mode.md` và architecture conventions cho public demo access guard.
- Verification (FAST-ACCESS-001): `npm test` pass (81 files / 360 tests); `npm run build` pass với warning cũ ngoài scope ở `next.config.ts` import trace từ `video-processing/edit`.

## FAST-SOURCE-002 - Move Inspiration Vault Persistence to MongoDB

- Chuyển Inspiration Vault từ browser `localStorage` sang API backed by MongoDB collection `inspiration_vault_items`.
- Thêm API `GET/POST /api/inspiration-vault` và `PATCH/DELETE /api/inspiration-vault/[itemId]` cho list/capture/toggle exploited/delete.
- Đổi topbar quick capture và Inspiration Vault panel sang fetch API, giữ event refresh nội bộ để panel reload sau capture.
- Cập nhật data model/source docs cho collection Inspiration Vault mới.
- Verification (FAST-SOURCE-002): `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/lib/inspiration-vault/repository.test.ts src/app/api/inspiration-vault/route.test.ts 'src/app/api/inspiration-vault/[itemId]/route.test.ts'` pass (4 files / 15 tests); `npm run build` pass với warning cũ ngoài scope ở `next.config.ts` import trace từ `video-processing/edit`.

## FAST-OPS-003 - Fix Vercel Runtime ERR_REQUIRE_ESM

- Sửa production outage trên Vercel khi toàn bộ routes trả `500` với `ERR_REQUIRE_ESM`.
- Root cause: package khai báo `"type": "module"` làm server bundle `.js` bị coi là ESM, không tương thích với launcher `require()` của runtime.
- Fix: bỏ field `"type": "module"` khỏi `package.json` để runtime load server routes bình thường.
- Verification (FAST-OPS-003): `npm test` pass (76 files / 344 tests); `npm run build` pass.

## Release v0.3.0 - Inspiration Vault and Focused Progress

- Bump app version from `0.2.0` to `0.3.0` as a minor release because this batch adds the user-facing `Inspiration Vault` feature and backward-compatible UX/runtime improvements.
- Release scope includes quick capture in topbar, Inspiration Vault storage/classification/management UI, focused progress tracking for long-running operations, topbar icon polish, and final table/copy feedback refinements.
- Release readiness hardening restored the Drive thumbnail helper expected by tests, lazy-loaded asset-only transcription API dependencies so invalid upload validation does not require DB env, and synchronized stale test expectations with current UI copy.
- Task IDs: `P2-SOURCE-001`, `FAST-UX-010`, `FAST-UX-011`, `FAST-UX-012`, `FAST-UX-013`, `FAST-UX-014`, `FAST-UX-015`, `FAST-UX-016`, `FAST-UX-017`, `FAST-UX-018`, `FAST-UX-019`, `FAST-UX-020`, `FAST-UX-021`, `FAST-UX-022`, `FAST-UX-023`, `FAST-OPS-002`, `FAST-REL-001`.
- Verification (FAST-REL-001): `npm test` pass (76 files / 344 tests); `npm run build` pass with existing warnings outside release scope.

## FAST-UX-023 - Remove Host Subline in Inspiration Vault Content Cell

- Bỏ dòng host (`item.host`) trong ô `Content` của các bảng Inspiration Vault để giao diện gọn hơn.
- Giữ nguyên click-to-copy và feedback `Copied`.

## FAST-UX-022 - Strengthen Inspiration Vault Copy Feedback

- Tăng độ rõ feedback copy trong Inspiration Vault: dòng vừa copy được highlight ngắn hạn và badge `Copied` có style nổi bật hơn.
- Thêm fallback copy bằng `document.execCommand("copy")` khi Clipboard API không khả dụng để giữ hành vi nhất quán.
- Verification (FAST-UX-022): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-021 - Add Copy Feedback in Inspiration Vault Rows

- Thêm feedback `Copied` ngắn hạn theo từng dòng sau khi click `Content` để copy.
- Feedback tự tắt sau ~1.2 giây.

## FAST-UX-020 - Use Pointer Cursor for Content Copy Hover

- Đổi hover cursor ở ô `Content` từ `cursor-copy` sang `cursor-pointer` để bỏ dấu `+` và giữ pointer thường.

## FAST-UX-019 - Copy on Content Click in Inspiration Vault

- Bỏ nút `Copy` khỏi cột actions.
- Cho phép click trực tiếp vào ô `Content` để copy `item.raw` (cursor copy + tooltip ngắn).
- Verification (FAST-UX-019): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-018 - Align Outer Border Spacing for Inspiration Vault and Video Tools Lab

- Đồng bộ wrapper spacing của `Inspiration Vault` và `Video Tools Lab` về chuẩn `px-5 py-5` như các trang khác, tránh cảm giác viền sát mép.
- Giữ `Inspiration Vault` ở chế độ full-height bằng wrapper `h-full` bên trong route layout.
- Verification (FAST-UX-018): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-017 - Make Inspiration Vault Truly Fill Viewport Height

- Thêm layout branch riêng cho `inspirationVault` trong content router để section chạy trong container `h-full/min-h-0` thay vì wrapper generic gây khoảng trống đáy.
- Đổi root panel Inspiration Vault sang `h-full min-h-0` để nhận full chiều cao khả dụng từ app shell.
- Verification (FAST-UX-017): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-015 - Simplify Inspiration Vault Tables

- Bỏ cột `Reference` trong 4 bảng Inspiration Vault.
- Bỏ nút `Open` trong actions.
- Giữ 4 bảng (`Video/Links/Keywords/Notes`) luôn hiển thị kể cả khi toàn bộ dữ liệu trống (mỗi bảng hiển thị `No items.` riêng).
- Verification (FAST-UX-015): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-014 - Split Inspiration Vault into Four Full-Width Tables

- Đổi Inspiration Vault từ 1 bảng tổng thành 4 bảng theo category: `Video`, `Links`, `Keywords`, `Notes`.
- 4 bảng dùng chung vùng nội dung chính theo layout grid, mỗi bảng giữ nguyên các action quan trọng (`Copy`, `Open`, `Delete`, `Exploited`).
- Verification (FAST-UX-014): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-013 - Finalize Topbar Icons and Remove Temporary Logo Options

- Topbar icon update theo mapping mới:
  - `Progress` -> `Rocket`
  - `System` -> `Gauge`
  - `Refresh` -> `Orbit`
- Xoá khối `10 logo options` tạm ở Inspiration Vault.
- Verification (FAST-UX-013): `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-OPS-002 - Focus Progress on Heavy Tasks and Add Logo Options

- Tập trung Progress topbar vào tác vụ nặng:
  - Video Intake: `Run Intake` và `Retry`.
  - Audio Transcript: `Transcribe`, `Translate`, `Generate voice`.
  - Video Tools Lab: `Mirror/Edit pipeline` (bao gồm download asset + ffmpeg edit run).
  - Published Content: `Load Published Content`.
- Không thêm progress cho các thao tác nhỏ (delete/load history/refresh nhẹ) để giảm nhiễu.
- Thêm khối tạm `10 logo options` trong Inspiration Vault để user tham khảo trước khi chốt icon cuối.
- Verification (FAST-OPS-002): `npm run test -- --run src/components/layout/navigation.test.ts src/lib/inspiration-vault/inspiration-vault.test.ts` pass (2 files / 14 tests); `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-012 - Use Table Layout for Inspiration Vault and Simplify Topbar Capture

- Topbar quick capture: bỏ nút `Vault`, giữ ô nhập duy nhất để submit bằng Enter.
- Inspiration Vault: thay danh sách card bằng bảng dữ liệu để scan nhanh và gọn hơn.
- Thêm action `Copy` theo từng dòng để copy nội dung đã lưu.
- Bỏ khối manual capture trong trang vault, tập trung intake qua topbar.
- Verification (FAST-UX-012): `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts` pass (2 files / 14 tests); `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-011 - Simplify Inspiration Vault Header and Remove Stats

- Xoá toàn bộ intro/stats block ở Inspiration Vault theo feedback, gồm các dòng copy và các card `Total/Fresh/Exploited/Video Sources/Keywords`.
- Dọn logic liên quan trong component (không còn tính stats cho block đã xoá).
- Đổi icon phần này sang `Idea` style bằng `Lightbulb` icon.
- Verification (FAST-UX-011): `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts` pass (2 files / 14 tests); `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-UX-010 - Align Inspiration Vault Shell Styling

- Chỉnh `Inspiration Vault` về đúng shell layout của các panel hiện có: outer `border border-main bg-main`, header/status/body nằm trong cùng khung thay vì các card rời bên ngoài.
- Thêm status strip bên trong panel để hiển thị trạng thái filter và counters giống pattern Storage Library/Publish Records.
- Verification (FAST-UX-010): `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts` pass (2 files / 14 tests); `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels; `git diff --check` pass.

## P2-SOURCE-001 - Inspiration Vault

- Thêm trang `Inspiration Vault` trong Video Pipeline để lưu và quản lý link, keyword, creator/source name và note phục vụ khai thác ý tưởng nội dung.
- Thêm quick capture input ở topbar: nhập URL hoặc text từ bất kỳ trang nào sẽ lưu vào vault local và tự phân loại Bilibili/Douyin/YouTube/TikTok video source, generic link, keyword hoặc note.
- Vault MVP lưu bằng `localStorage`, có counters, search, category/status filters, checkbox `Exploited`, mở link nguồn và xoá item.
- Thêm helper/test `src/lib/inspiration-vault/inspiration-vault.test.ts` bao phủ phân loại Bilibili URL, keyword, empty input, malformed URL-like input, capture order, toggle exploited, delete và corrupted storage fallback.
- Verification (P2-SOURCE-001): `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts` pass (2 files / 14 tests); `npm run build` pass với warnings cũ ngoài scope ở audio/storage/video-tools/display panels.

## FAST-WORKSPACE-011 - Move flow seed controls into Inspector with extensible seed registry

- Chuyển `Seed VI Voice Mask Publish` từ header của Workspace Canvas vào phần Inspector để khu vực thao tác flow tập trung hơn.
- Thêm `Flow Seeds` trong Inspector (khi chưa chọn node) và wiring callback `onApplySeed(seed)` để apply seed graph theo cơ chế chung.
- Chuẩn hóa seed definitions vào registry mới `src/lib/workspace/workspace-seeds.ts` để dễ thêm nhiều seed trong tương lai mà không cần hard-code button rời rạc.
- Thêm test `src/lib/workspace/workspace-seeds.test.ts` để xác nhận seed registry có entry hợp lệ và build được graph mẫu.
- Verification (FAST-WORKSPACE-011): `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts` pass (2 files / 34 tests).

## FAST-GOV-003 - Strengthen version bump governance workflow

- Mở rộng `docs/governance/versioning-rules.md` với SemVer strict policy (áp dụng cả trước 1.0.0), quyết định bump `patch/minor/major` theo matrix rõ ràng, và quy tắc chọn mức bump cao nhất theo release batch.
- Bổ sung workflow chuẩn cho version bump: tạo task release, chạy `npm version <patch|minor|major> --no-git-tag-version`, cập nhật changelog, verify build/test scope impacted, và kiểm tra UI hiển thị đúng version.
- Thêm enforcement rule để không được chốt `Done` cho task feature/bugfix đã sẵn sàng release nếu version chưa được bump đúng theo policy.
- Verification (FAST-GOV-003): docs-only governance update, không có thay đổi code runtime.

## FAST-UX-007 - Redesign AI Provider Chat Test Modal in English

- Redesign modal `API Chat Test` trong AI Providers với bố cục rõ hơn: header context, empty-state hint, chat timeline, composer và controls riêng cho model/temperature.
- Chuẩn hóa copy modal sang tiếng Anh (title, tooltip, send/loading labels, response metadata, empty-response fallback).
- Verification (FAST-UX-007): `npm run test -- --run src/features/ai-providers/ai-providers-panel.test.ts` pass (1 file / 2 tests).

## FAST-VIDEO-004 - Keep Video Tools preview controls outside blur frame

- Video Tools Lab `Original Preview` dùng control bar riêng bên dưới preview thay vì native controls trong frame, nên play/pause/seek/mute không còn che vùng cần vẽ blur.
- Storage Asset đã từng `Save Setup To Asset` giờ có badge/trạng thái `Saved setup`, tự apply lại blur/subtitle setup khi chọn asset, và cập nhật state local ngay sau khi save.
- Giữ `Edited Output` dùng native controls vì output preview không dùng để căn/vẽ vùng blur.
- Verification (FAST-VIDEO-004): `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (3 tests / 1 file); `npm run build` pass với warnings cũ ngoài scope (`Share2`, `loading`, `FileAudio`, missing `selectedProviderId` hook dependency, unused `Image`).

## FAST-AUDIO-019 - Smooth Piper Dubbing Speech Rate

- Cải thiện Piper timeline voice alignment: segment dài có thể mượn một phần gap sau trước khi bị speed-up, giảm hiện tượng câu nói nhanh/chậm thất thường khi timestamp vẫn đúng.
- Timeline mode giảm `sentence_silence` khi synthesize từng segment để tránh tạo thêm silence giả rồi phải tăng tempo bằng ffmpeg.
- Thêm diagnostics vào voice generation alignment metadata: raw duration, slot duration, target duration, borrowed gap, speed factor, tempo filter và warning codes theo từng segment.
- Audio Transcript hiển thị speech-rate diagnostics sau khi Generate Voice, gồm max speed factor, borrowed gap và các segment nhanh nhất cần rút gọn text.
- Audio Transcript hiển thị thêm nhóm `slow` để phân biệt đoạn nghe chậm do silence/pad timeline thay vì do TTS kéo chậm giọng nói.
- Audio Transcript đánh số segment rõ ràng và prompt dịch transcript ưu tiên bản dịch tiếng Việt ngắn/gọn theo `durationSeconds`; không ép số chữ tiếng Việt bằng chữ Trung, chỉ dùng độ dài nguồn như tín hiệu cần nén.
- Audio Transcript giữ lại `VI Metadata` sau reload bằng session local và cho phép chỉnh sửa title/description/hashtags trước khi `Save to Asset`.
- Đổi `Preserve timestamp gaps` thành `Balanced timing`: không pad từng segment cho đầy slot, giới hạn pause dài, giới hạn speed-up mặc định và cho phép lệch nhẹ để giọng ít bị nhanh/chậm giả tạo.
- Hạ balanced speed cap từ `1.25x` xuống `1.2x` để giảm cảm giác nói gấp, chấp nhận drift nhẹ hơn ở segment quá dài.
- Chia segment nhiều câu thành các lần Piper nhỏ trước khi nối WAV, tránh lỗi rè nặng sau dấu chấm trong segment dài.
- Giảm balanced pause cap từ `0.45s` xuống `0.3s` để nhịp voice bớt ngắt quãng.
- Thêm tooltip `i` ở Audio Transcript `Voice Generation` để xem toàn bộ setup Piper/balanced timing đang dùng.
- Đồng bộ Workspace Voice Generation/Video Dubbing với Audio Transcript: node defaults dùng `balanced`, Inspector có `Alignment mode`, checkbox `Balanced timing`, tooltip `i`, và runtime gửi `ttsAlignmentMode` sang voice/video dubbing API.
- Verification (FAST-AUDIO-019): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/app/api/audio/video-dubbing/route.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (53 tests / 4 files); `npm run build` pass với warnings cũ ngoài scope (`Share2`, `loading`, `FileAudio`, missing `selectedProviderId` hook dependency, unused `Image`).

## FAST-UX-006 - Refactor leftbar navigation to real route-based pages

- Refactor app shell navigation từ in-memory section switching sang URL routing thật: mỗi leftbar item đi tới route riêng (`/workspace`, `/videoIntake`, `/socialAccounts`, ...).
- Thêm guard route helper trong navigation registry (`isAppSectionId`, `toSectionPath`) để đảm bảo route segment hợp lệ và fallback an toàn.
- Giữ tương thích với luồng điều hướng nội bộ hiện có: custom event `omnivideo:navigate` giờ push route thay vì set local state.
- Thêm page route động `src/app/[section]/page.tsx` để reload/back-forward/share URL vẫn mở đúng panel.
- Sửa hiện tượng reload bị nháy về Workspace trước khi quay về section đích: active section được derive trực tiếp từ `pathname` thay vì qua local state mặc định.
- Chuẩn hóa canonical URLs sang kebab-case (ví dụ `/published-content`) và tự động redirect từ đường dẫn camelCase cũ (ví dụ `/publishedContent`) để giữ tương thích.
- Verification (FAST-UX-006): `npm run test -- --run src/components/layout/navigation.test.ts` pass (1 file / 6 tests).

## P1-INTAKE-013 - Harden yt-dlp format selection and streaming downloads

- Sửa root cause Bilibili tải về mất tiếng: resolver không còn fallback sang video-only direct URL; khi nguồn tách audio/video, default selector dùng `bv*+ba/...` và chuyển sang `yt-dlp-file` để merge bằng ffmpeg.
- Thêm API `POST /api/video-intake/formats` và UI `Load Formats` ở Video Intake để list đầy đủ format từ yt-dlp, gồm audio-only/video-only codec, resolution, size và selector đề xuất.
- Giữ Bilibili public ở no-cookie path; cookie/browser fallback vẫn chỉ dành cho TikTok/Douyin để tránh lỗi cookie không cần thiết với video công khai.
- Giảm rủi ro ăn RAM ở path URL video: Drive upload stream trực tiếp từ upstream hoặc từ temp file yt-dlp, Telegram fallback dùng file stream, và `resolve-file` trả streaming response thay vì `arrayBuffer()` toàn bộ video.
- Chặn nguyên nhân làm app/network bị đơ khi mở danh sách: Video Intake, Local Intake, Storage Library và Publish Records không còn render nhiều `<video preload="metadata">` trong bảng/picker; preview chỉ tải khi mở modal/detail.
- Verification (P1-INTAKE-013): `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py` pass (14 tests); `npm test` pass (64 files / 298 tests); `npm run build` pass (warning cũ ngoài scope). Network smoke với `https://www.bilibili.com/video/BV1W2oSBWEYw/`: format list trả audio formats `30216/30232/30280` và video-only formats; resolver trả `downloadMode=yt-dlp-file`, `formatId=100026+30280`; yt-dlp download tạo MP4 7,081,086 bytes và ffmpeg probe xác nhận có `Video: av1` + `Audio: aac`.

## FAST-OPS-001 - Local intake history parity and lightweight system snapshot modal

- Cập nhật Local Intake Run History: thêm preview video, cặp action `Detail` + `Delete` theo từng run, và detail modal có thông tin Created/Run/Asset/Storage để quan sát nhanh.
- Mở rộng API `GET /api/video-intake/local-runs` để trả `assetSummary` và serialize `outputSummary.assetId` nhất quán với URL Intake history.
- Thêm nút `System` cạnh `Progress` trên topbar để mở modal System Snapshot; snapshot chỉ fetch 1 lần ban đầu và chỉ reload khi user bấm `Reload` (không polling).
- Thêm API `GET /api/system/snapshot` (nhẹ) để hiển thị process/system metrics cơ bản: memory, CPU cores/model/usage xấp xỉ, load average, network interfaces, uptime, pid/threadpool.
- Verification (FAST-OPS-001): `npm run test -- --run src/app/api/system/snapshot/route.test.ts src/app/api/video-intake/runs/route.test.ts src/app/api/video-intake/runs/[runId]/route.test.ts` pass (3 files/5 tests); `npm run build` pass (warnings cũ ngoài scope).

## FAST-INTAKE-003 - Improve Video Intake run history detail and failed cleanup

- Cập nhật Video Intake Run History theo hướng giống Storage Library: thêm preview video khi run có asset, thêm detail modal chứa Created và metadata chính, đồng thời bỏ cột Created khỏi bảng chính.
- Thêm nút `Delete Failed` cạnh `Refresh` để xoá các URL intake run failed cùng `step_runs` và `run_events` liên quan.
- Verification (FAST-INTAKE-003): `npm run test -- --run src/app/api/video-intake/runs/route.test.ts` pass (1 file / 2 tests); `npm run build` pass (còn 2 warning cũ ngoài scope: unused `Download` và `Image`).

## 2026-04-30

### Changed

- Workspace Canvas: bỏ seed `Douyin Flow`, chỉ giữ seed `VI Voice Mask Publish`; đồng thời generalize copy liên quan transcript/dubbing để không hard-code Chinese/ZH.
- Mở executable flow mới `URL Video -> Save to Storage` trong Workspace, dùng URL intake API `/api/video-intake/runs` để resolve URL và persist thành asset vào storage account đã chọn.
- Mở rộng `URL Video` để hoạt động gần như `Upload Video` trong Workspace processing flows: có thể làm upstream cho transcript/dubbing/mirror/edit bằng cách resolve+tải URL video thành runtime file qua route server-side mới.

### Fixed

- Khôi phục runtime `yt-dlp` repo-local cho Video Intake bằng `.vendor/python` và thêm `npm run setup:resolver` để bootstrap lại runtime mà không cài global vào máy.
- Cập nhật lỗi missing resolver runtime để hướng dẫn chạy `npm run setup:resolver`.
- Ưu tiên resolver public no-cookie cho Video Intake, không còn dùng Chrome/browser-cookie fallback cho Bilibili/public platform, và thêm fallback format relaxed khi format progressive không có.

### Notes

- Task IDs: FAST-INTAKE-001, FAST-INTAKE-002, FAST-WORKSPACE-008, FAST-WORKSPACE-009
- Verification (FAST-INTAKE-001): `npm run setup:resolver` pass; `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts` pass (2 files / 6 tests); `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py` pass (8 tests); runtime smoke imports `yt-dlp 2025.10.14` from `.vendor/python`.
- Verification (FAST-INTAKE-002): `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py` pass (11 tests); `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/media-resolver.test.ts` pass (2 files / 6 tests); full-network smoke for `https://www.bilibili.com/video/BV1W2oSBWEYw/` with `VIDEO_RESOLVER_COOKIES_FROM_BROWSER=chrome` returned direct media JSON via no-cookie profiles.
- Verification (FAST-WORKSPACE-008): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts` pass (30 tests / 1 file); `npm run build` pass (warnings cũ ngoài scope: unused `Download` trong Video Tools Lab và unused `Image` trong Display Preferences).
- Verification (FAST-WORKSPACE-009): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/app/api/video-intake/resolve-file/route.test.ts` pass; `npm run build` pass (warnings cũ ngoài scope: unused `Download` trong Video Tools Lab và unused `Image` trong Display Preferences).

## 2026-04-29

### Added

- Thêm trang `Piper TTS Sandbox` trong Video Pipeline để test local Piper voice model `.onnx` bằng CPU, có cấu hình executable/model/config/speaker/scale và audio preview/download WAV.
- Thêm API `POST /api/audio/piper-tts` và adapter `src/lib/multilingual-audio/piper-tts.ts` để spawn Piper CLI local qua stdin và nhận WAV qua stdout.
- Thêm tests cho Piper adapter, Piper API route và navigation registry; đồng thời xoá phần Groq TTS sandbox còn sót khỏi navigation/task board.
- Thêm Piper voice generation cho Audio Transcript: sinh WAV từ translated segments, có chế độ bám segment timestamps bằng silence/trim/pad/speed-up qua ffmpeg.
- Thêm Workspace node `Voice Generation` để sinh WAV từ translated transcript và preview/download trực tiếp trong Inspector.
- Thêm Workspace node `Video Dubbing ZH->VI` và API `POST /api/audio/video-dubbing` để transcribe, translate, tạo voice Piper, duck audio gốc rồi mux MP4 preview/download.
- Thêm bridge artifact cho Workspace: dubbed MP4 có thể nối sang `Save to Storage` để persist thành asset rồi dùng tiếp với `Publish Social`.
- Thêm chọn AI Provider/model cho bước translate bên trong Workspace node `Video Dubbing ZH->VI`, dùng danh sách provider/model từ AI Provider Management thay vì chỉ nhập Groq model.
- Thêm Mirror Video processing bằng ffmpeg `hflip`, API `POST /api/video-processing/mirror`, Workspace node executable `edit.mirror`, và trang test-only `Video Tools Lab` để upload/preview/mirror/download video.
- Thêm pipeline `POST /api/video-processing/edit` để kết hợp mirror, partial blur vùng/timeline và burn phụ đề tiếng Việt theo translated segment timestamps trong một output MP4.
- Nâng `Video Tools Lab` thành lab edit tổng hợp cho mirror + partial blur + subtitle overlay, có preview/download output và nhập JSON translated segments.
- Đưa Workspace node `edit.mask-region` thành executable: nhận video upstream + `Translate Transcript` upstream, tạo video artifact preview/download và nối tiếp được sang `Save to Storage`.
- Thêm nút copy trong `Audio Transcript` Segments để copy `translatedSegments` JSON dùng dán vào Video Tools Lab hoặc copy toàn bộ text đang hiển thị.

### Changed

- Thay Edge-TTS ở Audio Transcript bằng Piper local; controls chuyển sang binary/model/config/speaker/scale và default path portable theo repo (`piper`, auto `piper/model.onnx`, auto `piper/model.onnx.json`).
- Tối ưu Groq segment translation: các chunk độc lập chạy song song có giới hạn thay vì tuần tự, trong khi vẫn giữ đúng order và `id/start/end`.
- Mở rộng `planWorkspaceFlow` cho voice/dubbing artifact steps thay vì chỉ dừng ở transcript translation.
- Mở rộng Workspace artifact flow để `edit.mirror` có thể nhận `source.file` hoặc video artifact upstream rồi nối tiếp sang `Save to Storage`.
- Mở rộng Workspace connection helper để node nhiều input tự chọn port còn trống theo data type, phục vụ flow video + transcript cho `edit.mask-region`.
- Chuẩn hoá copy/UX text tiếng Việt có dấu trong Video Tools Lab và thêm cấu hình subtitle ngay tại lab (`font`, `cỡ chữ`, `vị trí dọc`) với mặc định mới to hơn/cao hơn (`64`, `180`).
- Điều chỉnh video edit theo preset cân bằng cho máy CPU yếu nhưng vẫn ưu tiên phụ đề rõ hơn: `preset=veryfast`, `crf=22`; đồng bộ default blur/subtitle mới cho Lab và Workspace (`Y=84`, `Height=16`, `Font size=100`, `margin=150`).
- Tinh gọn Workspace seed buttons: bỏ `Seed Upload Social`, `Seed Upload Only`, `Seed Asset Publish`; thêm seed end-to-end `Upload -> VI Voice -> Mask Logo/Subtitles -> Save to Storage -> Publish Social`.
- Thêm AI Provider/model selector cho Workspace node `Translate Transcript`, dùng cùng provider model loading pattern với `Video Dubbing` và truyền `providerId` vào API dịch transcript.
- Mở rộng Workspace `edit.mask-region` với config subtitle (`font`, `size`, `y margin`) và truyền xuống API giống Video Tools Lab.
- Tinh gọn seed `Upload -> VI Voice -> Mask -> Storage -> Social`: bỏ nhánh `Audio Transcript -> Translate Transcript`, `Mask Logo/Subtitles` dùng lại translation do `Video Dubbing` tạo ra.
- Thêm nút `Continue Failed Flow` trong Workspace Runtime để tiếp tục flow lỗi bằng cách bỏ qua các step đã có output runtime.
- Thêm binary response mode cho `POST /api/video-processing/edit` để Workspace nhận MP4 trực tiếp thay vì JSON base64 khi xử lý video lớn.

### Fixed

- Sửa Piper sandbox không còn chờ timeout khi thiếu runtime dylib/model/config: adapter preflight các file bắt buộc trước khi spawn và UI mặc định trỏ vào `piper/model.onnx` + `piper/model.onnx.json` trong repo.
- Chuyển Piper runtime sang package self-contained trong `piper/.venv`, app dùng `piper/.venv/bin/piper`, ghi WAV qua temp output file rồi đọc lại thay vì phụ thuộc stdout streaming; lỗi ONNX không tương thích được rút gọn thành message rõ.
- Xoá runtime/test Edge-TTS khỏi source Audio Transcript; generated WAV chỉ dùng temp server file trong request rồi xoá, không persist vào storage.
- Sửa bước dịch transcript đôi khi còn sót chữ Hán/CJK trong câu tiếng Việt, ví dụ `ngây呆`, bằng retry quality gate theo segment nhỏ hơn và có giới hạn.
- Sửa Workspace flow lỗi mơ hồ `fetch failed`: runner giờ hiển thị rõ action + endpoint + API error/errorCode (hoặc HTTP status) để debug nhanh step thất bại.
- Sửa seed VI Voice Mask Publish dịch dư một lần: planner/executor giờ cho `edit.mask-region` lấy `translatedSegments` trực tiếp từ upstream `audio.video-dubbing` khi video đầu vào là dubbed MP4.
- Sửa trải nghiệm flow dài bị lỗi giữa chừng: Workspace runner lưu lại asset id/transcript/translation/artifact đã tạo trong phiên hiện tại để chạy tiếp từ bước lỗi, tránh render lại dubbing/edit đã thành công.
- Sửa lỗi Node OOM ở bước Mask Logo/Subtitles với video lớn: Workspace không còn ép output edit MP4 thành `videoBase64` rồi `JSON.stringify`; artifact runtime giữ `File`/object URL và Save to Storage upload lại file đó trực tiếp.

### Notes

- Task IDs: FAST-AUDIO-010, FAST-AUDIO-011, FAST-AUDIO-012, FAST-AUDIO-013, FAST-AUDIO-014, FAST-AUDIO-015, FAST-AUDIO-016, P2-AUDIO-007, P2-VIDEO-001, P2-VIDEO-002
- Verification (P2-VIDEO-002): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (37 tests / 3 files); `npm run build` pass với warning cũ `src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng và log DNS Mongo `querySrv ECONNREFUSED` trong static generation nhưng exit code 0. Copy button follow-up also verified with `npm run build` pass under the same known warnings/logs.
- Verification (P2-VIDEO-002 subtitle style/locale follow-up): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts` pass (10 tests / 2 files).
- Verification (P2-VIDEO-002 workspace subtitle parity + wrap follow-up): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (38 tests / 3 files).
- Verification (P2-VIDEO-002 CPU/size default follow-up): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (38 tests / 3 files).
- Verification (P2-VIDEO-002 balanced quality follow-up): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (38 tests / 3 files).
- Verification (P2-VIDEO-002 Workspace seed follow-up): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts` pass (29 tests / 1 file).
- Verification (P2-VIDEO-002 Workspace Translate Provider follow-up): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts` pass (29 tests / 1 file).
- Verification (P2-VIDEO-002 duplicate translation follow-up): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts` pass (29 tests / 1 file).
- Verification (P2-VIDEO-002 Workspace resume follow-up): `npm run build` pass với warning cũ ngoài scope (`src/features/video-processing/video-tools-lab-panel.tsx` unused `Download`, `src/features/workspace/display-preferences-panel.tsx` unused `Image`) và log DNS Mongo `querySrv ECONNREFUSED` trong static generation nhưng exit code 0.
- Verification (P2-VIDEO-002 video edit OOM follow-up): `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts` pass (12 tests / 2 files); `npm run build` pass với warning cũ ngoài scope (`src/features/video-processing/video-tools-lab-panel.tsx` unused `Download`, `src/features/workspace/display-preferences-panel.tsx` unused `Image`) và log DNS Mongo `querySrv ECONNREFUSED` trong static generation nhưng exit code 0.
- Verification (P2-VIDEO-001): `npm run test -- --run src/lib/video-processing/mirror-video.test.ts src/app/api/video-processing/mirror/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (37 tests / 4 files); `npm run build` pass với warning cũ `src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng và log DNS Mongo `querySrv ECONNREFUSED` trong static generation nhưng exit code 0.
- Verification (FAST-AUDIO-016): `npm run build` pass; Workspace runner errors include action + endpoint + API reason; existing unrelated warning remains (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng).
- Verification (FAST-AUDIO-015): `npm run test -- --run src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (26 tests / 2 files); `npm run build` pass với warning cũ ngoài scope (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng).
- Verification (P2-AUDIO-007): `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (29 tests / 3 files); `npm run build` pass với warning cũ ngoài scope (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng).
- Verification (FAST-AUDIO-014): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts` pass (10 tests / 2 files).
- Verification (FAST-AUDIO-013): `rg -n "edge-tts|Edge-TTS|EDGE_TTS|EdgeTts|vi-VN-HoaiMyNeural|PRV_EDGE_TTS_FAILED" src` không còn match; `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/app/api/audio/voice-generation/route.test.ts src/components/layout/navigation.test.ts` pass (19 tests / 4 files); `npm run build` pass với warning cũ ngoài scope (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng).
- Verification (FAST-AUDIO-012): `.vendor` runtime thử nghiệm đã được xoá; `piper-tts` cài trong repo-local `piper/.venv` bằng `--no-cache-dir`; `piper/.venv/bin/piper --help` pass; API smoke local đi tới Piper runtime và trả lỗi model không tương thích rõ ràng (`char_inputs/diac_inputs` vs Piper VITS `input/input_lengths/scales`); `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts` pass (9 tests / 2 files); `npm run build` pass với warning cũ ngoài scope.
- Verification (FAST-AUDIO-011): direct Piper smoke command fail-fast vì thiếu `libespeak-ng.1.dylib`, xác nhận lỗi runtime dependency thay vì synthesize chậm; `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts` pass (8 tests / 2 files); `npm run build` pass với warning cũ ngoài scope (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng).
- Verification (FAST-AUDIO-010): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/components/layout/navigation.test.ts` pass (10 tests / 3 files); `npm run build` pass với warning cũ ngoài scope (`src/features/workspace/display-preferences-panel.tsx` import `Image` chưa dùng); dev server chạy tại `http://localhost:3002`.
- Piper research note: OHF Piper hiện là repo kế nhiệm của `rhasspy/piper`; CLI phù hợp test nhanh nhưng docs khuyến nghị web server cho dùng lặp lại vì CLI phải load model mỗi lần. Voice cần cặp `.onnx` + `.onnx.json`; các voice chất lượng thấp dùng sample rate/model nhỏ hơn, hợp hơn với máy yếu.

## 2026-04-27

### Added

- Thêm Edge-TTS voice generation cho Audio Transcript: sinh voice tiếng Việt từ translated segments, cấu hình voice/rate/pitch/volume/output format và tùy chọn giữ timestamp gaps, kèm audio preview/download.
- Thêm API `POST /api/audio/voice-generation` và adapter `src/lib/multilingual-audio/edge-tts.ts` với validation, SSML builder và Edge ReadAloud websocket client.
- Thêm Groq LLM segment translation cho Audio Transcript: dịch transcript segments sang tiếng Việt bằng chat completions, giữ nguyên `id/start/end`, có model selector mặc định `llama-3.1-8b-instant`, và toggle xem bản gốc/bản dịch.
- Thêm API `POST /api/audio/transcript-translation` và Workspace node `text.translate-transcript` để nối sau `Audio Transcript`.
- Thêm Audio Transcript MVP: API `POST /api/audio/chinese-transcription` nhận video/audio, extract compressed MP3 mono 16k bằng bundled `ffmpeg-static`, gọi Groq `whisper-large-v3-turbo` với `verbose_json` và trả transcript kèm segment/word timestamps.
- Thêm trang `Audio Transcript` trong Video Pipeline để upload video/audio, chọn language hint, nhập prompt, bật word timestamps và xem transcript/segments/words.
- Thêm Workspace node `audio.chinese-transcribe` chạy trực tiếp từ `source.file` qua cùng API transcription.
- Thêm tests cho multilingual audio validation, ffmpeg command, Groq adapter, API missing-file case, Workspace transcription planning và navigation.
- Thêm generic `planWorkspaceFlow(graph)` trong `src/lib/workspace/workspace-graph.ts` với topological order, cycle detection và phân loại step (`upload-and-store`, `use-existing-asset`, `publish`).
- Thêm helper `updateWorkspaceNodeConfig` để mutate runtime config theo từng node.
- Thêm tests `planWorkspaceFlow` cho fan-out 1 storage → nhiều Publish Social, multi `source.asset` song song, source.file thiếu storage downstream, publish thiếu producer, và cycle.

### Changed

- Chuyển Translation controls của Audio Transcript sang cột trái ngay dưới Extract + Transcribe, mở rộng model selector theo Groq production/preview docs hiện tại, và backend dịch theo chunk adaptive để tránh TPM/request-too-large.
- Cập nhật multilingual audio docs để ghi rõ scope MVP ZH transcription và giới hạn chưa source-separate voice/music.
- Refactor Workspace executor sang generic graph runner: `runWorkspaceFlow` lặp `plan.steps`, không còn giới hạn 3 flow cứng (`upload-to-storage`, `asset-to-social`, `upload-to-social`).
- Chuyển toàn bộ runtime config (storageAccountId, socialAccountId, publishType, privacyStatus, facebookPageId, caption, hashtags, title, tags) từ state global single-slot sang `node.config` per-node, persist qua localStorage draft.
- Inspector form giờ mutate trực tiếp `node.config` của node được chọn; file upload lưu trong map `runtimeFilesByNodeId` ngoài graph.
- Workspace Run Status panel hiển thị step list theo `flowPlan.steps` và status badge per-node ngay trên canvas thay vì 3 step cố định.
- Backward-compat: `getWorkspaceExecutableUploadToSocialPlan` rút lại thành adapter trên `planWorkspaceFlow` để giữ contract cũ.
- Cập nhật Inspector `social.publish` trong Workspace: thay `Facebook Page ID` text input bằng dropdown `Facebook Page`, load danh sách page từ API theo account và auto chọn page mặc định khi có.
- Cập nhật Facebook page-list flow để giảm lỗi rate-limit (`OAuthException code=4`): `GET /api/social/accounts/[accountId]/facebook-pages` đọc cache từ account (`connectionJson.pages`) và thêm action `Update Pages` ở Social Accounts để refresh thủ công khi cần.
- Cập nhật OAuth callback/create-account (Facebook) theo hướng best-effort hydrate page cache vào account secrets, không làm fail flow chính nếu refresh pages bị giới hạn request.

### Fixed

- Sửa Edge-TTS `SSML is invalid` khi bật `preserveTimestampGaps` hoặc transcript dài: adapter không còn gửi SSML `<break>`, chia long transcript thành nhiều request nhỏ rồi nối audio bytes cho MVP preview/download.
- Sửa tiếp lỗi Edge-TTS `SSML is invalid` khi translated segment chứa ký tự control/invisible: adapter giờ sanitize text trước khi XML escape/build SSML và validation tính theo sanitized text.
- Sửa lỗi Edge-TTS `PRV_EDGE_TTS_FAILED: Edge-TTS websocket failed/closed without audio`: voice generation giờ dùng server-side TLS websocket transport có `Sec-MS-GEC`, Edge-compatible headers, full Edge voice name trong SSML và pitch dạng `Hz`.
- Sửa lỗi dịch bỏ sót segment sau một đoạn dài: translator giờ retry các segment còn nguyên CJK/source text và split batch nhỏ hơn khi Groq báo request quá lớn.
- Sửa `SYS_AUDIO_EXTRACTION_FAILED` khi `ffmpeg-static` resolve tới path không tồn tại trong runtime deploy: extractor giờ kiểm tra binary tồn tại, fallback sang `process.cwd()/node_modules/ffmpeg-static/ffmpeg`, rồi fallback sang `ffmpeg` trong PATH.
- Sửa `PRV_GROQ_TRANSCRIPTION_FAILED: Request Entity Too Large` debug gap: API/UI giờ trả step trace validate/extract/size-check/Groq, hiển thị source size và extracted audio size; payload gửi Groq đổi sang MP3 mono 16k 64kbps để giảm size.
- Sửa `VAL_AUDIO_FILE_TOO_LARGE` bị áp sai lên video nguồn trong Audio Transcript; giờ app extract audio trước, convert sang compressed audio, rồi mới kiểm tra giới hạn payload gửi Groq.
- Sửa lỗi Workspace chỉ hỗ trợ 1 instance mỗi loại node: graph có 2 `social.publish` giờ phát 2 publish records riêng với social account/publish type/Page riêng cho từng node.

### Notes

- Task IDs: P2-AUDIO-001, FAST-AUDIO-002, FAST-AUDIO-003, FAST-AUDIO-004, FAST-AUDIO-005, FAST-AUDIO-006, FAST-AUDIO-007, P2-AUDIO-005, P2-AUDIO-006, P4-WORKSPACE-006, FAST-WORKSPACE-007, FAST-SOCIAL-005
- Verification (FAST-AUDIO-007): `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (8 tests / 2 files); real local API smoke with 2 gapped segments and `preserveTimestampGaps=true` pass (`ok=true`, MP3 audio returned); real local API smoke with 45 segments pass (`ok=true`, MP3 audio returned, 1,270,824 bytes); `npm run test` pass (197 tests / 47 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-AUDIO-006): `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files); real local API smoke `POST /api/audio/voice-generation` pass with control char payload (`ok=true`, MP3 audio returned, 24,336 bytes); `npm run test` pass (196 tests / 47 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-AUDIO-005): `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files); real local API smoke `POST /api/audio/voice-generation` pass (`ok=true`, MP3 audio returned, 18,720 bytes); `npm run test` pass (196 tests / 47 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (P2-AUDIO-006): `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files); `npm run test` pass (196 tests / 47 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (P2-AUDIO-005): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (30 tests / 4 files); `npm run test` pass (189 tests / 45 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-AUDIO-004): `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/components/layout/navigation.test.ts src/lib/workspace/workspace-graph.test.ts` pass (30 tests / 5 files); `npm run test` pass (180 tests / 43 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-AUDIO-003): `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts` pass (4 tests / 1 file); `npm run test` pass (178 tests / 42 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-AUDIO-002): `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts` pass (10 tests / 3 files); `npm run test` pass (175 tests / 42 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (P2-AUDIO-001): `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (30 tests / 6 files); `npm run test` pass (173 tests / 42 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused); `npm audit --omit=dev` reports current Next/PostCSS vulnerabilities, not fixed in this task because suggested fix upgrades Next outside current range.
- Verification: `npm run test` pass (154 tests / 37 files); `npm run build` pass. Build warning duy nhất là `display-preferences-panel.tsx` `Image` unused (cũ).
- Verification (FAST-WORKSPACE-007): `npm run test -- --run src/lib/social/facebook-pages-client.test.ts src/lib/workspace/workspace-graph.test.ts` pass (19 tests / 2 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
- Verification (FAST-SOCIAL-005): `npm run test -- --run src/lib/social/facebook-auth.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts' src/lib/social/facebook-pages-client.test.ts` pass (12 tests / 3 files); `npm run build` pass with existing warning in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).

## 2026-04-26

### Added

- Thêm Social Platform Control Center cho Facebook/TikTok/Shopee/YouTube gồm Social Accounts, Platform Tasks và Publish Records trong dashboard.
- Thêm social domain foundation tại `src/lib/social/*`: account validation, secret masking, capability registry, publish record validation, retry eligibility và connection checks.
- Thêm API social foundation: `GET/POST /api/social/accounts`, `GET/PATCH/DELETE /api/social/accounts/[accountId]`, `GET /api/social/capabilities`, `GET/POST /api/social/publish-records`, `GET /api/social/dashboard`.
- Thêm `social` checks vào `GET /api/health/connections` và Connection Test panel.
- Thêm Vitest config alias `@ -> src` để API route contract tests import App Router routes ổn định.
- Thêm tests cho social validation, capability registry, secret masking, retry eligibility, connection checks và social API validation contracts.
- Thêm modal hướng dẫn cấu hình social account theo từng platform và `Publish now` intent cho publish records.
- Thêm OAuth foundation cho social accounts: `GET /api/social/oauth/start` và `GET /api/social/oauth/callback/[platform]` cho Facebook/TikTok/YouTube authorization-code flow.
- Thêm trạng thái lỗi riêng trong modal New/Edit Social Account và hướng dẫn YouTube OAuth kèm redirect URI cần cấu hình.
- Thêm hướng dẫn Google OAuth test users cho lỗi `403: access_denied` khi app còn ở testing.
- Thêm YouTube social connection check thật qua YouTube Data API `channels?mine=true`.
- Thêm kiểm tra YouTube tokeninfo để xác nhận access token có scope `https://www.googleapis.com/auth/youtube.upload`.
- Thêm YouTube `Publish now` adapter dùng resumable upload để đăng video thật từ storage asset.
- Thêm unit tests cho YouTube upload adapter, bao gồm refresh-token flow.
- Thêm chọn YouTube privacy trong New Publish Record và lưu `privacyStatus` vào publish records.
- Thêm guardrails cho YouTube Shorts: chặn video thiếu metadata, video ngang hoặc dài hơn 3 phút trước khi upload.
- Thêm trang Tutor Docs trong Social Platforms để chứa hướng dẫn OAuth/social integration dài và troubleshooting.
- Thêm `docs/operations/tutorial-docs.md`.
- Thêm trang Social Published Content để xem inventory video/Short theo social account và footprint publish theo từng asset.
- Thêm API `GET /api/social/published-content` và domain service YouTube inventory best-effort, đọc uploads playlist khi account có scope `youtube.readonly`.
- Thêm tests cho Social Published Content API và YouTube inventory success/failure path.
- Thêm quick-open links cho social published posts: user có thể mở trực tiếp bài đăng từ `Publish Records` và `Published Content` khi có `platformPostId` hợp lệ.
- Thêm TikTok publish-now adapter thật (`src/lib/social/tiktok-upload.ts`) dùng Content Posting API Direct Post: creator info query, init publish, upload binary theo chunk, và status fetch.
- Thêm tests cho TikTok adapter (`src/lib/social/tiktok-upload.test.ts`) bao phủ success, queued, failed và refresh-token flow.
- Thêm Facebook publish-now adapter (`src/lib/social/facebook-upload.ts`) cho Page video và Reels qua Meta Graph API, gồm Page token resolution, binary upload và provider error mapping.
- Thêm Facebook connection check thật qua Graph API Page lookup và `pageAccessToken` secret field cho social account config.
- Thêm Facebook page-context resolver (`src/lib/social/facebook-auth.ts`) để map `pageId + pageAccessToken` qua `/me/accounts`, xử lý rõ trường hợp nhiều Page và pageId không hợp lệ.
- Thêm tests cho Facebook page-context resolver (`src/lib/social/facebook-auth.test.ts`).
- Thêm API `GET /api/social/accounts/[accountId]/facebook-pages` để lấy danh sách Facebook Pages khả dụng cho publish target selection.
- Thêm governance doc `docs/governance/versioning-rules.md` để chuẩn hóa semver policy, release checklist và source-of-truth cho version hiển thị.
- Thêm regression helper/test để normalize editable Storage Provider secrets về controlled-input strings khi dữ liệu cũ chứa `null`.
- Thêm topbar Progress Center để xem các tác vụ nền đang chạy/gần đây, trước mắt gồm publish-now và Local Upload Intake.
- Thêm filters platform/status và phân trang cho `Publish Records` qua API + UI.
- Thêm confirm modal trước khi xóa Social Account.
- Thêm tests cho progress center, Publish Records filter/pagination API và key helper của Published Content.
- Thêm Workspace Canvas MVP với node catalog, graph draft helpers, canvas/inspector UI, sample Douyin rework flow và local draft persistence.
- Thêm drag node, pan/zoom canvas và Runtime Bridge cho Workspace để mở nhanh Local Upload Intake/Publish Records từ graph surface.
- Thêm executable Workspace flow đầu tiên: `Upload Video -> Save to Storage -> Publish Social`, chạy trực tiếp trong Workspace qua local upload API và publish-now API.
- Thêm input node `Storage Asset` để dùng video đã có trong Storage Library làm đầu vào Workspace flow.
- Thêm executable Workspace modes linh hoạt: upload-only, existing-asset publish, và upload-to-social end-to-end.
- Thêm Progress Center integration cho Workspace Flow, cập nhật tiến trình theo stage upload/publish.

### Changed

- Cập nhật Next.js `dev` và `build` scripts để chạy Turbopack rõ ràng (`next dev --turbopack`, `next build --turbopack`).
- Cập nhật social docs/data model/roadmap/connection docs theo hướng Control Center trước; YouTube và TikTok đã bật adapter upload thật, Facebook/Shopee vẫn deferred.
- Cập nhật Publish Records để lưu `publishMode` (`schedule` hoặc `publish_now`); YouTube/TikTok `publish_now` gọi upload thật, platform chưa có adapter sẽ fail rõ ràng thay vì giả vờ đã đăng.
- Cập nhật Publish Records modal: mặc định `Publish now`, chỉ hiển thị `Scheduled At` khi schedule, hiển thị trạng thái đang upload và khóa submit để tránh double publish.
- Cập nhật Social Account modal: chuyển checklist YouTube OAuth dài sang quick setup và link mở Tutor Docs.
- Cập nhật social docs với khuyến nghị OAuth/refresh-token flow là hướng dài hạn, manual access token chỉ là fallback/debug.
- Cập nhật YouTube OAuth scopes để request thêm `https://www.googleapis.com/auth/youtube.readonly` phục vụ đọc inventory channel upload.
- Cập nhật social UI để `platformPostId` không chỉ hiển thị text: YouTube tự build watch URL, còn ID đã là URL đầy đủ sẽ mở trực tiếp.
- Cập nhật social capabilities: TikTok chuyển sang `realPublishStatus=enabled` và hỗ trợ `publish_now`.
- Cập nhật `executePublishNow` để route sang TikTok adapter thay vì fail adapter-not-implemented.
- Cập nhật social connection checks: TikTok connected account được kiểm tra thật qua `creator_info/query` endpoint.
- Cập nhật social capabilities: Facebook chuyển sang `realPublishStatus=enabled` và hỗ trợ `publish_now`.
- Cập nhật `executePublishNow` để route sang Facebook adapter cho `facebook_video` và `facebook_reel`.
- Cập nhật Social Accounts/Publish Records copy để phản ánh Facebook publish-now đã hoạt động và cần Page ID/Page token.
- Cập nhật OAuth callback social để không ghi đè nhầm `accountId` Facebook thành internal Mongo ID từ state param.
- Cập nhật Social Accounts table hiển thị rõ `Page ID` đã cấu hình cho account Facebook.
- Cập nhật `New Publish Record`: khi chọn account Facebook sẽ load danh sách Pages và bắt buộc chọn `Facebook Page` trước khi submit.
- Cập nhật publish record model/validation/runtime để lưu và dùng `facebookPageId` theo từng record.
- Cập nhật `New Publish Record` sang multi-destination form: một video có thể tạo nhiều publish records cho nhiều account/platform/pages trong một lần submit.
- Cập nhật Connection Test semantics cho Facebook multi-page: token hợp lệ nhưng chưa chọn page account-level được coi là healthy và nhắc chọn Page khi publish.
- Cập nhật YouTube Connection Test ưu tiên refresh-token flow trước khi token scope validation để giảm false-down do access token cũ.
- Cập nhật leftbar footer version hiển thị động từ `package.json` thay vì hard-coded string.
- Cập nhật Storage Providers Drive modal thành quick setup + redirect URI panel tương tự New Social Account.
- Cập nhật copy trong Social Accounts/Publish Records để phản ánh TikTok publish-now đã hoạt động.
- Cập nhật social account status semantics: account mới là `needs_auth`, chỉ OAuth callback/token exchange thành công mới set `connected`; Connection Test báo `AUTH_SOCIAL_NOT_CONNECTED` khi chưa kết nối thật.
- Cập nhật Social Accounts UI để lỗi OAuth/config trong modal không còn ghi đè status bar của toàn trang.
- Cập nhật Connection Test để YouTube account `connected` không còn bị skipped nếu có access token.
- Cập nhật YouTube Connection Test không dùng endpoint đọc channel nữa, tránh yêu cầu scope đọc không cần thiết; nếu thiếu upload scope sẽ báo `AUTH_YOUTUBE_SCOPE_MISSING`.
- Cập nhật hướng dẫn YouTube: sau khi thêm scope trong Google Cloud phải OAuth connect lại vì token cũ không tự nhận scope mới.
- Cập nhật API `GET /api/storage/providers/[providerId]` để trả editable payload (bao gồm secrets) phục vụ hydrate form edit.
- Cập nhật Storage Providers UI: khi bấm `Edit` sẽ fetch chi tiết provider và nạp lại toàn bộ cấu hình đã lưu trước đó vào modal.
- Cập nhật confirm modal Drive fallback trong Local Upload Intake để có thêm lựa chọn `Upload anyway`.
- Cập nhật Storage Library table: thêm cột preview video inline trước `Asset`, bỏ cột `Created` và chuyển `Created` vào detail modal.
- Cập nhật navigation gộp `Typography + Appearance` thành section `Display`.
- Cập nhật App Shell + Content Router để áp dụng và lưu local preferences cho 5 font + 7 theme.
- Cập nhật Display panel với branding block (logo GIF + wordmark OmniVideo) theo style logo ban đầu.
- Cập nhật Appearance options thêm theme `Light Pastel Pink`.
- Cập nhật style actions dùng semantic tokens theo theme (`btn-danger`, `btn-success`) để đồng nhất light/dark.
- Cập nhật Google Drive storage flow sang OAuth-only: create/check/upload/download chỉ dùng `accessToken`, Storage Providers Drive form bỏ Service Account JSON.
- Cập nhật Storage Providers modal (Drive): thêm nút `Connect OAuth` để lấy access token tự động qua popup callback.
- Cập nhật Storage Providers modal hiển thị callback URI cụ thể cho Drive OAuth để user cấu hình Google OAuth client chính xác.
- Cập nhật `GET /api/storage/oauth/start` trả thêm `redirectUri` và ưu tiên request origin khi build OAuth redirect URI.
- Cập nhật Tutor Docs (UI + markdown docs) bổ sung Drive OAuth setup/troubleshooting tương tự YouTube.
- Cập nhật Drive runtime auth flow: ưu tiên refresh-token exchange (nếu có `DRIVE_CLIENT_ID`/`DRIVE_CLIENT_SECRET`) trước khi fallback access token.
- Cập nhật Drive OAuth callback/modal mapping để nhận và lưu `refreshToken` cùng `accessToken` khi connect OAuth.
- Cập nhật New Publish Record để publish-now chạy được ở background, có percent/progress bar và có thể ẩn modal trong lúc chạy.
- Cập nhật progress publish-now theo stage chi tiết (prepare/request/response/finalize) để không còn chỉ nhảy 0 -> 100 với destination đơn lẻ.
- Cập nhật Local Upload Intake để đăng ký tiến trình upload/pipeline vào Progress Center trên topbar.
- Cập nhật modal Background Progress sang layout centered, rộng hơn và hiển thị thêm scope/start/finish/duration để giảm mơ hồ.
- Cập nhật Storage Providers Drive OAuth setup guidance sang layout tương tự Social Account (Quick setup/Common scopes/Redirect URI/notes + Open Tutor Docs ở panel phải).
- Cập nhật Storage Provider modal: khi chọn Drive, toàn bộ form chuyển thành 2 cột riêng; input (`Provider/Label/Description/Priority/Tags/Secrets`) ở cột trái và Drive OAuth guidance là panel độc lập ở cột phải.
- Cập nhật `New Publish Record` asset selector từ plain text dropdown sang picker card có preview thumbnail + metadata tags (provider/platform/quality/size) để phân biệt asset dễ hơn.
- Cập nhật version app từ `0.1.0` lên `0.2.0`.
- Cập nhật Social runtime UI để dùng semantic status badges dùng chung cho `Published Content`, `Publish Records` và `Social Accounts`, giúp scan nhanh trạng thái `published/failed/planned/connected/needs_auth`.
- Tinh chỉnh semantic status UI theo mật độ giao diện: giữ badge cho account-level status, còn dense rows/tables (Social Published Content, Publish Records, Video Intake, Local Upload Intake) dùng text-only status colors cho `success/failed/...` để gọn hơn.
- Cập nhật default app section từ `profile` sang `workspace` và đăng ký Workspace trong navigation/content router.
- Cập nhật Workspace thành full-width surface riêng, không còn bị giới hạn `max-w-7xl`; left catalog và right inspector scroll độc lập.
- Cập nhật Workspace edge validation để lỗi thiếu input/output port hiển thị trong UI thay vì throw ra Next.js overlay.
- Cập nhật node contract `storage.upload` để output `asset`, cho phép nối tiếp sang `social.publish` trong executable upload-to-social flow.
- Cập nhật Workspace runtime config chuyển vào Inspector theo selected node thay vì form global trên graph.
- Cập nhật Workspace canvas controls: bỏ title strip trong graph và đưa pan/zoom/graph status/reset/clear vào overlay bên trong canvas.
- Cập nhật nút `Run Workspace Flow` sang primary action rõ hơn.

### Fixed

- Sửa lỗi form `Edit` storage provider bị trống secret fields dù account đã cấu hình từ trước.
- Sửa UX fallback local upload cho file lớn: user có thể giữ upload qua Telegram theo ý muốn thay vì chỉ có chuyển sang Drive hoặc hủy.
- Sửa React duplicate key warning trong `Published Content` khi nhiều footprint failed trùng account/type/status.
- Sửa style nút `Delete` ở Storage Providers/Storage Library để hiển thị đúng trong dark mode.
- Sửa regressions semantic color: khôi phục màu đỏ cho `Delete` và màu xanh cho `Activate` nhưng vẫn tương thích dark mode.
- Sửa lỗi Drive Service Account upload/check vẫn có thể rơi vào quota 0GB khi thiếu folder target bằng guard bắt buộc `folderId` và message actionable trước khi upload.
- Sửa lỗi vận hành Drive do hướng Service Account bằng cách tạm dừng toàn bộ Service Account path và chuyển hẳn sang quota OAuth cá nhân.
- Sửa UX lỗi Storage Providers: thiếu `accessToken` giờ hiển thị trực tiếp trong New/Edit Storage Account modal thay vì khó thấy ở status tổng.
- Sửa lỗi hướng dẫn thiếu thông tin callback gây khó debug `redirect_uri_mismatch` bằng cách hiển thị URI expected ngay trong modal.
- Sửa lỗi Drive upload/check/download bị fail sau thời gian ngắn vì access token hết hạn, bằng refresh-token runtime flow tương tự YouTube.
- Sửa lỗi edit Google Drive storage provider làm React cảnh báo `value` prop on `input` should not be null khi secret cũ chứa `null`.
- Sửa lỗi Facebook publish-now fail `PRV_FACEBOOK_PAGE_TOKEN_FAILED` khi account có nhiều Page hoặc fallback nhầm internal id: runtime giờ yêu cầu chọn `pageId` rõ ràng và resolve token đúng theo Page.
- Sửa lỗi vận hành account Facebook nhiều Page bằng cách cho chọn target Page trực tiếp trong publish modal thay vì phụ thuộc duy nhất vào cấu hình account.
- Sửa false-down Connection Test cho account Facebook nhiều Page (không còn đánh down khi token OK nhưng chưa set account-level pageId).
- Sửa false-down YouTube Connection Test do access token hết hạn bằng refresh-token check path.
- Sửa trạng thái reload mặc định hiện `Unknown section` do `profile` không nằm trong navigation registry.
- Sửa border trái Inspector trên Workspace về border token mảnh, tránh vệt đậm lệch phong cách.

### Notes

- Task IDs: P2-SOCIAL-001, P2-SOCIAL-002, P2-SOCIAL-003, P2-SOCIAL-004, P2-SOCIAL-005, P2-SOCIAL-006, P2-SOCIAL-007, P2-SOCIAL-008, P2-SOCIAL-009, P2-SOCIAL-010, P2-SOCIAL-011, P2-SOCIAL-012, P2-SOCIAL-013, P2-SOCIAL-014, P2-SOCIAL-015, P2-SOCIAL-016, P2-SOCIAL-017, P2-SOCIAL-018, FAST-SOCIAL-001, FAST-SOCIAL-002, FAST-SOCIAL-003, FAST-SOCIAL-004, FAST-UX-005, FAST-CONN-002, FAST-GOV-002, FAST-STORAGE-001, FAST-STORAGE-002, FAST-STORAGE-003, FAST-STORAGE-004, FAST-STORAGE-005, FAST-STORAGE-006, P1-STORAGE-006, P1-UX-003, P1-UX-004, P1-STABILITY-002, P4-WORKSPACE-001, P4-WORKSPACE-002, P4-WORKSPACE-003, P4-WORKSPACE-004, P4-WORKSPACE-005
- Verification: `npm run test` pass (102 tests / 25 files); `npm run build` pass. Build còn warning cũ: `src/features/workspace/display-preferences-panel.tsx` import `Image` không dùng.
- Verification (FAST-STORAGE-001): superseded by FAST-STORAGE-002 OAuth-only pivot trong cùng ngày.
- Verification (FAST-STORAGE-002): `npm run test -- --run src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts` pass (14 tests / 2 files); `npm run build` pass.
- Verification (FAST-STORAGE-003): `npm run test -- --run src/lib/storage/drive-oauth.test.ts src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts` pass (18 tests / 3 files); `npm run build` pass.
- Verification (FAST-STORAGE-004): `npm run test -- --run src/lib/storage/drive-oauth.test.ts src/lib/storage-providers/validation.test.ts src/lib/connections/storage-checks.test.ts` pass (19 tests / 3 files); `npm run build` pass.
- Verification (FAST-STORAGE-005): `npm run test -- --run src/lib/storage/drive-token.test.ts src/lib/connections/storage-checks.test.ts src/lib/storage-providers/validation.test.ts src/lib/storage/drive-oauth.test.ts` pass (23 tests / 4 files); `npm run build` pass.
- Verification (FAST-STORAGE-006, P2-SOCIAL-017): `npm run test -- --run src/lib/storage-providers/form-secrets.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts src/app/api/social/capabilities/route.test.ts` pass (14 tests / 4 files); `npm run test` pass (117 tests / 29 files); `npm run build` pass with existing unused `Image` warning in `display-preferences-panel.tsx`.
- Verification (FAST-SOCIAL-002): `npm run test -- --run src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts` pass (14 tests / 3 files); `npm run test` pass (120 tests / 30 files); `npm run build` pass with existing unused `Image` warning in `display-preferences-panel.tsx`.
- Verification (FAST-SOCIAL-003): `npm run test -- --run src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts src/lib/social/validation.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts'` pass (28 tests / 5 files); `npm run test` pass (123 tests / 31 files); `npm run build` pass with existing unused `Image` warning in `display-preferences-panel.tsx`.
- Verification (FAST-CONN-002, FAST-GOV-002, P2-SOCIAL-018): `npm run test -- --run src/lib/social/connection-checks.test.ts src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/validation.test.ts src/app/api/social/publish-records/route.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts'` pass (30 tests / 6 files); `npm run test` pass (124 tests / 31 files); `npm run build` pass with existing lint warnings (`navigation.ts` unused icons, `display-preferences-panel.tsx` unused `Image`).
- Verification (P4-WORKSPACE-001): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (7 tests / 2 files); `npm run test` pass (143 tests / 37 files); `npm run build` pass with existing warning in `display-preferences-panel.tsx` (`Image` unused).
- Verification (P4-WORKSPACE-002): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (9 tests / 2 files); `npm run test` pass (145 tests / 37 files); `npm run build` pass with existing warning in `display-preferences-panel.tsx` (`Image` unused).
- Verification (P4-WORKSPACE-003): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (11 tests / 2 files); `npm run build` pass; `npm run test` pass (147 tests / 37 files). Build warning remains existing `display-preferences-panel.tsx` unused `Image`.
- Verification (P4-WORKSPACE-004): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (12 tests / 2 files); `npm run build` pass; `npm run test` pass (148 tests / 37 files). Build warning remains existing `display-preferences-panel.tsx` unused `Image`.
- Verification (P4-WORKSPACE-005): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts src/lib/ui/progress-center.test.ts` pass (14 tests / 3 files); `npm run build` pass; `npm run test` pass (148 tests / 37 files). Build warning remains existing `display-preferences-panel.tsx` unused `Image`.
- Risks: YouTube `Publish now` đã upload thật nhưng đang đọc video vào memory trước khi gửi; TikTok publish có thể ở trạng thái processing/moderation và chưa có public post id ngay; YouTube Published Content cần OAuth reconnect để token có scope `youtube.readonly`; Facebook/Shopee real publish adapters vẫn deferred.

## 2026-04-25

### Added

- Thêm `docs/SYSTEM-SUMMARY.md` làm bản tổng hợp chuẩn toàn bộ hệ thống và toàn bộ bộ docs hiện hữu.
- Thêm `docs/architecture/testing-strategy.md` để chuẩn hóa chiến lược test cho stack Next.js + MongoDB.
- Thêm `docs/governance/testing-rules.md` với quy tắc cứng: code change phải có test tương ứng, bugfix phải có regression test.
- Thêm `docs/operations/test-execution-playbook.md` để chuẩn hóa quy trình chạy test và xử lý test failures.
- Thêm bộ khung Next.js App Router ban đầu gồm `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Thêm module homepage mới tại `src/modules/home/*` theo cấu trúc config/types/utils/components.
- Thêm unit test cho utility lọc sidebar nav tại `src/modules/home/utils/filter-nav-groups.test.ts`.
- Thêm cấu trúc leftbar mới theo hướng create-next tại `src/components/layout/leftbar.tsx`.
- Thêm MongoDB foundation tại `src/lib/config/env.ts` và `src/lib/db/mongodb.ts`.
- Thêm endpoint health check kết nối DB tại `src/app/api/health/db/route.ts`.
- Thêm Video Intake page để nhập URL, tags, storage provider và chạy node pipeline.
- Thêm Storage Library page để quản lý metadata video đã lưu trong MongoDB.
- Thêm API `POST /api/video-intake/runs` cho URL intake pipeline và `GET /api/storage/assets` cho danh sách video assets.
- Thêm node pipeline MVP gồm validate source URL, resolve media URL, upload storage và persist asset metadata.
- Thêm Telegram storage adapter dùng remote media URL và Google Drive adapter dùng resumable upload từ remote stream.
- Thêm test runner Vitest và unit tests cho platform detection, validation, pipeline definition, asset metadata mapping.
- Thêm Storage Providers page/API để quản lý nhiều Telegram/Drive/S3/local/other storage accounts với secret masking.
- Thêm domain module `src/lib/storage-providers/*` với validation, secret sanitization và status update.
- Thêm Video Intake run history để xem nhanh các run gần nhất, status, source, storage và lỗi.
- Thêm lựa chọn storage account thật trong Video Intake thay vì hard-code provider type.
- Thêm pagination cho Intake Run History (`page`, `pageSize`, `total`, `totalPages`) và điều hướng Prev/Next trên UI.
- Thêm Telegram upload fallback: nếu `sendVideo` bằng remote URL thất bại do Telegram không đọc được URL nguồn, hệ thống tự fallback upload binary trực tiếp.
- Cải thiện source fetch cho direct media URL bằng retry với browser-like headers khi gặp 401/403 từ host nguồn.
- Thêm built-in media resolver trong app bằng local `yt-dlp` runtime đặt tại workspace `.vendor/python`.
- Thêm bridge `internal-resolver.py` + `internal-resolver.ts` để resolve YouTube/TikTok/Facebook URL ngay trong Next.js app.
- Thêm API run detail `GET /api/video-intake/runs/[runId]` để lấy step trace chi tiết.
- Thêm propagation `requestHeaders` từ built-in resolver sang source fetch/upload.
- Thêm fallback profile cho built-in YouTube resolver: thử default trước, nếu fail sẽ retry với Android client.
- Thêm regression test `src/lib/video-intake/media-resolver.test.ts` để khóa lỗi mất `requestHeaders` từ resolver payload.
- Thêm quality selector cho Video Intake (`best`, `1080p`, `720p`, `480p`, `360p`) và truyền qualityPreference vào pipeline payload.
- Thêm helper `src/lib/storage/storage-location.ts` và test `src/lib/storage/storage-location.test.ts` để build link mở storage cho Drive/Telegram.
- Thêm API `GET /api/storage/assets/[assetId]/download` để tải asset từ Telegram/Drive thông qua credentials server-side.
- Thêm metadata format thực tế từ resolver (`actualQuality`, `resolution`, `formatId`, codec fields) vào video asset.
- Thêm normalize Douyin `modal_id` URL trước khi gọi resolver nội bộ.
- Thêm section `Local Upload Intake` và API multipart `POST/GET /api/video-intake/local-runs` để upload video local lên storage.
- Thêm local intake pipeline definition + validation cho local file upload path.
- Thêm helper `src/lib/storage/telegram-download.ts` + test để chuẩn hóa giới hạn Telegram Bot API download.
- Thêm API `GET /api/health/connections` để tổng hợp connection check MongoDB + Telegram/Drive.
- Thêm module `src/lib/connections/storage-checks.ts` + test cho kiểm tra health từng storage account Telegram/Drive.
- Thêm helper `src/lib/storage/drive-service-account.ts` + test để exchange access token từ Google Service Account JSON key.
- Thêm helper `src/lib/video-intake/local-upload-routing.ts` + test để áp dụng rule xác nhận chuyển Telegram -> Drive cho local file lớn.
- Thêm helper `src/lib/storage/google-drive-error.ts` + test để parse lỗi Google Drive chi tiết.
- Thêm API `DELETE /api/storage/providers/[providerId]` và `DELETE /api/storage/assets/[assetId]`.
- Thêm API `POST /api/storage/assets` để tạo manual video asset metadata trong Storage Library.

### Changed

- Cập nhật `docs/README.md` để bổ sung điều hướng Master Summary và testing docs.
- Cập nhật `docs/AGENTS.md` và `AGENTS.md` thành onboarding guide đồng bộ với testing rules mới.
- Cập nhật `README.md` để nêu rõ rule bắt buộc: code change phải có test.
- Cập nhật governance docs (`ai-agent-rules`, `definition-of-ready-done`, `engineering-rules`, `task-standard`) theo chuẩn testing bắt buộc.
- Cập nhật `tasks/templates/task-template.md` để thêm progress stamp `[ ]/[x]`, `Task Type`, checklist `feature/bugfix/research`, và `Test Evidence`.
- Cập nhật `tasks/README.md` để chuẩn hóa workflow đóng dấu `[x]` theo tiến độ task.
- Cập nhật `tasks/TASK-SETUP-TASK-001.md` và `tasks/board.md` để phản ánh trạng thái hoàn tất cải tiến template.
- Cập nhật `package.json` để thêm scripts và dependencies cho homepage bootstrap + test script.
- Cập nhật app shell về chế độ `leftbar-only` theo yêu cầu hiện tại và bỏ phần main content cũ.
- Cập nhật branding leftbar thành `OmniVideo` và footer `OmniVideo + v0.1.0`.
- Chuyển giao diện mặc định sang light mode (không gán dark theme mặc định).
- Cập nhật leftbar để item `Connection Test` gọi `/api/health/db` và hiển thị trạng thái MongoDB trực tiếp.
- Refactor lại UX navigation: leftbar chỉ điều hướng, nội dung hiển thị ở panel phải theo section active.
- Chuyển `Connection Test` sang panel phải và chạy DB health check tại khu vực content thay vì trong sidebar.
- Refactor homepage thành kiến trúc mở rộng gồm `AppShell`, `ContentRouter`, navigation registry và feature panels riêng.
- Rút gọn `src/app/page.tsx` thành entry point mỏng, không chứa logic tab/feature.
- Cập nhật env config để hỗ trợ `VIDEO_RESOLVER_ENDPOINT`, Telegram và Google Drive credentials.
- Cập nhật leftbar với nhóm `Video Pipeline` gồm `Video Intake` và `Storage Library`.
- Cập nhật storage docs/data model để phân biệt storage provider accounts với video asset library.
- Cập nhật Video Intake để upload bằng secrets của storage account active đã chọn.
- Cập nhật Storage Providers UI để form tạo account chỉ hiển thị sau khi bấm New.
- Cập nhật trạng thái Refresh trong Intake Run History để có loading feedback và lỗi tải history rõ hơn.
- Cập nhật media resolver sang fallback chain: direct URL -> external endpoint nếu có -> built-in resolver nội bộ.
- Cập nhật Run Status của Video Intake để hiển thị step-level trace (`validate`, `resolve`, `upload`, `persist`) và node lỗi cụ thể.
- Cập nhật internal resolver strategy để tăng tỷ lệ lấy direct media URL fetchable từ YouTube.
- Cập nhật media resolver mapping để giữ lại `requestHeaders` cho bước upload storage fetch source.
- Cập nhật built-in Python resolver: probe fetchability direct URL theo chuỗi profile (`default` -> `youtube-android`) trước khi trả payload.
- Cập nhật Storage Library UI để hiển thị thêm dữ liệu quan trọng (status, size, duration, resolver, requested quality, provider asset id, run/source refs) cùng detail row mở rộng.
- Cập nhật Storage Providers UI: form tạo account được mở bằng modal thay vì pane bên trái.
- Cập nhật Storage Library detail sang modal và thêm action `Download` cho từng asset.
- Cập nhật resolver error cleanup để bỏ Python deprecation noise và hướng dẫn cookie config khi Douyin/TikTok yêu cầu cookies.
- Cập nhật internal resolver profile strategy: chỉ dùng fallback `youtube-android` cho YouTube và thêm auto browser-cookie profile chain cho TikTok/Douyin.
- Cập nhật `README.md` và `.env.example` để bổ sung biến cấu hình cookies cho resolver TikTok/Douyin.
- Cập nhật app shell với top bar `h-12` đồng bộ header leftbar, có dark/light toggle và quick actions cho local upload flow.
- Cập nhật video intake repository/asset metadata để hỗ trợ pipeline id `mvp-local-intake-to-storage` và source type `file`.
- Cập nhật `next.config.ts` để tách artifact dir cho dev/build (`.next-dev` và `.next`) nhằm giảm lỗi chunk missing khi làm việc local.
- Cập nhật Connection Test panel để hiển thị chi tiết checks theo từng service/account (status, latency, message).
- Cập nhật Storage Providers modal cho Drive: hỗ trợ upload file JSON key hoặc paste JSON key trực tiếp, giữ `accessToken` dạng legacy.
- Cập nhật Drive upload/check runtime để resolve token theo `driveServiceAccountJson` (Service Account) hoặc fallback `accessToken` cũ.
- Cập nhật Local Upload Intake: khi chọn Telegram và file >20MB, UI hiển thị confirm modal để user quyết định chuyển sang Drive account active.
- Cập nhật API download asset hỗ trợ `disposition=inline` + `Range` forwarding để phục vụ video preview/player.
- Cập nhật Storage Library: thêm action preview và inline video player trong modal chi tiết asset.
- Cập nhật Storage Providers: hỗ trợ edit cấu hình account hiện có (label/description/priority/tags/secrets) từ UI.
- Cập nhật Storage Library UX: preview chuyển thành `Play` mở modal inline player; download tách thành action riêng.

### Fixed

- Chuẩn hóa lại DoD/agent protocol để không còn khoảng trống "code xong nhưng thiếu test".
- Chuẩn hóa cách nhìn tiến độ task để giảm bỏ sót bước khi thực thi.
- Giảm độ phức tạp cấu trúc component leftbar theo feedback trực tiếp của owner.
- Sửa sai luồng UX trước đó: không hiển thị kết quả connection check trong leftbar.
- Sửa vấn đề tổ chức code khiến homepage khó mở rộng khi số lượng tab leftbar tăng lên.
- Chuẩn hóa failure path khi URL nền tảng chưa có direct media resolver: fail rõ lỗi `VID_RESOLVER_REQUIRED` và lưu trace.
- Làm rõ failure `VID_RESOLVER_REQUIRED` trên UI Video Intake bằng hướng dẫn cấu hình `VIDEO_RESOLVER_ENDPOINT` hoặc dùng direct media URL.
- Cải thiện độ ổn định upload Telegram cho direct media URL bằng fallback multipart upload khi gặp lỗi `failed to get HTTP URL content` hoặc `wrong type of the web page content`.
- Làm rõ failure `STG_TELEGRAM_SOURCE_STREAM_FAILED` (403 từ source host) là lỗi quyền truy cập nguồn, không phải lỗi token Telegram.
- Gỡ phụ thuộc bắt buộc vào `VIDEO_RESOLVER_ENDPOINT` cho các nguồn page URL khi local resolver runtime khả dụng.
- Giảm lỗi `403` khi fetch direct URL từ resolver bằng cách dùng đúng headers mà extractor trả về cho source host.
- Giảm lỗi `403` do web client extraction bằng fallback resolver sang Android client profile.
- Sửa bug làm rơi resolver `requestHeaders` trước upload step, nguyên nhân khiến YouTube direct URL fetch bị `403`.
- Sửa thiếu liên kết mở nơi lưu ở Storage Library bằng cơ chế ưu tiên `publicUrl/webViewLink` và fallback Telegram message URL inference.
- Sửa lỗi Douyin URL dạng `jingxuan?modal_id=...` bị báo unsupported trước khi đến extractor đúng.
- Sửa lỗi intake TikTok/Douyin phụ thuộc cấu hình cookies thủ công bằng fallback tự thử cookies từ browser profiles khi env chưa cấu hình.
- Sửa lỗi download Telegram asset lớn trả message mơ hồ bằng error code rõ `STG_TELEGRAM_FILE_TOO_BIG_FOR_BOT_DOWNLOAD`.
- Sửa UX Storage Library: disable nút Download với Telegram asset vượt giới hạn bot download và hiển thị lý do.
- Sửa thiếu khả năng kiểm tra kết nối Telegram/Drive trong Connection Test bằng flow health check mới.
- Sửa lỗi Drive upload/download chỉ trả thông báo 403 chung chung bằng message chi tiết hơn từ Google API + hint quyền folder/service account.
- Sửa false-positive Connection Test Drive trong trường hợp token hợp lệ nhưng `folderId` không đủ quyền bằng folder access probe.
- Sửa thiếu thao tác vận hành cơ bản bằng cách bổ sung delete cho provider và asset ngay trong dashboard.

### Notes

- Task IDs: SETUP-DOC-002, SETUP-TASK-001, P1-HOME-001, P1-HOME-002, P1-HOME-003, P1-DB-001, P1-UX-001, P1-UX-002, P1-INTAKE-001, P1-STORAGE-001, P1-INTAKE-002, P1-INTAKE-003, P1-INTAKE-004, P1-INTAKE-005, P1-INTAKE-006, P1-INTAKE-007, P1-INTAKE-008, P1-INTAKE-009, P1-STORAGE-002, P1-INTAKE-010, P1-INTAKE-012, P1-STABILITY-001, P1-CONN-001, P1-STORAGE-003, P1-STORAGE-004, P1-STORAGE-005
- Risks: Storage provider secrets đang được hỗ trợ ở dạng inline MongoDB cho MVP; production cần secret manager hoặc encryption at-rest.

## 2026-04-24

### Added

- Thiết lập documentation system đầy đủ cho repo trong `docs/` theo các cụm product, architecture, domains, operations, governance.
- Bổ sung bộ governance rules chuẩn hóa cách làm việc cho engineering và AI agents.
- Bổ sung task system hoàn chỉnh trong `tasks/` gồm board, backlog, template và task setup mẫu.
- Bổ sung architecture specs cho stack Next.js + MongoDB, gồm system overview, node architecture, data model, integration boundaries.
- Bổ sung operations docs cho observability, connection center, incident playbook.
- Bổ sung domain specs cho source/provider/social/storage/video pipeline/multilingual audio/affiliate blueprint.

### Changed

- Cập nhật `README.md` thành entrypoint điều hướng tài liệu chính thức.

### Fixed

- Chuẩn hóa lại vị trí changelog chính thức về `changelog/changelog.md` để tránh phân tán tài liệu.

### Notes

- Task IDs: SETUP-DOC-001, SETUP-GOV-001, SETUP-ARCH-001
- Risks: Cần duy trì cập nhật docs đồng bộ với code trong các phase triển khai tiếp theo.

## 2026-05-01

### Added

- Audio Transcript Source Video hỗ trợ chọn trực tiếp từ Storage Library qua UI `Video Asset` (`Select asset`/`Browse`) thay vì chỉ upload local file.

### Changed

- Cập nhật API `POST /api/audio/chinese-transcription` để nhận nguồn từ `videoFile` hoặc `assetId`.

### Fixed

- Sửa giới hạn flow Audio Transcript không dùng được video đã lưu trong storage.

### Notes

- Task IDs: FAST-AUDIO-017
- Risks: Download asset từ provider vẫn phụ thuộc vào tính hợp lệ của pointer/token storage hiện có.
- Audio Transcript: thêm chỉnh sửa inline `translatedText` trực tiếp trong panel `Segments` sau khi Translate to VI, để sửa lỗi nhẹ mà không cần chạy dịch lại.
- Audio Transcript: thêm session persistence qua local storage để giữ transcript/translation/steps và cấu hình chính khi user chuyển trang rồi quay lại.
- Verification (FAST-AUDIO-018): `npm run test -- src/lib/multilingual-audio/transcript-session.test.ts` pass (1 file / 2 tests).

## 2026-05-01

### Added

- Workspace thêm node processing `Generate VI Metadata` (node lá sau `Translate Transcript`) để tạo `title + description + hashtags` tiếng Việt bằng AI.
- Thêm API `POST /api/audio/video-metadata` và service metadata generation cho luồng transcript translation -> social metadata.
- Video Tools Lab hỗ trợ vẽ trực tiếp nhiều vùng blur trên preview video (multi-region), mỗi vùng có timeline + strength riêng.

### Changed

- Mở rộng intake metadata (`URL Intake`, `Local Upload`, và workspace source nodes) để nhận/lưu `description` cùng `title` ngay từ đầu.
- Mở rộng metadata video asset để có trường `description`, `vietnameseTitle`, `vietnameseDescription`, `vietnameseHashtags`.
- Workspace publish fallback: khi node Publish Social không override metadata, hệ thống tự dùng metadata tiếng Việt đã generate.
- Storage Library detail hiển thị thêm source/VI metadata quan trọng.
- Publish Records asset picker tự điền title/caption/hashtags từ metadata VI (nếu form đang trống).
- API `POST /api/video-processing/edit` nhận thêm `blurRegionsJson` để xử lý nhiều vùng blur, đồng thời giữ backward compatibility với single-region payload cũ.
- Workspace `edit.mask-region` cho phép nhập `blurRegionsJson` để chạy multi-region blur trong flow runtime.

### Fixed

- Khắc phục khoảng trống metadata xuyên suốt flow intake -> transcript translation -> publish social.
- Sửa giới hạn blur một vùng cố định, cho phép blur nhiều vị trí trong cùng video.

### Notes

- Task IDs: FAST-WORKSPACE-010, FAST-VIDEO-003
- Verification:
    - `npm run test -- src/lib/video-intake/validation.test.ts src/lib/video-intake/local-validation.test.ts src/lib/workspace/workspace-graph.test.ts` (pass)
    - `npm run build` (pass)
- Audio Transcript: sau khi Translate to VI, thêm action `Generate VI Metadata`, hiển thị trực tiếp kết quả `title/description/hashtags`, và thêm `Save to Asset` để gọi API cập nhật metadata vào Storage Asset đã chọn.
- Video Edit multi-region verification:
    - `npm run test -- src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts` (pass)

## 2026-05-02

### Changed

- Video Tools Lab lưu vị trí `Subtitle mẫu` theo phần trăm khung preview trong `videoEditSetup.subtitlePreviewPlacement`, để chọn lại Storage Asset thì hiển thị đúng vị trí đã kéo thay vì suy lại từ ASS margin.
- Đổi mặc định `Độ rộng Subtitle mẫu (%)` thành `100` và cho phép nhập tối đa `100`.
- Subtitle background color trong Video Edit chuyển sang preset chọn nhanh (`đen/trắng/xám`) ở cả Video Tools Lab và Workspace Inspector thay cho nhập tay.

### Fixed

- Sửa lỗi preview subtitle mẫu hiển thị lệch lên cao sau khi load setup từ video asset, trong khi video output đã render đúng.
- Sửa lỗi subtitle background color không áp dụng đúng màu render (ví dụ `#FFFFFF`) do ASS style chưa đồng bộ màu hộp nền.

### Notes

- Task IDs: FAST-VIDEO-003
- Verification:
    - `npm run test -- src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts` (pass, 3 files / 47 tests)
    - `npm run build` (pass; còn warning cũ ngoài scope ở navigation/topbar/audio/display-preferences)
