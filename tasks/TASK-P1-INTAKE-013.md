# [P1-INTAKE-013] Harden yt-dlp Format Selection and Streaming Downloads

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: P1-INTAKE-013
- Phase: P1
- Target Phase: P1
- Domain: Video Intake / Stability
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: Codex
- Reviewer: Tung
- Status: Review

## 2. Context

- Lý do: Bilibili URL `https://www.bilibili.com/video/BV1W2oSBWEYw/` có thể tải về không có tiếng vì pipeline hiện chỉ chọn một direct media URL theo quality, trong khi nhiều nguồn công khai dùng video/audio stream tách rời. App cũng có path tải video đọc toàn bộ file vào RAM, gây rủi ro chiếm hết RAM khi video lớn.
- Bài toán cần giải quyết: Cho người dùng kiểm soát format yt-dlp bài bản hơn, tránh lỗi cookie không cần thiết với video công khai, và chuyển các path download/upload chính sang streaming hoặc temp-file streaming thay vì buffer toàn-file.
- Tài liệu liên quan: `docs/SYSTEM-SUMMARY.md`, `docs/governance/testing-rules.md`, `docs/domains/video-pipeline.md`, `tasks/TASK-P1-INTAKE-005.md`, `tasks/TASK-P1-INTAKE-010.md`

## 3. Scope

- In scope:
  - Sửa internal yt-dlp resolver để list formats đầy đủ và chọn selector có audio theo mặc định cho Bilibili/Douyin/YouTube.
  - Hỗ trợ download qua yt-dlp/ffmpeg merge vào temp file khi format là video+audio tách rời, rồi stream file đó lên storage hoặc trả về API.
  - Tránh browser-cookie fallback cho public Bilibili; cookie fallback chỉ áp dụng cho nền tảng cần thiết như Douyin/TikTok.
  - Loại bỏ các `arrayBuffer()` toàn-video ở path URL resolve/download chính khi có thể stream.
  - Thêm regression tests cho format selection, public cookie behavior, và streaming response.
- Out of scope:
  - Xây dựng UI nâng cao hoàn chỉnh cho mọi option CLI của yt-dlp.
  - Hỗ trợ private/restricted video cần account/cookie thật.
  - Tối ưu mọi pipeline audio/video khác ngoài các path liên quan trực tiếp đến URL video intake/download.

## 4. Input / Output

- Input: Public video URLs từ YouTube, Bilibili, Douyin/TikTok; quality preference hiện có; optional yt-dlp format selector.
- Output mong đợi: Video tải về có audio khi nguồn có audio public; format list đủ dữ liệu để UI/API có thể chọn; download/upload không giữ toàn bộ video trong RAM.

## 5. Acceptance Criteria

1. Default resolver không chọn video-only format khi có audio-compatible format/combination khả dụng.
2. Bilibili public extraction không cố dùng browser cookies hoặc cookie file; lỗi cookie không xuất hiện cho public path.
3. Resolver có khả năng trả danh sách formats đầy đủ từ yt-dlp gồm format id, codecs, resolution, filesize, protocol, và audio/video flags.
4. Video Intake storage upload path có thể stream output từ yt-dlp temp file hoặc direct response, không cần giữ toàn bộ video trong memory.
5. Workspace URL resolve-file API trả body streaming thay vì `arrayBuffer()` toàn-file.
6. Tests bao phủ format selector regression, cookie policy, temp-file/stream metadata, và response streaming behavior.

## 6. Technical Plan

