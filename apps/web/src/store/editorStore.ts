"use client";

import type { Project } from "@powervideo/shared";
import { create } from "zustand";
import { api } from "@/lib/api";
import {
  addMediaClip,
  addTextClip,
  deleteClip,
  projectDuration,
  removeEffect,
  splitClip,
  updateClip,
  upsertEffect,
} from "@/lib/timeline";

type HistorySnap = Project;

interface EditorState {
  project: Project | null;
  selectedClipId: string | null;
  playhead: number;
  isPlaying: boolean;
  zoom: number;
  pixelsPerSecond: number;
  saving: boolean;
  busy: string | null;
  error: string | null;
  past: HistorySnap[];
  future: HistorySnap[];

  setPlayhead: (t: number) => void;
  setPlaying: (v: boolean) => void;
  setZoom: (z: number) => void;
  selectClip: (id: string | null) => void;
  loadProject: (id: string) => Promise<void>;
  setProject: (project: Project, pushHistory?: boolean) => void;
  save: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  importFiles: (files: FileList | File[]) => Promise<void>;
  addToTimeline: (mediaId: string) => void;
  addCaption: (text: string) => void;
  trimSelected: (inPoint: number, outPoint: number) => void;
  splitAtPlayhead: () => void;
  deleteSelected: () => void;
  updateSelected: (patch: Parameters<typeof updateClip>[2]) => void;
  setEffect: (type: Parameters<typeof upsertEffect>[2], patch: Parameters<typeof upsertEffect>[3]) => void;
  clearEffect: (type: Parameters<typeof removeEffect>[2]) => void;
  transcribeSelectedMedia: (mediaId: string) => Promise<void>;
  exportMp4: () => Promise<void>;
  clearError: () => void;
}

const MAX_HISTORY = 40;

function pushPast(past: HistorySnap[], project: Project): HistorySnap[] {
  return [...past.slice(-(MAX_HISTORY - 1)), structuredClone(project)];
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  selectedClipId: null,
  playhead: 0,
  isPlaying: false,
  zoom: 1,
  pixelsPerSecond: 64,
  saving: false,
  busy: null,
  error: null,
  past: [],
  future: [],

  setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
  setPlaying: (v) => set({ isPlaying: v }),
  setZoom: (z) =>
    set({
      zoom: Math.min(4, Math.max(0.25, z)),
      pixelsPerSecond: 64 * Math.min(4, Math.max(0.25, z)),
    }),
  selectClip: (id) => set({ selectedClipId: id }),
  clearError: () => set({ error: null }),

  loadProject: async (id) => {
    set({ busy: "Loading project…", error: null });
    try {
      const project = await api.getProject(id);
      set({
        project,
        past: [],
        future: [],
        playhead: 0,
        selectedClipId: null,
        busy: null,
      });
    } catch (e) {
      set({ busy: null, error: e instanceof Error ? e.message : "Load failed" });
    }
  },

  setProject: (project, pushHistory = true) => {
    const current = get().project;
    if (pushHistory && current) {
      set({
        project,
        past: pushPast(get().past, current),
        future: [],
      });
    } else {
      set({ project });
    }
  },

  save: async () => {
    const project = get().project;
    if (!project) return;
    set({ saving: true, error: null });
    try {
      const saved = await api.saveProject(project);
      set({ project: saved, saving: false });
    } catch (e) {
      set({
        saving: false,
        error: e instanceof Error ? e.message : "Save failed",
      });
    }
  },

  undo: () => {
    const { past, project, future } = get();
    if (!project || past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      project: prev,
      past: past.slice(0, -1),
      future: [structuredClone(project), ...future].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const { past, project, future } = get();
    if (!project || future.length === 0) return;
    const next = future[0];
    set({
      project: next,
      future: future.slice(1),
      past: pushPast(past, project),
    });
  },

  importFiles: async (files) => {
    const project = get().project;
    if (!project) return;
    set({ busy: "Importing media…", error: null });
    try {
      let next = project;
      for (const file of Array.from(files)) {
        const item = await api.uploadMedia(project.id, file);
        next = { ...next, media: [...next.media, item] };
        // Auto-add video/audio to timeline
        if (item.type === "video") {
          next = addMediaClip(next, item.id, "video");
          if (item.hasAudio) {
            next = addMediaClip(next, item.id, "audio");
          }
        } else if (item.type === "audio") {
          next = addMediaClip(next, item.id, "audio");
        } else if (item.type === "image") {
          next = addMediaClip(next, item.id, "video");
        }
      }
      get().setProject(next);
      await api.saveProject(next);
      set({ busy: null });
    } catch (e) {
      set({
        busy: null,
        error: e instanceof Error ? e.message : "Import failed",
      });
    }
  },

  addToTimeline: (mediaId) => {
    const project = get().project;
    if (!project) return;
    const media = project.media.find((m) => m.id === mediaId);
    if (!media) return;
    let next = project;
    if (media.type === "audio") {
      next = addMediaClip(project, mediaId, "audio", get().playhead);
    } else {
      next = addMediaClip(project, mediaId, "video", get().playhead);
    }
    get().setProject(next);
  },

  addCaption: (text) => {
    const project = get().project;
    if (!project || !text.trim()) return;
    get().setProject(addTextClip(project, text.trim(), get().playhead, 3));
  },

  trimSelected: (inPoint, outPoint) => {
    const { project, selectedClipId } = get();
    if (!project || !selectedClipId) return;
    const duration = Math.max(0.05, outPoint - inPoint);
    get().setProject(
      updateClip(project, selectedClipId, {
        inPoint,
        outPoint,
        duration,
      })
    );
  },

  splitAtPlayhead: () => {
    const { project, selectedClipId, playhead } = get();
    if (!project || !selectedClipId) return;
    get().setProject(splitClip(project, selectedClipId, playhead));
  },

  deleteSelected: () => {
    const { project, selectedClipId } = get();
    if (!project || !selectedClipId) return;
    get().setProject(deleteClip(project, selectedClipId));
    set({ selectedClipId: null });
  },

  updateSelected: (patch) => {
    const { project, selectedClipId } = get();
    if (!project || !selectedClipId) return;
    get().setProject(updateClip(project, selectedClipId, patch));
  },

  setEffect: (type, patch) => {
    const { project, selectedClipId } = get();
    if (!project || !selectedClipId) return;
    get().setProject(upsertEffect(project, selectedClipId, type, patch));
  },

  clearEffect: (type) => {
    const { project, selectedClipId } = get();
    if (!project || !selectedClipId) return;
    get().setProject(removeEffect(project, selectedClipId, type));
  },

  transcribeSelectedMedia: async (mediaId) => {
    const project = get().project;
    if (!project) return;
    set({ busy: "Transcribing with Whisper…", error: null });
    try {
      await api.saveProject(project);
      const updated = await api.transcribe(project.id, mediaId);
      get().setProject(updated, false);
      set({ past: [], future: [], busy: null });
    } catch (e) {
      set({
        busy: null,
        error: e instanceof Error ? e.message : "Transcription failed",
      });
    }
  },

  exportMp4: async () => {
    const project = get().project;
    if (!project) return;
    set({ busy: "Exporting MP4…", error: null });
    try {
      await api.saveProject(project);
      const blob = await api.exportVideo(project.id, "standard");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, "_")}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      set({ busy: null });
    } catch (e) {
      set({
        busy: null,
        error: e instanceof Error ? e.message : "Export failed",
      });
    }
  },
}));

export function useDuration(): number {
  const project = useEditorStore((s) => s.project);
  return project ? projectDuration(project) : 0;
}
