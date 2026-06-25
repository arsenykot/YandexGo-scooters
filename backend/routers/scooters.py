from fastapi import APIRouter

from models import ScooterDetail, ScooterSummary
from store import store

router = APIRouter(prefix="/api/scooters", tags=["scooters"])


@router.get("", response_model=list[ScooterSummary])
def list_scooters() -> list[ScooterSummary]:
    return store.list_scooters()


@router.get("/rented", response_model=list[ScooterSummary])
def list_rented_scooters() -> list[ScooterSummary]:
    return store.list_rented_scooters()


@router.get("/{number}", response_model=ScooterDetail)
def get_scooter(number: str) -> ScooterDetail:
    return store.get_scooter(number)
