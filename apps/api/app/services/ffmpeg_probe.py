from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


class FFmpegError(RuntimeError):
    pass


def ensure_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if not path:
        raise FFmpegError(
            "FFmpeg not found on PATH. Install FFmpeg and restart the terminal."
        )
    return path


def ensure_ffprobe() -> str:
    path = shutil.which("ffprobe")
    if not path:
        raise FFmpegError(
            "ffprobe not found on PATH. Install FFmpeg and restart the terminal."
        )
    return path


def probe_media(file_path: Path) -> dict[str, Any]:
    ffprobe = ensure_ffprobe()
    cmd = [
        ffprobe,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(file_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise FFmpegError(result.stderr or "ffprobe failed")
    data = json.loads(result.stdout)

    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
        None,
    )
    audio_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "audio"),
        None,
    )
    fmt = data.get("format", {})
    duration = float(fmt.get("duration") or 0)

    width = height = fps = None
    media_type = "audio"
    if video_stream:
        media_type = "video"
        width = int(video_stream.get("width") or 0) or None
        height = int(video_stream.get("height") or 0) or None
        rate = video_stream.get("r_frame_rate") or "30/1"
        if "/" in rate:
            num, den = rate.split("/", 1)
            try:
                fps = float(num) / float(den) if float(den) else 30.0
            except ValueError:
                fps = 30.0
        # Still image treated as image if very short and no audio
        codec = (video_stream.get("codec_name") or "").lower()
        if codec in {"mjpeg", "png", "webp", "gif", "bmp"} and duration <= 0.1:
            media_type = "image"
            duration = 5.0
    elif file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}:
        media_type = "image"
        duration = 5.0

    return {
        "type": media_type,
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "hasAudio": audio_stream is not None,
    }


def extract_audio(input_path: Path, output_wav: Path) -> Path:
    ffmpeg = ensure_ffmpeg()
    output_wav.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output_wav),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise FFmpegError(result.stderr or "audio extract failed")
    return output_wav
