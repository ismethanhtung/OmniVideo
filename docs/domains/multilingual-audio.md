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
  mặc định `llama-3.1-8b-instant`.

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
4. `audio.tts`
5. `audio.duck-or-mute`
6. `subtitle.align`

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