1. Refactor `internal-resolver.py` để tách list formats, format summarization, selector mặc định `bv*+ba/b`, và output mode direct vs ytdlp-download.
2. Mở rộng TypeScript resolver/storage types để nhận `downloadMode`, `formatSelector`, `hasAudio`, và optional local temp file output.
3. Cập nhật storage adapters và resolve-file route để upload/trả response bằng stream, cleanup temp file sau khi dùng.
4. Thêm tests Python/TypeScript cho các behavior chính và cập nhật task/changelog evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/video-intake/*`, `src/app/api/video-intake/resolve-file/*`, `src/features/video-intake/*` nếu cần expose format data.

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `python3 src/lib/video-intake/internal-resolver-py.test.py`
   - `npm test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/storage-adapters.test.ts src/app/api/video-intake/resolve-file/route.test.ts`
2. Failure cases cần thử:
   - Bilibili/DASH format list có video-only best và audio-only best nhưng default selector vẫn yêu cầu merge video+audio.
   - Public platform không nhận cookie fallback dù env cookie/browser tồn tại.
   - Upstream fetch lỗi vẫn trả error chuẩn, không giữ partial buffer lớn.
3. Kết quả mong đợi: Tests pass, regression cũ không tái diễn.

## 9. Observability

- Metrics: step latency hiện có trong `runTrackedStep`.
- Logs: error detail từ resolver/storage giữ nguyên nhưng thêm thông tin format/download mode khi hữu ích.
- Error codes: giữ `VID_RESOLVER_FAILED`, `STG_DRIVE_SOURCE_STREAM_FAILED`, `SYS_WORKSPACE_URL_RESOLVE_FAILED`.

## 10. Risks & Rollback

- Risks: yt-dlp merge phụ thuộc ffmpeg trong environment; một số provider storage vẫn yêu cầu stream hợp lệ với content-length.
- Rollback strategy: quay lại direct URL resolver path cho từng provider nếu temp-file download gây lỗi, nhưng giữ tests mô tả regression audio.

## 11. Deliverables

1. Hardened yt-dlp resolver and format listing/download strategy.
2. Streaming storage/API paths for URL media.
3. Regression tests and task/changelog updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden Video Intake yt-dlp format control so public Bilibili/Douyin downloads preserve audio and avoid full-video RAM buffering.

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

- Assumptions:
  - Public Bilibili/Douyin video không nên yêu cầu cookie theo mặc định; cookie chỉ là fallback có kiểm soát cho nền tảng thật sự cần.
  - Có thể dùng temp file nội bộ để yt-dlp merge video+audio rồi stream lên provider, miễn cleanup đúng.
- Blockers:
  - None.
- Verification evidence:
  - Root cause confirmed on `https://www.bilibili.com/video/BV1W2oSBWEYw/`: yt-dlp lists audio-only formats `30216/30232/30280` and video-only formats such as `100026`; old resolver selected `100026` direct URL with `acodec=none`.
  - New resolver returns `downloadMode=yt-dlp-file`, `formatId=100026+30280`, `hasAudio=true`, `hasVideo=true` for the same public URL.
  - Download smoke created merged MP4 `7,081,086` bytes; bundled ffmpeg probe shows both `Video: av1` and `Audio: aac`.
  - Reopened after user reported repeated `/api/storage/assets/:id/download?disposition=inline` `206` requests followed by one `500` and laptop RAM/network instability. Root cause under investigation: table-level `<video preload="metadata">` fan-out in Video Intake / Local Intake / Storage Library.
  - Fixed table/picker preview fan-out: Video Intake, Local Intake, Storage Library, and Publish Records now show inert preview placeholders in lists; only detail modals create an inline video request.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-intake/internal-resolver-py.test.py`
  - `src/lib/video-intake/internal-resolver.test.ts`
  - `src/lib/video-intake/validation.test.ts`
  - `src/lib/video-intake/media-resolver.test.ts`
  - `src/lib/video-intake/storage-adapters.test.ts`
  - `src/app/api/video-intake/resolve-file/route.test.ts`
  - `src/app/api/video-intake/formats/route.test.ts`
  - `src/app/api/storage/assets/[assetId]/download/route.test.ts`
- Test commands executed:
  - `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver-py.test.py`
  - `npm test -- --run src/lib/video-intake/internal-resolver.test.ts src/lib/video-intake/validation.test.ts src/lib/video-intake/storage-adapters.test.ts src/app/api/video-intake/resolve-file/route.test.ts src/app/api/video-intake/formats/route.test.ts`
  - `npm test`
  - `npm run build`
  - `npm test -- --run src/app/api/storage/assets/[assetId]/download/route.test.ts src/lib/video-intake/storage-adapters.test.ts src/app/api/video-intake/resolve-file/route.test.ts src/app/api/video-intake/formats/route.test.ts`
  - Network smoke: `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py formats https://www.bilibili.com/video/BV1W2oSBWEYw/ best`
  - Network smoke: `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py resolve https://www.bilibili.com/video/BV1W2oSBWEYw/ best`
  - Network smoke: `PYTHONPATH=.vendor/python python3 src/lib/video-intake/internal-resolver.py download https://www.bilibili.com/video/BV1W2oSBWEYw/ best "" /private/tmp/omnivideo-bili-test-2`
  - Probe: `node_modules/ffmpeg-static/ffmpeg -hide_banner -i /private/tmp/omnivideo-bili-test-2/在桌底埋伏时发生这种事我也不想的啊！！-BV1W2oSBWEYw.mp4`
- Test results summary:
  - Python resolver tests pass: 14 tests.
  - Targeted Vitest pass: 5 files / 25 tests.
  - Full Vitest pass: 64 files / 298 tests.
  - Build pass; warnings are pre-existing unused imports/state outside this task.
