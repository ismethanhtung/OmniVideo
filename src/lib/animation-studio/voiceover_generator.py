#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZeroTTS Voiceover Generator & Audio Mixer for Animation & Film Projects
Integrates ZeroTTS (Vietnamese Voice Cloning / TTS) from OmniVideo into VipCom projects.

Usage:
  1. For a specific project folder:
     python3 voiceover_generator.py --project /path/to/project_dir

  2. Direct parameters:
     python3 voiceover_generator.py --subs subs.json --bg mix.wav --out-wav mix_final.wav --out-m4a mix.m4a --voice maichi

  3. As a Python module:
     from voiceover_generator import generate_voiceover
     generate_voiceover(subs_path="subs.json", bg_path="mix.wav", ...)
"""

import os
import sys
import json
import time
import shutil
import argparse
import subprocess
from pathlib import Path

# Auto-detect OmniVideo location
POSSIBLE_OMNIVIDEO_PATHS = [
    Path("/Users/thanhtung/Downloads/tung/OmniVideo"),
    Path(__file__).resolve().parent.parent.parent / "OmniVideo",
    Path.cwd().parent / "OmniVideo",
]

OMNIVIDEO_DIR = None
for p in POSSIBLE_OMNIVIDEO_PATHS:
    if p.is_dir() and (p / "src/lib/multilingual-audio/zerotts-runner.py").is_file():
        OMNIVIDEO_DIR = p.resolve()
        break

if not OMNIVIDEO_DIR:
    raise FileNotFoundError("Could not locate OmniVideo repository containing zerotts-runner.py.")

RUNNER_SCRIPT = OMNIVIDEO_DIR / "src/lib/multilingual-audio/zerotts-runner.py"
OMNIVIDEO_PYTHON = OMNIVIDEO_DIR / ".venv/bin/python3"

# Find ffmpeg binary if present
FFMPEG_CANDIDATES = [
    Path("/Users/thanhtung/Downloads/tung/VipCom/first-signal/node_modules/ffmpeg-static/ffmpeg"),
    Path("/opt/homebrew/bin/ffmpeg"),
    Path("/usr/local/bin/ffmpeg"),
    Path(shutil.which("ffmpeg") or ""),
]
FFMPEG_BIN = next((str(p) for p in FFMPEG_CANDIDATES if p.is_file() and os.access(p, os.X_OK)), None)


def load_zerotts_runner():
    """Dynamically load zerotts-runner from OmniVideo."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("zerotts_runner", str(RUNNER_SCRIPT))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module spec from {RUNNER_SCRIPT}")
    zr = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(zr)
    return zr


def convert_wav_to_m4a(wav_path, m4a_path, bitrate="192k"):
    """Convert WAV to AAC M4A using afconvert (native macOS) or ffmpeg."""
    wav_path = str(Path(wav_path).resolve())
    m4a_path = str(Path(m4a_path).resolve())

    # Try native macOS afconvert first
    afconvert = shutil.which("afconvert")
    if afconvert:
        cmd = [afconvert, "-f", "m4af", "-d", "aac", "-b", "192000", wav_path, m4a_path]
        try:
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
            if os.path.isfile(m4a_path) and os.path.getsize(m4a_path) > 0:
                return True
        except Exception:
            pass

    # Fallback to ffmpeg
    if FFMPEG_BIN:
        cmd = [FFMPEG_BIN, "-y", "-i", wav_path, "-c:a", "aac", "-b:a", bitrate, m4a_path]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True

    return False


