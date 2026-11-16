"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "@powervideo/shared";
import { api } from "@/lib/api";

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("Meu projeto");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProjects();
      setProjects(list);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "API offline — inicie apps/api (porta 8000)"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    try {
      const p = await api.createProject(name.trim() || "Untitled");
      window.location.href = `/editor/${p.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">
      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-pv-accent2">NLE</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
          Power<span className="text-pv-accent">Video</span>
        </h1>
        <p className="mt-3 max-w-xl text-pv-muted">
          Editor web estilo CapCut: timeline multi-track, preview, legendas com
          Whisper, efeitos básicos e export MP4 via FFmpeg. Pronto para Electron
          depois.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-pv-border bg-pv-panel/80 p-4 shadow-glow">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase text-pv-muted">Novo projeto</span>
          <input
            className="min-w-[240px] rounded-md border border-pv-border bg-pv-bg px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </label>
        <button
          type="button"
          onClick={create}
          className="rounded-md bg-pv-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          Criar e editar
        </button>
        <button
          type="button"
          onClick={refresh}
          className="rounded-md border border-pv-border px-3 py-2 text-sm text-pv-muted hover:text-pv-text"
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-pv-danger/40 bg-pv-danger/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-pv-muted">
        Projetos
      </h2>
      {loading && <p className="text-sm text-pv-muted">Carregando…</p>}
      {!loading && projects.length === 0 && (
        <p className="text-sm text-pv-muted">Nenhum projeto ainda.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/editor/${p.id}`}
              className="block rounded-xl border border-pv-border bg-pv-panel2 p-4 transition hover:border-pv-accent hover:shadow-glow"
            >
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 text-xs text-pv-muted">
                {p.width}×{p.height} · {p.mediaCount} media ·{" "}
                {new Date(p.updatedAt).toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
