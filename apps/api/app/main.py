from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routes import export, media, projects, transcribe

app = FastAPI(
    title="PowerVideo API",
    description="CapCut-like NLE backend — projects, media, Whisper, FFmpeg export",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "powervideo-api"}
