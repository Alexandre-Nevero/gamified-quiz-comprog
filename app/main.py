from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine
from app import models  # noqa: F401 — ensures models are registered with Base
from app.routers import auth, quiz, users, leaderboard

app = FastAPI(title="CompProg 2 Quiz App")


@app.on_event("startup")
def on_startup():
    """Create all database tables on startup if they don't already exist."""
    models.Base.metadata.create_all(bind=engine)


app.include_router(auth.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")

# Mount static files directory — serves /static/style.css, /static/app.js, etc.
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
def root():
    """Serve the SPA entry point at the root."""
    return FileResponse("static/index.html")


@app.get("/{full_path:path}", include_in_schema=False)
def catch_all(full_path: str):
    """Serve index.html for all non-API, non-static routes (SPA client-side navigation)."""
    # Let the static files mount handle actual static assets
    if full_path in ("style.css", "app.js"):
        from fastapi.responses import FileResponse as FR
        return FR(f"static/{full_path}")
    return FileResponse("static/index.html")
