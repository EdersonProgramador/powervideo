"use client";

import { useMemo, useRef } from "react";
import type { Clip } from "@powervideo/shared";
import { formatTimecode } from "@/lib/timeline";
import { useDuration, useEditorStore } from "@/store/editorStore";

const TRACK_H = 44;

function clipColor(type: string): string {
  if (type === "video") return "bg-sky-600/80 border-sky-400/50";
  if (type === "audio") return "bg-emerald-700/80 border-emerald-400/40";
  return "bg-amber-600/80 border-amber-300/40";
}

export function Timeline() {
  const project = useEditorStore((s) => s.project);
  const playhead = useEditorStore((s) => s.playhead);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const pixelsPerSecond = useEditorStore((s) => s.pixelsPerSecond);
  const zoom = useEditorStore((s) => s.zoom);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectClip = useEditorStore((s) => s.selectClip);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const addCaption = useEditorStore((s) => s.addCaption);
  const duration = useDuration();
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalWidth = useMemo(
    () => Math.max(800, (Math.max(duration, 10) + 2) * pixelsPerSecond),
    [duration, pixelsPerSecond]
  );

  if (!project) return null;

  const onRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    setPlayhead(x / pixelsPerSecond);
  };

  const onClipDrag = (clip: Clip, e: React.MouseEvent) => {
    e.stopPropagation();
    selectClip(clip.id);
    const startX = e.clientX;
    const origin = clip.start;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const nextStart = Math.max(0, origin + dx / pixelsPerSecond);
      useEditorStore.getState().updateSelected({ start: nextStart });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // Use setProject with history only on mouseup — for live drag update without spam history:
    // temporarily patch via getState
    const project0 = useEditorStore.getState().project;
    if (!project0) return;

    const liveMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const nextStart = Math.max(0, origin + dx / pixelsPerSecond);
      const p = useEditorStore.getState().project;
      if (!p) return;
      useEditorStore.setState({
        project: {
          ...p,
          tracks: p.tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) =>
              c.id === clip.id ? { ...c, start: nextStart } : c
            ),
          })),
        },
      });
    };
    const liveUp = () => {
      window.removeEventListener("mousemove", liveMove);
      window.removeEventListener("mouseup", liveUp);
      const current = useEditorStore.getState().project;
      if (current && project0) {
        useEditorStore.setState({
          past: [...useEditorStore.getState().past, structuredClone(project0)].slice(-40),
          future: [],
        });
      }
    };
    window.addEventListener("mousemove", liveMove);
    window.addEventListener("mouseup", liveUp);
    void onMove;
    void onUp;
  };

  const onTrimEdge = (
    clip: Clip,
    edge: "left" | "right",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    selectClip(clip.id);
    const startX = e.clientX;
    const originStart = clip.start;
    const originDur = clip.duration;
    const originIn = clip.inPoint;
    const originOut = clip.outPoint;

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / pixelsPerSecond;
      const p = useEditorStore.getState().project;
      if (!p) return;
      let next = { ...clip };
      if (edge === "right") {
        const duration = Math.max(0.05, originDur + dx);
        next = {
          ...clip,
          duration,
          outPoint: originIn + duration,
        };
      } else {
        const delta = Math.min(originDur - 0.05, Math.max(-originIn, dx));
        next = {
          ...clip,
          start: originStart + delta,
          duration: originDur - delta,
          inPoint: originIn + delta,
        };
      }
      useEditorStore.setState({
        project: {
          ...p,
          tracks: p.tracks.map((t) => ({
            ...t,
            clips: t.clips.map((c) => (c.id === clip.id ? next : c)),
          })),
        },
      });
    };
    const snapshot = structuredClone(useEditorStore.getState().project!);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      useEditorStore.setState({
        past: [...useEditorStore.getState().past, snapshot].slice(-40),
        future: [],
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <section className="flex h-64 shrink-0 flex-col border-t border-pv-border bg-pv-panel">
      <div className="flex items-center gap-2 border-b border-pv-border px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-pv-muted">
          Timeline
        </span>
        <button
          type="button"
          onClick={splitAtPlayhead}
          className="rounded border border-pv-border px-2 py-0.5 text-[11px] hover:bg-pv-panel2"
        >
          Split
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          className="rounded border border-pv-border px-2 py-0.5 text-[11px] text-pv-danger hover:bg-pv-panel2"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => {
            const text = window.prompt("Caption text");
            if (text) addCaption(text);
          }}
          className="rounded border border-pv-border px-2 py-0.5 text-[11px] hover:bg-pv-panel2"
        >
          + Text
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-pv-muted">
          <button type="button" onClick={() => setZoom(zoom / 1.25)}>
            −
          </button>
          <span>Zoom {zoom.toFixed(2)}×</span>
          <button type="button" onClick={() => setZoom(zoom * 1.25)}>
            +
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative flex-1 overflow-auto">
        <div style={{ width: totalWidth, minHeight: "100%" }} className="relative">
          <div
            className="sticky top-0 z-20 h-6 border-b border-pv-border bg-pv-panel2 timeline-grid"
            style={{ width: totalWidth, backgroundSize: `${pixelsPerSecond}px 100%` }}
            onClick={onRulerClick}
          >
            {Array.from({ length: Math.ceil(Math.max(duration, 10)) + 1 }).map((_, i) => (
              <span
                key={i}
                className="absolute top-1 text-[10px] text-pv-muted"
                style={{ left: i * pixelsPerSecond + 4 }}
              >
                {formatTimecode(i, project.fps)}
              </span>
            ))}
          </div>

          {project.tracks.map((track, ti) => (
            <div
              key={track.id}
              className="relative border-b border-pv-border/70"
              style={{ height: TRACK_H }}
            >
              <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full w-24 items-center bg-gradient-to-r from-pv-panel via-pv-panel/95 to-transparent px-2 text-[11px] font-medium text-pv-muted">
                {track.name}
              </div>
              <div
                className="absolute inset-0 timeline-grid"
                style={{ backgroundSize: `${pixelsPerSecond}px 100%` }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x =
                    e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
                  setPlayhead(x / pixelsPerSecond);
                  selectClip(null);
                }}
              />
              {track.clips.map((clip) => {
                const left = clip.start * pixelsPerSecond;
                const width = Math.max(8, clip.duration * pixelsPerSecond);
                const selected = clip.id === selectedClipId;
                return (
                  <div
                    key={clip.id}
                    className={`absolute top-1.5 h-[calc(100%-12px)] cursor-grab overflow-hidden rounded border text-[10px] ${clipColor(track.type)} ${
                      selected ? "ring-2 ring-pv-accent" : ""
                    }`}
                    style={{ left, width, marginLeft: 0 }}
                    onMouseDown={(e) => onClipDrag(clip, e)}
                    title={clip.text || clip.mediaId || clip.id}
                  >
                    <div
                      className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-ew-resize bg-white/30"
                      onMouseDown={(e) => onTrimEdge(clip, "left", e)}
                    />
                    <div className="truncate px-2 py-1">
                      {clip.text ||
                        project.media.find((m) => m.id === clip.mediaId)?.name ||
                        "Clip"}
                    </div>
                    <div
                      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-ew-resize bg-white/30"
                      onMouseDown={(e) => onTrimEdge(clip, "right", e)}
                    />
                  </div>
                );
              })}
              {/* spacer for label */}
              <span className="sr-only">{ti}</span>
            </div>
          ))}

          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-pv-danger"
            style={{ left: playhead * pixelsPerSecond }}
          >
            <div className="absolute -left-1.5 top-0 h-3 w-3 rotate-45 bg-pv-danger" />
          </div>
        </div>
      </div>
    </section>
  );
}
