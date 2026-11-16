# PowerVideo

Editor de vídeo **estilo CapCut** (web-first, pronto para Electron): timeline multi-track, preview, legendas com Whisper, efeitos básicos e export MP4 com FFmpeg.

## Stack

- **apps/web** — Next.js 15 + React + Tailwind + Zustand
- **apps/api** — FastAPI + faster-whisper + FFmpeg
- **packages/shared** — tipos TypeScript do projeto

## Pré-requisitos

- Node.js 20+
- Python 3.11+ (recomendado 3.12)
- FFmpeg e ffprobe no PATH

## Setup

```bash
# Dependências JS (raiz do monorepo)
npm install

# API Python
cd apps/api
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

## Desenvolvimento

Em dois terminais (ou um com o script raiz):

```bash
# Terminal 1 — API
cd apps/api
.venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — Web
npm run dev:web
```

Ou, com a venv da API já ativa na PATH do shell:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Recursos (MVP)

- Importar vídeo / áudio / imagem
- Timeline multi-track (vídeo, áudio, texto)
- Cortar, trim, split, arrastar clips
- Preview com overlays de legenda
- Transcrição Whisper → clips de texto na timeline
- Efeitos: fade in/out, speed, brightness, contrast
- Export H.264 MP4
- Undo / redo e persistência JSON em `data/projects`

## Estrutura

```
powervideo/
  apps/web/          # UI CapCut-like
  apps/api/          # REST + Whisper + FFmpeg
  packages/shared/   # schema do projeto
  data/              # projetos e exports (gitignored)
```

## Electron (depois)

Empacote `apps/desktop` como shell fino: sobe a API local e carrega a UI (dev server ou build estático). A API e o schema já são locais e sem auth — encaixe direto.

## Referências open-source

Inspiração (não forks): Concat, OpenCut-AI, trykimu/videoeditor, FireRed-OpenStoryline, tightcut / faster-whisper pipelines.

## Licença

MIT
