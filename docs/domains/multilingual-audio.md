# Multilingual Audio (Việt + Anh Priority)

## 1. Objective

Hỗ trợ xử lý audio đa ngôn ngữ cho video linh hoạt: phát hiện ngôn ngữ nguồn, che tiếng gốc khi cần, lồng tiếng mới, và đồng bộ subtitle theo timeline.

## 2. Current Status

- Domain này được đánh dấu `research-heavy`.
- Chưa phải ưu tiên triển khai trong phase setup.
- Cần thiết kế kỹ để tránh lỗi sync và chất lượng voice thấp.
- MVP đầu tiên đã có cho ZH transcription: upload video/audio, extract audio
  speech-ready thành MP3 mono 16k 64kbps bằng bundled `ffmpeg-static`, gọi Groq
  `whisper-large-v3-turbo`, và trả transcript kèm segment/word timestamps. Giới
  hạn upload Groq áp lên audio đã extract, không áp lên video nguồn. MVP này
  chưa tách voice khỏi nhạc nền bằng source-separation model.
- Bước dịch segment-level đã có trên cùng Audio Transcript flow: Groq chat LLM
  dịch từng segment sang tiếng Việt, giữ nguyên `id/start/end`, có model selector
  mặc định `llama-3.1-8b-instant`. Translator xử lý các chunk độc lập song song
  có giới hạn và retry segment còn sót ký tự CJK để giảm latency mà vẫn giữ đúng
  timeline.
- Bước sinh voice-over trên Audio Transcript flow hiện dùng Piper local qua CPU:
  nhận Vietnamese translated segments, cấu hình executable/model/config/speaker
  và các scale của Piper. Default path portable theo repo: UI có thể gửi
  `piper` và để trống model/config để server tự resolve `piper/.venv/bin/piper`,
  `piper/model.onnx`, `piper/model.onnx.json`. Output trả WAV để
  preview/download trong UI, chưa persist vào storage. Khi bật balanced timing,
  server synthesize từng segment với sentence silence rất ngắn, giới hạn pause
  dài giữa segments và chặn speed-up quá mạnh để ưu tiên giọng tự nhiên hơn
  timestamp tuyệt đối. Response trả thêm diagnostics theo segment gồm raw
  duration, target/scheduled duration, pause, drift, speed factor và warning
  codes để phát hiện câu cần rewrite hoặc dịch ngắn hơn.
- Workspace hiện có node `audio.voice-generation` để sinh WAV từ translated
  transcript và node `audio.video-dubbing` để chạy trọn MVP ZH->VI: transcribe,
  translate, Piper TTS, duck audio gốc rồi mux MP4 bằng ffmpeg. Node dubbing trả
  preview/download trong Workspace và có thể nối sang `storage.upload` để persist
  thành asset trước khi publish. Các node audio Workspace reuse word-aware timing
  preparation của Audio Transcript khi có word timestamps, expose đủ Piper
  controls cần thiết, và `audio.chinese-transcribe` nhận cả Storage Asset hoặc
  artifact sau `video.preprocess`. Bước translate trong node dubbing dùng cùng AI
  Provider Management với Audio Transcript: có thể chọn provider active, load
  models từ provider đó, hoặc dùng default env `GROQ_API_KEY`.
- VIP Processing có thêm remote EC2 mode dành cho seed riêng
  `Seed Remote VIP Voice Render`: transcript/translation/metadata vẫn chạy ở
  local control-plane, còn Piper voice generation và final ffmpeg render chạy ở
  worker EC2 qua `/api/audio/video-vip-voice-render`. Mode fallback
  `voiceRenderExecutionMode=remote` vẫn chạy Piper local và chỉ offload final
  render. Source video luôn upload bằng multipart; voice+render mode gửi
  transcript/translation/tts settings sang worker thay vì gửi voice WAV, còn
  render-only mode gửi thêm multipart `voiceFile`. Video render được tải về qua
  server artifact binary để tránh base64 JSON quá lớn với video dài. Remote
  worker request dùng async job + polling để video dài không phụ thuộc vào một
  kết nối `fetch` mở liên tục trong suốt thời gian Piper/render.

