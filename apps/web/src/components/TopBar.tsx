"use client";

import Link from "next/link";
import { useEditorStore } from "@/store/editorStore";
import { formatTimecode } from "@/lib/timeline";
import { useDuration } from "@/store/editorStore";

export function TopBar() {
  const project = useEditorStore((s) => s.project);
  const playhead = useEditorStore((s) => s.playhead);
  const saving = useEditorStore((s) => s.saving);
  const busy = useEditorStore((s) => s.busy);
  const save = useEditorStore((s) => s.save);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const exportMp4 = useEditorStore((s) => s.exportMp4);
  const setProject = useEditorStore((s) => s.setProject);
  const duration = useDuration();

  if (!project) return null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-pv-border bg-pv-panel/90 px-4 backdrop-blur">
      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-tight text-pv-text"
      >
        Power<span className="text-pv-accent">Video</span>
      </Link>
      <div className="mx-2 h-5 w-px bg-pv-border" />
      <input
        className="min-w-[160px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-pv-text outline-none hover:border-pv-border focus:border-pv-accent"
        value={project.name}
        onChange={(e) => setProject({ ...project, name: e.target.value }, false)}
        onBlur={() => save()}
      />
      <span className="font-mono text-xs text-pv-muted">
        {formatTimecode(playhead, project.fps)} / {formatTimecode(duration, project.fps)}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {(busy || saving) && (
          <span className="anim-pulse-soft text-xs text-pv-accent2">
            {busy || "Saving…"}
          </span>
        )}
        <button
          type="button"
          onClick={undo}
          className="rounded-md border border-pv-border px-2.5 py-1.5 text-xs text-pv-muted hover:bg-pv-panel2 hover:text-pv-text"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={redo}
          className="rounded-md border border-pv-border px-2.5 py-1.5 text-xs text-pv-muted hover:bg-pv-panel2 hover:text-pv-text"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={() => save()}
          className="rounded-md border border-pv-border px-2.5 py-1.5 text-xs hover:bg-pv-panel2"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => exportMp4()}
          className="rounded-md bg-pv-accent px-3 py-1.5 text-xs font-semibold text-white shadow-glow hover:brightness-110"
        >
          Export MP4
        </button>
      </div>
    </header>
  );
}
