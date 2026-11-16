import type { Clip, Effect, Project, TextStyle, Track } from "@powervideo/shared";
import { DEFAULT_TEXT_STYLE } from "@powervideo/shared";

export function uid(): string {
  return crypto.randomUUID();
}

export function projectDuration(project: Project): number {
  let max = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.start + clip.duration);
    }
  }
  return max;
}

export function findClip(
  project: Project,
  clipId: string
): { track: Track; clip: Clip; trackIndex: number; clipIndex: number } | null {
  for (let ti = 0; ti < project.tracks.length; ti++) {
    const track = project.tracks[ti];
    const clipIndex = track.clips.findIndex((c) => c.id === clipId);
    if (clipIndex >= 0) {
      return { track, clip: track.clips[clipIndex], trackIndex: ti, clipIndex };
    }
  }
  return null;
}

export function updateClip(
  project: Project,
  clipId: string,
  patch: Partial<Clip>
): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    })),
  };
}

export function deleteClip(project: Project, clipId: string): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== clipId),
    })),
  };
}

export function splitClip(project: Project, clipId: string, atTime: number): Project {
  const found = findClip(project, clipId);
  if (!found) return project;
  const { clip, track } = found;
  const local = atTime - clip.start;
  if (local <= 0.05 || local >= clip.duration - 0.05) return project;

  const left: Clip = {
    ...clip,
    duration: local,
    outPoint: clip.inPoint + local,
  };
  const right: Clip = {
    ...clip,
    id: uid(),
    start: atTime,
    duration: clip.duration - local,
    inPoint: clip.inPoint + local,
    outPoint: clip.outPoint,
    effects: clip.effects.map((e) => ({ ...e, id: uid() })),
  };

  return {
    ...project,
    tracks: project.tracks.map((t) => {
      if (t.id !== track.id) return t;
      const clips = t.clips.flatMap((c) => (c.id === clipId ? [left, right] : [c]));
      return { ...t, clips };
    }),
  };
}

export function addMediaClip(
  project: Project,
  mediaId: string,
  trackType: "video" | "audio",
  atTime?: number
): Project {
  const media = project.media.find((m) => m.id === mediaId);
  if (!media) return project;

  const track =
    project.tracks.find((t) => t.type === trackType) ||
    project.tracks.find((t) => t.type === "video");
  if (!track) return project;

  const end = track.clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  const start = atTime ?? end;
  const duration = Math.max(0.1, media.duration || 5);

  const clip: Clip = {
    id: uid(),
    mediaId,
    start,
    duration,
    inPoint: 0,
    outPoint: duration,
    effects: [],
  };

  return {
    ...project,
    tracks: project.tracks.map((t) =>
      t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t
    ),
  };
}

export function addTextClip(
  project: Project,
  text: string,
  start: number,
  duration = 3,
  style?: Partial<TextStyle>
): Project {
  const track = project.tracks.find((t) => t.type === "text");
  if (!track) return project;
  const clip: Clip = {
    id: uid(),
    start,
    duration,
    inPoint: 0,
    outPoint: duration,
    effects: [],
    text,
    textStyle: { ...DEFAULT_TEXT_STYLE, ...style },
  };
  return {
    ...project,
    tracks: project.tracks.map((t) =>
      t.id === track.id ? { ...t, clips: [...t.clips, clip] } : t
    ),
  };
}

export function upsertEffect(
  project: Project,
  clipId: string,
  type: Effect["type"],
  patch: Partial<Effect>
): Project {
  const found = findClip(project, clipId);
  if (!found) return project;
  const existing = found.clip.effects.find((e) => e.type === type);
  let effects: Effect[];
  if (existing) {
    effects = found.clip.effects.map((e) =>
      e.type === type ? { ...e, ...patch } : e
    );
  } else {
    effects = [...found.clip.effects, { id: uid(), type, ...patch }];
  }
  return updateClip(project, clipId, { effects });
}

export function removeEffect(
  project: Project,
  clipId: string,
  type: Effect["type"]
): Project {
  const found = findClip(project, clipId);
  if (!found) return project;
  return updateClip(project, clipId, {
    effects: found.clip.effects.filter((e) => e.type !== type),
  });
}

export function formatTimecode(seconds: number, fps = 30): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const frame = Math.floor((s % 1) * fps);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}:${String(frame).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}:${String(frame).padStart(2, "0")}`;
}
