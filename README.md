# LINE Bot with Two-Stage LLM Routing

Monorepo containing the FastAPI backend and Next.js admin panel for a LINE messaging bot powered by Claude Haiku + Sonnet.

See [spec.md](spec.md) for the full project specification.

## Structure

```
twothree-ai/
├── backend/        # FastAPI + SQLAlchemy
├── frontend/       # Next.js 14 (App Router) + Tailwind
├── docker-compose.yml
└── .env.example
```

## Local development

```bash
# 1. Copy env template and fill in secrets
cp .env.example .env

# 2. Start both services
docker compose up --build

# Backend: http://localhost:8000  (docs at /docs)
# Frontend: http://localhost:3000
```

### Backend (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

Lint / format:
```bash
ruff check .
ruff format .
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

Lint / format:
```bash
npm run lint
npm run format
```
