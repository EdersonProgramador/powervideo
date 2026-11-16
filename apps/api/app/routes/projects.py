from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import Project, ProjectCreate, ProjectSummary, ProjectUpdate
from app.services import storage

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects():
    return storage.list_projects()


@router.post("", response_model=Project)
def create_project(body: ProjectCreate):
    return storage.create_project(body)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.put("/{project_id}", response_model=Project)
def update_project(project_id: str, body: ProjectUpdate):
    project = storage.load_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    data = project.model_dump()
    patch = body.model_dump(exclude_unset=True)
    data.update(patch)
    updated = Project.model_validate(data)
    return storage.save_project(updated)


@router.delete("/{project_id}")
def delete_project(project_id: str):
    if not storage.delete_project(project_id):
        raise HTTPException(404, "Project not found")
    return {"ok": True}
