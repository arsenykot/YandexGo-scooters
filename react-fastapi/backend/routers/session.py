from typing import Optional

from fastapi import APIRouter

from models import CompleteResponse, ReserveRequest, SessionResponse
from store import store

router = APIRouter(prefix="/api/session", tags=["session"])


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions() -> list[SessionResponse]:
    return store.list_sessions()


@router.get("/{number}", response_model=Optional[SessionResponse])
def get_session(number: str) -> Optional[SessionResponse]:
    return store.get_session(number)


@router.post("/select/{number}", response_model=SessionResponse)
def select_scooter(number: str) -> SessionResponse:
    return store.select_scooter(number)


@router.post("/reserve", response_model=SessionResponse)
def reserve(req: ReserveRequest) -> SessionResponse:
    return store.reserve(req)


@router.post("/reset")
def reset_demo() -> dict[str, str]:
    return store.reset()


@router.post("/{number}/start", response_model=SessionResponse)
def start(number: str) -> SessionResponse:
    return store.start(number)


@router.post("/{number}/pause", response_model=SessionResponse)
def pause(number: str) -> SessionResponse:
    return store.pause(number)


@router.post("/{number}/resume", response_model=SessionResponse)
def resume(number: str) -> SessionResponse:
    return store.resume(number)


@router.post("/{number}/cancel")
def cancel(number: str) -> dict[str, str]:
    store.cancel(number)
    return {"status": "cancelled"}


@router.post("/{number}/finish", response_model=SessionResponse)
def finish(number: str) -> SessionResponse:
    return store.finish(number)


@router.post("/{number}/complete", response_model=CompleteResponse)
def complete(number: str) -> CompleteResponse:
    return store.complete(number)


@router.post("/{number}/beep")
def beep(number: str) -> dict[str, str]:
    return store.beep(number)
