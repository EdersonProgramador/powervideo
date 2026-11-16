"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Clip } from "@powervideo/shared";
import { api } from "@/lib/api";
import { useDuration, useEditorStore } from "@/store/editorStore";
import { formatTimecode } from "@/lib/timeline";

function activeClipsAt(clips: Clip[], t: number): Clip[] {
  return clips.filter((c) => t >= c.start && t < c.start + c.duration);
}

export function Preview() {
  const project = useEditorStore((s) => s.project);
  const playhead = useEditorStore((s) => s.playhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const duration = useDuration();
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoTrack = project?.tracks.find((t) => t.type === "video");
  const textTrack = project?.tracks.find((t) => t.type === "text");

  const activeVideo = useMemo(() => {
    if (!videoTrack) return null;
    const clips = activeClipsAt(videoTrack.clips, playhead);
    return clips[clips.length - 1] || null;
  }, [videoTrack, playhead]);

  const activeTexts = useMemo(() => {
    if (!textTrack) return [];
    return activeClipsAt(textTrack.clips, playhead);
  }, [textTrack, playhead]);

  const mediaUrl = useMemo(() => {
    if (!project || !activeVideo?.mediaId) return null;
    return api.mediaUrl(project.id, activeVideo.mediaId);
  }, [project, activeVideo]);

  // Sync video element to playhead / clip in-point
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeVideo) return;
    const local = playhead - activeVideo.start + activeVideo.inPoint;
    if (Math.abs(el.currentTime - local) > 0.12) {
      el.currentTime = Math.max(0, local);
    }
  }, [playhead, activeVideo?.id, activeVideo?.inPoint, activeVideo?.start]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [isPlaying, mediaUrl, setPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = get().playhead + dt;
      if (next >= Math.max(duration, 0.1)) {
        setPlaying(false);
        setPlayhead(duration);
      } else {
        setPlayhead(next);
      }
      raf = requestAnimationFrame(tick);
    };
    const get = useEditorStore.getState;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, duration, setPlayhead, setPlaying]);

  if (!project) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black/40">
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        <div
          className="relative aspect-video max-h-full w-full max-w-4xl overflow-hidden rounded-lg bg-black shadow-glow"
          style={{ aspectRatio: `${project.width} / ${project.height}` }}
        >
          {mediaUrl ? (
            <video
              key={activeVideo?.mediaId}
              ref={videoRef}
              src={mediaUrl}
              className="h-full w-full object-contain"
              muted
              playsInline
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-pv-muted">
              Import media and add clips to preview
            </div>
          )}
          {activeTexts.map((clip) => {
            const style = clip.textStyle;
            const pos = style?.position || "bottom";
            const top =
              pos === "top" ? "12%" : pos === "center" ? "50%" : "82%";
            return (
              <div
                key={clip.id}
                className="pointer-events-none absolute left-1/2 z-10 max-w-[90%] -translate-x-1/2 px-3 py-1 text-center"
                style={{
                  top,
                  transform:
                    pos === "center"
                      ? "translate(-50%, -50%)"
                      : "translateX(-50%)",
                  color: style?.color || "#fff",
                  backgroundColor: style?.backgroundColor || "rgba(0,0,0,0.45)",
                  fontSize: Math.max(14, (style?.fontSize || 48) * 0.35),
                  fontWeight: style?.bold ? 700 : 500,
                  fontFamily: style?.fontFamily || "Arial",
                  textAlign: style?.align || "center",
                  WebkitTextStroke: style?.strokeWidth
                    ? `${Math.max(0.5, style.strokeWidth * 0.3)}px ${style.strokeColor || "#000"}`
                    : undefined,
                }}
              >
                {clip.text}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 border-t border-pv-border bg-pv-panel/90 px-4 py-2">
        <button
          type="button"
          onClick={() => setPlayhead(0)}
          className="rounded border border-pv-border px-2 py-1 text-xs text-pv-muted hover:text-pv-text"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={() => setPlaying(!isPlaying)}
          className="rounded-full bg-pv-accent px-4 py-1.5 text-sm font-semibold text-white"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="font-mono text-xs text-pv-muted">
          {formatTimecode(playhead, project.fps)}
        </span>
      </div>
    </div>
  );
}
