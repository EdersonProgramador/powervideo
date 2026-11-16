# PowerVideo Desktop (future)

Thin Electron/Tauri shell:

1. Spawn `apps/api` (uvicorn) pointing at the same `data/` folder
2. Load `apps/web` production build or `http://127.0.0.1:3000` in dev
3. No cloud auth — local NLE only

Not implemented in MVP; API + web are already local-first.
