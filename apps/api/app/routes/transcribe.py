from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.models import Project, TranscribeRequest
from app.services import storage
from app.services.ffmpeg_probe import FFmpegError
from app.services.whisper_service import transcribe_file

router = APIRouter(prefix="/projects/{project_id}", tags=["transcribe"])


@router.post("/transcribe", response_model=Project)
def transcribe(project_id: str, body: TranscribeRequest):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    item = next((m for m in project.media if m.id == body.mediaId), None)
    if not item:
        raise HTTPException(404, "Media not found")
    if item.type == "image":
        raise HTTPException(400, "Cannot transcribe an image")

    media_path = storage.project_dir(project_id) / item.path
    if not media_path.exists():
        raise HTTPException(404, "Media file missing")

    try:
        clips = transcribe_file(
            Path(media_path),
            language=body.language,
            model_name=body.model or "base",
        )
    except FFmpegError as exc:
        raise HTTPException(500, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Transcription failed: {exc}") from exc

    text_track = next((t for t in project.tracks if t.type == "text"), None)
    if not text_track:
        raise HTTPException(500, "Text track missing")

    # Replace existing caption clips generated for this media session:
    # keep manual text without mediaId; append new captions
    text_track.clips.extend(clips)
    return storage.save_project(project)
