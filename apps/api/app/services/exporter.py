from __future__ import annotations

import re
import subprocess
import uuid
from pathlib import Path
from typing import Optional

from app.config import EXPORTS_DIR
from app.models import Clip, Project
from app.services.ffmpeg_probe import FFmpegError, ensure_ffmpeg
from app.services.storage import project_dir


QUALITY_PRESETS = {
    "draft": {"crf": "28", "preset": "veryfast"},
    "standard": {"crf": "23", "preset": "medium"},
    "high": {"crf": "18", "preset": "slow"},
}


def _escape_drawtext(text: str) -> str:
    text = text.replace("\\", "\\\\")
    text = text.replace(":", "\\:")
    text = text.replace("'", "\\'")
    text = text.replace("%", "%%")
    return re.sub(r"[\r\n]+", " ", text)


def _effect_value(clip: Clip, effect_type: str, default: float) -> float:
    for e in clip.effects:
        if e.type == effect_type and e.value is not None:
            return float(e.value)
    return default


def _effect_duration(clip: Clip, effect_type: str, default: float = 0.0) -> float:
    for e in clip.effects:
        if e.type == effect_type and e.duration is not None:
            return float(e.duration)
    return default


def _resolve_media(project: Project, media_id: Optional[str]) -> Optional[Path]:
    if not media_id:
        return None
    item = next((m for m in project.media if m.id == media_id), None)
    if not item:
        return None
    path = project_dir(project.id) / item.path
    if path.exists():
        return path
    abs_path = Path(item.path)
    return abs_path if abs_path.exists() else None


def project_duration(project: Project) -> float:
    max_end = 0.0
    for track in project.tracks:
        for clip in track.clips:
            max_end = max(max_end, clip.start + clip.duration)
    return max(max_end, 0.1)


