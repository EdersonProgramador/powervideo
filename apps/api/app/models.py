from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


EffectType = Literal[
    "fadeIn", "fadeOut", "brightness", "contrast", "speed", "crossfade"
]
TrackType = Literal["video", "audio", "text"]
MediaType = Literal["video", "audio", "image"]


class Effect(BaseModel):
    id: str
    type: EffectType
    duration: Optional[float] = None
    value: Optional[float] = None


class TextStyle(BaseModel):
    fontFamily: str = "Arial"
    fontSize: int = 48
    color: str = "#FFFFFF"
    backgroundColor: Optional[str] = "rgba(0,0,0,0.45)"
    align: Literal["left", "center", "right"] = "center"
    position: Literal["top", "center", "bottom"] = "bottom"
    bold: Optional[bool] = True
    strokeColor: Optional[str] = "#000000"
    strokeWidth: Optional[int] = 2


class Clip(BaseModel):
    id: str
    mediaId: Optional[str] = None
    start: float
    duration: float
    inPoint: float = 0.0
    outPoint: float = 0.0
    effects: list[Effect] = Field(default_factory=list)
    text: Optional[str] = None
    textStyle: Optional[TextStyle] = None


class Track(BaseModel):
    id: str
    type: TrackType
    name: str
    clips: list[Clip] = Field(default_factory=list)
    locked: Optional[bool] = False
    muted: Optional[bool] = False


class MediaItem(BaseModel):
    id: str
    name: str
    filename: str
    path: str
    type: MediaType
    duration: float
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    hasAudio: Optional[bool] = None
    thumbnail: Optional[str] = None
    createdAt: str


class Project(BaseModel):
    id: str
    name: str
    fps: int = 30
    width: int = 1920
    height: int = 1080
    tracks: list[Track]
    media: list[MediaItem] = Field(default_factory=list)
    createdAt: str
    updatedAt: str


class ProjectCreate(BaseModel):
    name: str = "Untitled"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    fps: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    tracks: Optional[list[Track]] = None
    media: Optional[list[MediaItem]] = None


class ProjectSummary(BaseModel):
    id: str
    name: str
    updatedAt: str
    width: int
    height: int
    mediaCount: int


class TranscribeRequest(BaseModel):
    mediaId: str
    language: Optional[str] = None
    model: Optional[str] = "base"


class ExportRequest(BaseModel):
    format: str = "mp4"
    quality: Literal["draft", "standard", "high"] = "standard"


class ApiMessage(BaseModel):
    ok: bool = True
    message: str = ""
    data: Optional[Any] = None