def mux_audio_into_video(video_path, audio_path, output_path=None):
    """Mux new audio track into video file without re-encoding video."""
    if not FFMPEG_BIN:
        print("[Warn] FFmpeg binary not found. Skipping video muxing.")
        return None

    video_path = Path(video_path).resolve()
    audio_path = Path(audio_path).resolve()
    if not video_path.is_file():
        print(f"[Warn] Video file {video_path} does not exist.")
        return None

    if not output_path:
        output_path = video_path.parent / f"{video_path.stem}_with_voice{video_path.suffix}"
    else:
        output_path = Path(output_path).resolve()

    cmd = [
        FFMPEG_BIN, "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        str(output_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return str(output_path)


def generate_voiceover(
    subs_path,
    bg_audio_path=None,
    output_wav="mix_final.wav",
    output_m4a="mix.m4a",
    voice="maichi",
    voice_gain=1.20,
    bg_duck_gain=0.45,
    lead_in=0.10,
    lead_out=0.28,
    speed=1.0,
    auto_fit_timing=True,
    temp_dir=None,
    mux_video=None,
):
    """
    Main function to generate full film voiceover and mix with background track.
    """
    import numpy as np
    import soundfile as sf

    subs_file = Path(subs_path).resolve()
    if not subs_file.is_file():
        raise FileNotFoundError(f"Subtitle file not found: {subs_file}")

    with open(subs_file, "r", encoding="utf-8") as f:
        subs_data = json.load(f)

    lines = subs_data.get("lines", [])
    if not lines:
        raise ValueError(f"No subtitle lines found in {subs_file}")

    print(f"[Voiceover] Loaded {len(lines)} subtitle lines from {subs_file.name}")
    print(f"[Voiceover] Using ZeroTTS voice: '{voice}'")

    if not temp_dir:
        temp_dir = subs_file.parent / ".voice_cache"
    temp_dir = Path(temp_dir).resolve()
    temp_dir.mkdir(parents=True, exist_ok=True)

    # 1. Initialize ZeroTTS engine
    print("[Voiceover] Initializing ZeroTTS neural engine...")
    zr = load_zerotts_runner()
    tts = zr.get_or_create_tts()
    print("[Voiceover] ZeroTTS engine ready.")

    SR = 48000
    synthesized_segments = []

    # 2. Synthesize each subtitle line
    for idx, line in enumerate(lines):
        text = line.get("vn", "").strip()
        c0 = float(line.get("c0", 0.0))
        c1 = float(line.get("c1", c0 + 2.0))
        slot_dur = max(0.5, c1 - c0)

        if not text:
            continue

        clip_filename = f"seg_{idx:03d}_{int(c0 * 100)}.wav"
        clip_path = temp_dir / clip_filename

        print(f"[{idx+1}/{len(lines)}] ({c0:.1f}s -> {c1:.1f}s, slot: {slot_dur:.1f}s) Generating: \"{text}\"")

        # Initial synthesis at nominal speed
        res = zr.synthesize_speech(
            text=text,
            voice=voice,
            output_path=str(clip_path),
            speed=speed,
            normalize_vi=True,
            temperature=0.75,
            top_p=0.95,
            cfg_scale=1.0,
            sentence_silence=0.15,
        )

        audio_data, sample_rate = sf.read(str(clip_path))
        if sample_rate != SR:
            import soxr
            audio_data = soxr.resample(audio_data, sample_rate, SR)

        clip_dur = len(audio_data) / SR
        print(f"     -> Synthesized duration: {clip_dur:.2f}s")

        # Auto-fit if speech exceeds slot duration
        if auto_fit_timing and clip_dur > (slot_dur + 0.1):
            ratio = clip_dur / (slot_dur - 0.1)
            target_speed = min(1.35, max(1.05, ratio))
            print(f"     -> [AutoFit] Adjusting speed to {target_speed:.2f}x to fit slot...")
            clip_path_speed = temp_dir / f"seg_{idx:03d}_speed.wav"
            zr.synthesize_speech(
                text=text,
                voice=voice,
                output_path=str(clip_path_speed),
                speed=target_speed,
                normalize_vi=True,
                temperature=0.75,
                top_p=0.95,
                cfg_scale=1.0,
            )
            audio_data, sample_rate = sf.read(str(clip_path_speed))
            clip_dur = len(audio_data) / SR
            print(f"     -> Adjusted duration: {clip_dur:.2f}s (fits nicely)")

        synthesized_segments.append({
            "index": idx,
            "text": text,
            "c0": c0,
            "c1": c1,
            "audio": audio_data,
            "duration": clip_dur,
        })

    # 3. Load or prepare background audio track
    bg_audio = None
    bg_sr = SR
    if bg_audio_path and Path(bg_audio_path).is_file():
        bg_audio_path = Path(bg_audio_path).resolve()
        print(f"[Voiceover] Loading background audio track: {bg_audio_path.name}")
        bg_audio, bg_sr = sf.read(str(bg_audio_path))
        if bg_audio.ndim == 1:
            bg_audio = np.column_stack([bg_audio, bg_audio])
    else:
        print("[Voiceover] No background audio provided. Creating pure voiceover track.")

    # Calculate total film audio length
    last_end = max(seg["c0"] + seg["duration"] for seg in synthesized_segments) + 1.5
    bg_len = (len(bg_audio) / bg_sr) if bg_audio is not None else 0.0
    total_sec = max(last_end, bg_len)
    total_samples = int(total_sec * SR)

    # Master timeline arrays (stereo, float32)
    voice_track = np.zeros((total_samples, 2), dtype=np.float32)
    duck_envelope = np.ones(total_samples, dtype=np.float32)

    # 4. Place voice clips onto timeline & build smooth ducking envelope
    fade_len = int(0.015 * SR)  # 15ms anti-click micro-fade
    fade_in = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    fade_out = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)

    lead_in_samples = int(lead_in * SR)
    lead_out_samples = int(lead_out * SR)

    for seg in synthesized_segments:
        start_samp = int(seg["c0"] * SR)
        clip = seg["audio"]
        c_len = len(clip)

        if c_len > fade_len * 2:
            clip[:fade_len] *= fade_in
            clip[-fade_len:] *= fade_out

        end_samp = min(total_samples, start_samp + c_len)
        placed_len = end_samp - start_samp

        # Voice track is stereo centered
        voice_track[start_samp:end_samp, 0] += clip[:placed_len]
        voice_track[start_samp:end_samp, 1] += clip[:placed_len]

        # Apply ducking envelope on background track
        d_start = max(0, start_samp - lead_in_samples)
        d_end = min(total_samples, end_samp + lead_out_samples)

        # Smooth ramp into ducking
        ramp_in_len = min(lead_in_samples, d_end - d_start)
        if ramp_in_len > 0:
            duck_envelope[d_start : d_start + ramp_in_len] = np.minimum(
                duck_envelope[d_start : d_start + ramp_in_len],
                np.linspace(1.0, bg_duck_gain, ramp_in_len)
            )

        # Hold ducking while speech is sounding
        speech_hold_end = min(total_samples, end_samp + int(0.05 * SR))
        if speech_hold_end > d_start + ramp_in_len:
            duck_envelope[d_start + ramp_in_len : speech_hold_end] = np.minimum(
                duck_envelope[d_start + ramp_in_len : speech_hold_end],
                bg_duck_gain
            )

        # Smooth ramp out of ducking
        ramp_out_len = d_end - speech_hold_end
        if ramp_out_len > 0:
            duck_envelope[speech_hold_end:d_end] = np.minimum(
                duck_envelope[speech_hold_end:d_end],
                np.linspace(bg_duck_gain, 1.0, ramp_out_len)
            )

    # 5. Mix Voice + Ducked Background
    if bg_audio is not None:
        # Pad or trim bg_audio to total_samples
        if len(bg_audio) < total_samples:
            pad = np.zeros((total_samples - len(bg_audio), 2), dtype=bg_audio.dtype)
            bg_audio = np.vstack([bg_audio, pad])
        else:
            bg_audio = bg_audio[:total_samples]

        ducked_bg = bg_audio * duck_envelope[:, np.newaxis]
        master_mix = (voice_track * voice_gain) + ducked_bg
    else:
        master_mix = voice_track * voice_gain

    # 6. Peak Normalization (-1.0 dBFS)
    peak = np.max(np.abs(master_mix))
    target_peak = 10 ** (-1.0 / 20.0)  # ~0.891
    if peak > target_peak:
        norm_factor = target_peak / peak
        master_mix *= norm_factor
        print(f"[Voiceover] Normalized master mix (scaled by {norm_factor:.3f}, peak was {peak:.3f})")
    elif peak > 0:
        norm_factor = min(1.3, target_peak / peak)
        master_mix *= norm_factor
        print(f"[Voiceover] Gently boosted master mix (scaled by {norm_factor:.3f})")

    # 7. Write outputs
    out_wav_path = Path(output_wav).resolve()
    sf.write(str(out_wav_path), master_mix, SR, subtype="PCM_16")
    print(f"[Voiceover] Successfully wrote master WAV: {out_wav_path.name} ({out_wav_path.stat().st_size / 1e6:.2f} MB)")

    # Also save voice-only track for reference
    voice_only_path = out_wav_path.parent / f"{out_wav_path.stem}_voice_only.wav"
    sf.write(str(voice_only_path), voice_track, SR, subtype="PCM_16")

    # Convert to M4A for HTML5 playback
    out_m4a_path = Path(output_m4a).resolve()
    if convert_wav_to_m4a(out_wav_path, out_m4a_path):
        print(f"[Voiceover] Successfully created AAC M4A: {out_m4a_path.name} ({out_m4a_path.stat().st_size / 1e6:.2f} MB)")

    # Optional Video Muxing
    muxed_video = None
    if mux_video:
        muxed_video = mux_audio_into_video(mux_video, out_wav_path)
        if muxed_video:
            print(f"[Voiceover] Successfully muxed into video: {Path(muxed_video).name}")

    # Also save voice metadata for Studio UI inspection
    voice_name = Path(voice).stem if "/" in voice or "\\" in voice else voice
    meta_info = {
        "voice": voice,
        "voiceName": voice_name,
        "speed": speed,
        "sentenceCount": len(synthesized_segments),
        "totalDuration": round(total_sec, 2),
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "hasMasterWav": out_wav_path.is_file(),
        "hasMasterM4a": out_m4a_path.is_file(),
        "voiceGain": voice_gain,
        "ducking": bg_duck_gain,
    }
    meta_path = out_wav_path.parent / "voice_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_info, f, indent=2, ensure_ascii=False)
    print(f"[Voiceover] Saved voice metadata to {meta_path.name}")

    return {
        "ok": True,
        "masterWav": str(out_wav_path),
        "voiceOnlyWav": str(voice_only_path),
        "masterM4a": str(out_m4a_path) if out_m4a_path.is_file() else None,
        "muxedVideo": muxed_video,
        "totalDuration": total_sec,
        "sentenceCount": len(synthesized_segments),
        "voiceMeta": meta_info,
    }


