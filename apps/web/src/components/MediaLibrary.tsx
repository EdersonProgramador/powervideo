"use client";

import { useRef } from "react";
import { useEditorStore } from "@/store/editorStore";

export function MediaLibrary() {
  const project = useEditorStore((s) => s.project);
  const importFiles = useEditorStore((s) => s.importFiles);
  const addToTimeline = useEditorStore((s) => s.addToTimeline);
  const transcribeSelectedMedia = useEditorStore((s) => s.transcribeSelectedMedia);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-pv-border bg-pv-panel/80">
      <div className="flex items-center justify-between border-b border-pv-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pv-muted">
          Media
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-pv-panel2 px-2 py-1 text-xs text-pv-accent hover:bg-pv-border"
        >
          Import
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) importFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {project.media.length === 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-pv-border text-center text-xs text-pv-muted hover:border-pv-accent hover:text-pv-text"
          >
            Drop or import
            <span className="mt-1 text-[10px] opacity-70">MP4, MOV, MP3, PNG…</span>
          </button>
        )}
        {project.media.map((m) => (
          <div
            key={m.id}
            className="rounded-lg border border-pv-border bg-pv-panel2 p-2"
          >
            <div className="truncate text-sm font-medium">{m.name}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-pv-muted">
              {m.type} · {m.duration.toFixed(1)}s
              {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => addToTimeline(m.id)}
                className="rounded bg-pv-bg px-2 py-0.5 text-[10px] hover:bg-pv-border"
              >
                Add
              </button>
              {(m.type === "video" || m.type === "audio") && (
                <button
                  type="button"
                  onClick={() => transcribeSelectedMedia(m.id)}
                  className="rounded bg-pv-bg px-2 py-0.5 text-[10px] text-pv-accent2 hover:bg-pv-border"
                >
                  Transcribe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
