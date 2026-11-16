"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editorStore";
import { TopBar } from "./TopBar";
import { MediaLibrary } from "./MediaLibrary";
import { Preview } from "./Preview";
import { Timeline } from "./Timeline";
import { Inspector } from "./Inspector";

export function EditorShell({ projectId }: { projectId: string }) {
  const loadProject = useEditorStore((s) => s.loadProject);
  const project = useEditorStore((s) => s.project);
  const error = useEditorStore((s) => s.error);
  const clearError = useEditorStore((s) => s.clearError);
  const busy = useEditorStore((s) => s.busy);
  const splitAtPlayhead = useEditorStore((s) => s.splitAtPlayhead);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const save = useEditorStore((s) => s.save);
  const setPlaying = useEditorStore((s) => s.setPlaying);
  const isPlaying = useEditorStore((s) => s.isPlaying);

  useEffect(() => {
    loadProject(projectId);
  }, [projectId, loadProject]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying(!useEditorStore.getState().isPlaying);
      }
      if (e.key === "s" || e.key === "S") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          save();
        } else {
          splitAtPlayhead();
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, redo, save, setPlaying, splitAtPlayhead, undo, isPlaying]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      {error && (
        <div className="flex items-center justify-between bg-pv-danger/20 px-4 py-2 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={clearError} className="underline">
            Dismiss
          </button>
        </div>
      )}
      {!project && (
        <div className="flex flex-1 items-center justify-center text-pv-muted">
          {busy || "Loading…"}
        </div>
      )}
      {project && (
        <>
          <div className="flex min-h-0 flex-1">
            <MediaLibrary />
            <Preview />
            <Inspector />
          </div>
          <Timeline />
        </>
      )}
    </div>
  );
}
