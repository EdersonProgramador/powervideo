from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.models import ExportRequest
from app.services import storage
from app.services.exporter import export_project
from app.services.ffmpeg_probe import FFmpegError

router = APIRouter(prefix="/projects/{project_id}", tags=["export"])


@router.post("/export")
def export_video(project_id: str, body: ExportRequest):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    try:
        out = export_project(project, quality=body.quality)
    except FFmpegError as exc:
        raise HTTPException(500, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Export failed: {exc}") from exc

    return FileResponse(
        out,
        media_type="video/mp4",
        filename=f"{project.name.replace(' ', '_')}.mp4",
    )
