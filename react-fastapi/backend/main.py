from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import scooters, session, wallet

app = FastAPI(title="Yandex Go Scooter Emulation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scooters.router)
app.include_router(session.router)
app.include_router(wallet.router)

media_dir = Path(__file__).resolve().parent.parent / "assets"
if media_dir.exists():
    app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
