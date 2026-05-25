# OmniVideo Changelog

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
