from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.models import MediaItem, Project
from app.services import storage
from app.services.ffmpeg_probe import FFmpegError, probe_media

router = APIRouter(prefix="/projects/{project_id}/media", tags=["media"])

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}
AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}


@router.post("", response_model=MediaItem)
async def upload_media(project_id: str, file: UploadFile = File(...)):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    original = file.filename or "upload.bin"
    suffix = Path(original).suffix.lower()
    media_id = str(uuid.uuid4())
    safe_name = f"{media_id}{suffix}"
    dest = storage.media_dir(project_id) / safe_name

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")
    dest.write_bytes(content)

    try:
        info = probe_media(dest)
    except FFmpegError as exc:
        # Fallback typing by extension if probe fails
        if suffix in IMAGE_EXT:
            info = {
                "type": "image",
                "duration": 5.0,
                "width": None,
                "height": None,
                "fps": None,
                "hasAudio": False,
            }
        elif suffix in AUDIO_EXT:
            info = {
                "type": "audio",
                "duration": 0.0,
                "width": None,
                "height": None,
                "fps": None,
                "hasAudio": True,
            }
        elif suffix in VIDEO_EXT:
            raise HTTPException(400, f"Could not probe media: {exc}") from exc
        else:
            raise HTTPException(400, f"Unsupported media type: {suffix}") from exc

    item = MediaItem(
        id=media_id,
        name=original,
        filename=safe_name,
        path=f"media/{safe_name}",
        type=info["type"],
        duration=float(info.get("duration") or 0),
        width=info.get("width"),
        height=info.get("height"),
        fps=info.get("fps"),
        hasAudio=info.get("hasAudio"),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )
    project.media.append(item)
    storage.save_project(project)
    return item


@router.get("/{media_id}/file")
def get_media_file(project_id: str, media_id: str):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    item = next((m for m in project.media if m.id == media_id), None)
    if not item:
        raise HTTPException(404, "Media not found")
    path = storage.project_dir(project_id) / item.path
    if not path.exists():
        raise HTTPException(404, "File missing on disk")
    return FileResponse(path, filename=item.name)


@router.delete("/{media_id}")
def delete_media(project_id: str, media_id: str):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    item = next((m for m in project.media if m.id == media_id), None)
    if not item:
        raise HTTPException(404, "Media not found")

    path = storage.project_dir(project_id) / item.path
    if path.exists():
        path.unlink()

    # Remove clips referencing this media
    for track in project.tracks:
        track.clips = [c for c in track.clips if c.mediaId != media_id]
    project.media = [m for m in project.media if m.id != media_id]
    storage.save_project(project)
    return {"ok": True}
