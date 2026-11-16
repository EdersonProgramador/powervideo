# PowerVideo API

FastAPI backend for projects, media upload, Whisper transcription, and FFmpeg export.

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health: `GET http://127.0.0.1:8000/api/health`
