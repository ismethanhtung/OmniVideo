#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZeroTTS Runner Script for OmniVideo
Invoked by src/lib/multilingual-audio/zerotts.ts to handle Vietnamese voice cloning & TTS synthesis.
Supports preset voices (maichi, baotrang, giahuy, hamy, huuduc, kimoanh, quangminh, tiendat)
and custom voice packs (.zip, .npz downloaded from zeroweight.ai).
"""

import argparse
import base64
import json
import math
import os
import re
import struct
import sys
import threading
import time
import wave

# Predefined preset voices in official ZeroTTS model
PRESET_VOICES = [
    {
        "id": "maichi",
        "name": "Mai Chi",
        "gender": "female",
        "region": "Bắc",
        "description": "Nữ miền Bắc - truyền cảm, tự nhiên, biểu cảm sâu sắc (Khuyên dùng)",
        "isPreset": True,
    },
]

VI_DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
VI_UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]


def read_three_digits(num_str, is_first_group=False):
    """Read a 3-digit group in Vietnamese standard speech."""
    num_str = num_str.zfill(3)
    c, ch, d = int(num_str[0]), int(num_str[1]), int(num_str[2])
    res = []

    if c > 0 or not is_first_group:
        res.append(VI_DIGITS[c] + " trăm")

    if ch > 1:
        res.append(VI_DIGITS[ch] + " mươi")
    elif ch == 1:
        res.append("mười")
    elif ch == 0 and d > 0 and (c > 0 or not is_first_group):
        res.append("lẻ")

    if d == 1:
        if ch > 1:
            res.append("mốt")
        else:
            res.append("một")
    elif d == 4 and ch > 1:
        res.append("tư")
    elif d == 5:
        if ch > 0:
            res.append("lăm")
        else:
            res.append("năm")
    elif d > 0 or (c == 0 and ch == 0 and is_first_group):
        if not (d == 0 and (c > 0 or ch > 0)):
            res.append(VI_DIGITS[d])

    return " ".join([r for r in res if r])


def number_to_vietnamese_words(num):
    """Convert integer number to Vietnamese words."""
    try:
        num = int(num)
    except (ValueError, TypeError):
        return str(num)

    if num == 0:
        return "không"

    is_negative = num < 0
    num = abs(num)
    num_str = str(num)

    groups = []
    while num_str:
        groups.append(num_str[-3:])
        num_str = num_str[:-3]

    group_count = len(groups)
    words = []
    for i in range(group_count - 1, -1, -1):
        g_val = int(groups[i])
        if g_val == 0:
            continue
        g_words = read_three_digits(groups[i], is_first_group=(i == group_count - 1))
        unit = VI_UNITS[i % len(VI_UNITS)]
        if unit:
            words.append(f"{g_words} {unit}")
        else:
            words.append(g_words)

    result = " ".join(words).strip()
    return ("âm " + result) if is_negative else result


def normalize_vietnamese_text(text):
    """
    Fallback Vietnamese text normalization expanding dates, clock times, percentages, and numbers.
    If zerotts library is installed, it prioritizes zerotts.normalize_vi_text.
    """
    try:
        from zerotts import normalize_vi_text
        return normalize_vi_text(text)
    except Exception:
        pass

    normalized = text

    def replace_currency(match):
        num_str = match.group(1).replace(".", "").replace(",", "")
        words = number_to_vietnamese_words(num_str)
        return f"{words} đồng"

    normalized = re.sub(r"(\d+(?:[.,]\d+)*)\s*(?:đ|vnd|vnđ|đồng)", replace_currency, normalized, flags=re.IGNORECASE)

    def replace_date(match):
        prefix = match.group(1) or ""
        d, m, y = match.group(2), match.group(3), match.group(4)
        d_words = number_to_vietnamese_words(d)
        m_words = number_to_vietnamese_words(m)
        y_words = number_to_vietnamese_words(y)
        lead = "" if prefix.strip().lower() == "ngày" else "ngày "
        return f"{prefix}{lead}{d_words} tháng {m_words} năm {y_words}"

    normalized = re.sub(r"(ngày\s+)?\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b", replace_date, normalized, flags=re.IGNORECASE)

    def replace_time(match):
        h, m = match.group(1), match.group(2)
        h_words = number_to_vietnamese_words(h)
        if m:
            m_words = number_to_vietnamese_words(m)
            return f"{h_words} giờ {m_words} phút"
        return f"{h_words} giờ"

    normalized = re.sub(r"\b(\d{1,2})h(\d{1,2})?\b", replace_time, normalized, flags=re.IGNORECASE)

    def replace_percent(match):
        num_str = match.group(1).replace(",", ".")
        if "." in num_str:
            parts = num_str.split(".")
            int_part = number_to_vietnamese_words(parts[0])
            dec_part = " ".join([VI_DIGITS[int(d)] for d in parts[1] if d.isdigit()])
            return f"{int_part} phẩy {dec_part} phần trăm"
        words = number_to_vietnamese_words(num_str)
        return f"{words} phần trăm"

    normalized = re.sub(r"(\d+(?:[.,]\d+)?)\s*%", replace_percent, normalized)

    def replace_standard_numbers(match):
        num_str = match.group(0).replace(".", "").replace(",", "")
        return number_to_vietnamese_words(num_str)

    normalized = re.sub(r"\b\d{1,3}(?:[.,]\d{3})+\b", replace_standard_numbers, normalized)

    def replace_standalone_num(match):
        return number_to_vietnamese_words(match.group(0))

    normalized = re.sub(r"\b\d+\b", replace_standalone_num, normalized)

    return normalized


def check_environment():
    """Check Python environment and ZeroTTS readiness."""
    status = {
        "pythonVersion": sys.version,
        "zerottsInstalled": False,
        "zerottsVersion": None,
        "onnxruntimeInstalled": False,
        "soundfileInstalled": False,
        "presetVoices": PRESET_VOICES,
    }

    try:
        import zerotts
        status["zerottsInstalled"] = True
        status["zerottsVersion"] = getattr(zerotts, "__version__", "unknown")
    except ImportError:
        pass

    try:
        import onnxruntime
        status["onnxruntimeInstalled"] = True
    except ImportError:
        pass

    try:
        import soundfile
        status["soundfileInstalled"] = True
    except ImportError:
        pass

    return status


def apply_audio_speed(input_path, output_path, speed):
    """
    Apply pitch-preserving audio speed adjustment using FFmpeg atempo filter.
    Preserves audio quality and pitch while scaling speaking speed accurately.
    """
    if abs(speed - 1.0) < 0.01:
        if os.path.abspath(input_path) != os.path.abspath(output_path):
            import shutil
            shutil.copy2(input_path, output_path)
        return

    import shutil
    import subprocess

    ffmpeg_candidates = [
        os.environ.get("FFMPEG_PATH", ""),
        os.path.join(os.getcwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
        shutil.which("ffmpeg") or "",
    ]
    ffmpeg_bin = next((c for c in ffmpeg_candidates if c and os.path.isfile(c) and os.access(c, os.X_OK)), None)

    if not ffmpeg_bin:
        if os.path.abspath(input_path) != os.path.abspath(output_path):
            shutil.copy2(input_path, output_path)
        return

    # Build chained atempo filter (atempo accepts values in [0.5, 2.0])
    filters = []
    current = float(speed)
    while current > 2.0:
        filters.append("atempo=2.0")
        current /= 2.0
    while current < 0.5:
        filters.append("atempo=0.5")
        current /= 0.5
    filters.append(f"atempo={current:.4f}")
    filter_str = ",".join(filters)

    cmd = [
        ffmpeg_bin,
        "-y",
        "-i", input_path,
        "-filter:a", filter_str,
        "-vn",
        output_path,
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


_GLOBAL_TTS_INSTANCE = None


def get_or_create_tts(model_id="zeroweight-ai/ZeroTTS"):
    global _GLOBAL_TTS_INSTANCE
    if _GLOBAL_TTS_INSTANCE is not None:
        return _GLOBAL_TTS_INSTANCE

    import tempfile
    from pathlib import Path
    import zerotts.voices
    zerotts.voices.USER_VOICES_DIR = Path(tempfile.gettempdir()) / "zerotts_voices"
    os.makedirs(zerotts.voices.USER_VOICES_DIR, exist_ok=True)

    from zerotts import ZeroTTS
    threads = min(4, max(1, os.cpu_count() or 4))
    _GLOBAL_TTS_INSTANCE = ZeroTTS.from_pretrained(model_id, intra_op_num_threads=threads, warmup=False)
    return _GLOBAL_TTS_INSTANCE


def synthesize_speech(
    text,
    voice="maichi",
    output_path=None,
    model_id="zeroweight-ai/ZeroTTS",
    speed=1.0,
    normalize_vi=True,
    temperature=0.8,
    top_p=0.95,
    cfg_scale=1.0,
    audio_repetition_penalty=1.2,
    seed=42,
    sentence_silence=0.2,
):
    """
    Synthesize Vietnamese speech using ZeroTTS neural model.
    Supports preset voices and custom voice packs (.zip, .npz from zeroweight.ai).
    Applies pitch-preserving speed adjustment and deterministic seed.
    """
    start_time = time.time()

    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    processed_text = text.strip()
    if normalize_vi:
        processed_text = normalize_vietnamese_text(processed_text)

    if not output_path:
        output_path = f"/tmp/zerotts_{int(time.time() * 1000)}.wav"

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    raw_output_path = f"{output_path}.raw.wav"

    try:
        from zerotts import ZeroTTS
        from zerotts.chunking import chunk_text, normalize_punctuation, clean_segment_punctuation
        from zerotts.audio import concat_with_silence
        import numpy as np
    except ImportError as ie:
        raise RuntimeError(
            f"ZeroTTS package is not installed in current Python environment ({sys.executable}). "
            "Please run `pip install zerotts onnxruntime soundfile` to install."
        ) from ie

    # Set random seed for deterministic & consistent voice synthesis
    if seed is not None and seed >= 0:
        np.random.seed(int(seed))

    tts = get_or_create_tts(model_id)
    actual_voice = voice
    is_custom_voice = False

    # Check if voice is a file path
    if isinstance(voice, str) and (os.path.isfile(voice) or os.path.isdir(voice)):
        voice_lower = voice.lower()
        if voice_lower.endswith((".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac")):
            raise ValueError(
                "ZeroTTS mã nguồn mở sử dụng Voice Pack (.zip hoặc .npz) chứa voice embeddings từ zeroweight.ai. "
                "Do mô hình mở chưa tích hợp PerceiverIO audio encoder cục bộ, bạn hãy vào https://zeroweight.ai "
                "-> mở Thư viện giọng -> Bấm nút 'Tải về' (file .zip) và tải file .zip đó lên đây để nhân bản giọng đọc."
            )
        elif voice_lower.endswith(".zip") or os.path.isdir(voice):
            is_custom_voice = True
            installed = tts.add_voices(voice)
            if installed:
                actual_voice = installed[0]
            else:
                raise ValueError(f"Không tìm thấy voice pack hợp lệ trong file {voice}. Yêu cầu file zip chứa voice.npz.")
        elif voice_lower.endswith(".npz"):
            is_custom_voice = True
            npz_data = np.load(voice)
            emb = np.asarray(npz_data["voice_emb"], dtype=np.float32)
            if emb.ndim == 2:
                emb = emb[None, :, :]
            actual_voice = emb

    effective_cfg = max(0.5, float(cfg_scale))

    # Intelligent chunking for long-form synthesis:
    # Autoregressive attention over unbroken 40+ second texts leads to KV cache explosion
    # and runaway generation times (e.g. 224s). Chunking by sentences drops latency to ~25s (7-9x faster).
    punct_normalized = normalize_punctuation(processed_text)
    raw_segments = chunk_text(punct_normalized, max_chunk_sec=12.0)
    cleaned_segments = [clean_segment_punctuation(s) for s in raw_segments]
    segments = [s for s in cleaned_segments if s.strip()]
    if not segments:
        segments = [processed_text]

    sampling_kwargs = {
        "voice": actual_voice,
        "cfg_scale": effective_cfg,
        "text_temperature": 1.0,
        "text_topk": 50,
        "audio_temperature": float(temperature),
        "audio_topk": 25,
        "audio_topp": float(top_p),
        "audio_repetition_penalty": float(audio_repetition_penalty),
    }

    if len(segments) <= 1:
        audio = tts.synthesize(segments[0], **sampling_kwargs)
    else:
        chunks = []
        for seg in segments:
            c_audio = tts.synthesize(seg, **sampling_kwargs)
            chunks.append(c_audio)
        gap = max(0.05, float(sentence_silence) if sentence_silence is not None else 0.2)
        audio = concat_with_silence(chunks, gap, getattr(tts, "sample_rate", 48000))

    tts.save_audio(audio, raw_output_path)

    # Apply pitch-preserving speed factor
    if abs(speed - 1.0) >= 0.01:
        apply_audio_speed(raw_output_path, output_path, speed)
        if os.path.exists(raw_output_path):
            os.remove(raw_output_path)
    else:
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(raw_output_path, output_path)

    sample_rate = getattr(tts, "sample_rate", 48000)
    duration_ms = 0
    with wave.open(output_path, "rb") as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        duration_ms = int((frames / float(rate)) * 1000)

    elapsed_ms = int((time.time() - start_time) * 1000)
    byte_length = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    with open(output_path, "rb") as f:
        audio_bytes = f.read()
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "ok": True,
        "data": {
            "audioBase64": audio_base64,
            "mimeType": "audio/wav",
            "extension": "wav",
            "byteLength": byte_length,
            "durationMs": duration_ms,
            "sampleRate": sample_rate,
            "generationDurationMs": elapsed_ms,
            "text": text,
            "normalizedText": processed_text,
            "voice": str(voice),
            "speed": speed,
            "seed": seed,
            "cfgScale": effective_cfg,
            "modelId": model_id,
            "segmentCount": len(segments),
            "isRealInference": True,
        },
    }


def run_daemon_server(port=50123, model_id="zeroweight-ai/ZeroTTS", idle_timeout_sec=900):
    """
    Run an in-memory resident HTTP server for ZeroTTS.
    Keeps model weights warm in RAM for sub-second synthesis response times.
    Automatically terminates after `idle_timeout_sec` of inactivity (default 15m)
    to protect MacBook Air M1 unified RAM and thermals.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler

    print(f"[ZeroTTS Daemon] Pre-loading model '{model_id}' into RAM...")
    get_or_create_tts(model_id)
    print(f"[ZeroTTS Daemon] Model loaded successfully. Starting server on 127.0.0.1:{port} (idle timeout: {idle_timeout_sec}s)...")

    last_active = [time.time()]
    is_running = [True]

    class ZeroTtsHandler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            # Suppress default request logging to keep output clean
            pass

        def do_GET(self):
            last_active[0] = time.time()
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "ok": True,
                    "status": "ready",
                    "loaded": True,
                    "idleSeconds": int(time.time() - last_active[0]),
                    "idleTimeout": idle_timeout_sec,
                }).encode("utf-8"))
            elif self.path == "/shutdown":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "status": "shutting_down"}).encode("utf-8"))
                is_running[0] = False
                threading.Thread(target=server.shutdown).start()
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            last_active[0] = time.time()
            if self.path == "/synthesize":
                try:
                    content_length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(content_length).decode("utf-8")
                    payload = json.loads(body) if body else {}

                    res = synthesize_speech(
                        text=payload.get("text", ""),
                        voice=payload.get("voice", "maichi"),
                        output_path=payload.get("output", None),
                        model_id=payload.get("modelId", model_id),
                        speed=float(payload.get("speed", 1.0)),
                        normalize_vi=payload.get("normalizeVi", True),
                        temperature=float(payload.get("temperature", 0.8)),
                        top_p=float(payload.get("topP", 0.95)),
                        cfg_scale=float(payload.get("cfgScale", 1.0)),
                        audio_repetition_penalty=float(payload.get("audioRepetitionPenalty", 1.2)),
                        seed=payload.get("seed", 42),
                        sentence_silence=float(payload.get("sentenceSilence", 0.2)),
                    )

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False).encode("utf-8"))
            elif self.path == "/shutdown":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "status": "shutting_down"}).encode("utf-8"))
                is_running[0] = False
                threading.Thread(target=server.shutdown).start()
            else:
                self.send_response(404)
                self.end_headers()

    server = HTTPServer(("127.0.0.1", port), ZeroTtsHandler)

    def idle_watchdog():
        while is_running[0]:
            time.sleep(15)
            if idle_timeout_sec > 0 and (time.time() - last_active[0]) > idle_timeout_sec:
                print(f"[ZeroTTS Daemon] Idle timeout of {idle_timeout_sec}s reached without requests. Shutting down cleanly to release RAM...")
                is_running[0] = False
                server.shutdown()
                break

    watchdog_thread = threading.Thread(target=idle_watchdog, daemon=True)
    watchdog_thread.start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("[ZeroTTS Daemon] Server stopped.")


