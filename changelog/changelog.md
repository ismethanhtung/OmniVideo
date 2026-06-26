# OmniVideo Changelog

## FAST-VIDEO-057 - Add VIP segment transcript retry and Vietnamese name guard

- Bumped app version from `0.11.44` to `0.11.45` as a patch release for Workspace VIP segment review.
- Added transcript retry selection inside Background Progress `Segments (...)` edit mode, allowing multiple completed VIP segments to be marked for transcript splitting and AI retranslation.
- Added a transcript retry override helper that splits selected merged source segments by punctuation/timing, reindexes transcript segments, and feeds the corrected transcript back into VIP reruns.
- Updated Workspace VIP reruns so transcript retry uses `transcriptOverrideJson` while keeping `translationMode=ai`, forcing translation to run again from the corrected transcript instead of reusing imported translated lines.
- Hardened Vietnamese translation prompts and TTS normalization against Pinyin/latinized Chinese names such as `Zhūzhū` and `Xǔ Shí`.
- Verification (FAST-VIDEO-057):
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/lib/multilingual-audio/transcript-segment-retry.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (7 files / 104 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-056 - Move VIP translation corrections into Background Progress

- Bumped app version from `0.11.43` to `0.11.44` as a patch release for Workspace VIP correction UX.
- Moved VIP translated segment correction into the Background Progress `Segments (...)` panel, with in-place editing for multiple translated lines.
- Added a typed Background Progress correction event so the Topbar can trigger the existing Workspace corrected VIP rerun path for the matching VIP node.
- Removed the separate Workspace correction panel so completed VIP review and correction happen in one place.
- Added validation coverage for correction event payloads and updated focused Workspace/Topbar regression checks.
- Verification (FAST-VIDEO-056):
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (5 files / 80 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-055 - Add VIP translation correction rerun

- Bumped app version from `0.11.42` to `0.11.43` as a patch release for Workspace VIP correction reruns.
- Added a Workspace VIP translation correction panel that appears after a successful VIP run with runtime transcript and translation data.
- Added corrected VIP rerun wiring that sends `transcriptOverrideJson` and structured `importedTranslationSegmentsJson`, letting the rerun skip transcription and AI translation while regenerating voice/render/metadata.
- Extended VIP processing to accept transcript overrides and include their hash in checkpoint fingerprints so stale voice/render/metadata are not reused for corrected translations.
- Added validation for structured imported translation segment JSON and transcript override JSON.
- Reworded the remote FormData fallback progress line as a compatibility fallback instead of an alarming EC2 rejection.
- Verification (FAST-VIDEO-055):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts` pass (4 files / 89 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-054 - Fix VIP background music render failure

- Bumped app version from `0.11.41` to `0.11.42` as a patch release for VIP background music render reliability.
- Fixed VIP ffmpeg music mixing so repeat and scheduled background music tracks are trimmed to the known output timeline before mixing, preventing infinite or overlong audio graphs.
- Removed unnecessary `adelay=0:all=1` usage for tracks starting at `0:00` and switched scheduled track delays to the more compatible `adelay=<ms>|<ms>` syntax.
- Passed the generated voice duration into one-pass VIP renders when background music is configured, so the ffmpeg graph has a finite music timeline even when repeat is enabled.
- Expanded ffmpeg render failure messages to include recent stderr context instead of only the generic `Conversion failed!` line.
- Verification (FAST-VIDEO-054):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts` pass (1 file / 28 tests).
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/background-music/route.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts` pass (7 files / 110 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-053 - Fix dynamic music discovery and remote FormData fallback

- Bumped app version from `0.11.40` to `0.11.41` as a patch release for VIP background music and remote worker reliability.
- Added `/api/video-processing/background-music` to list supported files directly from `public/musics`.
- Updated Video Tools Lab to load background music options dynamically and added a Refresh action for newly added music files.
- Added remote VIP start fallback from the custom Node multipart uploader to native `fetch(FormData)` when an EC2 worker responds with `Failed to parse body as FormData`.
- Added regression coverage for music library listing, Video Tools Lab dynamic loading guards, and remote FormData fallback.
- Verification (FAST-VIDEO-053):
  - `npm run test -- --run src/app/api/video-processing/background-music/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts` pass (3 files / 26 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-052 - Add saved background music setup for VIP video renders

- Bumped app version from `0.11.39` to `0.11.40` as a patch release for VIP background music rendering.
- Added Video Tools Lab background music setup controls for enabling music, selecting the public test track, setting master/per-track volume, repeat, and per-track start times.
- Persisted background music setup in video edit metadata and forwarded saved setup from Workspace VIP runs into `/api/audio/video-vip-processing`.
- Validated VIP music sources so only safe `/musics/...` public assets are accepted.
- Added VIP ffmpeg audio mixing for generated voice, optional original source audio, and scheduled/repeated music tracks, with remote EC2 worker payload pass-through.
- Added regression coverage for Video Tools Lab setup UI, Workspace VIP payload forwarding, API validation/setup parsing, worker payload pass-through, and ffmpeg mix args.
- Verification (FAST-VIDEO-052):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts` pass (5 files / 93 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-095 - Parallelize remote VIP source upload staging

- Bumped app version from `0.11.38` to `0.11.39` as a patch release for large remote VIP source upload speed.
- Added remote worker source chunk staging on `/api/audio/video-vip-voice-render`, allowing EC2 to receive large source videos as staged parts and later resolve `sourceUploadId` during job start.
- Updated the default remote worker client to stage large source videos in parallel chunks before sending a lightweight async start request.
- Preserved fallback to the existing single multipart start upload when chunk staging is unsupported or fails, so old workers do not hard-break the flow.
- Updated Workspace remote VIP progress text for parallel EC2 chunk staging.
- Added regression coverage for staged chunk upload, fallback to single upload, worker-side staged source assembly, and UI progress visibility.
- Verification (FAST-WORKSPACE-095):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 50 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-094 - Harden remote VIP start upload and progress visibility

- Bumped app version from `0.11.37` to `0.11.38` as a patch release for remote VIP EC2 start upload reliability.
- Replaced the default remote worker start POST path with a Node HTTP/HTTPS multipart upload transport that uses an explicit long timeout and upload progress callbacks instead of native `fetch(FormData)` for large video uploads.
- Saved remote worker progress into VIP checkpoints for preflight, source upload, worker acceptance, polling, completion, and artifact download phases.
- Updated Workspace VIP progress polling to show EC2-specific status such as upload bytes, accepted job, worker stage, poll retry, and artifact download instead of only the generic voice/render message.
- Added regression coverage for default Node multipart upload progress, checkpoint persistence, and Workspace progress visibility.
- Verification (FAST-WORKSPACE-094):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 61 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-076 - Retry transient translation chunk failures

- Bumped app version from `0.11.36` to `0.11.37` as a patch release for VIP translation resilience.
- Added bounded chunk-level retry for transient translation provider failures, including Gemini `503 UNAVAILABLE` high-demand responses, provider `429`/`5xx`, and network fetch failures.
- Preserved existing request-too-large split retry, invalid JSON retry, and single-segment fallback behavior.
- Added `chunk-transient-retry` logging with chunk label, attempt count, delay, and summarized provider error.
- Added regression coverage for Gemini-style `503` recovery and bounded persistent transient failure.
- Verification (FAST-AUDIO-076):
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts` pass (1 file / 20 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-093 - Harden remote VIP worker polling and filename fallback

- Bumped app version from `0.11.35` to `0.11.36` as a patch release for remote VIP worker reliability.
- Added remote worker preflight before transcript/translation in EC2 voice+render mode, so unreachable EC2 fails fast before expensive local stages.
- Added bounded retry for transient remote worker job-poll network failures instead of failing on the first `fetch failed`.
- Kept job-specific poll results intact while making general worker health/status omit heavyweight completed job result payloads.
- Overrode remote VIP output filenames locally with the strict source-title sanitizer, so stale EC2 workers cannot return `omnivideo-vip-done.mp4`.
- Verification (FAST-WORKSPACE-093):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (3 files / 45 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
  - Live EC2 check at `http://16.162.254.230:8787/api/audio/video-vip-voice-render` returned `ok:true`, but the current worker still serves the old heavyweight status payload until redeployed/restarted.

## FAST-VIDEO-051 - Sanitize VIP output download filenames

- Bumped app version from `0.11.34` to `0.11.35` as a patch release for VIP download filename reliability.
- Sanitized VIP output filenames from source titles by removing Vietnamese accents, replacing punctuation/whitespace with `-`, collapsing repeated separators, and preserving the existing `.mp4` extension.
- Hardened Workspace server artifact download headers so legacy accented artifact filenames are returned to the browser as conservative ASCII hyphenated names.
- Added regression coverage for the reported Vietnamese title pattern and server artifact download headers.
- Verification (FAST-VIDEO-051):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts` pass (2 files / 24 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-075 - Apply AI Provider RPM throttle to VIP only

- Bumped app version from `0.11.33` to `0.11.34` as a patch release for VIP AI Provider RPM throttling.
- Applied configured AI Provider `rateLimitRpm` only to Workspace VIP translation and metadata AI calls.
- Kept Workspace VIP transcript behavior unchanged so the selected translation provider does not alter or duplicate the speech-to-text stage.
- Removed route-level RPM wiring from non-VIP transcript, translation, and metadata endpoints while keeping adapter support inert unless VIP passes a limiter.
- Added regression coverage for VIP-only rate-limit wiring and the RPM interval helper.
- Verification (FAST-AUDIO-075):
  - `npm run test -- --run src/lib/ai-providers/rate-limit.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts --reporter=dot` pass (7 files / 76 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-092 - Freeze completed progress step durations

- Bumped app version from `0.11.32` to `0.11.33` as a patch release for Background Progress timing correctness.
- Fixed repeated VIP checkpoint polling so already completed sub-steps keep their original `finishedAt` timestamp instead of continuing to grow while later stages run.
- Preserved measured `durationMs` updates from final VIP results, so completed steps can still switch to backend stage timing when available.
- Added regression coverage for repeated `finishProgressStep` calls on an already completed step.
- Verification (FAST-WORKSPACE-092):
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts --reporter=dot` pass (3 files / 37 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-074 - Smooth strict VIP voice timing

- Bumped app version from `0.11.31` to `0.11.32` as a patch release for VIP voice timing quality.
- Updated Piper timeline speed calculation so chunks that already fit their target duration keep natural `1.0x` playback instead of being forced to the `1.25x` acceleration floor.
- Added small strict-timeline lead borrowing from previous audible slack, capped at `0.35s`, so cramped segments can reduce high speed without changing transcript/subtitle timestamps or overlapping previous spoken audio.
- Kept existing following-gap borrowing and high-speed warning behavior when there is not enough safe slack.
- Fixed Audio Transcript speed labels to show the actual backend speed factor instead of clamping display to at least `1.25x`.
- Verification (FAST-AUDIO-074):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts --reporter=dot` pass (4 files / 61 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-091 - Show VIP token usage and measured progress durations

- Bumped app version from `0.11.30` to `0.11.31` as a patch release for Workspace VIP progress visibility.
- Added translation token usage to VIP completion details when the translation provider returns usage telemetry, including total and cached prompt tokens.
- Added measured `durationMs` support to Background Progress steps and persisted it across reload-style hydration.
- Updated Workspace VIP completion to set the main VIP step and transcript/translation/voice-render/metadata sub-step durations from backend stage timing instead of client elapsed time.
- Verification (FAST-WORKSPACE-091):
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts --reporter=dot` pass (4 files / 56 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-073 - Tighten overlong Chinese segment retry threshold

- Bumped app version from `0.11.29` to `0.11.30` as a patch release for VIP transcription segment splitting.
- Tightened overlong Chinese transcript detection from more than `40` Han characters to more than `30`, so 36-character source segments like the observed VIP case are retried before translation/voice generation.
- Kept the existing segment-level retry flow and best-effort programmatic split fallback, now using the stricter threshold when provider retries still return one long segment.
- Added regression coverage for the observed Chinese source text that previously escaped retry.
- Verification (FAST-AUDIO-073):
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/chinese-transcription/route.test.ts --reporter=dot` pass (4 files / 42 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-072 - Route Gemini transcription sandbox through native audio API

- Bumped app version from `0.11.28` to `0.11.29` as a patch release for Feature Sandbox Gemini transcription.
- Fixed Feature Sandbox speech transcription with Google AI Studio/Gemini models by routing those requests through native Gemini `generateContent` audio input instead of the Whisper-compatible `/audio/transcriptions` endpoint.
- Added JSON transcript prompting and response normalization so Gemini output feeds the existing `text`, `language`, `segments`, and `words` UI/result shape.
- Preserved Groq/default and other OpenAI-compatible Whisper providers on the existing verbose JSON transcription endpoint.
- Verification (FAST-AUDIO-072):
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts --reporter=dot` pass (5 files / 32 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-AUDIO-071 - Add provider-selectable speech transcription sandbox

- Bumped app version from `0.11.27` to `0.11.28` as a patch release for Feature Sandbox transcription testing.
- Added AI Provider and transcription model controls to the Feature Sandbox transcript lab while preserving the existing upload video/audio and Video Asset input flow.
- Generalized the Groq Whisper transcription adapter so sandbox runs can target another OpenAI-compatible `/audio/transcriptions` provider/model without changing the existing extraction, prompt, verbose JSON timestamp, chunking, and overlong-segment retry logic.
- Extended `/api/audio/chinese-transcription` to accept optional `providerId` and `model`, resolve configured provider credentials server-side, and pass provider/model metadata into the same transcription pipeline.
- Updated Feature Sandbox navigation copy to mention speech transcription providers.
- Verification (FAST-AUDIO-071):
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts --reporter=dot` pass (5 files / 31 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-090 - Default VIP original volume to zero

- Bumped app version from `0.11.26` to `0.11.27` as a patch release for VIP audio mix defaults.
- Changed shared VIP `Original volume` default/fallback from `0.1` to `0`, so new Workspace VIP nodes and omitted VIP runtime values mute source audio by default.
- Updated Workspace VIP inspector placeholder/fallback and seed configs to use the shared `0` default.
- Preserved explicit caller-provided source audio mix values.
- Verification (FAST-WORKSPACE-090):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts --reporter=dot` pass (4 files / 116 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-089 - Default Gemini 3.1 Flash Lite and trace VIP progress stages

- Bumped app version from `0.11.25` to `0.11.26` as a patch release for Workspace VIP defaults and progress traceability.
- Changed shared translation/metadata AI defaults from the old 9router-compatible path to Google AI Studio env (`env-gemini`) with `models/gemini-3.1-flash-lite`.
- Updated Workspace VIP, dubbing, transcript translation, metadata, Audio Transcript, Video Narrator, and AI Image Studio defaults/placeholders to prefer Gemini 3.1 Flash Lite.
- Fixed AI Image Studio Reference Image Bank so `Add` explicitly opens the hidden file input, while keeping the compact Audio Transcript-style shell.
- Expanded Workspace Background Progress for VIP processing with traceable sub-stages for transcript, translation, voice/render, and metadata.
- Synchronized mask blur fallback/default strength to `25` across Video Tools, Workspace mask nodes, and relevant API fallbacks.
- Verification (FAST-WORKSPACE-089):
  - `npm run test -- --run src/lib/ai-providers/default-provider.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/storyboard/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/app/api/audio/video-narrator/route.test.ts src/lib/multilingual-audio/video-narrator.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/video-narrator/video-narrator-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/edit/route.test.ts --reporter=dot` pass (16 files / 192 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-050 - Align AI Image Studio UI and lower Video Tools blur default

- Bumped app version from `0.11.24` to `0.11.25` as a patch release for Video Pipeline UI polish.
- Changed Video Tools Lab partial blur default strength from `35` to `25`.
- Restored the AI Image Studio Audio Transcript-style header and status metrics.
- Aligned AI Image Studio fields, textareas, small actions, and primary buttons with the compact Audio Transcript visual treatment, including light accent actions instead of solid accent fill.
- Verification (FAST-VIDEO-050):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/ai-image/ai-image-studio-panel.test.ts` pass (2 files / 15 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-049 - Add Replicate reference and consistency workflow

- Bumped app version from `0.11.23` to `0.11.24` as a patch release for Replicate consistency tooling in Feature Sandbox.
- Added schema inspection to `GET /api/replicate/predictions`, returning model input fields and likely image/audio/video/file reference keys from Replicate `openapi_schema`.
- Added `Inspect Schema` to Feature Sandbox Replicate Model Lab so users can see whether a model supports a real reference image input.
- Added `Reference & Consistency` prompt tooling with scene prompt, style lock, character lock, and continuity lock to keep generated frames visually consistent when the model is text-only.
- Added quick actions to use detected file input keys as the optional uploaded reference key.
- Verification (FAST-VIDEO-049):
  - `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` pass (2 files / 7 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-083 - Lower VIP original volume default to 0.1

- Bumped app version from `0.11.22` to `0.11.23` as a patch release for Workspace VIP audio default tuning.
- Changed shared VIP processing `Original volume` default from `0.2` to `0.1`.
- Updated Workspace VIP template defaults, sample seed configs, runtime form fallback, resume key fallback, and inspector placeholder to use `0.1`.
- Preserved explicit caller-provided original volume values, including existing tests that intentionally pass `0.2`.
- Verification (FAST-WORKSPACE-083):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 74 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-048 - Add complete Z Image Turbo Replicate preset

- Bumped app version from `0.11.21` to `0.11.22` as a patch release for the Feature Sandbox Replicate preset update.
- Updated the default `prunaai/z-image-turbo` input JSON with `width`, `height`, `go_fast`, `output_format`, `guidance_scale`, `output_quality`, and `num_inference_steps`.
- Added a `Z Image Turbo` reset button in Replicate Model Lab so the complete preset can be restored after editing.
- Verification (FAST-VIDEO-048):
  - `npm run test -- --run src/features/audio/piper-tts-sandbox-panel.test.ts` pass (1 file / 2 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-047 - Add Replicate generic runner to Feature Sandbox

- Bumped app version from `0.11.20` to `0.11.21` as a patch release for the Feature Sandbox Replicate runner.
- Added `POST /api/replicate/predictions` for sandbox Replicate predictions with server env token fallback (`REPLICATE_API_TOKEN`) or temporary pasted token.
- Added auto owner/model latest-version resolution via Replicate model lookup, plus explicit version, official model endpoint, and deployment endpoint modes.
- Added arbitrary JSON input support and optional local file injection into any Replicate input key as a data URL for small image/audio/video tests.
- Expanded Feature Sandbox with `Replicate Model Lab`, defaulting to `prunaai/z-image-turbo`, output URL/media previews, raw prediction JSON, logs/status visibility, and copy output action.
- Verification (FAST-VIDEO-047):
  - `npm run test -- --run src/app/api/replicate/predictions/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts` pass (3 files / 12 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-046 - Tune Video Tools and Workspace defaults

- Bumped app version from `0.11.19` to `0.11.20` as a patch release covering AI Image Studio video rendering and workflow default tuning.
- Changed Video Tools Lab partial blur default strength from `50` to `35`.
- Changed Workspace Gemini thumbnail default model to `models/gemini-3.1-flash-lite` across template defaults, seed config, setup validation, inspector fallback, and thumbnail API fallback.
- Kept the Workspace thumbnail provider default on Google AI Studio env mode and renamed the inspector option to `Google AI Studio (env)`.
- Fixed Google Gemini thumbnail route model URL construction so model names already prefixed with `models/` do not become `models/models/...`.
- Verification (FAST-VIDEO-046):
  - `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/render-video/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts` pass (5 files / 72 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-045 - Render AI Image Studio storyboard video

- Added `POST /api/ai-image/render-video` to accept storyboard scenes plus per-scene uploaded images and return a rendered MP4.
- Generated Piper TTS audio from each scene voiceover using the scene time ranges as the speech timeline.
- Built a 9:16 slideshow video from uploaded scene images with ffmpeg, concatenated the scene clips, burned SRT subtitles, and muxed voice audio.
- Added AI Image Studio video assembly controls with render gating, progress/error state, MP4 preview, output metrics, and direct download.
- Added focused route coverage for successful render input and missing scene-image validation.
- Verification (FAST-VIDEO-045):
  - `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/render-video/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts` pass (5 files / 72 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-044 - Rework AI Image Studio into storyboard planner

- Bumped app version from `0.11.18` to `0.11.19` as a patch release for the AI Image Studio workflow change.
- Replaced direct image generation controls with a storyboard-first planner for video ideas, categories, provider/model selection, retry/improve prompts, and AI-generated scene tables.
- Added `POST /api/ai-image/storyboard` to generate structured Vietnamese storyboard JSON with time range, visual prompt, and voiceover fields through configured AI Providers or env Google AI Studio.
- Added per-scene copy controls for visual prompt, voiceover, and full scene text so scenes can be pasted into external image tools.
- Added per-scene image upload slots and a reference image bank for manually created style/reference images.
- Left video assembly, TTS, speech, and subtitles as the next phase while exposing their progress placeholders in the page.
- Verification (FAST-VIDEO-044):
  - `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/storyboard/route.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (3 files / 13 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-043 - Let AI Image Studio generate with configured AI Providers

- Bumped app version from `0.11.17` to `0.11.18` as a patch release for AI Image Studio provider selection.
- Added `Configured AI Provider` mode to AI Image Studio so users can select existing AI Providers such as ChiaseGPU instead of relying only on Hugging Face.
- Added provider/model loading from `/api/ai-providers` and `/api/ai-providers/[providerId]/models`, with model manual override preserved.
- Extended `POST /api/ai-image/huggingface-generate` with provider-backed OpenAI-compatible `/images/generations` support using the server-side stored API key.
- Supported provider image responses returned as `b64_json` or image URLs.
- Added regression coverage for provider-backed image generation and UI provider controls.
- Verification (FAST-VIDEO-043):
  - `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (2 files / 9 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-042 - Harden AI Image Studio Hugging Face network errors

- Bumped app version from `0.11.16` to `0.11.17` as a patch release for AI Image Studio Hugging Face connectivity.
- Switched AI Image Studio Hugging Face generation to prefer the current Inference Providers router endpoint before falling back to the legacy `api-inference` endpoint.
- Fixed model path encoding so Hugging Face model ids like `stabilityai/stable-diffusion-xl-base-1.0` are sent as path segments instead of a single `%2F`-encoded segment.
- Added explicit provider network error mapping for DNS/TLS/timeout failures instead of returning a generic HTTP 500.
- Added regression coverage for router endpoint use, legacy fallback, provider JSON errors, and network failures.
- Verification (FAST-VIDEO-042):
  - `npm run test -- --run src/app/api/ai-image/huggingface-generate/route.test.ts` pass (1 file / 5 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-041 - Add AI Image Studio page for Hugging Face generation

- Bumped app version from `0.11.15` to `0.11.16` as a patch release for the AI image-first video creation experiment.
- Added `AI Image Studio` under Video Pipeline with an Audio Transcript-style bordered tool UI for prompt, model, token, frame size, steps, guidance, seed, preview, prompt copy, and image download.
- Added `POST /api/ai-image/huggingface-generate` to call Hugging Face Inference image models, return binary image responses as data URLs, and map provider JSON errors such as model loading into clear API errors.
- Registered `/ai-image-studio` routing and navigation entries.
- Added focused navigation, panel structure, and Hugging Face API route tests.
- Verification (FAST-VIDEO-041):
  - `npm run test -- --run src/components/layout/navigation.test.ts src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (3 files / 13 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-088 - Add VIP Gemini thumbnail generation seed

- Bumped app version from `0.11.14` to `0.11.15` as a patch release for the Workspace VIP thumbnail experiment.
- Added a `Generate VIP Thumbnail` Workspace node that requires a manual thumbnail title, supports Gemini/Google AI Studio image generation, optional local/reference thumbnail input, and saves output into Thumbnail Assets.
- Added the `Seed Remote VIP + Gemini Thumbnail` seed so Upload Video -> EC2 voice/render can continue into a manual-title thumbnail generation step before local save.
- Added setup validation so the flow stops before running when the thumbnail title or thumbnail storage account is missing.
- Added focused graph, seed, setup validation, and API route coverage for the new thumbnail path.
- Verification (FAST-WORKSPACE-088):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-flow-setup.test.ts src/lib/workspace/workspace-seeds.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (5 files / 96 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-086 - Quiet VIP checkpoint polling and parse fenced think JSON

- Bumped app version from `0.11.13` to `0.11.14` as a patch release for Workspace VIP translation and progress polling.
- Added `POST /api/audio/video-vip-processing/checkpoint` so Workspace live progress polling sends the VIP resume key in the request body instead of a very long query string.
- Updated Workspace VIP polling to use the short checkpoint endpoint, avoiding repeated terminal/browser access logs that expose the full long `key=` URL.
- Kept the existing `GET /api/audio/video-vip-processing?key=...` checkpoint endpoint for compatibility.
- Extended translation JSON parsing to accept valid fenced JSON blocks that appear after provider reasoning tags such as `<think></think>`.
- Added regression tests for checkpoint POST polling and fenced think JSON parsing.
- Verification (FAST-WORKSPACE-086):
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-processing/checkpoint/route.test.ts` pass (3 files / 37 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-085 - Fix VIP parallel render subtitle speechEnd chunk drift

- Bumped app version from `0.11.12` to `0.11.13` as a patch release for VIP EC2 parallel render correctness.
- Fixed parallel render chunk subtitle shifting so `speechEnd` is converted from full-video timestamps into chunk-local timestamps.
- Preserved speech-tail subtitles that cross a chunk boundary by clipping them to the active chunk instead of dropping or overextending them.
- Prevented generated chunk ASS files from inheriting absolute `speechEnd` values such as `0:00:42.00`, which caused old subtitles to remain on screen and stack over later subtitles.
- Added regression coverage for chunk-local `speechEnd` shifting and ASS output.
- Verification (FAST-WORKSPACE-085):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts` pass (2 files / 46 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-084 - Harden Vercel remote VIP worker status proxy

- Bumped app version from `0.11.11` to `0.11.12` as a patch release for deployed remote VIP worker status checks.
- Increased `/api/audio/remote-vip-worker` proxy timeout from a hard-coded `3000ms` to a Vercel-safer `8000ms` default.
- Added `OMNIVIDEO_REMOTE_WORKER_PROXY_TIMEOUT_MS` override with min/max clamping for deployments that need a different EC2 status timeout.
- Returned safe unavailable diagnostics with `detail` and `timeoutMs` so Vercel-to-EC2 timeout/connect failures are visible instead of being collapsed into a generic unavailable message.
- Surfaced those diagnostics in the Server modal and Workspace remote worker error messages.
- Preserved browser-provided worker token forwarding through `X-OmniVideo-Remote-Vip-Token`.
- Verification (FAST-WORKSPACE-084):
  - `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 33 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-040 - Add Vietnamese Video Metadata generation to Video Narrator

- Bumped app version from `0.11.10` to `0.11.11` as a patch release for Video Narrator.
- Integrated the Vietnamese Video Metadata generator in Video Narrator below the Render Settings section.
- Fetches Vietnamese title, description, and hashtags based on narration segments from `/api/audio/video-metadata`.
- Fixed a bug where narration segment texts were passed directly to `/api/audio/video-metadata` (where `translatedText` is expected but segments had only `text` property), leading to empty input data and hallucinated animation titles/descriptions. Narration segments are now mapped correctly.
- Automatically appends, deduplicates, and formats fixed tags (`xuhuong`, `short`).
- Exposes selector dropdowns for AI Provider and AI Model in the Video Metadata section, with dynamic model listing via `/api/ai-providers/${providerId}/models` and session storage persistence.
- Adds metadata editor fields (Title, Description, Hashtags) in a collapsible UI section and persists draft values in localStorage.
- Supports saving generated metadata directly to the selected storage asset.
- Created regression unit tests in `src/features/video-narrator/video-narrator-panel.test.ts`.
- Verification (FAST-VIDEO-040):
  - `npm run test` pass (121 files / 659 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-039 - Add missing Piper Voice settings to Video Narrator

- Bumped app version from `0.11.9` to `0.11.10` as a patch release for Video Narrator.
- Added 5 missing Piper Voice settings to the Video Narrator UI to match the level of control on the Audio Transcript page:
  - Config JSON path (input text)
  - Noise scale (input number, step 0.01)
  - Noise W (input number, step 0.01)
  - Sentence silence (input number, step 0.05)
  - Balanced timing (checkbox)
- Added localStorage load and save persistence for all 9 Piper settings inside the Video Narrator panel.
- Disabled input controls when script generation or rendering is in progress.
- Verification (FAST-VIDEO-039):
  - `npm run test` pass (120 files / 651 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-038 - Fix Video Narrator 3-word active-only highlight render

- Bumped app version from `0.11.8` to `0.11.9` as a patch release for Video Narrator active word coloring.
- Replaced `3-word active highlight` ASS karaoke `\k` rendering with per-word timed dialogue events.
- Applied the selected text color only to the currently active word using explicit ASS color override tags.
- Kept previous and upcoming words warm white within each 3-word window.
- Updated the regression test to reject `\k` output for this mode and assert active-only color override text.
- Verification (FAST-VIDEO-038):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-037 - Fix Video Narrator 3-word preview and active highlight color

- Bumped app version from `0.11.7` to `0.11.8` as a patch release for Video Narrator subtitle preview/render parity.
- Made Source Preview follow the current video time and selected subtitle mode instead of showing a static full-sentence sample.
- Updated `3-word active highlight` preview to show only the active 3-word window, with non-active words in warm white and the active word using the selected text color.
- Updated 3-word ASS render colors so warm white is the default subtitle color and the selected text color is used as the karaoke active color.
- Replaced the confusing Bottom/Left/Right primary subtitle controls with `Vertical %` and `Horizontal position` controls.
- Verification (FAST-VIDEO-037):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-036 - Keep Video Narrator subtitle render output consistent with preview

- Bumped app version from `0.11.6` to `0.11.7` as a patch release for Video Narrator render consistency.
- Made Render Output full-bleed like Source Preview, removing padding around the rendered video.
- Forced `3-word active highlight` Video Narrator renders through the local render path even if EC2 Spot Worker is selected, avoiding stale remote workers that render default full-line subtitles.
- Updated the 3-word subtitle mode to emit grouped ASS karaoke timing for each 3-word window so the active word highlights within the visible group.
- Added a regression assertion that remote requests with `3-word active highlight` do not call the remote worker path.
- Verification (FAST-VIDEO-036):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.
  - `git diff --check` pass.

## FAST-VIDEO-035 - Refine Video Narrator subtitle controls and timeline segments

- Bumped app version from `0.11.5` to `0.11.6` as a patch release for Video Narrator subtitle preview placement.
- Moved the subtitle sample out of the Subtitle controls box and into Source Preview as a live overlay that uses the selected font, text color, background, alignment, and vertical offset.
- Kept the Subtitle controls focused on actual settings instead of showing a fake preview inside the settings card.
- Verification (FAST-VIDEO-035):
  - `npm run test -- --run src/app/api/audio/video-narrator/route.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-VIDEO-034 - Match Video Narrator workbench to tool page pattern

- Bumped app version from `0.11.3` to `0.11.4` as a patch release for Video Narrator UI alignment.
- Reworked Video Narrator Source Video selection to match Audio Transcript and Video Tools Lab with styled file input, Browse/Close asset picker, asset search, metadata rows, lifecycle badges, and inline Preview/Hide.
- Normalized Video Narrator sidebar panels, headings, input classes, action buttons, render controls, preview cards, and narration timeline rows to the same workbench visual system as the reference tool pages.
- Verification (FAST-VIDEO-034):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-VIDEO-033 - Polish Video Narrator subtitle controls and add three-word highlight mode

- Bumped app version from `0.11.2` to `0.11.3` as a patch release for Video Narrator subtitle controls.
- Polished `VideoNarratorPanel` into the same bordered tool-shell and sidebar/workbench layout used by Audio Transcript and Video Tools Lab.
- Added Video Narrator subtitle controls for mode, font family, font size, text color, bottom/left/right margins, alignment, background color, background opacity, and background padding.
- Passed all Video Narrator subtitle styling fields through `/api/audio/video-narrator` into render `subtitleStyle`.
- Added `triple-word-highlight` subtitle mode: each active subtitle window shows up to 3 words and highlights the current timed word in yellow.
- Added tests for the new ASS subtitle mode and backend subtitle style mapping.
- Verification (FAST-VIDEO-033):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-VIDEO-032 - Add subtitle display modes (Standard, Word Reveal, Karaoke) to Video Narrator

- Bumped app version from `0.11.0` to `0.11.2` as a patch release for the new subtitle display modes feature and timing sync improvements.
- Updated `/api/audio/video-narrator` route to read `subtitleMode` from incoming form data and pass it inside the `subtitleStyle` parameter of `VideoVipVoiceRenderInput`.
- Integrated `subtitleMode` select dropdown under "Dựng & Trộn âm thanh" section in the frontend `VideoNarratorPanel` component, and persisted the selection inside local storage session state.
- Implemented character-length and punctuation-weighted word duration distribution in `buildSubtitleAssContent` to prevent voice-first desync in "word-reveal" and "karaoke" modes.
- Fixed timing alignment desync in `buildSpeechTimedSubtitleSegments` by removing the artificial start-time delay from overlapping segments, keeping subtitle starts aligned exactly with voice segment starts.
- Extended subtitle segments to handle voice spillover gracefully by capping segment duration at `Math.max(segment.end, speechEnd)`.
- Added/updated unit tests in `src/lib/video-processing/video-edit-pipeline.test.ts` and `src/lib/multilingual-audio/video-vip-processing.test.ts` verifying proportional weighted durations and overlap alignments.
- Verification (FAST-VIDEO-032):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts` pass (1 file / 25 tests).
  - `npm run test` pass (120 files / 649 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## P2-VIDEO-003 - Implement AI Video Narrator Pipeline

- Bumped app version from `0.10.118` to `0.11.0` as a minor release for the new AI Video Narrator feature under the Video Pipeline.
- Registered new navigation item `videoNarrator` in `src/components/layout/navigation.ts`, updated layout routing maps in `src/components/layout/content-router.tsx`, and updated `AppSectionId` in `src/components/layout/types.ts`.
- Implemented Google AI Studio Gemini Video client helper in `src/lib/multilingual-audio/video-narrator.ts` supporting resumable uploads via the Google File API, processing state polling, and structured JSON-mode Vietnamese timed script generation.
- Implemented backend API router at `src/app/api/audio/video-narrator/route.ts` providing script generation endpoints and media voice synthesis/FFmpeg rendering (supporting local and EC2 worker executions with faked transcript timestamps).
- Created modern frontend workspace panel `VideoNarratorPanel` in `src/features/video-narrator/video-narrator-panel.tsx` with local file uploads, Storage library selection, narration script generator prompt settings, timed narration segment tables with inline playback previews and manual edits, volume mixers, and rendering options.
- Added `video-narrator` into the `DemoFeature` rate-limiting access control union type in `src/lib/access-control/access-control.ts`.
- Fixed Google AI Studio File API resumable upload URL path in `video-narrator.ts` to include the `/upload/` prefix (calling `/upload/v1beta/files`), and updated upload URL checks to support the standard `x-goog-upload-url` header.
- Implemented backend routing in `/api/ai-providers/[providerId]/models/route.ts` to support the `"env-gemini"` provider ID, enabling model listing requests to fetch directly from Google AI Studio Models API using the environment key.
- Updated `VideoNarratorPanel` to set default selection to `"env-gemini"` and call provider models listing endpoints to correctly load the supported model list when utilizing environment API keys.
- Fixed output video player and download link in `VideoNarratorPanel` to correctly resolve local `/api/workspace/artifacts/[artifactId]/download` path when generated video output size exceeds the 8MB base64 inline limit.
- Verification (P2-VIDEO-003):
  - `npx vitest run src/lib/multilingual-audio/video-narrator.test.ts` pass (1 file / 6 tests).
  - `npx vitest run src/app/api/audio/video-narrator/route.test.ts` pass (1 file / 2 tests).
  - `npm run test` pass (120 files / 645 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-083 - VIP Checkpoint Parameter Dependencies, Sentence Split Optimization, and Clear Checkpoints Button

- Bumped app version from `0.10.117` to `0.10.118` as a patch release for VIP workflow resume reliability and split alignment quality.
- Updated `vipResumeKey` generation in `src/features/workspace/workspace-canvas-panel.tsx` to depend on node configuration parameters: `speedFactor`, `translationMode`, `language`, `targetLanguage`, `model`, `originalAudioVolume`, `voiceVolume`, and `mirrorEnabled`. This voids old checkpoints immediately when parameters change, preventing GET API from reading stale logs and steps.
- Optimized `splitOverlongSegmentByWords` in `src/lib/multilingual-audio/chinese-transcription.ts` to use a scoring-based boundary split model (prioritizing hard/soft punctuation marks and pauses), avoiding sentence cutting mid-phrase.
- Implemented `DELETE` handler in `/api/audio/video-vip-processing/route.ts` to clear a specific checkpoint folder or clear all checkpoints under `/tmp/omnivideo-vip-stage-checkpoints/`.
- Added "Clear checkpoints" button next to "Clear finished" in the Background Progress modal in `src/components/layout/topbar.tsx` and connected it to the DELETE API with deletion confirmation/success alerts.
- Verification (FAST-WORKSPACE-083):
  - `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts` pass (1 file / 9 tests).
  - `npx vitest run src/app/api/audio/video-vip-processing/route.test.ts` pass (1 file / 17 tests).
  - `npm run test` pass (118 files / 637 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-070 - Programmatic word-level segment splitting fallback for overlong Chinese transcription segments

- Bumped app version from `0.10.116` to `0.10.117` as a patch release for Chinese transcription segment-splitting reliability.
- Implemented `splitOverlongSegmentByWords` to programmatically partition overlong segments into sub-segments of <= 40 Han characters.
- Configured programmatic word-level fallback inside `retryOverlongChineseSegments` in `src/lib/multilingual-audio/chinese-transcription.ts` under `best-effort` mode.
- Handled word timestamps for precise splitting when available, and fell back to proportional text/duration split when word timestamps are empty.
- Verification (FAST-AUDIO-070):
  - `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts` pass (1 file / 8 tests).
  - `npm run test` pass (118 files / 634 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-069 - Implement HTTP 429 rate limit retries with backoff for Groq Whisper transcription

- Bumped app version from `0.10.115` to `0.10.116` as a patch release for Groq Whisper transcription reliability.
- Implemented automatic retry loop in `transcribeWithGroq` in `src/lib/multilingual-audio/groq-transcription.ts` to handle HTTP 429 rate limit errors.
- Parsed the retry delay time dynamically from the API error message and slept for the requested duration plus a 500ms safety buffer.
- Added test coverage in `groq-transcription.test.ts` to mock rate limit responses and verify the retry behavior.
- Verification (FAST-AUDIO-069):
  - `npm run test -- src/lib/multilingual-audio/groq-transcription.test.ts` pass (1 file / 7 tests).
  - `npm run test -- src/lib/multilingual-audio/chinese-transcription.test.ts` pass (1 file / 7 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-082 - Intermediate step-aware progress details for Workspace VIP flow

- Bumped app version from `0.10.114` to `0.10.115` as a patch release for intermediate VIP background progress tracking.
- Added a `GET` handler in `/api/audio/video-vip-processing` to fetch checkpoint state by hashing the provided key with SHA-256 and reading from `/tmp/omnivideo-vip-stage-checkpoints/<hash>/checkpoint.json`.
- Implemented client-side polling in `workspace-canvas-panel.tsx` during VIP execution. Every 2 seconds, it queries the new GET endpoint and updates the background progress step with intermediate segments and status logs.
- Verification (FAST-WORKSPACE-082):
  - `npx vitest run src/app/api/audio/video-vip-processing` pass (1 file / 15 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-031 - Support Large Video Files in Video Splitter

- Bumped app version from `0.10.112` to `0.10.113` as a patch release for Video Splitter scalability.
- Refactored Video Splitter API `/api/video-processing/split` to parse incoming multipart body as a stream using a custom sliding-window parser, writing chunk bytes directly to disk.
- Prevented "Failed to parse body as FormData" error and V8 heap limits on video file uploads larger than 2GB.
- Verification (FAST-VIDEO-031):
  - `npm run test -- --run src/lib/video-processing/multipart-parser.test.ts` pass (1 file / 1 test).
  - `npm run test -- --run src/lib/video-processing/video-split.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-068 - Lower Minimum Voice Speed Floor to 1.25x

- Bumped app version from `0.10.111` to `0.10.112` as a patch release for voice speed timing floor.
- Lowered the shared Piper timeline minimum speed floor from `1.30x` to `1.25x` (`timelineMinSpeedFactor`).
- Lowered the Audio Transcript `Voice speed` UI display floor from `1.30x` to `1.25x`.
- Workspace audio nodes automatically inherit the same `1.25x` runtime floor because they use the shared Piper alignment settings.
- Verification (FAST-AUDIO-068):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts` pass (1 file / 26 tests).
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts` pass (1 file / 8 tests).
  - `npm run guard:version` pass.

## FAST-UX-028 - Add Command-click Open Behavior to Inspiration Vault

- Bumped app version from `0.10.110` to `0.10.111` as a patch release for Inspiration Vault content interaction.
- Kept plain content clicks copying the saved value.
- Added Command+Click and Ctrl+Click support for opening URL content in a new tab.
- Verification (FAST-UX-028):
  - `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-081 - Update VIP Default Speed and Original Volume

- Bumped app version from `0.10.109` to `0.10.110` as a patch release for VIP processing defaults.
- Changed VIP Processing default `Speed factor` from `0.8` to `0.75`.
- Changed VIP Processing default `Original volume` from `0` to `0.2`.
- Updated Workspace VIP node template defaults, VIP seed graph configs, Workspace runtime fallbacks/placeholders, and VIP processing runtime fallbacks to stay aligned.
- Verification (FAST-WORKSPACE-081):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (4 files / 108 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-080 - Parallelize EC2 VIP Final Render Chunks

- Bumped app version from `0.10.108` to `0.10.109` as a patch release for EC2 VIP final render throughput.
- Added optional VIP final render chunking controlled by `OMNIVIDEO_VIP_RENDER_CHUNKS`; each chunk keeps the same `veryfast`/CRF/filter behavior and is concatenated by stream copy.
- Configured `omnivideo-vip-spot.sh` to set `OMNIVIDEO_VIP_RENDER_CHUNKS=4` for `c8g.xlarge`, so EC2 workers can use multiple ffmpeg processes instead of bottlenecking in one mostly single-core filtergraph.
- Added per-chunk video/audio input seek, timeline-shifted blur/cover enables, shifted subtitle ASS files, shifted text overlay ASS files, and per-chunk thread allocation.
- Preserved single-render fallback when chunking is disabled, media is too short, or `OMNIVIDEO_VIP_RENDER_CHUNKS=1`.
- Verification (FAST-WORKSPACE-080):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts` pass (4 files / 48 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.

## FAST-WORKSPACE-079 - Skip Muted Source Audio in VIP Final Render

- Bumped app version from `0.10.107` to `0.10.108` as a patch release for VIP final render performance.
- Optimized final VIP ffmpeg args so runs with `originalAudioVolume=0` no longer decode source audio, apply source `atempo`, or run `amix`.
- Preserved the existing source-audio speed/volume/mix path when original audio volume is above zero.
- Kept final render quality unchanged: `veryfast` remains the default render preset.
- Verification (FAST-WORKSPACE-079):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts` pass (4 files / 46 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-078 - Keep Segments From Expanding Progress Row Height

- Bumped app version from `0.10.106` to `0.10.107` as a patch release for Background Progress segment panel sizing.
- Removed the JavaScript height-measurement approach for matching Segments height.
- Wrapped the right column in a relative grid item and rendered Segments as an absolute panel on wide layouts.
- Kept the segment list internally scrollable so the left Flow steps/Dubbing details column defines the row height.
- Verification (FAST-WORKSPACE-078):
  - `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-077 - Match Segments Height to Left Progress Column

- Bumped app version from `0.10.105` to `0.10.106` as a patch release for Background Progress column alignment.
- Changed the rich progress grid to stretch columns to the same row height.
- Made the Segments panel fill that row height on wide layouts instead of using a viewport-relative cap.
- Kept the segment list internally scrollable.
- Verification (FAST-WORKSPACE-077):
  - `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-076 - Let Progress Segments Use Modal Height

- Bumped app version from `0.10.104` to `0.10.105` as a patch release for Background Progress segment panel height.
- Removed the old fixed desktop `28rem` segment list cap.
- Made the Segments panel a flex column with modal-relative max height on wide screens.
- Kept the segment list internally scrollable while allowing it to use more available modal height.
- Verification (FAST-WORKSPACE-076):
  - `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-075 - Rebalance Progress Details and Segments Layout

- Bumped app version from `0.10.103` to `0.10.104` as a patch release for Background Progress layout.
- Moved Dubbing details below Flow steps in the left column.
- Moved Segments into the right progress column by itself.
- Removed the forced full-width span from the `Stages` metadata card so it can fill the next available grid cell.
- Verification (FAST-WORKSPACE-075):
  - `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-074 - Compact Progress Segments and Restore Stages Label

- Bumped app version from `0.10.102` to `0.10.103` as a patch release for Background Progress readability.
- Compacted VIP progress segment rows by moving raw/target duration into the header line and reducing row padding.
- Kept source text available while rendering translated/source text in a two-column compact layout on wider screens.
- Restored the stage summary presentation by rendering `Measured stages` as `Stages`.
- Normalized the stage wording back to `render (speed+mix+mirror+blur+sub)` in Dubbing details.
- Verification (FAST-WORKSPACE-074):
  - `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-073 - Use Server Modal Remote VIP Config for Workspace Runs

- Bumped app version from `0.10.101` to `0.10.102` as a patch release for remote VIP worker configuration.
- Moved browser-stored remote VIP worker URL/token into a shared helper used by both the topbar Server modal and Workspace.
- Updated Workspace VIP runs to use the Server modal URL/token when the VIP node does not specify its own remote worker URL.
- Preserved node-level remote worker URL override behavior.
- Updated Workspace Check/Kill worker controls to include the Server modal token and fallback URL.
- Added progress detail text showing whether the remote endpoint came from the node, Server modal, or server env fallback.
- Verification (FAST-WORKSPACE-073):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (2 files / 28 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-072 - Clarify Remote VIP Worker Network Failures

- Bumped app version from `0.10.100` to `0.10.101` as a patch release for remote VIP worker diagnostics.
- Wrapped remote VIP worker network failures with endpoint and request phase context for start request, job poll, and artifact download.
- Preserved existing worker HTTP/JSON error behavior while mapping connection-level failures to `SYS_DUBBING_MUX_FAILED` with HTTP 502.
- Added regression coverage for start, poll, and artifact-download `fetch failed` paths.
- Verification (FAST-WORKSPACE-072):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts` pass (1 file / 8 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-071 - Restore Original Workspace Canvas UI

- Bumped app version from `0.10.99` to `0.10.100` as a patch release for reverting the Workspace canvas UI changes.
- Restored Workspace canvas dimensions to the original `2400x1400`.
- Restored the default canvas view to `{ x: 0, y: 0, scale: 0.6 }`.
- Restored the empty draft panel to its original top-left placement.
- Restored manual Add Node and seed application to the original coordinate behavior, removing the recent centered graph translation and viewport-fit helpers.
- Verification (FAST-WORKSPACE-071):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 25 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-070 - Center Workspace Node Creation Coordinates

- Bumped app version from `0.10.98` to `0.10.99` as a patch release for Workspace canvas node placement.
- Added graph translation for Workspace seeds so seeded node coordinates are centered in the expanded canvas instead of remaining near the old top-left origin.
- Changed manual catalog node creation to place new nodes around the currently visible canvas center with small collision offsets.
- Removed the first-node auto-fit behavior from manual Add Node so the viewport does not unexpectedly jump after adding a node.
- Verification (FAST-WORKSPACE-070):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 26 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.

## FAST-WORKSPACE-069 - Fit Canvas View After Seed Creation

- Bumped app version from `0.10.97` to `0.10.98` as a patch release for Workspace seed visibility.
- Added a node-bounds based canvas view fit helper that adjusts viewport transform without changing graph node coordinates.
- Applied the fit helper after seed graph creation so seeded flows are visible immediately.
- Applied the fit helper when adding the first catalog node so it appears in the current viewport.
- Verification (FAST-WORKSPACE-069):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 25 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-068 - Move Progress Segments Left and Show Voice Speed

- Bumped app version from `0.10.96` to `0.10.97` as a patch release for Workspace progress readability.
- Moved progress `Segments` out of the right-side Dubbing details panel and into the left column below Flow steps.
- Removed the old Show all/Hide segment behavior; segments are now always available in a scrollable panel.
- Added a source-text toggle for progress segments.
- Used existing VIP `voice.alignment.timeline` data, when present, to show per-segment voice speed, raw/target duration, and warning codes without extra fetches or payload requests.
- Highlighted high-speed or warning voice segments in the progress segment list.
- Verification (FAST-WORKSPACE-068):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (2 files / 27 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-067 - Clarify VIP Stage Timing and Compact Hashtags

- Bumped app version from `0.10.95` to `0.10.96` as a patch release for VIP progress clarity and metadata quality.
- Updated VIP Workspace progress details to show explicit `Voice render time`, `Final video render time`, and `Measured stages total` labels.
- Removed the old VIP stage-log timestamp lines that could be split awkwardly by the progress detail parser.
- Normalized generated Vietnamese metadata hashtags into compact no-space tokens, including inferred preferred tags such as `reviewfull` and `hoạthìnhtrungquốc`.
- Verification (FAST-WORKSPACE-067):
  - `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 29 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-066 - Configure Remote VIP Worker from Server Modal

- Bumped app version from `0.10.94` to `0.10.95` as a patch release for Vercel remote worker operations.
- Added remote worker URL and token fields to the topbar Server modal, persisted in browser localStorage for the current operator.
- Updated Server status refresh and kill requests to use the modal-configured worker URL/token while preserving server environment variable fallback.
- Added proxy support for a caller-provided `X-OmniVideo-Remote-Vip-Token` header so Vercel deployments can call EC2 workers without storing the token in Vercel env.
- Added focused regression coverage for browser-provided worker tokens and Server modal config markers.
- Verification (FAST-WORKSPACE-066):
  - `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 7 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-065 - Center Workspace Empty State and Suppress Tar Xattrs

- Bumped app version from `0.10.93` to `0.10.94` as a patch release for Workspace first-load and EC2 launcher polish.
- Moved the `Workspace draft is empty` panel to the center of the expanded canvas plane instead of anchoring it near the top-left origin.
- Updated the default Workspace canvas view so the centered empty-state panel is visible when entering an empty Workspace.
- Added `COPYFILE_DISABLE=1` to EC2 worker archive creation so macOS extended attributes are not packed into the tarball, avoiding `LIBARCHIVE.xattr.com.apple.provenance` warnings during remote extract.
- Verification (FAST-WORKSPACE-065):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 24 tests).
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-064 - Expand Workspace Canvas Start Area

- Bumped app version from `0.10.92` to `0.10.93` as a patch release for Workspace canvas usability.
- Increased the Workspace canvas plane from `2400x1400` to `6400x3600` so drag/drop flows have substantially more room.
- Changed the initial canvas viewport from the top-left origin to a centered starting offset with a slightly larger default scale.
- Verification (FAST-WORKSPACE-064):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 23 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-063 - Stop Remote Server Status Timeout Spam

- Bumped app version from `0.10.91` to `0.10.92` as a patch release for remote Server status reliability.
- Added controlled timeout/catch handling to the remote VIP worker proxy so unreachable EC2 workers return concise JSON instead of repeated `fetch failed` stack traces.
- Paused Server modal auto-refresh after a failed worker check and changed the action to `Retry` until a successful manual refresh resumes polling.
- Added regression coverage for unreachable worker proxy behavior and Server modal auto-refresh pause markers.
- Verification (FAST-WORKSPACE-063):
  - `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 6 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-062 - Default VIP Piper Model URLs and Enrich Server Status

- Bumped app version from `0.10.90` to `0.10.91` as a patch release for remote VIP worker operations.
- Added default Google Drive Piper model/config URLs to `omnivideo-vip-spot.sh`, while preserving `PIPER_MODEL_URL` and `PIPER_MODEL_CONFIG_URL` env overrides.
- Extended remote VIP worker status with optional EC2 metadata from IMDS, including instance id/type, region/AZ, and public/private IPs.
- Added a bounded non-interactive `top` snapshot to remote VIP worker status so the topbar Server modal can show current CPU/process load.
- Updated the topbar Server modal to display EC2 instance details and top output when available.
- Verification (FAST-WORKSPACE-062):
  - `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 13 tests).
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-061 - Maximize EC2 VIP Render CPU Utilization

- Bumped app version from `0.10.89` to `0.10.90` as a patch release for EC2 VIP render throughput and reliability.
- Kept final VIP ffmpeg render quality at `veryfast` while adding explicit full-CPU thread settings for filtergraph and libx264 encoder work, with env overrides for preset/thread count.
- Added a configurable final render timeout so stuck ffmpeg jobs fail with a controlled error instead of hanging indefinitely.
- Kept Workspace VIP render mode defaults/options on `veryfast`/`superfast` instead of introducing lower-quality `ultrafast`.
- Added `OMNIVIDEO_FFMPEG_PATH` support and configured the EC2 launcher to use `/usr/bin/ffmpeg`, avoiding accidental priority of `ffmpeg-static` on the worker.
- Extended remote worker process scanning so `/tmp/omnivideo-vip-*` final ffmpeg render processes are visible and killable even when EC2 uses system `ffmpeg`.
- Documented EC2 render tuning env vars and local rollback controls.
- Verification (FAST-WORKSPACE-061):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/audio-extraction.test.ts` pass (6 files / 117 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.

## FAST-WORKSPACE-060 - Add Remote VIP Worker Status and Kill Controls

- Bumped app version from `0.10.88` to `0.10.89` as a patch release for remote VIP operations.
- Added active Piper/ffmpeg child-process tracking to Piper voice generation so stuck EC2 subprocesses can be identified and terminated from the worker API.
- Added OS process-table scanning for untracked OmniVideo ffmpeg/Piper processes so old stuck EC2 subprocesses still appear in the `Server` modal and can be terminated.
- Extended `/api/audio/video-vip-voice-render` health/status output with active jobs and child processes, and added `DELETE` cancel support for active worker jobs/processes.
- Added local `/api/audio/remote-vip-worker` proxy so the Workspace UI can check or kill the configured EC2 worker without browser cross-origin calls or exposing the worker token.
- Added topbar `Server` modal for centralized remote worker status and kill controls, showing active job stage, metrics, PID, process kind, elapsed time, and command preview.
- Added Workspace VIP inspector controls for direct per-node worker check/kill access.
- Verification (FAST-WORKSPACE-060):
  - `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (5 files / 61 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-059 - Add Async Polling for Long Remote VIP Jobs

- Bumped app version from `0.10.87` to `0.10.88` as a patch release for long remote VIP worker reliability.
- Changed the remote VIP worker client to submit multipart worker requests with `async=1`, poll by `jobId`, and download the rendered artifact only after the worker reports `done`.
- Added in-memory async job support to `/api/audio/video-vip-voice-render` so long EC2 Piper/render work no longer depends on one long-lived POST response.
- Added remote job stage telemetry for `voice`, `render`, and `artifact` so local polling logs can show whether a long job is stuck in Piper generation or ffmpeg render.
- Preserved the existing synchronous worker response contract for compatibility with older or direct callers.
- Documented the async polling contract and remaining durability limitation that worker jobs/artifacts are still process-local.
- Verification (FAST-WORKSPACE-059):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (4 files / 36 tests).
  - `npm run build` pass.

## FAST-VIDEO-030 - Expand Video Tools Lab Previews

- Bumped app version from `0.10.86` to `0.10.87` as a patch release for Video Tools Lab layout polish.
- Changed Video Tools Lab `Original Preview` and `Edited Output` video frames to occupy the full available preview column width.
- Increased Video Tools Lab preview/output max height from `420px` to `720px` so the full-width frames are not visually constrained by the old height cap.
- Placed `Background padding Y` and `Độ rộng Subtitle mẫu (%)` controls on the same two-column row.
- Verification (FAST-VIDEO-030):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (1 file / 10 tests).
  - `npm run guard:version` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-058 - Prune Retired Workspace Seeds

- Bumped app version from `0.10.85` to `0.10.86` as a patch release for Workspace seed registry cleanup.
- Removed retired Workspace seed templates `Seed VI Voice Mask Publish` and `Seed Asset Preprocess Dubbing` from the visible seed registry.
- Removed the unused graph builders and old graph test coverage for those retired seed-only flows.
- Moved `Seed Asset Transcript Full Processing` to the first seed position.
- Renamed VIP seeds to `Seed Asset VIP Processing (storage)` and `Seed Asset VIP Processing (local)`.
- Verification (FAST-WORKSPACE-058):
  - `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts` pass (2 files / 57 tests).
  - `npm run guard:version` pass.
  - `git diff --check` pass.
  - Runtime source search for retired seed ids/builders only finds absence assertions in `workspace-seeds.test.ts`.

## FAST-VIDEO-029 - Default Video Tools Lab to Partial Blur and Keep Bangers Font

- Bumped app version from `0.10.84` to `0.10.85` as a patch release for Video Tools Lab defaults.
- Changed Video Tools Lab default edit mode to `Partial blur` enabled and `Cover subtitle box` disabled.
- Fixed default subtitle reset path so selecting a local video file without saved setup keeps `Bangers` instead of resetting to `Arial`.
- Increased Video Tools Lab default subtitle font size from `40` to `50`.
- Added compatibility fallback for legacy saved setups without blur/cover flags, defaulting them to the new partial-blur baseline.
- Verification (FAST-VIDEO-029):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (1 file / 9 tests).
  - `npm run build` pass.

## FAST-WORKSPACE-057 - Run VIP Piper Voice on EC2

- Bumped app version from `0.10.83` to `0.10.84` as a patch release for remote VIP voice execution.
- Added `voiceRenderExecutionMode=remote-voice-render` so VIP transcript, translation, and metadata stay local while Piper voice generation and final ffmpeg render run on the EC2 worker.
- Preserved `voiceRenderExecutionMode=remote` as the EC2 render-only fallback that sends `videoFile + voiceFile` multipart payloads and never calls Piper on the worker.
- Updated `/api/audio/video-vip-voice-render` to distinguish render-only vs voice+render requests while keeping the same endpoint, token contract, artifact response, and binary artifact download path.
- Updated `Seed Remote VIP Voice Render`, Workspace runtime copy/config, and `omnivideo-vip-spot.sh` so provided Google Drive `PIPER_MODEL_URL` / `PIPER_MODEL_CONFIG_URL` install the worker model files required for EC2 voice.
- Verification (FAST-WORKSPACE-057):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (7 files / 115 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.
  - `git diff --check` pass.
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.

## FAST-WORKSPACE-056 - Switch Remote VIP Seed to EC2 Render Only

- Bumped app version from `0.10.82` to `0.10.83` as a patch release for remote VIP stability.
- Changed remote VIP mode so Piper voice generation runs locally with the existing VIP voice/checkpoint path, while only final ffmpeg render is delegated to the EC2 worker.
- Updated the remote worker client to send both source video and generated voice WAV as multipart files, keeping large media out of JSON payloads.
- Updated `/api/audio/video-vip-voice-render` to behave as a render-only worker endpoint while preserving the existing endpoint path and token contract for simpler redeploy.
- Updated Workspace seed labels and progress copy to describe local voice plus remote render instead of EC2 voice/render.
- Verification (FAST-WORKSPACE-056):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (7 files / 111 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.
  - `git diff --check` pass.
  - `bash -n omnivideo-vip-spot.sh` and `zsh -n omnivideo-vip-spot.sh` pass.

## FAST-WORKSPACE-055 - Harden Remote VIP Media Transport for Long Videos

- Bumped app version from `0.10.81` to `0.10.82` as a patch release for remote VIP long-video reliability.
- Replaced remote VIP source video transport from base64 JSON with multipart `videoFile` upload, preventing large source videos from hitting JavaScript string limits before worker render.
- Changed the EC2 worker response to store rendered video as a temporary server artifact and return `artifactId`; the local VIP client now downloads that artifact as binary bytes instead of parsing rendered video base64 JSON.
- Preserved remote VIP token validation, local transcript/translation/metadata behavior, and the normal VIP result shape consumed by Workspace.
- Verification (FAST-WORKSPACE-055):
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (3 files / 17 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.
  - `git diff --check` pass.

## FAST-WORKSPACE-054 - Add Remote EC2 Voice/Render VIP Seed

- Bumped app version from `0.10.80` to `0.10.81` as a patch release for remote VIP worker support.
- Added `Seed Remote VIP Voice Render`, preserving existing VIP seeds while enabling a new `Upload Video -> VIP Processing -> Save to Local` flow that delegates only voice generation and final render to a remote worker.
- Added `/api/audio/video-vip-voice-render` for EC2 workers to run Piper voice generation plus final ffmpeg render with the same repo runtime logic.
- Added remote worker client support to VIP processing so transcript/translation/metadata stay local while voice/render can run remotely through `OMNIVIDEO_REMOTE_VIP_WORKER_URL` and `OMNIVIDEO_REMOTE_VIP_TOKEN`.
- Added `omnivideo-vip-spot.sh`, a one-file AWS launcher for a Hong Kong Spot `c8g.xlarge` worker that uploads the current repo, installs Node/Piper/ffmpeg/fonts, supports `PIPER_MODEL_URL` and `PIPER_MODEL_CONFIG_URL`, and starts the worker service.
- Fixed launcher token generation so `set -o pipefail` cannot exit silently before logging, and added Google Drive sharing-link downloads through `gdown` for Piper model/config files. The launcher passes the parsed Drive file id directly to `gdown` for compatibility with versions that do not support `--fuzzy`.
- Documented remote VIP worker behavior, Piper model requirements, and the current MVP limitation that video/result payloads are still inline instead of object-storage pointers.
- Verification (FAST-WORKSPACE-054):
  - `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (5 files / 96 tests).
  - `npm run build` pass.
  - `bash -n omnivideo-vip-spot.sh` pass.
  - `zsh -n omnivideo-vip-spot.sh` pass.

## FAST-AUDIO-067 - Optimize Transcript Translation Prompt Cost and Quality

- Bumped app version from `0.10.79` to `0.10.80` as a patch release for translation prompt efficiency.
- Increased transcript translation chunk target from 100 to 150 segments when char budget allows.
- Replaced repeated full-transcript context in every chunk prompt with a one-time compact translation guide for multi-chunk runs plus small nearby context windows.
- Switched preferred translation output contract to compact `{"t":{"id":"text"}}` JSON while keeping backward compatibility with existing `segments` and `translations` shapes.
- Added OpenAI-native `prompt_cache_key` support for chat requests and logs for prompt/completion/cached token usage when returned by the provider.
- Verification (FAST-AUDIO-067):
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts` pass (1 file / 18 tests).
  - `npm run test -- --run src/app/api/audio/transcript-translation/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts` pass (2 files / 19 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.
  - `git diff --check` pass.

## FAST-VIDEO-028 - Prefer Original Source Title for VIP Output Filename

- Bumped app version from `0.10.78` to `0.10.79` as a patch release for VIP naming consistency.
- Updated VIP API source resolution to pass `sourceTitle` (original title stem) into runtime processing for file/asset/artifact inputs.
- Updated VIP output naming to prioritize `sourceTitle` before technical `fileName`, while keeping `-done.mp4` suffix.
- This prevents intermediate names like `part-001` from dominating output names when original source title is available.
- Verification (FAST-VIDEO-028):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (2 files / 21 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-027 - Fix Thumbnail Download Filename and VIP Output Naming

- Bumped app version from `0.10.77` to `0.10.78` as a patch release for output naming correctness.
- Fixed storage download filename generation to infer extension from actual mime type instead of hardcoding `.mp4`.
- Thumbnail/image download now keeps image extensions (for example `.png`, `.jpg`) so `Download image` no longer returns MP4 filenames.
- Changed VIP output filename suffix from `-vip.mp4` to `-done.mp4`, preserving sanitized source base name.
- Verification (FAST-VIDEO-027):
  - `npm run test -- --run src/lib/storage/download-filename.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 13 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-026 - Add 3-Minute Head Clip Option in Video Splitter

- Bumped app version from `0.10.76` to `0.10.77` as a patch release for Video Splitter UX.
- Added `3 minutes` option in `Split Video -> Chỉ cắt đoạn đầu` duration selector.
- Kept existing `15 minutes` and `30 minutes` options unchanged.
- Verification (FAST-VIDEO-026):
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-025 - Disable Automatic Subtitle Line Wrapping

- Bumped app version from `0.10.75` to `0.10.76` as a patch release for subtitle stability.
- Disabled automatic subtitle line wrapping in ASS generation.
- Subtitle text now stays on one line by default, and only becomes multiline when the input segment already contains explicit newline characters.
- Kept uppercase transform and ASS multiline spacer behavior for explicit multiline input.
- Verification (FAST-VIDEO-025):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts` pass (1 file / 21 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-024 - Relax Subtitle Auto-Wrap Threshold to 80% Width

- Bumped app version from `0.10.74` to `0.10.75` as a patch release for subtitle wrapping behavior.
- Relaxed ASS subtitle auto-wrap width budgeting to target at least 80% of `PlayResX` width (when no explicit placement region is set), preventing premature line breaks when horizontal space is still available.
- Preserved placement-region-aware wrapping behavior so explicit subtitle region constraints still apply when configured.
- Added regression coverage to ensure subtitle text under the 80%-width threshold remains on one line.
- Verification (FAST-VIDEO-024):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts` pass (1 file / 21 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-023 - Update Subtitle Defaults and Force Uppercase Render

- Bumped app version from `0.10.73` to `0.10.74` as a patch release for subtitle defaults/style consistency.
- Updated subtitle default font size to `40` in Video Tools Lab, Workspace mask/VIP defaults, and edit/VIP API fallback paths.
- Updated subtitle background opacity default to `0` in Video Tools Lab, Workspace mask/VIP defaults, and edit/VIP API fallback paths.
- Forced subtitle overlay text to render in uppercase during ASS subtitle generation.
- Updated VIP subtitle timing to follow repaired voice segment timing, so subtitles appear with spoken audio instead of showing too early on leading silence.
- Added de-overlap normalization for subtitle segment times before VIP render, preventing consecutive subtitle rows from stacking on top of each other.
- Fixed VIP composite render to pass `fontsdir` into ASS subtitle/text-overlay filters, so Workspace output uses the selected custom font (for example `Lobster`) instead of default fallback.
- Added VIP dynamic Google-font media fallback (matching edit pipeline) so `Bangers` can resolve/render without a bundled local `.ttf`.
- Bundled `public/fonts/Bangers-Regular.ttf` and mapped `Bangers` in both edit and VIP bundled-font resolution, ensuring ffmpeg/libass uses true Bangers glyphs instead of falling back from `woff2`.
- Changed default subtitle font to `Bangers` across Video Tools Lab, Workspace runtime defaults/seeds, and edit/VIP API subtitle fallback paths.
- Changed default translation/metadata model to `cx/gpt-5.5` (replacing `cx/gpt-5.3-codex-low`) across shared constants, Workspace defaults/seeds, and related UI placeholders/tests.
- Verification (FAST-VIDEO-023):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run test -- src/lib/workspace/workspace-graph.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run test -- src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
  - `npm run test -- src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`

## FAST-WORKSPACE-053 - Prioritize Saved Video Tools Setup Over Node Defaults

- Fixed Workspace VIP/edit mask config precedence so saved Video Tools Lab setup is applied when node fields remain at template defaults.
- Added template-default-aware resolution for boolean/number/string mask fields to avoid default node values unintentionally overriding saved setup.
- Explicit node overrides still take priority when a node config value differs from its template default.
- Fixed local-upload runtime fallback in VIP/edit branches by merging `source.file` setup when no `source.asset` setup exists.
- Fixed direct `source.file` path detection so local setup fallback is applied even when VIP/edit consumes the source file node directly.
- Verification (FAST-WORKSPACE-053):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`

## FAST-WORKSPACE-052 - Add Seed Asset VIP Processing 2

- Added a new Workspace seed `Seed Asset VIP Processing 2`.
- New seed flow: `Upload Video -> VIP Processing -> Save to Local`.
- Preserved existing `Seed Asset VIP Processing` flow unchanged (`Storage Asset -> VIP Processing -> Save to Storage`).
- Verification (FAST-WORKSPACE-052):
  - `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run guard:version`

## FAST-VIDEO-022 - Persist Video Tools Lab Local Upload Setup Across Reload

- Fixed Video Tools Lab local-upload flow to rehydrate saved local setup when the same file is selected again after page reload.
- Local source picker now loads setup from local registry and applies it immediately, so mirror/blur/subtitle/text settings are restored without requiring a Storage Asset.
- Kept existing fallback behavior: if no local setup exists for the selected file, panel resets to default setup.
- Verification (FAST-VIDEO-022):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts`
  - `npm run guard:version`

## FAST-VIDEO-021 - Preserve Video Tools Subtitle Preview in Product Render

- Bumped app version from `0.10.65` to `0.10.73` as a patch release for Video Tools Lab preview/output parity.
- Fixed Workspace/VIP product render paths to preserve saved `subtitleBackgroundPaddingY` from Video Tools Lab setup.
- Forwarded `subtitleBackgroundPaddingY` through Workspace edit/VIP form payloads and `/api/audio/video-vip-processing` subtitle style.
- Updated Video Tools Lab Run/Save to derive output subtitle `alignment` and margins from the currently visible preview box position, so dragged preview placement is no longer separate from render settings.
- Refined subtitle margin export back to bottom-aligned ASS fallback margins so saved top-margin values cannot push subtitles to the top of the video.
- Rebuilds Workspace/VIP subtitle margins from saved `subtitlePreviewPlacement` when present, so older saved numeric margins cannot override the preview position the user actually aligned in Video Tools Lab.
- Added subtitle region placement using the same percentage `x/y/width/height` coordinate model as blur/cover regions; render now positions subtitle text at the region center with ASS `\pos`, and falls back to saved blur regions for older setups.
- Fixed subtitle wrapping to use placement-region width instead of stale ASS margins, expanded the auto-wrap width budget, and inserted a controlled ASS spacer between multi-line subtitle rows.
- Fixed subtitle/text-overlay custom font rendering in output video by wiring Next-bundled Google font files into ffmpeg `ass` filters via `fontsdir`, so fonts like `Lobster` no longer fallback to default in render output.
- Bundled `Lobster-Regular.ttf` locally (`public/fonts`) and mapped `Lobster` to this TTF first, so ffmpeg/libass avoids unsupported `woff2` and uses the configured font reliably with minimal extra size.
- Changed subtitle defaults to font size `35` and background padding Y `8`.
- Expanded Video Tools Lab subtitle font selector with styled options using the loaded thumbnail/video font families.
- Removed the incorrect ASS vertical scale workaround so subtitle text/background scale stays governed by saved setup values.
- Blur processing remains unchanged.
- Verification (FAST-VIDEO-021):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/edit/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts` pass (6 files / 119 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-051 - Update VIP Workspace Defaults to veryfast and 0.8x

- Bumped app version from `0.10.62` to `0.10.63` as a patch release for Workspace VIP default tuning.
- Changed VIP `Render mode` default in Workspace from `superfast` to `veryfast`.
- Changed VIP `Speed factor` default in Workspace from `0.7` to `0.8`.
- Updated Workspace VIP runtime fallbacks so missing config also defaults to `veryfast` and `0.8`.
- Updated Workspace graph defaults/tests to match new VIP defaults.
- Verification (FAST-WORKSPACE-051):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass.

## FAST-WORKSPACE-051 - Add VIP Render Mode Selector (veryfast/superfast)

- Bumped app version from `0.10.60` to `0.10.61` as a patch release for VIP render control.
- Added VIP `Render mode` runtime config with two presets: `superfast` (default) and `veryfast`.
- Wired selected render mode through Workspace VIP run payload (`renderPreset`) to `/api/audio/video-vip-processing`.
- Updated VIP API/runtime render pipeline to apply selected preset directly on ffmpeg x264 `-preset`.
- Preserved backward compatibility by defaulting/fallback to `superfast` when preset is missing or invalid.
- Verification (FAST-WORKSPACE-051):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts` pass (4 files / 89 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-050 - Fix VIP Transcript Network Error Mapping and Stage Log Clarity

- Bumped app version from `0.10.59` to `0.10.60` as a patch release for VIP transcript failure diagnostics.
- Fixed Groq transcription adapter to map network fetch exceptions (for example `fetch failed`) into structured `PRV_GROQ_TRANSCRIPTION_FAILED` errors.
- Preserved transcript-stage step evidence in the VIP path when transcription fails, so Workspace can show actionable failure details instead of generic mux-only messaging.
- This prevents transcript network failures from being downgraded into ambiguous `SYS_DUBBING_MUX_FAILED` top-level errors.
- Verification (FAST-WORKSPACE-050):
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (3 files / 18 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-049 - Add Manual Translate Import Mode for VIP Node

- Bumped app version from `0.10.58` to `0.10.59` as a patch release for VIP translation flexibility.
- Added VIP `Translation mode` in Workspace Pre-run configuration with two options: `AI API` (existing flow) and `Import manual translate`.
- Added manual import UI for VIP mode:
  - runtime multiline input for translated subtitles (one line per transcript segment),
  - source transcript copy action (`Copy source text`) once transcript stage is available,
  - inline imported-line count vs expected-segment count feedback.
- Updated VIP runtime/API to support manual translation path without calling transcript-translation AI API:
  - API accepts `translationMode` + `importedTranslationText`,
  - server parses numbered/manual line formats and maps them to transcript segments by order,
  - server validates line count and returns structured manual-translation prompt payload when missing/mismatched.
- Updated Workspace VIP run handling to capture manual-translation prompt responses, persist runtime transcript for the VIP node, and show actionable continue guidance.
- Preserved default behavior: when mode is `AI API`, VIP translation still runs through provider/model flow unchanged.
- Verification (FAST-WORKSPACE-049):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 38 tests).
  - `npm run build` pass.
  - `npm run guard:version` pass.

## FAST-VIDEO-019 - Add Download Button Near Thumbnail Name and Right-Align Upload Title Hint

- Bumped app version from `0.10.57` to `0.10.58` as a patch release for Thumbnail Studio UX polish.
- Added a `Download` action in the `Thumbnail name` header area of Thumbnail Studio editor.
- Added right-side title hint in the same row (for example `upload 10:07:25`) so upload-named thumbnails are visible without opening library cards.
- Download action now points to selected thumbnail attachment route.
- Verification (FAST-VIDEO-019):
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts` pass (1 file / 5 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-018 - Fix Thumbnail Studio Download Filename Extension by MIME Type

- Bumped app version from `0.10.56` to `0.10.57` as a patch release for Thumbnail Studio download correctness.
- Fixed shared storage download filename generation to derive extension from resolved MIME type instead of forcing `.mp4`.
- Thumbnail image downloads now produce image filenames (for example `.png` / `.jpg`) while generic binary MIME types still fall back to `.mp4`.
- Verification (FAST-VIDEO-018):
  - `npm run test -- --run src/lib/storage/asset-download.test.ts` pass (1 file / 3 tests).
  - `npm run guard:version` pass.

## FAST-STORAGE-010 - Fix TypeScript Const Assertion Error in Storage Delete Helper

- Bumped app version from `0.10.55` to `0.10.56` as a patch release for build stability.
- Fixed TypeScript build error in storage delete helper by replacing invalid `null as const` with `null`.
- No behavioral change to Storage Library delete flow; this is a compile-time correctness fix.
- Verification (FAST-STORAGE-010):
  - `npm run build` pass.
  - `npm run guard:version` pass.

## FAST-STORAGE-009 - Allow Local Storage Delete When Drive Remote Context Is Missing

- Bumped app version from `0.10.54` to `0.10.55` as a patch release for Storage Library delete robustness.
- Updated Drive remote-delete helper to treat missing remote context as best-effort skip instead of hard failure:
  - missing `fileId`,
  - missing resolved Drive access token.
- Kept local Storage Library delete path unblocked in these cases, so problematic legacy/mixed assets can still be removed from app metadata.
- Preserved hard-fail behavior for explicit non-404 Drive delete failures; preserved idempotent success for Drive `404`.
- Verification (FAST-STORAGE-009):
  - `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` pass (2 files / 9 tests).
  - `npm run guard:version` pass.

## FAST-OPS-008 - Clean Next Build ESLint Circular Warning

- Bumped app version from `0.10.53` to `0.10.54` as a patch release for build-output hygiene.
- Removed flat ESLint config (`eslint.config.mjs`) and switched to Next-compatible `.eslintrc.json` extends.
- Aligned lint package major with runtime (`eslint-config-next` -> `15.5.18`) to match `next@15.5.18`.
- Disabled noisy lint rules in build path:
  - `@typescript-eslint/no-unused-vars`
  - `react-hooks/exhaustive-deps`
  - `@next/next/no-img-element`
- Fixed `prefer-const` error in `chinese-transcription.ts` so lint/type-check stage no longer fails.
- Verification (FAST-OPS-008):
  - `npm run build` pass with no circular-JSON ESLint warning.
  - `npm run guard:version` pass.

## FAST-STORAGE-008 - Make Storage Delete Idempotent When Drive File Is Missing

- Bumped app version from `0.10.52` to `0.10.53` as a patch release for Storage Library delete reliability.
- Updated Drive-backed asset delete flow to treat remote Google Drive `404 Not Found` as an idempotent success case.
- Storage Library delete now continues to remove the local asset record and linked intake run traces when the Drive file has already been deleted externally.
- Kept existing hard-fail behavior for non-404 Drive delete errors (permission/auth/network) so unexpected remote failures still stop local deletion.
- Verification (FAST-STORAGE-008):
  - `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` pass (2 files / 7 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-048 - Refine VIP Detail Output and Subtitle Wrapping

- Bumped app version from `0.10.51` to `0.10.52` as a patch release for VIP detail clarity.
- Removed verbose `Voice chunks` / `Voice chunk N` lines from Workspace VIP completion details.
- Added generated metadata visibility in VIP completion details: `Title`, shortened `Description`, and `Tags`.
- Added ASS subtitle auto-wrap before render, so long translated lines are split into `\N` line breaks based on subtitle width/font constraints.
- Preserved explicit input line breaks while applying auto-wrap, so existing multiline subtitles continue to render correctly.
- Verification (FAST-WORKSPACE-048):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/video-processing/video-edit-pipeline.test.ts` pass (2 files / 36 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-047 - Add Detailed Terminal Logs for VIP Pipeline

- Bumped app version from `0.10.50` to `0.10.51` as a patch release for VIP terminal observability.
- Added structured `[VIP]` terminal logs with run id, source/config summary, checkpoint hit/reuse/save status, per-stage start/success/reuse/failure markers, durations, counts, output bytes, and error stack previews.
- Added structured `[TranscriptTranslation]` terminal logs with translation run plan, chunk start, provider request/response/body-read, normalized result counts, split/fallback retries, and fetch-failure context.
- Removed full translation request body logging from terminal output and replaced it with provider host, model, segment range/count, request byte size, full transcript char count, response byte size, and response preview.
- Verification (FAST-WORKSPACE-047):
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 21 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-046 - Use Superfast Rendering and Mute Original Audio by Default

- Bumped app version from `0.10.49` to `0.10.50` as a patch release for faster local rendering defaults.
- Switched VIP, video preprocess, and video edit ffmpeg x264 encode preset from `veryfast` to `superfast`.
- Changed video dubbing and VIP runtime fallback `originalAudioVolume` from `0.10` to `0`, so default runs mute source audio and keep generated voice at full volume.
- Updated Workspace dubbing/VIP node defaults, sample graph configs, runtime form fallbacks, and inspector placeholders to use original volume `0`.
- Verification (FAST-WORKSPACE-046):
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/video-preprocess.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-dubbing/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (8 files / 106 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-045 - Map VIP Translation Network Failures Correctly

- Bumped app version from `0.10.48` to `0.10.49` as a patch release for VIP translation error mapping.
- Mapped translation provider network failures thrown before an HTTP response (`fetch failed`) to `PRV_GROQ_TRANSLATION_FAILED`.
- Preserved VIP checkpoint failure telemetry so Workspace reports `failedStage: translation` and reusable transcript checkpoints without mislabeling the provider failure as generic mux/system failure.
- Verification (FAST-WORKSPACE-045):
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (3 files / 29 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-044 - Surface VIP Partial Checkpoints on Failed Continue

- Bumped app version from `0.10.47` to `0.10.48` as a patch release for Workspace VIP resume clarity.
- Added VIP checkpoint metadata to failed VIP processing errors, including failed stage, stages saved in the current run, and reusable stages for the next retry.
- Updated `/api/audio/video-vip-processing` to return checkpoint telemetry in error JSON when a VIP internal stage fails after partial progress.
- Updated Workspace failure detail rendering to show reusable VIP checkpoint stages and explain that `Continue Failed Flow` skips them on the same server/source/config.
- Added Continue-mode VIP progress copy so retries make checkpoint reuse explicit instead of looking like a full restart.
- Updated Video Pipeline docs to require VIP failure checkpoint telemetry.
- Verification (FAST-WORKSPACE-044):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 34 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-043 - Save Workspace Runtime Video Directly to Local

- Bumped app version from `0.10.46` to `0.10.47` as a patch release for Workspace local output parity.
- Updated the Workspace local output node copy from download-only behavior toward `Save to Local`.
- Extended Workspace planning so `Save to Local` can consume generated video artifact producers directly, including `VIP Processing`, without requiring `Save to Storage` first.
- Updated Workspace runtime save-local execution to use:
  - Storage asset download when the upstream producer is a Storage asset,
  - inline `File`/base64 runtime artifacts when available,
  - server-side workspace artifact download when large VIP/edit/preprocess outputs are represented by `artifactId`.
- Added `/api/workspace/artifacts/[artifactId]/download` for temporary Workspace server-side artifacts.
- Updated Video Pipeline docs to record direct local save support for runtime video artifacts.
- Verification (FAST-WORKSPACE-043):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts 'src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts'` pass (3 files / 73 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-042 - Apply Video Tools Cover Box and Text Overlay in Workspace

- Bumped app version from `0.10.45` to `0.10.46` as a patch release for Workspace video edit parity.
- Updated Workspace saved `videoEditSetup` typing/resolution to include:
  - `blurEnabled`,
  - `coverBoxEnabled`,
  - `textOverlayEnabled`,
  - `textOverlay`.
- Updated Workspace `edit-video` requests to forward cover box and text overlay fields to `/api/video-processing/edit`, including text overlay play resolution.
- Updated Workspace VIP processing requests to forward saved cover box and text overlay setup instead of forcing blur-only behavior.
- Extended `/api/audio/video-vip-processing` to read saved/form cover box and text overlay setup.
- Extended VIP final composite render to apply cover boxes before mirror and text overlays after subtitles.
- Updated Video Pipeline docs to require Workspace render parity with Video Tools Lab setup.
- Verification (FAST-WORKSPACE-042):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts` pass (5 files / 53 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-VIDEO-017 - Add Video Tools Cover Box and Text Overlay

- Bumped app version from `0.10.44` to `0.10.45` as a patch release for Video Tools Lab edit workflow.
- Added a lightweight cover-box transform to the video edit pipeline using ffmpeg `drawbox`, so old subtitle regions can be covered with the Vietnamese subtitle background color/opacity without running blur.
- Added simple ASS-based Text Overlay support for channel watermark text, preserving Vietnamese text such as `Ăn Không Ngồi Rồi`.
- Extended `/api/video-processing/edit` to parse `coverBoxEnabled`, `coverBoxesJson`, `textOverlayEnabled`, and `textOverlaysJson`.
- Updated Video Tools Lab with:
  - default no-blur `Cover subtitle box`,
  - explicit `Partial blur` toggle,
  - quick `Add subtitle box` region,
  - simple Text Overlay controls and draggable preview layer,
  - setup save/load fields for cover box and text overlay.
- Updated Video Pipeline docs to include cover boxes and text overlays as edit capabilities.
- Verification (FAST-VIDEO-017):
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts` pass (3 files / 25 tests).
  - `npm run build` pass; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` pass.

## FAST-VIDEO-016 - Add Multi-file Video Merge Mode to Video Splitter Page

- Bumped app version from `0.10.43` to `0.10.44` as a patch release for local video tools.
- Added new local merge runtime using ffmpeg concat demuxer with stream copy (`-c copy`) to keep CPU/RAM usage low.
- Added `/api/video-processing/merge` API route accepting multiple `videoFiles` and returning direct download URL for merged MP4 artifact.
- Upgraded Video Splitter panel into split + merge utility:
  - operation switch (`Split video` / `Merge multiple videos`),
  - multi-file selection for merge (2+ files),
  - `Merge + Download MP4` action.
- Updated navigation label to `Video Split & Merge` with revised capability description.
- Verification (FAST-VIDEO-016):
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/lib/video-processing/video-merge.test.ts src/app/api/video-processing/merge/route.test.ts src/components/layout/navigation.test.ts` pass (4 files / 14 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-066 - Chunk Groq Transcription Uploads and Fix VIP Multiline Progress Detail

- Bumped app version from `0.10.41` to `0.10.43` as a patch release for VIP transcription reliability.
- Added Groq transcription chunking for large extracted audio payloads (direct upload target `24 MB`) while preserving 16k mono speech extraction settings.
- Added overlap-aware chunk merge that offsets timestamps back to global timeline and keeps boundary-safe windows to reduce chunk edge duplication.
- Preserved overlong Chinese segment retry flow, now running on merged multi-chunk transcript.
- Improved transcription step telemetry with `chunkingEnabled`, `directUploadTargetBytes`, and `chunkCount`.
- Fixed Workspace VIP running detail rendering to use real line breaks instead of literal `\\n`.
- Replaced misleading static `[queued] ...` pseudo-stage lines with explicit copy that live sub-stage telemetry is not streamed yet in current mode.
- Mapped metadata-provider network failures (`fetch failed`) to `PRV_GROQ_TRANSLATION_FAILED` instead of leaking generic `SYS_DUBBING_MUX_FAILED`.
- Added adaptive Piper batching by timeline span target (~10 minutes/chunk), so one-hour jobs trend toward about 6 voice chunks instead of oversized chunk groups.
- Verification (FAST-AUDIO-066):
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 28 tests).
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-metadata.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (3 files / 51 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-041 - Surface Full VIP Failure Stage Details in Workspace

- Bumped app version from `0.10.40` to `0.10.41` as a patch release for VIP failure observability.
- Added structured API error propagation for Workspace JSON calls, preserving response payload when an API returns `ok: false`.
- Updated VIP runtime step handling to append detailed failure stage logs from `/api/audio/video-vip-processing` payload (`errorCode`, `error`, `steps`, and compact `metrics`) before failing the flow step.
- Prevented the global step-failure catch from overwriting VIP detailed stage logs with a single-line error message.
- Added queued sub-stage lines during VIP running state so the step detail shows transcript/translation/voice/render/metadata states while waiting.
- Added explicit 413 hint line in VIP detail (`request body too large`) with likely cause guidance (upload/body limit or provider cap such as Groq Whisper 25MB audio).
- This allows immediate diagnosis of cases like `Request Entity Too Large`, including whether failure happened at `check-upload-size`, `groq-transcribe`, or other internal stages.
- Verification (FAST-WORKSPACE-041):
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 21 tests).
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (3 files / 30 tests).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-040 - Fix VIP Blur Before Mirror Order

- Bumped app version from `0.10.38` to `0.10.39` as a patch release for VIP render correctness.
- Fixed VIP final render filter order so blur/mask is applied on source coordinates before output mirror.
- Kept subtitle overlay after mirror so subtitles render on the final frame.
- Preserved audio speed/mix behavior.
- Added regression coverage for VIP ffmpeg filter order: `setpts -> boxblur -> hflip -> ass`.
- Verification (FAST-WORKSPACE-040):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts` pass (1 file / 3 tests).
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (2 files / 9 tests).
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
  - `npm run guard:version` pass.

## FAST-AUDIO-065 - Chunk Strict Voice Timeline Mix and Surface VIP Stage Details

- Bumped app version from `0.10.37` to `0.10.38` as a patch release for VIP strict voice performance and observability.
- Chunked strict timeline audio mixing into 200-segment groups before the final absolute timeline mix, avoiding one giant `amix` over 1000+ aligned segment files.
- Preserved absolute timestamps, borrowed-gap behavior, timeline diagnostics, and final voice target duration.
- Added voice processing chunk metadata to the voice alignment result for VIP detail display.
- Updated Workspace VIP completion details to show a `Stage log`, stage durations, `Voice chunks`, and per-chunk time ranges.
- Added regression coverage for 450-segment strict mix chunking (`200/200/50`) and Workspace voice chunk detail copy.
- Verification (FAST-AUDIO-065):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts` pass (1 file / 25 tests).
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (3 files / 48 tests).
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
  - `npm run guard:version` pass.

## FAST-AUDIO-064 - Chunk Piper Voice Synthesis at 200 Segments

- Bumped app version from `0.10.36` to `0.10.37` as a patch release for VIP Piper TTS stability.
- Chunked Piper batch synthesis into 200-segment groups by default, so large voice jobs run as smaller Piper batches before existing alignment/merge steps.
- Preserved transcript/translation flow, Piper model/settings/text normalization, and strict/balanced/natural timeline semantics.
- Preserved segment output order when punctuation-only silence segments are mixed with spoken segments.
- Added regression coverage for 450-segment chunking (`200/200/50`) and mixed silence/spoken segment ordering.
- Verification (FAST-AUDIO-064):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts` pass (1 file / 24 tests).
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 26 tests).
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
  - `npm run guard:version` pass.

## FAST-AUDIO-063 - Add Retry Hard-Constraint Transcript Test in Feature Sandbox

- Bumped app version from `0.10.35` to `0.10.36` as a patch release for transcript retry diagnostics.
- Added `retryPromptHardConstraint` option in Chinese transcription request path.
- When retrying overlong Chinese segments, the runtime can now append a hard-constraint instruction to prompt Whisper to split into shorter timestamped segments.
- Extended `/api/audio/chinese-transcription` to accept `retryPromptHardConstraint` form field.
- Updated `Piper TTS Sandbox` navigation entry to `Feature Sandbox`.
- Expanded Feature Sandbox with transcript retry test tools:
  - upload video/audio or choose Storage Asset,
  - toggle hard-constraint retry prompt,
  - run transcription and inspect resulting segments + step trace.
- Added regression coverage to ensure retry calls include hard-constraint prompt when enabled.
- Verification (FAST-AUDIO-063):
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/components/layout/navigation.test.ts` pass (2 files / 13 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-062 - Keep VIP Processing Running When Segment Retry Is Exhausted

- Bumped app version from `0.10.34` to `0.10.35` as a patch release for VIP transcription resilience.
- Added transcription retry mode `strict | best-effort` for overlong Han segment retries.
- Kept existing strict behavior unchanged: retry exhaustion still throws `PRV_GROQ_SEGMENT_RETRY_EXHAUSTED`.
- Added best-effort behavior: if a segment still remains overlong after 5 retries, keep the original segment and continue processing.
- Updated VIP processing to call transcription with `overlongSegmentRetryMode: "best-effort"` so one bad segment no longer aborts the whole VIP pipeline.
- Added regression tests for strict failure path and best-effort continuation path.
- Verification (FAST-AUDIO-062):
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 7 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-015 - Add Split-by-Parts Mode and Refine Video Splitter UX

- Bumped app version from `0.10.32` to `0.10.34` as a patch release for Video Splitter usability.
- Added a new splitter mode `Chia theo so phan`, letting users input a part count (e.g., cut in 2, 3, N parts).
- Backend now probes source duration from ffmpeg metadata and computes equal segment interval for split-by-parts mode.
- Kept and polished existing modes: interval split now offers `30/45/60 phut`, and head-clip mode remains `15/30 phut`.
- Updated splitter panel wording and controls for a more consistent in-product operational style.
- Output naming now consistently uses original basename:
  - archive: `<original>.zip`
  - clips: `<original>-part-001.mp4`, `<original>-part-002.mp4`, ...
- Verification (FAST-VIDEO-015):
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/lib/video-processing/video-split.test.ts src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-VIDEO-013 - Add Video Splitter Page for Local Download Workflow

- Bumped app version from `0.10.31` to `0.10.32` as a patch release for local video processing workflow.
- Added new `Video Splitter` page in Video Pipeline navigation, aligned with existing panel style.
- Added server-side split API:
  - `POST /api/video-processing/split` for ffmpeg split execution,
  - `GET /api/video-processing/split/download/:downloadId` for direct attachment download.
- Added local split runtime with two modes:
  - interval split (`30m` or `60m`),
  - head clip (`15m` or `30m`).
- Split outputs are packaged as `.zip` and downloaded directly to local browser downloads (without Drive upload).
- Verification (FAST-VIDEO-013):
  - `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/components/layout/navigation.test.ts src/components/layout/content-router.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-INTAKE-014 - Add Visible Download Fallback Signal in Video Intake

- Bumped app version from `0.10.30` to `0.10.31` as a patch release for Video Intake download UX clarity.
- Switched Video Intake manual download trigger to hidden iframe request so the page stays stable while browser handles file response.
- Added explicit Run Status fallback affordance: `Open direct download link`.
- Updated success copy to clarify that only the request was sent to browser, not that file transfer already completed.
- Verification (FAST-INTAKE-014):
  - `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-INTAKE-012 - Force Video Intake Download as Attachment Instead of Browser Preview

- Bumped app version from `0.10.29` to `0.10.30` as a patch release for download UX correctness.
- Added `Content-Disposition: attachment` headers to all `/api/video-intake/resolve-file` download responses (materialized and direct stream paths).
- Added explicit client-side anchor `download` hint for Video Intake manual download.
- Verification (FAST-INTAKE-012):
  - `npm run test -- --run src/app/api/video-intake/resolve-file/route.test.ts src/features/video-intake/video-intake-panel.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-INTAKE-011 - Stream Browser-Native Video Intake Download for Large Files

- Bumped app version from `0.10.28` to `0.10.29` as a patch release for Video Intake download reliability.
- Added `GET /api/video-intake/resolve-file` query-mode support and refactored route to share one resolve/stream handler for GET + POST.
- Switched Video Intake manual `Download` action from client-side `fetch(...).blob()` buffering to browser-native streaming download URL.
- Kept server-side Bilibili HTML5 materialization path unchanged, but removed large blob buffering pressure on the client side for `bilibili-html5-*` and other large media.
- Verification (FAST-INTAKE-011):
  - `npm run test -- --run src/app/api/video-intake/resolve-file/route.test.ts src/features/video-intake/video-intake-panel.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-039 - Add Local Download Output Node for Workspace

- Bumped app version from `0.10.27` to `0.10.28` as a patch release for Workspace output flexibility.
- Added a new output node `Download Local` to Workspace node catalog.
- Added planner/runtime support for step kind `download-local` so Workspace can download upstream storage assets directly to the local machine.
- Added node runtime save mode options:
  - `Browser Downloads folder` (default browser-managed download),
  - `Choose folder on every run` (uses picker when supported, with browser-download fallback).
- Verification (FAST-WORKSPACE-039):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 75 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-061 - Optimize Piper VIP Voice Generation Without Quality Loss

- Bumped app version from `0.10.26` to `0.10.27` as a patch release for VIP Piper TTS performance.
- Kept Piper model/settings/text quality unchanged while reducing large segment-count overhead in timeline alignment.
- Added direct WAV duration parsing for generated Piper segment files, avoiding one ffmpeg probe process per segment when WAV metadata is available.
- Parallelized independent ffmpeg alignment transforms with conservative bounded concurrency (`PIPER_ALIGNMENT_FFMPEG_CONCURRENCY`, default max 4).
- Kept balanced/strict timing semantics, tempo filters, and final concat/mix behavior unchanged.
- Verification (FAST-AUDIO-061):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (3 files / 30 tests).
  - `npm run build` compiles current changes, then stops on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-038 - Add Stage Checkpoints for VIP Processing Resume

- Bumped app version from `0.10.25` to `0.10.26` as a patch release for Workspace VIP resume behavior.
- Added local server-side VIP stage checkpoints keyed by Workspace `vipResumeKey` and an input fingerprint.
- VIP processing now saves completed transcript, translation, voice, rendered video, and metadata stages, then reuses compatible checkpoints on retry.
- Workspace now sends a stable `vipResumeKey` for VIP node requests and surfaces reused checkpoint stages in the VIP progress log.
- Checkpoints are invalidated when source/config fingerprint changes, avoiding reuse after settings edits.
- Verification (FAST-WORKSPACE-038):
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 27 tests).
  - `npm run build` compiles current changes, then stops on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-037 - Fix VIP Processing Provider Lookup and Error Mapping

- Bumped app version from `0.10.24` to `0.10.25` as a patch release for Workspace VIP processing reliability.
- Fixed `/api/audio/video-vip-processing` metadata provider lookup by passing `providerId: metadataProviderId` to `getAiProviderById`.
- Added structured `STG_ASSET_DOWNLOAD_FAILED` mapping for storage asset download/fetch failures before VIP processing starts.
- Fixed VIP subtitle style typing so the route no longer blocks build on the VIP route after the provider lookup fix.
- Verification (FAST-WORKSPACE-037):
  - `npm run test -- --run src/app/api/audio/video-vip-processing/route.test.ts` pass (1 file / 5 tests).
  - `npm run build` no longer fails on `src/app/api/audio/video-vip-processing/route.ts`; it now stops on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
  - `npm run guard:version` pass.

## FAST-INTAKE-010 - Stabilize Bilibili HTML5 Intake Downloads

- Bumped app version from `0.10.23` to `0.10.24` as a patch release for Bilibili HTML5 intake reliability.
- Fixed selected `bilibili-html5-*` Download and Drive upload paths by materializing the HTML5 media through yt-dlp temp-file download before browser response or Google Drive resumable upload.
- Added internal resolver support for `download ... bilibili-html5-*`, so the HTML5 direct URL is downloaded with yt-dlp retry/resume behavior instead of raw app-level direct piping.
- Mapped interrupted direct source materialization failures to `STG_SOURCE_STREAM_FAILED` instead of allowing raw `terminated` errors to become unknown intake failures.
- Verification (FAST-INTAKE-010):
  - `npm run test -- --run src/lib/video-intake/storage-adapters.test.ts src/app/api/video-intake/resolve-file/route.test.ts` pass (2 files / 11 tests).
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py` pass (18 tests).
  - Live smoke: `internal-resolver.py download` with the reported `BV1A1RUBEEC8` URL and `bilibili-html5-64` produced a `69,392,247` byte MP4 with audio/video metadata.
  - `npm run guard:version` pass.
  - `npm run build` still fails on unrelated pre-existing `src/app/api/audio/video-vip-processing/route.ts:361` type error (`metadataProviderId` passed where `providerId` is expected).

## FAST-INTAKE-009 - Add Manual Download Action to Video Intake

- Bumped app version from `0.10.22` to `0.10.23` as a patch release for Video Intake workaround UX.
- Added a `Download` action beside `Run Intake Pipeline` on Video Intake.
- The action downloads the current URL/quality/format selector through `/api/video-intake/resolve-file`, using the server-provided `x-omnivideo-file-name` header when available.
- Download does not require a selected storage account or folder, so it remains available when Drive upload is failing.
- Verification (FAST-INTAKE-009):
  - `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts` pass (1 file / 5 tests).

## FAST-INTAKE-008 - Materialize Bilibili HTML5 Drive Uploads

- Bumped app version from `0.10.21` to `0.10.22` as a patch release for Bilibili HTML5 intake reliability.
- Fixed Drive intake for selected `bilibili-html5-*` formats by materializing the progressive Bilibili source to a temp file before the Google Drive resumable PUT.
- Kept generic direct URL Drive uploads on remote-stream mode, and kept existing `yt-dlp-file` uploads on file-stream mode.
- Verification (FAST-INTAKE-008):
  - `npm run test -- --run src/lib/video-intake/storage-adapters.test.ts` pass (1 file / 7 tests).
  - `npm run guard:version` pass.
  - `npm run build` currently fails on unrelated `src/app/api/audio/video-vip-processing/route.ts:361` type error (`metadataProviderId` passed where `providerId` is expected).

## FAST-WORKSPACE-036 - Add Isolated VIP Composite Workspace Node

- Added a dedicated `video.vip-processing` Workspace node that runs a separate composite runtime path without changing existing node behaviors.
- Added a new 3-node seed: `Storage Asset -> VIP Processing -> Save to Storage`.
- Added planner/runtime support for new step kind `vip-process-video`, including storage artifact handoff.
- Added new API endpoint `/api/audio/video-vip-processing` to run combined pipeline stages (preprocess, dubbing, final render with mirror+blur+subtitle, and VI metadata generation).
- Enhanced Background Progress detail for VIP step with stage durations and segment timeline summary.
- Fixed VIP subtitle placement for direct Storage Asset flows by resolving saved `videoEditSetup` from the source asset itself and by falling back to saved subtitle style values in the VIP API when request fields are untouched defaults.
- Verification (FAST-WORKSPACE-036):
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts src/app/api/audio/video-vip-processing/route.test.ts` pass (3 files / 52 tests).
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 19 tests).
  - `npm test -- src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 22 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-060 - Segment-Level Retry for Overlong Chinese Transcription Segments

- Bumped app version from `0.10.20` to `0.10.21` as a patch release for transcription reliability.
- Added deterministic detection for transcript segments with more than 40 Han/Chinese characters.
- Added segment-level retry: the pipeline now cuts only the suspicious extracted-audio range and calls Groq again up to 5 times instead of reprocessing the whole video.
- Successful retries replace the suspicious segment with shorter segment(s), offsetting timestamps back onto the original transcript timeline.
- If a segment remains overlong after 5 retries, transcription fails with `PRV_GROQ_SEGMENT_RETRY_EXHAUSTED` and includes the segment id/time range in the error message.
- Verification (FAST-AUDIO-060):
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/audio-extraction.test.ts` pass (2 files / 11 tests).

## FAST-VIDEO-012 - Match Video Tools Lab Preview Behavior with Audio Transcript

- Bumped app version from `0.10.16` to `0.10.17` as a patch release for picker UX consistency.
- Replaced Video Tools Lab asset-row thumbnail preview with the same interaction used in Audio Transcript picker:
  - per-row `Preview/Hide` action button,
  - expandable inline `<video controls>` panel for the active row.
- Kept wrapped lifecycle tags and `Saved setup` badge behavior from prior fix.
- Verification (FAST-VIDEO-012):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts` pass (1 file / 4 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-011 - Restore Asset Preview and Tag Wrapping in Video Tools Lab Picker

- Bumped app version from `0.10.15` to `0.10.16` as a patch release for Video Tools Lab picker UX.
- Added optional `wrap` mode to shared `AssetLifecycleBadges` so lifecycle chips can break to new lines when containers are narrow.
- Updated Video Tools Lab `Select asset` row layout to:
  - show a per-item preview video box again (`preload="none"`), and
  - render lifecycle chips in a wrapped row with `Saved setup` badge alongside.
- Verification (FAST-VIDEO-011):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts` pass (2 files / 5 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-010 - Fix Video Tools Lab Asset-Picker Lifecycle Badge Wrapping

- Bumped app version from `0.10.14` to `0.10.15` as a patch release for Video Tools Lab picker CSS stability.
- Fixed asset picker row layout in Video Tools Lab so the metadata text uses flexible truncation (`min-w-0` + `flex-1`) instead of squeezing lifecycle chips.
- Updated the shared `AssetLifecycleBadges` component to keep lifecycle chips single-line (`whitespace-nowrap`) and non-shrinking in dense list rows.
- Kept `Saved setup` chip single-line in the same right-side badge group for consistent alignment.
- Verification (FAST-VIDEO-010):
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/storage/asset-lifecycle-tags.test.ts` pass (2 files / 5 tests).
  - `npm run guard:version` pass.

## FAST-AUDIO-059 - Reduce Balanced Voice Inter-Segment Max Pause to 0.10s

- Bumped app version from `0.10.13` to `0.10.14` as a patch release for voice pacing tuning.
- Reduced balanced timeline pause cap from `0.3s` to `0.1s` via `PIPER_TTS_ALIGNMENT_SETTINGS.balancedMaxPauseSeconds`.
- Updated balanced Piper alignment regression expectation to reflect the tighter pause cap (`pauseBeforeSeconds: 0.1` and earlier scheduled start).
- Verification (FAST-AUDIO-059):
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts` pass (1 file / 20 tests).
  - `npm run guard:version` pass.

## FAST-VIDEO-009 - Title-Based Workspace Output Naming and Bilibili Auth-Integrated Intake

- Bumped app version from `0.10.12` to `0.10.13` as a patch release for naming and intake quality controls.
- Workspace `Store Generated Artifact` now sets asset `title` by business priority instead of technical transform filename chain:
  - generated VI metadata title -> source node title -> source asset title -> file stem fallback.
- Added optional resolver auth fields to intake pipeline and APIs:
  - `resolverCookieHeader` (raw Cookie/Header text)
  - `resolverCookiesFromBrowser` (`chrome`/`chromium`/`edge`/`firefox`/`safari`)
- Video Intake UI now includes resolver auth controls and browser-local remember support to avoid repeated manual entry.
- Internal resolver now allows cookie fallback profiles for Bilibili in addition to TikTok/Douyin, enabling authenticated higher-quality extraction attempts when valid cookies are provided.
- Verification (FAST-VIDEO-009):
  - `npm run test -- --run src/lib/video-intake/validation.test.ts src/lib/video-intake/media-resolver.test.ts src/app/api/video-intake/formats/route.test.ts src/app/api/video-intake/resolve-file/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-035 - Preserve Subtitle PlayRes for Server-Side Artifact Edit Path

- Bumped app version from `0.10.11` to `0.10.12` as a patch release for Workspace subtitle rendering correctness.
- Fixed Workspace edit route subtitle PlayRes drift for server-side artifact flow by probing source video dimensions from the temp input path before ASS generation.
- Kept heavy media optimization intact: the fix still uses `artifactId` path and does not force browser-side full video decode for dimension detection.
- Added an edit route regression test to verify probed dimensions override stale fallback PlayRes values in `responseMode=artifact`.
- Verification (FAST-WORKSPACE-035):
  - `npm run test -- --run src/app/api/video-processing/edit/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-OPS-007 - Enrich Dubbing Progress with Segment Timeline Details

- Bumped app version from `0.10.10` to `0.10.11` as a patch release for progress observability UX.
- Kept task-level Workspace Dub progress copy concise while adding richer step-level completion details.
- Added Dub progress metadata for file name, size, MIME, runtime, transcript/translation/voice counts, provider/model, and audio mix.
- Moved Dub segment timeline details out of the `Dub · ...` flow row into a dedicated right/bottom detail panel with a `Show all` / `Hide` control for long segment lists.
- Prevented Workspace runtime artifact previews from rendering media/link elements with empty `src`/`href` when an artifact is server-side only.
- Verification (FAST-OPS-007):
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 21 tests).
  - `npm run build` pass with the existing ESLint circular-config warning.
  - `npm run guard:version` pass after version bump + changelog update.

## FAST-WORKSPACE-034 / FAST-INTAKE-007 - Large Workspace Artifacts and Intake Fetch Error Mapping

- Bumped app version from `0.10.9` to `0.10.10` as a patch release for heavy Workspace runtime and intake diagnostics.
- Added a server-side Workspace artifact registry for large generated media; video preprocess, dubbing, mirror, and edit APIs now return `artifactId` instead of `videoBase64` when outputs exceed the inline threshold.
- Workspace downstream media nodes now pass `artifactId` through FormData, and Store Generated Artifact can upload from the server-side artifact without browser base64 decode/re-upload.
- Active Background Progress tasks and lightweight Workspace artifact checkpoints now persist across reload-style hydration instead of only preserving finished tasks.
- Intake upload network throws are now mapped to explicit codes: `STG_SOURCE_FETCH_FAILED`, `STG_DRIVE_UPLOAD_NETWORK_FAILED`, and `STG_DRIVE_RESUMABLE_PUT_FAILED`.
- Verification (FAST-WORKSPACE-034 / FAST-INTAKE-007):
  - `npm run test -- --run src/lib/workspace/server-artifacts.test.ts src/lib/ui/progress-center.test.ts src/lib/video-intake/storage-adapters.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-dubbing/route.test.ts` pass (5 files / 36 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains).
  - `npm run guard:version` pass.

## FAST-WORKSPACE-033 - Improve Workspace Metadata Tags and Publish Records Thumbnail UX

- Bumped app version from `0.10.8` to `0.10.9` as a patch release for metadata/publish UX polish.
- Updated Vietnamese video metadata generation to explicitly prioritize tags when matching content type: `review phim`, `review full`, `truyện ngắn`, `hoạt hình`, `review truyện`, `tóm tắt truyện`, `tóm tắt phim`, and `hoạt hình trung quốc`.
- Added deterministic preferred-tag inference after provider output so matching movie/story/short-story/animation content gets the relevant tags even if the model omits them.
- Publish Records table and detail modal now surface generated Title, Hashtags, and Caption instead of keeping them only inside the create form.
- New Publish Record now loads the Thumbnail Library, supports visual thumbnail selection/search/clear, and sends `thumbnailAssetId` with the publish request.
- Verification (FAST-WORKSPACE-033):
  - `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/social/publish-records-panel.test.ts` pass (2 files / 7 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains).
  - `npm run guard:version` pass.

## FAST-AUDIO-058 - Lower Default Original Audio Mix Volume to 0.10

- Bumped app version from `0.10.7` to `0.10.8` as a patch release for dubbing mix balance polish.
- Lowered video dubbing runtime fallback `originalAudioVolume` from `0.18` to `0.10`.
- Lowered Workspace audio dubbing defaults for `originalAudioVolume` from `0.18` to `0.10` in node template defaults and sample graphs.
- Updated Workspace audio dubbing runtime form default and inspector placeholder to `0.1`.
- Added regression coverage to assert invalid original-volume input falls back to `0.100` in FFmpeg mix args.
- Verification (FAST-AUDIO-058):
  - `npm run test -- --run src/lib/multilingual-audio/video-dubbing.test.ts src/app/api/audio/video-dubbing/route.test.ts` pass.
  - `npm run guard:version` pass.

## FAST-WORKSPACE-032 - Add Thumbnail Support to Workspace Publish Social Node

- Workspace `Publish Social` now loads thumbnail assets from `/api/storage/thumbnail-assets` and exposes a visual `Thumbnail Library asset` picker (search + inline image preview) in node runtime config.
- Workspace flow runtime now forwards `thumbnailAssetId` from `social.publish` node config into `POST /api/social/publish-records`.
- Social publish create/validation contracts now accept and persist `thumbnailAssetId`:
  - Added `thumbnailAssetId` to publish input/document types.
  - Validation enforces Mongo ObjectId format when provided.
  - Publish record query projection/API serialization now includes `thumbnailAssetId`.
- YouTube publish-now now applies selected thumbnail after successful video upload by calling `thumbnails.set`.
- If thumbnail asset is missing/invalid/non-image/empty, publish fails with explicit thumbnail-related error code/detail.
- Workspace flow setup now warns early when selected thumbnail is no longer available.
- Verification (FAST-WORKSPACE-032):
  - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 69 tests).
  - `npm run test -- --run src/lib/social/validation.test.ts src/lib/social/youtube-upload.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/tiktok-upload.test.ts src/app/api/social/publish-records/route.test.ts` pass (5 files / 29 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains).
  - `npm run guard:version` pass.

## FAST-VIDEO-008 - Fix Thumbnail Studio Blur and Text Preview Fidelity

- Bumped app version from `0.10.6` to `0.10.7` as a patch release for Thumbnail Studio preset and import UX improvements.
- Fixed blur strength `0` so it maps to `0px` and export skips blur drawing for zero-strength regions.
- Aligned preview and export blur strength conversion through one shared `getBlurPixelsFromStrength` helper.
- Removed the dark blur preview overlay that made regions look darker instead of showing the real blur effect.
- Replaced the Blur panel icon with `Droplets` so the icon better matches blur/softening behavior without using crop/scissors or filter/funnel semantics.
- Kept the requested base font set (`Montserrat`, `Bangers`, `Lobster`, `Sriracha`, `Agbalumo`) and added 20 thumbnail-style fonts, including `Luckiest Guy`, `Changa One`, `Lilita One`, `Bowlby One SC`, `Titan One`, `Rowdies`, `Prompt`, and `Unbounded`.
- Scaled preview text and stroke by the actual preview frame height against the 720px export baseline so saved text no longer appears much smaller than the preview.
- Create-variant save now keeps the source thumbnail selected after upload, preserving the current base image and edit setup for producing multiple episode variants.
- Added quick-add text style presets in the middle editor panel, including `Red glow Montserrat`, `Yellow glow Bangers`, `Cyan glow Changa`, and other font/stroke/glow combinations.
- Quick style preset clicks now always create new text layers instead of mutating the selected layer.
- New quick style layers now use the preset label as text content instead of generic `NEW TEXT`.
- Text color and Glow color now use native color picker inputs aligned with Stroke color.
- Quick style preset labels and quick-text preset labels now render with their configured glow colors so preview labels visually match intended output accents.
- Deleting a selected thumbnail now requires explicit user confirmation before the delete request is sent.
- Drag-and-drop import box now also includes an `Upload` button that opens file picker and reuses the same import flow.
- Reworked the colored text effect into an explicit `Glow behind text` toggle with `Glow color`, `Glow blur`, `Glow spread`, and `Glow drop` controls.
- Canvas export now renders glow as a colored outer halo stroke behind the main black stroke and fill, closer to the yellow/red reference thumbnail style than a normal offset shadow.
- Preview glow now uses a separate background text layer with a colored halo stroke so it more closely matches the canvas save output.
- Default text stroke width is now `5px`.
- Canvas export now fills text before stroking it so saved stroke weight better matches preview stroke weight.
- Updated Thumbnail Studio regression tests for blur-zero behavior, shared blur mapping, blur icon, font loading, preview text scaling, create-variant selection, expanded font list, quick text style presets, native color pickers, default stroke, and colored glow controls.
- Verification (FAST-VIDEO-008): `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts` pass (1 file / 5 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-VIDEO-007 - Make Thumbnail Studio Production-Ready with Storage Persistence

- Bumped app version from `0.10.1` to `0.10.4` as a patch release for Thumbnail Studio persistence and layout/UX refinements.
- Added dedicated thumbnail storage APIs:
  - `GET/POST /api/storage/thumbnail-assets`
  - `PATCH/DELETE /api/storage/thumbnail-assets/[assetId]`
  - `GET /api/storage/thumbnail-assets/[assetId]/download`
- Added thumbnail repository support for `assetType=image` in `assets` collection, including lifecycle-aware tags and storage-backed thumbnail metadata.
- Thumbnail Studio now loads real thumbnail library data from storage instead of local seed gradients.
- Added storage account selection and real import flows:
  - drag/drop image upload to storage;
  - URL image import (server-side fetch then upload).
- Save action now performs real client-side render (crop preset + blur regions + text overlays) and persists rendered thumbnails to storage.
- Implemented save modes:
  - `Create variant` (default): creates a new processed thumbnail;
  - `Overwrite current`: uploads replacement then deletes old thumbnail asset + remote file.
- Added metadata controls for folder/tags in Thumbnail Studio and kept duplicate/reset/delete operations connected to persisted assets.
- Added new route tests for thumbnail-assets endpoints and updated Thumbnail Studio source-level UI contract tests.
- Removed `has output` lifecycle badge from Thumbnail Library cards to keep thumbnail tags focused.
- Aligned Thumbnail Studio page shell with Workspace-style viewport framing: fixed-height panel inside equal 4-side page padding, with internal scroll regions instead of drifting page height gaps.
- Reworked crop editing from a passive preset select into an interactive crop box: preset buttons (`16:9`, `9:16`, `1:1`, `4:5`, `Custom`) now show a green crop rectangle on the thumbnail preview, support drag/resize during the edit session, and save by cutting the rendered image to that crop.
- Split the editor control surface into explicit `Crop ratio` and `Blur` sections so crop selection and blur-region creation are visually separate.
- Added `None` as the default crop mode so opening/selecting a thumbnail shows no crop box until the user chooses a crop preset or custom crop.
- Split `Text`, `Crop`, and `Blur` into three separate editor panels on the right side of Thumbnail Studio.
- Stopped persisting transient crop/blur/text editor setup onto thumbnail assets; selecting a saved output thumbnail now starts with clean tools instead of inheriting the source image's edit box/layers.
- Verification (FAST-VIDEO-007): `npm run test -- --run src/app/api/storage/thumbnail-assets/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/download/route.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts src/components/layout/navigation.test.ts` pass (5 files / 18 tests); latest crop/setup follow-up `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts src/app/api/storage/thumbnail-assets/route.test.ts` pass (2 files / 8 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-AUDIO-057 - Remove Redundant Audio Transcript 2 Test Page

- Removed `Audio Transcript 2 - Test` from leftbar navigation after test completion.
- Removed `chineseTranscription2` section wiring from app section types, content router, and navigation slug/legacy resolution.
- Deleted obsolete wrapper component `src/features/audio/chinese-transcription-v2-panel.tsx`.
- Kept `Audio Transcript` main page and preprocess capabilities unchanged.
- Updated navigation and transcript panel source tests to reflect the cleanup.
- Verification (FAST-AUDIO-057): `npm run test -- --run src/components/layout/navigation.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts` pass (3 files / 20 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-VIDEO-006 - Compact Thumbnail Studio Labels and Multi-Layer Blur/Text Summaries

- Bumped app version from `0.10.0` to `0.10.1` as a patch release for Thumbnail Studio UX refinement.
- Updated Thumbnail Studio library cards so long thumbnail names now stay on one line with truncation instead of wrapping across lines.
- Replaced single-region blur editing with a multi-region list model and compact one-line summaries in the same style as Video Tools Lab (`#n x:.. y:.. w:.. h:.. t:.. s:..`).
- Added multi-layer text overlay management with compact one-line summaries (`#n x:.. y:.. z:.. w:.. "text..."`) so users can scan and switch layers quickly.
- Moved remove actions inline: each blur/text summary row now has a trailing close icon for direct deletion.
- Blur regions can now be moved by drag-and-drop and resized from an in-preview corner handle, replacing coordinate/time numeric form editing for positioning.
- Kept blur region border with square corners (no rounded corners), matched border tone to panel styling, and upgraded resize controls to full edge+corner handles (8 directions) with non-visual handle hit areas (no blue dots).
- Kept drag-on-preview text positioning and applied it to the currently selected text layer.
- Disabled `Region blur` by default in Thumbnail Studio editor.
- Removed the non-functional `Workflow Output Hook` placeholder block from Thumbnail Studio.
- Fixed multi-text drag behavior: dragging now tracks the grabbed text layer id + pointer offset, so switching selected layers no longer drags the wrong text and drag no longer snaps text center to cursor.
- Increased CTA button contrast in Thumbnail Studio editor so `Add text layer`, `Add blur region`, and action buttons (`Save`, `Duplicate`, `Reset`, `Delete`) are easier to spot and operate.
- Added direct in-preview text editing: click a text overlay to edit its content inline on the canvas.
- Hardened text drag interaction with click-vs-drag thresholding so quick selection clicks no longer trigger unintended movement.
- Fixed summary-row layout expansion by locking grid tracks with `minmax(0, …)` and enforcing overflow truncation on blur/text summary rows so long text no longer pushes adjacent panes.
- Verification (FAST-VIDEO-006): `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts` pass (1 file / 5 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-VIDEO-005 - Build Thumbnail Studio UI Shell (Library + Editor)

- Bumped app version from `0.9.11` to `0.10.0` as a backward-compatible feature release for thumbnail workflow foundation.
- Added a new `Thumbnail Studio` section in Video Pipeline navigation and route mapping (`/thumbnail-studio`).
- Introduced a split-page UI shell that mirrors existing OmniVideo styling patterns: left `Library` pane and right `Editor` pane.
- Added first-pass thumbnail library interactions in UI: drag-drop import, URL import, search, lifecycle filtering, and lifecycle badges (`raw`, `processed`, `has-processed-output`).
- Added thumbnail preview visuals directly in each library item, removed noisy `Updated ...` meta labels, and attached per-item `Duplicate` + `Delete` actions for faster episodic workflows.
- Added first-pass editor interactions in UI: rename, non-destructive default mode (`Create variant`), optional `Overwrite current`, crop preset, blur strength, and rich text overlay controls (font/size/fill/stroke) with drag-on-canvas text positioning.
- Reworked lifecycle filtering UX so `all/raw/processed/has-processed-output` now lives inside a compact filter icon menu next to search instead of occupying a full inline row.
- Widened the library pane and changed thumbnail list into a denser 2-card-per-row grid for faster visual scanning.
- Fixed invalid nested button structure in thumbnail cards to prevent Next.js hydration errors, and polished top-right duplicate/delete icon contrast for clearer visibility.
- Added workflow/storage integration placeholders in UI for upcoming Drive persistence and publish-node thumbnail selection.
- Added/updated tests for navigation/route registry and thumbnail panel structure markers.
- Verification (FAST-VIDEO-005): `npm run test -- --run src/components/layout/navigation.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts` pass (2 files / 12 tests); `npm run build` pass with existing ESLint circular-config warning.

## FAST-AI-001 - Switch Default Translation Provider/Model to 9router

- Bumped app version from `0.9.10` to `0.9.11` as a patch release for translation default routing.
- Changed default translation model from `llama-3.1-8b-instant` to `cx/gpt-5.3-codex-low` in shared multilingual defaults and Workspace node defaults.
- Replaced fallback provider label `Default (env GROQ_API_KEY)` with `9router (openai-compatible)` in Workspace and Audio Transcript selector UIs.
- Added reusable default-provider resolver so empty provider configs resolve to the active `9router (openai-compatible)` provider id when available.
- Kept Whisper/STT paths unchanged; only translation/metadata/dubbing fallback provider-model defaults were updated.

## FAST-WORKSPACE-031 - Add Cleanup Assets Workspace Node

- Bumped app version from `0.9.9` to `0.9.10` as a patch release for Workspace cleanup automation.
- Added a dedicated `cleanup` node category and new `Cleanup Assets` node with explicit `Delete original asset` / `Delete processed asset` runtime controls.
- Extended Workspace planning with `cleanup-assets` steps that can run after stored-asset paths or after `Publish Social`.
- Publish-gated cleanup now runs only when the upstream publish step succeeded, then reuses the existing storage asset DELETE API so selected Drive files, metadata, and related intake history are cleaned consistently.
- Verification (FAST-WORKSPACE-031): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass.

## FAST-STORAGE-007 - Delete Drive Files From Storage Library

- Bumped app version from `0.9.8` to `0.9.9` as a patch release for Storage Library deletion behavior.
- Deleting a Drive-backed asset from Storage Library now deletes the matching Google Drive file before removing the local asset record.
- Drive deletion reuses the stored asset file id and configured Drive credentials, and local metadata is preserved if the remote delete fails.
- Storage Library deletion also removes intake run history and trace records tied to the deleted asset, so Video Intake no longer keeps orphaned `No preview` rows.
- Non-Drive assets keep the existing metadata-only delete behavior.
- Verification (FAST-STORAGE-007): `npm run test -- --run src/lib/storage/asset-delete.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` pass.

## FAST-OPS-006 - Notify When Background Tasks Finish

- Bumped app version from `0.9.7` to `0.9.8` as a patch release for completion awareness.
- Added one-shot completion detection for newly finished Background Progress jobs while ignoring historical tasks restored from browser storage.
- Added top-right in-app completion toasts when OmniVideo is the visible tab.
- Added optional browser notifications for hidden tabs after the user explicitly enables notification permission from the Progress modal.
- Added an explicit `Send test notification` action plus explanatory copy so permission can be verified without waiting for a real background job to finish.
- Verification (FAST-OPS-006): `npm run test -- --run src/lib/ui/progress-notifications.test.ts src/components/layout/topbar.test.ts` pass.

## FAST-WORKSPACE-030 - Reframe Default Workspace Canvas View

- Bumped app version from `0.9.6` to `0.9.7` as a patch release for Workspace canvas framing.
- Reduced the initial Workspace canvas scale from `0.88` to `0.52` so seeded flows open with a wider overview without becoming too small after follow-up tuning.
- Shifted the initial canvas x-offset from `32` to `-24` so the first view moves left after user review corrected the intended direction.
- Moved the initial transform into a named `DEFAULT_CANVAS_VIEW` constant for easier future tuning.
- Verification (FAST-WORKSPACE-030): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass.

## FAST-UX-027 - Color-code Asset Lifecycle Tags

- Bumped app version from `0.9.5` to `0.9.6` as a patch release for asset browsing clarity.
- Added reusable lifecycle badges so `raw`, `processed`, and `has-processed-output` are visually distinct instead of disappearing inside plain metadata text.
- Chose restrained lifecycle colors: amber for raw source material, emerald for processed outputs, and rose for raw assets that already produced a processed derivative.
- Surfaced lifecycle badges in Storage Library plus asset pickers across Audio Transcript, Workspace, Video Tools Lab, and Publish Records.
- Verification (FAST-UX-027): `npm run test -- --run src/lib/storage/asset-lifecycle-tags.test.ts src/features/storage/storage-library-panel.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/features/social/publish-records-panel.test.ts` pass (6 files / 34 tests).

## FAST-AUDIO-056 - Add Full Transcript Context to Every Translation Chunk

- Bumped app version from `0.9.4` to `0.9.5` as a patch release for long-form translation continuity.
- Every transcript translation request now includes the full source transcript as read-only context while still returning output only for the active chunk.
- Adaptive retry/split requests and the single-segment plain-text fallback keep the same full-transcript context, so long narrative references do not disappear when a chunk is retried.
- Strengthened the translation prompt to explicitly separate global context from the current `Segments` output contract.
- Verification (FAST-AUDIO-056): `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts` pass (1 file / 15 tests).

## FAST-WORKSPACE-029 - Smooth Preprocess Speed Editing and Mark Raw Sources with Outputs

- Bumped app version from `0.9.3` to `0.9.4` as a patch release for Workspace editing and asset lifecycle clarity.
- Replaced eager preprocess speed coercion with a decimal-friendly runtime number input that preserves draft text while the user edits and commits only validated values on blur/Enter.
- Raw source assets now gain `has-processed-output` after Workspace successfully stores a processed derivative, while the new derived asset keeps the existing `processed` lifecycle tag.
- Extended storage asset metadata patching to accept sanitized tag updates and taught folder inference to ignore the new lifecycle marker.
- Verification (FAST-WORKSPACE-029): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/storage/asset-folder.test.ts src/app/api/storage/assets/[assetId]/route.test.ts` pass (3 files / 21 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-INTAKE-006 - Restore Public Bilibili 1080p Intake via HTML5 Fallback

- Bumped app version from `0.9.2` to `0.9.3` as a patch release for Bilibili intake reliability.
- Added a public no-cookie Bilibili HTML5 progressive fallback that recovers `1080p` A/V media when the default DASH response only exposes lower video rows.
- Format listing now surfaces `bilibili-html5-*` progressive entries and recommends the HTML5 1080p path when it is better than the default DASH formats.
- Preserved the merged-media resolver path as fallback for non-Bilibili and lower-quality requests.
- Verification (FAST-INTAKE-006): `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py` pass (17 tests); `npm run test -- --run src/lib/video-intake/internal-resolver.test.ts src/app/api/video-intake/formats/route.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/video-intake-v2-panel.test.ts` pass (3 files / 13 tests); live Bilibili smoke for both `BV1uG411A7N5` and the user-reported `BV1DA411Y78D` returns `bilibili-html5-80`, `1080p`, `hasAudio=true`, `hasVideo=true`.

## FAST-AUDIO-055 - Prevent Forced Long Pauses Inside Split Voice Segments

- Bumped app version from `0.9.1` to `0.9.2` as a patch release for shared audio timing polish.
- Hardened the shared word-aware voice splitter so it only creates sub-chunks when translated sentence chunks and detected source timing clusters map one-to-one.
- Ambiguous merged segments now stay as one continuous voice chunk instead of preserving a speculative long internal pause that can force the remaining speech to catch up at `1.75x`.
- Audio Transcript, Workspace voice generation, and Workspace dubbing inherit the same fix because they all reuse the shared voice timing helper.
- Verification (FAST-AUDIO-055): `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (4 files / 33 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-UX-026 - Polish Folder Selector and Remove Navigation Leave Warnings

- Bumped app version from `0.9.0` to `0.9.1` as a patch release for intake/navigation polish.
- Replaced browser-native folder datalists in Video Intake and Local Upload Intake with standard select controls that match the existing Storage Provider dropdown style.
- Preserved folder creation by adding a `New folder...` option that reveals a dedicated input only when needed.
- Removed cross-section leave confirmation warnings when navigating away from Workspace or Audio Transcript.
- Verification (FAST-UX-026): `npm run test -- --run src/components/layout/app-shell.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts` pass (3 files / 7 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## P1-STORAGE-007 - Lightweight Folder Metadata and Asset Search

- Bumped app version from `0.8.7` to `0.9.0` as a backward-compatible feature release for lightweight storage organization.
- Replaced free-form intake tag inputs with `Folder` fields on Video Intake and Local Upload Intake, backed by suggestions from folders already used in source/asset metadata.
- Added lightweight folder propagation so raw assets persist the selected folder with `raw`, while Workspace-stored artifacts inherit the upstream folder and persist `processed`.
- Added accent-insensitive asset search helpers and wired searchable video asset pickers into Workspace, Audio Transcript, Video Tools Lab, and Publish Records.
- Updated source/storage/data-model docs to distinguish logical folders from provider folders and system lifecycle tags.
- Verification (P1-STORAGE-007): `npm run test -- --run src/lib/storage/asset-folder.test.ts src/lib/video-intake/validation.test.ts src/lib/video-intake/local-validation.test.ts src/lib/video-intake/asset-metadata.test.ts src/app/api/storage/folders/route.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/features/social/publish-records-panel.test.ts src/lib/video-intake/media-resolver.test.ts` pass (12 files / 58 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-028 - Remove Blue Focus Outline from Edge Delete Control

- Bumped app version from `0.8.5` to `0.8.6` as a patch release for Workspace interaction polish.
- Removed the browser-default blue outline that appeared after clicking the SVG edge-delete control.
- Added a dedicated `workspace-edge-delete-control` style hook that suppresses mouse-click focus chrome while preserving an intentional theme-compatible `focus-visible` state for keyboard navigation.
- Verification (FAST-WORKSPACE-028): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 14 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-027 - Fix Edge Delete Hitbox and Curve Drag Preview

- Bumped app version from `0.8.4` to `0.8.5` as a patch release for Workspace link interaction polish.
- Replaced the SVG `foreignObject`-embedded edge delete button with an SVG-native centered control and a slightly larger invisible hit circle so the visible delete icon and click target share the same geometry.
- Added pointer-down isolation on the delete control so canvas panning does not interfere with edge deletion clicks.
- Switched in-progress drag-link previews from a straight `L` segment to the shared cubic Bézier path builder used by Workspace links.
- Verification (FAST-WORKSPACE-027): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/features/workspace/workspace-linking-interactions.test.ts` pass (2 files / 15 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-026 - Add Subtle Dot Grid to Workspace Canvas

- Bumped app version from `0.8.3` to `0.8.4` as a patch release for Workspace canvas polish.
- Added a subtle theme-aware dotted background to the transformed Workspace coordinate plane so the node area feels less empty without competing with node cards or edges.
- Anchored the pattern to the movable/zoomable flow plane so dots follow pan and zoom together with nodes and edges.
- Raised dot contrast/size from the first pass so the pattern is actually visible on light themes while remaining understated.
- Hardened existing Workspace source-level assertions to tolerate harmless formatting changes while adding coverage for the new `workspace-canvas-grid` hook.
- Verification (FAST-WORKSPACE-026): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 13 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass. Browser QA against `http://127.0.0.1:3000/workspace` was not completed because the in-app browser policy blocked that local target in this session.

## FAST-OPS-005 - Persist Finished Background Progress Tasks Across Reloads

- Bumped app version from `0.8.2` to `0.8.3` as a patch release for Background Progress history durability.
- `Background Progress` now persists finished task history in browser storage and restores it after reload.
- `Clear finished` and per-task dismiss now also remove the corresponding persisted history, while in-flight tasks remain session-scoped to avoid stale “running” entries after a reload.
- Added safe fallback handling for corrupted persisted payloads so progress history never breaks the modal.
- Verification (FAST-OPS-005): `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts` pass (2 files / 7 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-025 - Warn Missing Mask Setup in Flow Setup and Soften Progress Separators

- Bumped app version from `0.8.1` to `0.8.2` as a patch release for Workspace/UI polish.
- Softened internal `Background Progress` separators so row dividers no longer visually compete with main card borders.
- Added a non-blocking `Flow Setup` warning when `Blur + subtitle overlay` uses an upstream Storage Asset that has no saved `videoEditSetup` from `Video Tools Lab`.
- `Flow Setup` now distinguishes blocking issues from review-only warnings; warnings remain visible but do not disable `Run Flow`.
- Verification (FAST-WORKSPACE-025): `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (3 files / 19 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-AUDIO-054 - Lower Minimum Voice Speed Floor to 1.30x

- Bumped app version from `0.8.0` to `0.8.1` as a patch release for audio timing polish.
- Lowered the shared Piper timeline minimum speed floor from `1.40x` to `1.30x`.
- Lowered the Audio Transcript `Voice speed` display floor from `1.40x` to `1.30x`.
- Workspace audio nodes automatically inherit the same `1.30x` runtime floor because they use the shared Piper alignment settings.
- Verification (FAST-AUDIO-054): `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 39 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-OPS-004 - Step-aware Background Progress Telemetry

- Bumped app version from `0.7.0` to `0.8.0` as a backward-compatible feature release for richer runtime progress visibility.
- Upgraded `Background Progress` from a flat task list to a step-aware flow timeline with per-step status, live elapsed duration, and explicit failure details.
- Workspace flow progress no longer fabricates overall percentages from completed step count; flows now use honest indeterminate task progress plus real step completion summaries.
- Added lightweight measured download progress for Workspace file downloads when response size is known, while keeping non-measurable processing steps truthful with status text + elapsed time instead of fake percentages.
- Verification (FAST-OPS-004): `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 15 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass. Browser QA against `http://localhost:3000` was not completed because the in-app browser policy blocked that local target in this session.

## FAST-WORKSPACE-024 - Fix Dubbing Voice Timeline Drift for Preprocess Flows

- Fixed Workspace dubbing timeline drift for preprocess flows (for example `0.7x`) where voice could end noticeably earlier than slowed video timeline.
- Workspace runtime now auto-forces `ttsAlignmentMode=strict` when `audio.video-dubbing` consumes a `video.preprocess` source with speed different from `1x` and node mode is still `balanced`.
- Updated Workspace node defaults/seeds for `audio.voice-generation` and `audio.video-dubbing` to `strict` alignment to match Audio Transcript timing expectations out of the box.
- Added explicit UI hint in Workspace dubbing config: preprocess speed changes can trigger strict alignment at runtime to avoid early voice completion.
- Verification (FAST-WORKSPACE-024): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass; `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-023 - Fix Mirror/Blur Mismatch for Saved Setup Fallback

- Fixed Workspace `edit.mask-region` runtime mismatch where saved blur regions from Storage Asset setup could target the wrong side when upstream video had already passed through `Mirror video`.
- Added upstream video mirror-parity detection and auto-horizontal-mirror for **fallback** setup blur regions so they align with the runtime video orientation.
- Preserved explicit user overrides: if node `blurRegionsJson` is set manually, Workspace does not auto-mirror it.
- Updated `edit.mask-region` runtime config copy to clarify mirror behavior and show when fallback blur regions are auto-mirrored due to upstream mirror transforms.
- Verification (FAST-WORKSPACE-023): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (55 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-021 - Persist VI Metadata on Stored Artifacts and Align Workspace Edit Runtime with Video Tools Lab

- Fixed Workspace artifact storage metadata gap: after `store-artifact` succeeds, Workspace now patches the newly created Storage Asset with generated Vietnamese metadata (`vietnameseTitle`, `vietnameseDescription`, `vietnameseHashtags`) when `Generate VI metadata` output exists.
- Improved runtime setup sourcing for `edit.mask-region`: Workspace edit execution now resolves saved `videoEditSetup` from upstream `source.asset` via graph traversal, not only when the direct source node is `source.asset`.
- Improved subtitle render consistency with Video Tools Lab by probing runtime source video dimensions and sending `subtitlePlayResX` / `subtitlePlayResY` to `/api/video-processing/edit` in Workspace edit execution.
- Metadata patch failures are handled as non-fatal warnings so successful video upload/storage is not rolled back.
- Verification (FAST-WORKSPACE-021): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (55 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-020 - Persist Resume Checkpoints and Strengthen Continue Failed Flow

- Added lightweight Workspace runtime resume snapshot persistence in localStorage (graph signature, node run statuses, stored asset checkpoints, generated VI metadata checkpoints, run error/result) without persisting large media artifacts.
- Workspace now hydrates resume checkpoints after navigation/reload when the current graph signature matches the saved snapshot.
- Strengthened `Continue Failed Flow` with publish-only continuation mode: when at least one `store-artifact` checkpoint succeeded and there are failed steps, non-publish steps previously marked success can be skipped so user can retry failed publish directly after fixing social token issues.
- `Clear` now also removes persisted runtime resume snapshot for Workspace.
- Verification (FAST-WORKSPACE-020): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (53 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-019 - Publish Fallback to Generate VI Metadata When Overrides Are Empty

- Clarified and reinforced Workspace `Publish Social` fallback behavior: when `Title`, `Caption`, or `Hashtags` are empty, publish runtime automatically uses metadata generated by `Generate VI metadata`.
- Publish runtime now prefers metadata from an upstream `Generate VI metadata` node connected to that publish path before falling back to any available generated metadata.
- Updated `social.publish` inspector copy so users know empty fields will auto-fallback to generated metadata, then to upstream asset metadata if generated output is unavailable.
- Fixed follow-up runtime wiring bug in `Flow Setup` modal where `runtimeVietnameseMetadataByNodeId` was referenced before being passed into `WorkspaceFlowSetupModal`, causing `ReferenceError` on `Run Flow`.
- Verification (FAST-WORKSPACE-019): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass; `npm run guard:version` pass.

## FAST-WORKSPACE-018 - Remove Duplicate Transcript/Voice Branch from Full Processing Seed

- Simplified `Seed Asset Transcript Full Processing` to remove redundant `Audio Transcript -> Translate Transcript -> Voice Generation` branch that duplicated `Video Dubbing` internals.
- Updated the seed path to run a single dubbing chain: `Storage Asset -> Preprocess -> Video Dubbing -> Mirror -> Mask/Subtitles -> Save to Storage`.
- Kept `Generate VI Metadata` and subtitle overlay support by reusing translated transcript output emitted from `audio.video-dubbing`.
- Extended workspace planner so `Generate VI Metadata` and `Mask Logo/Subtitles` can consume transcript output from `audio.video-dubbing` in addition to `text.translate-transcript`.
- Verification (FAST-WORKSPACE-018): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass; `npm run guard:version` pass.

## FAST-WORKSPACE-017 - Mask Setup Hydration, Flow Setup Close Button Polish, and Preprocess Enable Toggle

- Bumped app version from `0.6.0` to `0.7.0` as a backward-compatible feature release for Workspace runtime config control.
- `edit.mask-region` now resolves effective blur/subtitle config from upstream Storage Asset `videoEditSetup` when node fields are still default, while still prioritizing explicit node overrides.
- Added clear in-UI signal in `Mask Logo/Subtitles` config when saved video setup is being used from the selected upstream Storage Asset.
- Aligned `Flow Setup` modal close icon button size/padding with shared app modal button pattern.
- Added `Enable preprocess` toggle to `video.preprocess`; when disabled, Workspace runner now bypasses transform and passes source video through as a runtime artifact for downstream nodes.
- Verification (FAST-WORKSPACE-017): `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts` pass (2 files / 47 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-WORKSPACE-016 - Add Pre-run Flow Setup Modal for Workspace Nodes

- Bumped app version from `0.5.0` to `0.6.0` as a backward-compatible feature release for centralized Workspace flow setup.
- Changed `Run Flow` so it opens a `Flow Setup` modal before execution instead of immediately starting the runner.
- Added a pre-run readiness summary plus ordered node cards that show node label, node type, node id, and per-node setup issues before the user runs a flow.
- Reused the existing per-node runtime config UI inside the modal so Inspector edits and modal edits continue to write to the same `node.config` source of truth.
- Added setup helper coverage for execution-order node collection and readiness validation across missing file, URL, Storage Asset, storage account, social account, Facebook Page, and trace-tag cases.
- Verification (FAST-WORKSPACE-016): `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 10 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass. Full `npm run test` currently reports two unrelated pre-existing failures in navigation label and transcript prompt assertions outside this task.

## FAST-WORKSPACE-015 - Provider Thumbnails and Visual Workspace Asset Picker

- Switched compact asset thumbnails in Video Intake, Audio Transcript, and Workspace to Google Drive provider thumbnails via the existing Drive thumbnail helper instead of probing video streams.
- Drive-backed assets now load small image thumbnails directly; assets without a reliable provider thumbnail (for example Telegram) fall back without issuing video thumbnail requests.
- Replaced the Workspace `source.asset` raw select with a visual asset picker using compact thumbnails and asset metadata.
- Verification (FAST-WORKSPACE-015): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/video-intake/drive-thumbnail.test.ts` pass (4 files / 19 tests); `npm run build` pass with existing ESLint circular-config warning; `npm run guard:version` pass.

## FAST-AUDIO-053 - Show Inline Asset Videos in Audio Transcript Source Picker

- Replaced the per-asset `Preview` / `Hide` CTA in `Audio Transcript -> Source Video` with always-visible inline video inside each asset row.
- Kept existing asset selection behavior while removing the extra preview click step.
- Verification (FAST-AUDIO-053): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts` pass.

## FAST-INTAKE-005 - Show Direct Thumbnails in Video Intake Run History

- Updated `Video Intake -> Intake Run History` to show inline video thumbnail frame directly in each row instead of the `Preview` text CTA.
- Kept `No preview` fallback for unavailable/blocked assets.
- Verification (FAST-INTAKE-005): `npm run test -- --run src/features/video-intake/video-intake-panel.test.ts` pass.

## FAST-WORKSPACE-014 - Add Full Storage-Asset Transcript Processing Seed

- Added a new Workspace seed: `Seed Asset Transcript Full Processing`.
- Seed starts from `Storage Asset` and includes: `Video Preprocess`, `Audio Transcript`, `Translate Transcript`, `Voice Generation`, `Video Dubbing`, `Mirror Video`, `Mask Logo/Subtitles`, `Save to Storage`, and `Generate VI Metadata`.
- Seed topology is aligned with current planner constraints by feeding `Mask` from both mirrored video and translated transcript.
- Verification (FAST-WORKSPACE-014): `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts` pass.

## FAST-WORKSPACE-013 - Direct Canvas Linking and Edge Deletion

- Added hover-visible connector handles on all four sides of Workspace nodes so links can be created by dragging directly on the canvas.
- Refined connector feedback so the active source handle visibly darkens once selected for dragging.
- During a drag, the current destination node now reveals all four handles, and the nearest destination handle darkens to make the intended drop point explicit.
- Preserved the existing Inspector `Link from node` workflow while routing drag-created links through the same connection validation rules.
- Added interactive edge hit areas plus an on-canvas delete control for removing links without deleting nodes.
- Verification (FAST-WORKSPACE-013): `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 41 tests); `npm run build` pass with existing ESLint circular-config warning; browser verification not completed because the in-app browser policy blocked access to the local dev URL.

## FAST-UX-025 - Align Workspace Outer Spacing with App Pages

- Fixed Workspace route outer wrapper spacing mismatch by aligning `ContentRouter` workspace padding from `p-3` to `p-5`, consistent with other app sections.
- Added source-level regression coverage for workspace outer padding class to prevent future spacing drift.
- Verification (FAST-UX-025): `npm run test -- --run src/components/layout/content-router.test.ts` pass; `npm run guard:version` pass.

## FAST-AUDIO-052 / FAST-WORKSPACE-012 - Promote Video Preprocess and Workspace Audio Functional Parity

- Bumped app version from `0.4.25` to `0.5.0` as a backward-compatible feature release for promoted preprocess UX and executable Workspace media flow upgrades.
- Promoted on-demand `Video Preprocess` to the main `Audio Transcript` page, visible by default but still opt-in, with `0.7x` as the selected speed baseline.
- Isolated the heavy transcript segment subtree and memoized timing derivations so preprocess-only state changes do not rebuild the largest result surfaces unnecessarily.
- Added executable Workspace node `video.preprocess`, including planner/runtime execution, Inspector config, seed flow, and downstream artifact support for transcript/dubbing/mirror/storage paths.
- Brought Workspace audio nodes closer to the main Audio Transcript flow: transcription now accepts Storage Asset and preprocess artifact upstream, voice generation/dubbing reuse word-aware timing preparation, and Piper nodes expose `noiseScale`, `noiseW`, and `sentenceSilence`.
- Updated Workspace node/domain docs plus tests for preprocess graphs, Storage Asset transcription, seed registration, and dubbing timing preparation.
- Verification (FAST-AUDIO-052 / FAST-WORKSPACE-012): `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts` pass (5 files / 58 tests); `npm run build` pass; `npm run guard:version` pass.

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
