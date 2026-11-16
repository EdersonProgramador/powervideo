import type { MediaItem, Project, ProjectSummary } from "@powervideo/shared";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        detail = data.detail || data.message || JSON.stringify(data);
      } else {
        const text = (await res.text()).trim();
        if (text) detail = text.slice(0, 200);
      }
    } catch {
      /* ignore */
    }
    if (
      typeof detail === "string" &&
      /unsupported method/i.test(detail)
    ) {
      detail =
        "API FastAPI não está rodando na porta 8000. Inicie: cd apps/api && .venv\\Scripts\\activate && python -m uvicorn app.main:app --reload --port 8000";
    }
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res as unknown as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),

  listProjects: () => request<ProjectSummary[]>("/projects"),

  createProject: (name: string) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getProject: (id: string) => request<Project>(`/projects/${id}`),

  saveProject: (project: Project) =>
    request<Project>(`/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: project.name,
        fps: project.fps,
        width: project.width,
        height: project.height,
        tracks: project.tracks,
        media: project.media,
      }),
    }),

  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" }),

  uploadMedia: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<MediaItem>(`/projects/${projectId}/media`, {
      method: "POST",
      body: form,
    });
  },

  mediaUrl: (projectId: string, mediaId: string) =>
    `${BASE}/projects/${projectId}/media/${mediaId}/file`,

  transcribe: (projectId: string, mediaId: string, language?: string) =>
    request<Project>(`/projects/${projectId}/transcribe`, {
      method: "POST",
      body: JSON.stringify({ mediaId, language: language || null, model: "base" }),
    }),

  exportVideo: async (projectId: string, quality: "draft" | "standard" | "high" = "standard") => {
    const res = await fetch(`${BASE}/projects/${projectId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "mp4", quality }),
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(typeof detail === "string" ? detail : "Export failed");
    }
    return res.blob();
  },
};
