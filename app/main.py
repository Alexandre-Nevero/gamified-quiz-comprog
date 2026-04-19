from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine
from app import models  # noqa: F401 — ensures models are registered with Base

app = FastAPI(title="CompProg 2 Quiz App")


@app.on_event("startup")
def on_startup():
    """Create all database tables on startup if they don't already exist."""
    models.Base.metadata.create_all(bind=engine)


# TODO: Register routers here once implemented
# from app.routers import auth, quiz, users, leaderboard
# app.include_router(auth.router, prefix="/api")
# app.include_router(quiz.router, prefix="/api")
# app.include_router(users.router, prefix="/api")
# app.include_router(leaderboard.router, prefix="/api")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/{full_path:path}", include_in_schema=False)
def catch_all(full_path: str):
    """Serve index.html for all non-API routes to support client-side navigation."""
    return FileResponse("static/index.html")