def main():
    parser = argparse.ArgumentParser(description="ZeroTTS Voiceover Generator for VipCom Animation Projects")
    parser.add_argument("--project", type=str, default=None, help="Project directory (e.g. sketchnote-loaf)")
    parser.add_argument("--subs", type=str, default=None, help="Path to subs.json")
    parser.add_argument("--bg", type=str, default=None, help="Path to background mix.wav")
    parser.add_argument("--out-wav", type=str, default=None, help="Output WAV path (default: mix_final.wav)")
    parser.add_argument("--out-m4a", type=str, default=None, help="Output M4A path (default: mix.m4a)")
    parser.add_argument("--voice", type=str, default="maichi", help="Voice id ('maichi' or custom path)")
    parser.add_argument("--voice-gain", type=float, default=1.20, help="Voice volume gain factor (default: 1.20)")
    parser.add_argument("--ducking", type=float, default=0.45, help="Background volume factor during speech (default: 0.45)")
    parser.add_argument("--speed", type=float, default=1.0, help="Base speech speed")
    parser.add_argument("--cfg-scale", type=float, default=1.0, help="Voice match strength / CFG scale")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for voice consistency")
    parser.add_argument("--sentence-silence", type=float, default=0.2, help="Sentence silence gap in seconds")
    parser.add_argument("--mux-video", type=str, default=None, help="Optional MP4 video file to mux")

    args = parser.parse_args()

    project_dir = Path(args.project).resolve() if args.project else None
    if project_dir and project_dir.is_dir():
        subs_path = project_dir / "subs.json"
        bg_path = project_dir / "mix.wav" if (project_dir / "mix.wav").is_file() else None
        out_wav = project_dir / (args.out_wav or "mix_final.wav")
        out_m4a = project_dir / (args.out_m4a or "mix.m4a")

        # Check for matching MP4 file in project directory
        mux_video = args.mux_video
        if not mux_video:
            mp4s = list(project_dir.glob("*.mp4"))
            if mp4s:
                mux_video = str(mp4s[0])
    else:
        if not args.subs:
            parser.error("Either --project or --subs must be provided.")
        subs_path = Path(args.subs)
        bg_path = Path(args.bg) if args.bg else None
        out_wav = Path(args.out_wav or "mix_final.wav")
        out_m4a = Path(args.out_m4a or "mix.m4a")
        mux_video = args.mux_video

    res = generate_voiceover(
        subs_path=subs_path,
        bg_audio_path=bg_path,
        output_wav=out_wav,
        output_m4a=out_m4a,
        voice=args.voice,
        voice_gain=args.voice_gain,
        bg_duck_gain=args.ducking,
        speed=args.speed,
        mux_video=mux_video,
    )
    print("\n[Voiceover Generator Complete!]")
    print(json.dumps(res, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
