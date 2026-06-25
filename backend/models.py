from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    SELECTED = "selected"
    RESERVED = "reserved"
    RIDING = "riding"
    PAUSED = "paused"
    FINISH_PHOTO = "finish_photo"


class TariffType(str, Enum):
    PER_MINUTE = "per_minute"
    PACKAGE_30 = "package_30"
    PACKAGE_50 = "package_50"
    PACKAGE_100 = "package_100"
    PACKAGE_300 = "package_300"


class ScooterSummary(BaseModel):
    id: str
    number: str
    battery: int
    lat_pct: float
    lng_pct: float
    available: bool = True


class TariffOption(BaseModel):
    id: TariffType
    label: str
    subtitle: str
    price: str
    original_price: Optional[str] = None


class ScooterDetail(ScooterSummary):
    range_hours: float
    tariffs: list[TariffOption]


class ReserveRequest(BaseModel):
    number: str
    tariff: TariffType = TariffType.PER_MINUTE


class SessionResponse(BaseModel):
    status: SessionStatus
    scooter_number: str
    scooter_id: str
    battery: int
    range_hours: float
    lat_pct: float
    lng_pct: float
    tariff: TariffType
    elapsed_seconds: int = 0
    riding_seconds: int = 0
    waiting_total_seconds: int = 0
    waiting_session_seconds: int = 0
    cost_rub: float = 0.0
    free_wait_remaining_seconds: Optional[int] = None
    package_minutes_remaining: Optional[int] = None
    wallet_minutes_remaining: Optional[int] = None
    server_time: datetime = Field(default_factory=datetime.utcnow)


class CompleteResponse(BaseModel):
    scooter_number: str
    riding_seconds: int
    waiting_total_seconds: int
    cost_rub: float
    tariff: TariffType
    prepaid_minutes_used: int = 0


class WalletResponse(BaseModel):
    prepaid_seconds: int
    prepaid_minutes: int


class PurchaseRequest(BaseModel):
    tariff: TariffType


class PurchaseResponse(BaseModel):
    tariff: TariffType
    minutes_added: int
    price_rub: float
    prepaid_seconds: int
    prepaid_minutes: int
