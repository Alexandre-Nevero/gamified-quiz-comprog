# Deployment Guide

## Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Seed the database (run once to populate questions):
   ```bash
   python seed.py
   ```

3. Start the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   The app will be available at `http://localhost:8000`.

## Running Tests

```bash
pytest --tb=short
```

## Deploying to Render

The project includes a `render.yaml` (Blueprint) and a `Procfile` for Render deployment.

### Steps

1. Push the repository to GitHub (or GitLab).
2. In the [Render dashboard](https://dashboard.render.com), create a new **Web Service** and connect your repository.
   - Render will auto-detect `render.yaml` and configure the service.
   - Alternatively, set the build command to `pip install -r requirements.txt` and the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT` manually.
3. The persistent disk (`quiz-db`) is mounted at `/opt/render/project/src`, which is the working directory. The SQLite file (`quiz.db`) will be created there automatically on first startup.
4. **After the first deploy**, open a Render shell (or use the one-off job feature) and run:
   ```bash
   python seed.py
   ```
   This populates the question bank. It only needs to be run once.

### Notes

- The FastAPI app creates the database schema automatically on startup (no manual migration needed).
- All API routes and static frontend files are served from the same process on the same port.
- SQLite is the sole database; no external database service is required.