## 3. Target Workflow

1. Detect source language per segment.
2. Transcript source audio.
3. Translate script sang ngôn ngữ đích.
4. Sinh voice-over theo script đã dịch.
5. Mute/duck audio gốc theo scene.
6. Align subtitle + timeline.
7. Export multi-track metadata.

## 4. Required Nodes

1. `audio.detect-language`
2. `audio.transcribe`
3. `text.translate`
4. `audio.tts` / `audio.voice-generation`
5. `audio.duck-or-mute`
6. `subtitle.align`
7. `audio.video-dubbing` (MVP composite node cho ZH->VI)
8. `video.preprocess` (speed preprocess trước transcript/dubbing/edit khi cần)

## 5. Data Requirements

1. Segment-level timestamps.
2. Voice profile settings (gender/style/speed).
3. Subtitle language tracks.
4. Confidence score cho detect/transcribe/align.

## 6. Quality Gates

1. Subtitle timing drift <= ngưỡng policy.
2. Voice-over không cắt chữ ở cuối segment.
3. Loudness normalization đạt ngưỡng mục tiêu.
4. TTS thất bại phải fallback voice profile hoặc provider.
5. Timeline voice generation phải báo segment có speed factor cao để không che
   giấu lỗi tự nhiên giọng đọc.

## 7. Risks

1. Mis-detection language ở audio lẫn tạp âm.
2. Drift timeline sau khi translate dài/ngắn khác nhau.
3. Chi phí API cao nếu không caching segment.

## 8. Implementation Recommendation

1. Làm incremental: 1 language pair (ZH->VI hoặc EN->VI) trước.
2. Ưu tiên subtitle sync đúng trước khi tối ưu style giọng.
3. Caching transcript/translation để giảm cost.
4. Tách nhạc nền/voice thật sự nên là node riêng dùng source-separation model,
   không dùng chung với bước ASR extraction vì chất lượng và runtime khác nhau.
5. Transcript dài nên được chunk theo segment ranges trong task sau để tránh
   vượt context/output limit của LLM.
6. Piper local phù hợp sandbox/máy yếu vì chạy CPU và giữ runtime trong repo,
   nhưng batch job dài vẫn cần provider abstraction/fallback và cơ chế cache.
7. Composite dubbing node phù hợp MVP thao tác nhanh, nhưng các pipeline cần
   kiểm soát chất lượng cao vẫn nên tách riêng transcribe, translate, TTS,
   duck/mux và review thành nhiều node nhỏ.
8. Tối ưu dubbing tự nhiên nên ưu tiên duration-aware translation/rewrite trước
   khi hậu xử lý tempo mạnh; ffmpeg alignment chỉ nên là bước fine-tune.
9. Remote EC2 voice/render cần Piper model/config có sẵn trên worker; launcher
   nhận `PIPER_MODEL_URL` và `PIPER_MODEL_CONFIG_URL` để tải cặp file này. Remote
  media transport đã tránh payload video inline bằng multipart upload và
  artifact binary download; async polling tránh timeout kết nối cho video dài,
  nhưng vẫn nên dùng object storage/checkpoint bền trước khi chạy production
  trên Spot với video lớn.
10. Final VIP render trên EC2 giữ preset mặc định `veryfast`, dùng toàn bộ CPU
   threads phát hiện được, và worker launcher ép `OMNIVIDEO_FFMPEG_PATH=/usr/bin/ffmpeg`
   để dùng system ffmpeg. Khi cần giới hạn tài nguyên local, dùng
   `OMNIVIDEO_VIP_RENDER_THREADS`, `OMNIVIDEO_VIP_RENDER_PRESET` và
   `OMNIVIDEO_VIP_RENDER_TIMEOUT_MS` để override theo môi trường chạy.
11. Worker EC2 mặc định bật `OMNIVIDEO_VIP_RENDER_CHUNKS=4`, chia final render
   thành các chunk timeline song song để tận dụng nhiều vCPU khi filtergraph
   `ass`/`boxblur`/`overlay` không scale tốt trong một ffmpeg process. Chất lượng
   encode không đổi vì mỗi chunk vẫn dùng preset/CRF/filter như single render.
