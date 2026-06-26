from fastapi import APIRouter

from models import PurchaseRequest, PurchaseResponse, WalletResponse
from store import store

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletResponse)
def get_wallet() -> WalletResponse:
    return store.get_wallet()


@router.post("/purchase", response_model=PurchaseResponse)
def purchase_package(req: PurchaseRequest) -> PurchaseResponse:
    return store.purchase_package(req.tariff)