def main():
    parser = argparse.ArgumentParser(description="ZeroTTS Runner for OmniVideo")
    parser.add_argument("--action", choices=["synthesize", "list-voices", "check-env", "normalize-text", "server"], default="synthesize")
    parser.add_argument("--text", type=str, default="")
    parser.add_argument("--voice", type=str, default="maichi")
    parser.add_argument("--output", type=str, default=None)
    parser.add_argument("--model-id", type=str, default="zeroweight-ai/ZeroTTS")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--normalize-vi", action="store_true", default=True)
    parser.add_argument("--no-normalize-vi", dest="normalize_vi", action="store_false")
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-p", type=float, default=0.95)
    parser.add_argument("--cfg-scale", type=float, default=1.0)
    parser.add_argument("--audio-repetition-penalty", type=float, default=1.2)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--sentence-silence", type=float, default=0.2)
    parser.add_argument("--port", type=int, default=50123)
    parser.add_argument("--idle-timeout", type=int, default=900)

    args = parser.parse_args()

    try:
        if args.action == "server":
            run_daemon_server(port=args.port, model_id=args.model_id, idle_timeout_sec=args.idle_timeout)
            return

        if args.action == "check-env":
            result = {"ok": True, "data": check_environment()}
            print(json.dumps(result, ensure_ascii=False))
            return

        if args.action == "list-voices":
            result = {"ok": True, "data": PRESET_VOICES}
            print(json.dumps(result, ensure_ascii=False))
            return

        if args.action == "normalize-text":
            normalized = normalize_vietnamese_text(args.text)
            result = {"ok": True, "data": {"raw": args.text, "normalized": normalized}}
            print(json.dumps(result, ensure_ascii=False))
            return

        if args.action == "synthesize":
            if not args.text:
                raise ValueError("Missing required --text parameter.")

            result = synthesize_speech(
                text=args.text,
                voice=args.voice,
                output_path=args.output,
                model_id=args.model_id,
                speed=args.speed,
                normalize_vi=args.normalize_vi,
                temperature=args.temperature,
                top_p=args.top_p,
                cfg_scale=args.cfg_scale,
                audio_repetition_penalty=args.audio_repetition_penalty,
                seed=args.seed,
                sentence_silence=args.sentence_silence,
            )
            print(json.dumps(result, ensure_ascii=False))
            return

    except Exception as e:
        error_res = {
            "ok": False,
            "errorCode": "ZERO_TTS_EXECUTION_FAILED",
            "error": str(e),
        }
        print(json.dumps(error_res, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
