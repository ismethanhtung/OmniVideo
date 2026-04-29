# OmniVideo Changelog

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

### Changed

- Thay Edge-TTS ở Audio Transcript bằng Piper local; controls chuyển sang binary/model/config/speaker/scale và default path portable theo repo (`piper`, auto `piper/model.onnx`, auto `piper/model.onnx.json`).
- Tối ưu Groq segment translation: các chunk độc lập chạy song song có giới hạn thay vì tuần tự, trong khi vẫn giữ đúng order và `id/start/end`.
- Mở rộng `planWorkspaceFlow` cho voice/dubbing artifact steps thay vì chỉ dừng ở transcript translation.
- Mở rộng Workspace artifact flow để `edit.mirror` có thể nhận `source.file` hoặc video artifact upstream rồi nối tiếp sang `Save to Storage`.

### Fixed

- Sửa Piper sandbox không còn chờ timeout khi thiếu runtime dylib/model/config: adapter preflight các file bắt buộc trước khi spawn và UI mặc định trỏ vào `piper/model.onnx` + `piper/model.onnx.json` trong repo.
- Chuyển Piper runtime sang package self-contained trong `piper/.venv`, app dùng `piper/.venv/bin/piper`, ghi WAV qua temp output file rồi đọc lại thay vì phụ thuộc stdout streaming; lỗi ONNX không tương thích được rút gọn thành message rõ.
- Xoá runtime/test Edge-TTS khỏi source Audio Transcript; generated WAV chỉ dùng temp server file trong request rồi xoá, không persist vào storage.
- Sửa bước dịch transcript đôi khi còn sót chữ Hán/CJK trong câu tiếng Việt, ví dụ `ngây呆`, bằng retry quality gate theo segment nhỏ hơn và có giới hạn.
- Sửa Workspace flow lỗi mơ hồ `fetch failed`: runner giờ hiển thị rõ action + endpoint + API error/errorCode (hoặc HTTP status) để debug nhanh step thất bại.

### Notes

- Task IDs: FAST-AUDIO-010, FAST-AUDIO-011, FAST-AUDIO-012, FAST-AUDIO-013, FAST-AUDIO-014, FAST-AUDIO-015, FAST-AUDIO-016, P2-AUDIO-007, P2-VIDEO-001
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
