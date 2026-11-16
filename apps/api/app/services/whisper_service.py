from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from app.config import WHISPER_COMPUTE, WHISPER_DEVICE, WHISPER_MODEL
from app.models import Clip, TextStyle
from app.services.ffmpeg_probe import extract_audio

_model = None


def get_model(model_name: Optional[str] = None):
    global _model
    name = model_name or WHISPER_MODEL
    # Cache single model instance for the process
    if _model is None or getattr(_model, "_pv_name", None) != name:
        from faster_whisper import WhisperModel

        _model = WhisperModel(name, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE)
        _model._pv_name = name  # type: ignore[attr-defined]
    return _model


def transcribe_file(
    media_path: Path,
    language: Optional[str] = None,
    model_name: Optional[str] = None,
) -> list[Clip]:
    """Transcribe media and return timed text clips."""
    work_dir = media_path.parent / ".whisper"
    wav_path = work_dir / f"{media_path.stem}.wav"
    extract_audio(media_path, wav_path)

    model = get_model(model_name)
    segments, _info = model.transcribe(
        str(wav_path),
        language=language,
        word_timestamps=True,
        vad_filter=True,
    )

    style = TextStyle()
    clips: list[Clip] = []
    for seg in segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        start = float(seg.start or 0)
        end = float(seg.end or start)
        duration = max(0.05, end - start)
        clips.append(
            Clip(
                id=str(uuid.uuid4()),
                start=start,
                duration=duration,
                inPoint=0,
                outPoint=duration,
                effects=[],
                text=text,
                textStyle=style,
            )
        )
    return clips
