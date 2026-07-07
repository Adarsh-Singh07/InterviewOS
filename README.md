# Personal AI Copilot

A private, self-hosted, real-time AI assistant for interviews and meetings.

## Architecture

This project is built using a modern, scalable, and completely free/open-source stack:
- **Frontend:** React + Vite + TailwindCSS
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL (with Alembic for migrations)
- **Vector DB:** Qdrant (for semantic memory and RAG)
- **Caching/PubSub:** Redis
- **Transcription:** Deepgram (falling back to local Whisper)
- **Intelligence:** Groq (Llama 3) / Gemini / Local Llama

## Folder Structure

```
copilot/
-- .env.example             # Template for environment variables
-- docker-compose.yml       # Development Docker architecture
-- docker-compose.prod.yml  # Production Docker architecture
-- backend/                 # FastAPI application
   -- app/                 # Application source code
   -- alembic/             # Database migrations
   -- storage/             # Persistent storage (logs, uploads)
   -- Dockerfile           # Backend container build instructions
-- frontend/                # React application
    -- src/                 # Frontend source code
    -- Dockerfile           # Frontend multi-stage container build
    -- nginx.conf           # Web server configuration
```

## Installation & Development Setup

1. Copy `.env.example` to `.env.development`:
   ```bash
   cp .env.example .env.development
   ```
2. Fill in your required API keys (Deepgram, Groq, etc.) and generate a secure `SECRET_KEY`.
3. Start the entire stack in development mode using Docker Compose:
   ```bash
   docker compose up -d
   ```
   *This single command will spin up Postgres, Redis, Qdrant, build the backend and frontend, and automatically run database migrations.*

4. Access the application at `http://localhost:5173` (or `http://localhost` depending on routing).

## Production Deployment

For production, we use pre-built images and an Nginx reverse proxy without live-reloading overhead.

1. Configure `.env.production`.
2. Run the production stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

## Troubleshooting

- **Database Errors:** The backend container relies on health checks and will wait for Postgres to be fully initialized. If you see migration errors, verify `DATABASE_URL` matches the internal Docker network (`postgresql://copilot:copilotpassword@postgres:5432/copilot_db`).
- **Logs:** Review structured application logs inside the `backend/storage/logs/` directory.

## Common Commands
- **Stop all services:** `docker compose down`
- **Wipe database completely:** `docker compose down -v`
- **Rebuild containers:** `docker compose up -d --build`
