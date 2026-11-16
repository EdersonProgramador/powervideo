from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import PROJECTS_DIR
from app.models import Project, ProjectCreate, ProjectSummary, Track


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def project_dir(project_id: str) -> Path:
    return PROJECTS_DIR / project_id


def project_json_path(project_id: str) -> Path:
    return project_dir(project_id) / "project.json"


def media_dir(project_id: str) -> Path:
    d = project_dir(project_id) / "media"
    d.mkdir(parents=True, exist_ok=True)
    return d


def default_tracks() -> list[Track]:
    return [
        Track(id="v1", type="video", name="Video 1", clips=[]),
        Track(id="a1", type="audio", name="Audio 1", clips=[]),
        Track(id="t1", type="text", name="Text / Captions", clips=[]),
    ]


def create_project(body: ProjectCreate) -> Project:
    project_id = str(uuid.uuid4())
    now = _now()
    project = Project(
        id=project_id,
        name=body.name or "Untitled",
        fps=30,
        width=1920,
        height=1080,
        tracks=default_tracks(),
        media=[],
        createdAt=now,
        updatedAt=now,
    )
    path = project_dir(project_id)
    path.mkdir(parents=True, exist_ok=True)
    media_dir(project_id)
    save_project(project)
    return project


def save_project(project: Project) -> Project:
    project.updatedAt = _now()
    path = project_json_path(project.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(project.model_dump_json(indent=2), encoding="utf-8")
    return project


def load_project(project_id: str) -> Optional[Project]:
    path = project_json_path(project_id)
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return Project.model_validate(data)


def list_projects() -> list[ProjectSummary]:
    summaries: list[ProjectSummary] = []
    if not PROJECTS_DIR.exists():
        return summaries
    for folder in PROJECTS_DIR.iterdir():
        if not folder.is_dir():
            continue
        project = load_project(folder.name)
        if not project:
            continue
        summaries.append(
            ProjectSummary(
                id=project.id,
                name=project.name,
                updatedAt=project.updatedAt,
                width=project.width,
                height=project.height,
                mediaCount=len(project.media),
            )
        )
    summaries.sort(key=lambda s: s.updatedAt, reverse=True)
    return summaries


def delete_project(project_id: str) -> bool:
    import shutil

    path = project_dir(project_id)
    if not path.exists():
        return False
    shutil.rmtree(path)
    return True
