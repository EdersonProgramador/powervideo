export type TrackType = "video" | "audio" | "text";

export type EffectType =
  | "fadeIn"
  | "fadeOut"
  | "brightness"
  | "contrast"
  | "speed"
  | "crossfade";

export interface Effect {
  id: string;
  type: EffectType;
  /** Duration in seconds for fades / crossfade */
  duration?: number;
  /** Multiplier for brightness/contrast/speed (e.g. 1.2, 0.5–2) */
  value?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  align: "left" | "center" | "right";
  position: "top" | "center" | "bottom";
  bold?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface Clip {
  id: string;
  /** Present for video/audio clips */
  mediaId?: string;
  /** Timeline start (seconds) */
  start: number;
  /** Duration on timeline (seconds) */
  duration: number;
  /** Source in-point (seconds) */
  inPoint: number;
  /** Source out-point (seconds) */
  outPoint: number;
  effects: Effect[];
  /** Caption / title text */
  text?: string;
  textStyle?: TextStyle;
}

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  locked?: boolean;
  muted?: boolean;
}

export interface MediaItem {
  id: string;
  name: string;
  filename: string;
  path: string;
  type: "video" | "audio" | "image";
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
  thumbnail?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  tracks: Track[];
  media: MediaItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  width: number;
  height: number;
  mediaCount: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Arial",
  fontSize: 48,
  color: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.45)",
  align: "center",
  position: "bottom",
  bold: true,
  strokeColor: "#000000",
  strokeWidth: 2,
};

export function createEmptyProject(name = "Untitled"): Omit<Project, "id" | "createdAt" | "updatedAt"> {
  return {
    name,
    fps: 30,
    width: 1920,
    height: 1080,
    tracks: [
      { id: "v1", type: "video", name: "Video 1", clips: [] },
      { id: "a1", type: "audio", name: "Audio 1", clips: [] },
      { id: "t1", type: "text", name: "Text / Captions", clips: [] },
    ],
    media: [],
  };
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