def export_project(project: Project, quality: str = "standard") -> Path:
    """
    Compose timeline onto a black canvas:
    - video clips trimmed/scaled/effects, delayed and overlaid
    - audio clips mixed with adelay
    - text burn-in via drawtext
    """
    ffmpeg = ensure_ffmpeg()
    q = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["standard"])
    out_dir = EXPORTS_DIR / project.id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"export_{uuid.uuid4().hex[:8]}.mp4"

    video_track = next((t for t in project.tracks if t.type == "video"), None)
    audio_track = next((t for t in project.tracks if t.type == "audio"), None)
    text_track = next((t for t in project.tracks if t.type == "text"), None)

    video_clips = [c for c in (video_track.clips if video_track else []) if c.mediaId]
    if not video_clips:
        raise FFmpegError("No video clips on the timeline to export.")

    total = project_duration(project)
    w, h, fps = project.width, project.height, project.fps

    inputs: list[str] = []
    filter_parts: list[str] = [
        f"color=c=black:s={w}x{h}:d={total}:r={fps}[base]"
    ]
    current = "base"
    input_files: list[Path] = []

    def add_input(path: Path) -> int:
        inputs.extend(["-i", str(path)])
        input_files.append(path)
        return len(input_files) - 1

    for idx, clip in enumerate(sorted(video_clips, key=lambda c: c.start)):
        media_path = _resolve_media(project, clip.mediaId)
        if not media_path:
            continue
        input_idx = add_input(media_path)

        speed = max(0.25, min(4.0, _effect_value(clip, "speed", 1.0)))
        brightness = _effect_value(clip, "brightness", 0.0)
        contrast = _effect_value(clip, "contrast", 1.0)
        fade_in = _effect_duration(clip, "fadeIn", 0.0)
        fade_out = _effect_duration(clip, "fadeOut", 0.0)
        trim_end = clip.inPoint + (clip.duration * speed)

        chain = (
            f"[{input_idx}:v]trim=start={clip.inPoint}:end={trim_end},"
            f"setpts=PTS-STARTPTS"
        )
        if abs(speed - 1.0) > 1e-3:
            chain += f",setpts={1.0 / speed}*PTS"
        chain += (
            f",scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps},format=yuva420p"
        )
        if abs(brightness) > 1e-6 or abs(contrast - 1.0) > 1e-6:
            chain += f",eq=brightness={brightness}:contrast={contrast}"
        if fade_in > 0:
            chain += f",fade=t=in:st=0:d={fade_in}:alpha=1"
        if fade_out > 0:
            st = max(0.0, clip.duration - fade_out)
            chain += f",fade=t=out:st={st}:d={fade_out}:alpha=1"

        prep = f"vp{idx}"
        delayed = f"vd{idx}"
        out = f"vo{idx}"
        chain += f"[{prep}]"
        filter_parts.append(chain)
        filter_parts.append(f"[{prep}]tpad=start_duration={clip.start}:color=black@0[{delayed}]")
        filter_parts.append(
            f"[{current}][{delayed}]overlay=0:0:eof_action=pass[{out}]"
        )
        current = out

    if text_track:
        for tidx, tclip in enumerate(text_track.clips):
            if not (tclip.text and tclip.text.strip()):
                continue
            style = tclip.textStyle
            fontsize = style.fontSize if style else 48
            raw_color = (style.color if style else "#FFFFFF").lstrip("#")
            fontcolor = raw_color if len(raw_color) in (6, 8) else "FFFFFF"
            pos = style.position if style else "bottom"
            if pos == "top":
                y_expr = "h*0.08"
            elif pos == "center":
                y_expr = "(h-text_h)/2"
            else:
                y_expr = "h*0.82"
            escaped = _escape_drawtext(tclip.text.strip())
            out = f"tx{tidx}"
            filter_parts.append(
                f"[{current}]drawtext=text='{escaped}':fontsize={fontsize}:fontcolor={fontcolor}:"
                f"borderw=2:bordercolor=black:"
                f"x=(w-text_w)/2:y={y_expr}:"
                f"enable='between(t\\,{tclip.start}\\,{tclip.start + tclip.duration})'"
                f"[{out}]"
            )
            current = out

    audio_labels: list[str] = []
    audio_clips = [c for c in (audio_track.clips if audio_track else []) if c.mediaId]
    for aidx, aclip in enumerate(sorted(audio_clips, key=lambda c: c.start)):
        media_path = _resolve_media(project, aclip.mediaId)
        if not media_path:
            continue
        input_idx = add_input(media_path)
        speed = max(0.5, min(2.0, _effect_value(aclip, "speed", 1.0)))
        trim_end = aclip.inPoint + (aclip.duration * speed)
        lab = f"a{aidx}"
        af = (
            f"[{input_idx}:a]atrim=start={aclip.inPoint}:end={trim_end},"
            f"asetpts=PTS-STARTPTS"
        )
        if abs(speed - 1.0) > 1e-3:
            af += f",atempo={speed}"
        delay_ms = int(max(0.0, aclip.start) * 1000)
        af += f",adelay={delay_ms}|{delay_ms}[{lab}]"
        filter_parts.append(af)
        audio_labels.append(lab)

    # Pull audio from video clips when no dedicated audio track clips
    if not audio_labels:
        for idx, clip in enumerate(sorted(video_clips, key=lambda c: c.start)):
            media_path = _resolve_media(project, clip.mediaId)
            if not media_path:
                continue
            # Find matching input index used for this video
            try:
                input_idx = input_files.index(media_path)
            except ValueError:
                continue
            speed = max(0.5, min(2.0, _effect_value(clip, "speed", 1.0)))
            trim_end = clip.inPoint + (clip.duration * speed)
            lab = f"va{idx}"
            delay_ms = int(max(0.0, clip.start) * 1000)
            af = (
                f"[{input_idx}:a]atrim=start={clip.inPoint}:end={trim_end},"
                f"asetpts=PTS-STARTPTS"
            )
            if abs(speed - 1.0) > 1e-3:
                af += f",atempo={speed}"
            af += f",adelay={delay_ms}|{delay_ms}[{lab}]"
            filter_parts.append(af)
            audio_labels.append(lab)

    has_audio = False
    if audio_labels:
        if len(audio_labels) == 1:
            filter_parts.append(f"[{audio_labels[0]}]anull[aout]")
        else:
            joined = "".join(f"[{lab}]" for lab in audio_labels)
            filter_parts.append(
                f"{joined}amix=inputs={len(audio_labels)}:dropout_transition=0:normalize=0[aout]"
            )
        has_audio = True

    filter_complex = ";".join(filter_parts)
    cmd = [
        ffmpeg,
        "-y",
        *inputs,
        "-filter_complex",
        filter_complex,
        "-map",
        f"[{current}]",
    ]
    if has_audio:
        cmd.extend(["-map", "[aout]"])
    else:
        cmd.append("-an")

    cmd.extend(
        [
            "-c:v",
            "libx264",
            "-crf",
            q["crf"],
            "-preset",
            q["preset"],
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-t",
            str(total),
            str(out_path),
        ]
    )

    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        # Retry without audio (some sources lack audio streams)
        if has_audio:
            cmd_no_a = [
                ffmpeg,
                "-y",
                *inputs,
                "-filter_complex",
                filter_complex,
                "-map",
                f"[{current}]",
                "-an",
                "-c:v",
                "libx264",
                "-crf",
                q["crf"],
                "-preset",
                q["preset"],
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-t",
                str(total),
                str(out_path),
            ]
            # Strip audio filter nodes for cleaner retry — still may fail; use only video chain
            # Rebuild video-only filter
            video_only_parts = [p for p in filter_parts if ":a]" not in p and "amix" not in p and "anull" not in p and "atrim" not in p and "adelay" not in p]
            # Keep only parts that don't reference aout / audio labels roughly — simpler: drop audio maps
            fc = ";".join(
                p
                for p in filter_parts
                if not any(
                    x in p
                    for x in (":a]", "atrim", "adelay", "amix", "anull[aout]", "atempo")
                )
            )
            cmd_no_a[cmd_no_a.index("-filter_complex") + 1] = fc
            result2 = subprocess.run(cmd_no_a, capture_output=True, text=True, check=False)
            if result2.returncode != 0:
                raise FFmpegError(
                    (result2.stderr or result.stderr or "export failed")[-4000:]
                )
        else:
            raise FFmpegError((result.stderr or "export failed")[-4000:])

    if not out_path.exists():
        raise FFmpegError("Export finished but output file missing.")
    return out_path
