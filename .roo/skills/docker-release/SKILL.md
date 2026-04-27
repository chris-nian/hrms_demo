---
name: docker-release
description: Build, tag, and release Docker images for the HRMS application. Use when the user needs to containerize the app, create a production image, or prepare the application for deployment. Leverages the existing multi-stage Dockerfile.
---

# Docker Release

## Overview

This skill manages the Docker build and release process for the HRMS full-stack application. The project already has:

- `Dockerfile` — Multi-stage build (Node.js frontend + Python backend)
- `docker-compose.yml` — Orchestration configuration
- `.dockerignore` — Build context exclusions

## When to Use This Skill

Use this skill when:

- The user wants to build a Docker image
- Preparing for production deployment
- The user says "dockerize", "build image", "containerize", or "deploy"
- Testing the production build locally

## Workflow

### Step 1: Verify Build Prerequisites

Ensure these files exist and are up to date:
- `Dockerfile`
- `docker-compose.yml`
- `backend/requirements.txt`
- `frontend/package.json` and `package-lock.json`

### Step 2: Build the Image

From the project root:

```bash
docker build -t hrms:latest -t hrms:$(date +%Y%m%d-%H%M%S) .
```

For a specific tag:

```bash
docker build -t hrms:v1.2.0 .
```

### Step 3: Run Locally with Docker

```bash
docker run -d \
  --name hrms-app \
  -p 8000:8000 \
  -v hrms-data:/app/data \
  hrms:latest
```

Or use Docker Compose:

```bash
docker-compose up -d
```

Verify the container is running:

```bash
docker ps
```

Check logs:

```bash
docker logs -f hrms-app
```

### Step 4: Test the Containerized App

Open http://localhost:8000 in a browser and verify:
- Frontend loads correctly
- API endpoints respond
- Database persists across restarts

### Step 5: Push to Registry (Optional)

Tag for your registry:

```bash
docker tag hrms:latest your-registry.com/hrms:latest
docker push your-registry.com/hrms:latest
```

### Step 6: Clean Up

```bash
docker stop hrms-app
docker rm hrms-app
docker-compose down
```

## Dockerfile Structure Reference

The existing `Dockerfile` uses a multi-stage build:

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| Stage 1 | `node:20-alpine` | Build frontend (Vite → `dist/`) |
| Stage 2 | `python:3.12-slim` | Run FastAPI backend + serve static files |

Key environment variables:
- `HRMS_DATA_DIR=/app/data` — Database storage location
- `HRMS_FRONTEND_DIST=/app/frontend/dist` — Static files path

## docker-compose.yml Reference

Review `docker-compose.yml` for:
- Port mappings (default `8000:8000`)
- Volume mounts for data persistence
- Environment variables
- Restart policies

## Common Issues and Fixes

### Issue: Frontend build fails

Check if `frontend/dist` is generated:
```bash
docker build --target frontend-builder -t hrms-frontend-build .
```

### Issue: SQLite database not persisting

Ensure the volume is mounted:
```bash
docker run -v $(pwd)/data:/app/data -p 8000:8000 hrms:latest
```

### Issue: Image size too large

The current image uses `python:3.12-slim` which is already optimized. For further optimization:
- Use multi-stage Python build with `python:3.12-alpine`
- Add `--no-cache-dir` to pip install (already present)

### Issue: Static files not served

Verify `HRMS_FRONTEND_DIST` is set correctly and the `dist` directory exists in the final image:
```bash
docker run --rm hrms:latest ls -la /app/frontend/dist
```

## Rules

- Always build from the project root (where `Dockerfile` lives)
- Tag images with both `latest` and a version/timestamp
- Test the container locally before pushing to production
- Ensure `data/hrms.db` is not copied into the image (check `.dockerignore`)
- Use volumes for database persistence in production
- Do not run `uvicorn` with `--reload` in production images
