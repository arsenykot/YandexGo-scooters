from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from models import (
    CompleteResponse,
    PurchaseResponse,
    ReserveRequest,
    ScooterDetail,
    ScooterSummary,
    SessionResponse,
    SessionStatus,
    TariffOption,
    TariffType,
    WalletResponse,
)

PER_MINUTE_RATE = 8.99
FREE_WAIT_SECONDS = 600

PACKAGE_TARIFFS: dict[TariffType, tuple[int, float]] = {
    TariffType.PACKAGE_30: (30, 215.0),
    TariffType.PACKAGE_50: (50, 350.0),
    TariffType.PACKAGE_100: (100, 650.0),
    TariffType.PACKAGE_300: (300, 1800.0),
}

RENTED_STATUSES = frozenset(
    {
        SessionStatus.RESERVED,
        SessionStatus.RIDING,
        SessionStatus.PAUSED,
        SessionStatus.FINISH_PHOTO,
    }
)

BILLED_STATUSES = frozenset(
    {
        SessionStatus.RIDING,
        SessionStatus.PAUSED,
        SessionStatus.FINISH_PHOTO,
    }
)


@dataclass
class Scooter:
    id: str
    number: str
    battery: int
    lat_pct: float
    lng_pct: float
    range_hours: float
    available: bool = True


@dataclass
class ActiveSession:
    scooter_id: str
    status: SessionStatus
    tariff: TariffType
    reserved_at: Optional[datetime] = None
    riding_started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    accumulated_riding_seconds: int = 0
    accumulated_waiting_seconds: int = 0
    finish_requested_at: Optional[datetime] = None


TARIFFS: list[TariffOption] = [
    TariffOption(
        id=TariffType.PER_MINUTE,
        label="Go anywhere",
        subtitle="₽8.99/min",
        price="₽8.99/min",
    ),
    TariffOption(
        id=TariffType.PACKAGE_30,
        label="30 min",
        subtitle="valid 1 day",
        price="₽215",
        original_price="₽270",
    ),
    TariffOption(
        id=TariffType.PACKAGE_50,
        label="50 min",
        subtitle="valid 1 day",
        price="₽350",
        original_price="₽450",
    ),
    TariffOption(
        id=TariffType.PACKAGE_100,
        label="100 min",
        subtitle="valid 1 day",
        price="₽650",
        original_price="₽900",
    ),
    TariffOption(
        id=TariffType.PACKAGE_300,
        label="300 min",
        subtitle="valid 1 day",
        price="₽1800",
        original_price="₽2700",
    ),
]


def _seed_scooters() -> dict[str, Scooter]:
    items = [
        Scooter("s1", "HA538P", 98, 52.0, 48.0, 4.0),
        Scooter("s2", "HA539B", 85, 38.0, 55.0, 3.5),
        Scooter("s3", "HA541K", 72, 65.0, 42.0, 3.0),
        Scooter("s4", "HA544M", 91, 45.0, 62.0, 3.8),
        Scooter("s5", "HA547R", 64, 58.0, 35.0, 2.5),
    ]
    return {s.number.upper(): s for s in items}


class InMemoryStore:
    def __init__(self) -> None:
        self.scooters: dict[str, Scooter] = _seed_scooters()
        self.sessions: dict[str, ActiveSession] = {}
        self.prepaid_seconds: int = 0

    def get_wallet(self) -> WalletResponse:
        now = datetime.utcnow()
        remaining = self._wallet_seconds_remaining(now)
        return WalletResponse(
            prepaid_seconds=remaining,
            prepaid_minutes=int(remaining // 60),
        )

    def purchase_package(self, tariff: TariffType) -> PurchaseResponse:
        if tariff == TariffType.PER_MINUTE:
            raise HTTPException(400, "Only minute packages can be purchased")
        if tariff not in PACKAGE_TARIFFS:
            raise HTTPException(400, "Unknown package")
        minutes, price = PACKAGE_TARIFFS[tariff]
        added_seconds = minutes * 60
        self.prepaid_seconds += added_seconds
        remaining = self.prepaid_seconds
        return PurchaseResponse(
            tariff=tariff,
            minutes_added=minutes,
            price_rub=price,
            prepaid_seconds=remaining,
            prepaid_minutes=int(remaining // 60),
        )

    def _rented_ids(self) -> set[str]:
        return {
            sid
            for sid, sess in self.sessions.items()
            if sess.status in RENTED_STATUSES
        }

    def list_scooters(self) -> list[ScooterSummary]:
        rented = self._rented_ids()
        return [
            self._to_summary(s)
            for s in self.scooters.values()
            if s.id not in rented and s.available
        ]

    def list_rented_scooters(self) -> list[ScooterSummary]:
        result: list[ScooterSummary] = []
        for scooter_id, sess in self.sessions.items():
            if sess.status not in RENTED_STATUSES:
                continue
            scooter = self._get_scooter_by_id(scooter_id)
            result.append(self._to_summary(scooter, available=False))
        return result

    def get_scooter(self, number: str) -> ScooterDetail:
        scooter = self._get_scooter(number)
        rented = scooter.id in self._rented_ids()
        return ScooterDetail(
            id=scooter.id,
            number=scooter.number,
            battery=scooter.battery,
            lat_pct=scooter.lat_pct,
            lng_pct=scooter.lng_pct,
            available=scooter.available and not rented,
            range_hours=scooter.range_hours,
            tariffs=TARIFFS,
        )

    def list_sessions(self) -> list[SessionResponse]:
        return [self._build_session_response(s) for s in self.sessions.values()]

    def get_session(self, number: str) -> Optional[SessionResponse]:
        scooter = self._get_scooter(number)
        sess = self.sessions.get(scooter.id)
        if not sess:
            return None
        return self._build_session_response(sess)

    def reset(self) -> dict[str, str]:
        self.scooters = _seed_scooters()
        self.sessions = {}
        self.prepaid_seconds = 0
        return {"status": "reset"}

    def _clear_other_selected(self, except_scooter_id: Optional[str] = None) -> None:
        for scooter_id, sess in list(self.sessions.items()):
            if sess.status != SessionStatus.SELECTED:
                continue
            if except_scooter_id and scooter_id == except_scooter_id:
                continue
            del self.sessions[scooter_id]

    def select_scooter(self, number: str) -> SessionResponse:
        scooter = self._get_scooter(number)
        existing = self.sessions.get(scooter.id)
        if existing:
            self._clear_other_selected(except_scooter_id=scooter.id)
            return self._build_session_response(existing)
        if scooter.id in self._rented_ids():
            raise HTTPException(409, "Scooter is already rented")
        self._clear_other_selected(except_scooter_id=scooter.id)
        self.sessions[scooter.id] = ActiveSession(
            scooter_id=scooter.id,
            status=SessionStatus.SELECTED,
            tariff=TariffType.PER_MINUTE,
        )
        return self._build_session_response(self.sessions[scooter.id])

    def reserve(self, req: ReserveRequest) -> SessionResponse:
        if req.tariff != TariffType.PER_MINUTE:
            raise HTTPException(
                400,
                "Reserve uses per-minute billing. Buy minute packages separately.",
            )
        sess = self._session_for_number(req.number)
        self._ensure_session_status(sess, SessionStatus.SELECTED)
        scooter = self._get_scooter(req.number)
        now = datetime.utcnow()
        sess.status = SessionStatus.RESERVED
        sess.tariff = req.tariff
        sess.reserved_at = now
        scooter.available = False
        return self._build_session_response(sess)

    def start(self, number: str) -> SessionResponse:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.RESERVED)
        sess.status = SessionStatus.RIDING
        sess.riding_started_at = datetime.utcnow()
        return self._build_session_response(sess)

    def pause(self, number: str) -> SessionResponse:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.RIDING)
        now = datetime.utcnow()
        sess.accumulated_riding_seconds = self._riding_seconds(sess, now)
        sess.paused_at = now
        sess.status = SessionStatus.PAUSED
        sess.riding_started_at = None
        return self._build_session_response(sess)

    def resume(self, number: str) -> SessionResponse:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.PAUSED)
        now = datetime.utcnow()
        if sess.paused_at:
            sess.accumulated_waiting_seconds += int(
                (now - sess.paused_at).total_seconds()
            )
        sess.status = SessionStatus.RIDING
        sess.riding_started_at = now
        sess.paused_at = None
        return self._build_session_response(sess)

    def cancel(self, number: str) -> None:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.RESERVED)
        self._release_scooter(sess)
        del self.sessions[sess.scooter_id]

    def finish(self, number: str) -> SessionResponse:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.RIDING, SessionStatus.PAUSED)
        now = datetime.utcnow()
        if sess.status == SessionStatus.RIDING:
            sess.accumulated_riding_seconds = self._riding_seconds(sess, now)
        elif sess.status == SessionStatus.PAUSED and sess.paused_at:
            sess.accumulated_waiting_seconds += int(
                (now - sess.paused_at).total_seconds()
            )
        sess.status = SessionStatus.FINISH_PHOTO
        sess.finish_requested_at = now
        sess.riding_started_at = None
        sess.paused_at = None
        return self._build_session_response(sess)

    def complete(self, number: str) -> CompleteResponse:
        sess = self._session_for_number(number)
        self._ensure_session_status(sess, SessionStatus.FINISH_PHOTO)
        now = datetime.utcnow()
        riding_seconds = self._riding_seconds(sess, now)
        waiting_total = self._waiting_total_seconds(sess, now)
        billable = riding_seconds + waiting_total
        items = self._active_billed_sessions(now)
        total_billable = sum(b for _, b in items)
        other_billable = total_billable - billable
        available_for_this = max(0, self.prepaid_seconds - other_billable)
        prepaid_used = min(billable, available_for_this)
        costs = self._session_costs(now)
        cost = costs.get(sess.scooter_id, 0.0)
        prepaid_used = min(billable, self.prepaid_seconds)
        scooter = self._get_scooter_by_id(sess.scooter_id)
        summary = CompleteResponse(
            scooter_number=scooter.number,
            riding_seconds=riding_seconds,
            waiting_total_seconds=waiting_total,
            cost_rub=cost,
            tariff=sess.tariff,
            prepaid_minutes_used=int(prepaid_used // 60),
        )
        self.prepaid_seconds = max(0, self.prepaid_seconds - billable)
        sess.accumulated_riding_seconds = riding_seconds
        self._release_scooter(sess)
        del self.sessions[sess.scooter_id]
        return summary

    def beep(self, number: str) -> dict[str, str]:
        sess = self._session_for_number(number)
        if sess.status not in RENTED_STATUSES:
            raise HTTPException(400, "Scooter is not rented")
        return {"message": "Beep sent"}

    def _release_scooter(self, sess: ActiveSession) -> None:
        scooter = self._get_scooter_by_id(sess.scooter_id)
        scooter.available = True
        if sess.accumulated_riding_seconds > 0:
            drain = min(25, sess.accumulated_riding_seconds // 60)
            scooter.battery = max(10, scooter.battery - drain)

    def _to_summary(self, scooter: Scooter, available: bool = True) -> ScooterSummary:
        return ScooterSummary(
            id=scooter.id,
            number=scooter.number,
            battery=scooter.battery,
            lat_pct=scooter.lat_pct,
            lng_pct=scooter.lng_pct,
            available=available and scooter.available,
        )

    def _get_scooter(self, number: str) -> Scooter:
        scooter = self.scooters.get(number.upper())
        if not scooter:
            raise HTTPException(404, f"Scooter {number} not found")
        return scooter

    def _get_scooter_by_id(self, scooter_id: str) -> Scooter:
        for scooter in self.scooters.values():
            if scooter.id == scooter_id:
                return scooter
        raise HTTPException(404, "Scooter not found")

    def _session_for_number(self, number: str) -> ActiveSession:
        scooter = self._get_scooter(number)
        sess = self.sessions.get(scooter.id)
        if not sess:
            raise HTTPException(404, "No session for this scooter")
        return sess

    def _ensure_session_status(
        self, sess: ActiveSession, *allowed: SessionStatus
    ) -> None:
        if sess.status not in allowed:
            raise HTTPException(
                400,
                f"Invalid transition from {sess.status}",
            )

    def _riding_seconds(self, sess: ActiveSession, now: datetime) -> int:
        total = sess.accumulated_riding_seconds
        if sess.status == SessionStatus.RIDING and sess.riding_started_at:
            total += int((now - sess.riding_started_at).total_seconds())
        return total

    def _waiting_session_seconds(self, sess: ActiveSession, now: datetime) -> int:
        if sess.status == SessionStatus.PAUSED and sess.paused_at:
            return int((now - sess.paused_at).total_seconds())
        return 0

    def _waiting_total_seconds(self, sess: ActiveSession, now: datetime) -> int:
        total = sess.accumulated_waiting_seconds
        if sess.status == SessionStatus.PAUSED and sess.paused_at:
            total += int((now - sess.paused_at).total_seconds())
        return total

    def _billable_for_session(self, sess: ActiveSession, now: datetime) -> int:
        riding = self._riding_seconds(sess, now)
        waiting = self._waiting_total_seconds(sess, now)
        return riding + waiting

    def _active_billed_sessions(self, now: datetime) -> list[tuple[ActiveSession, int]]:
        items: list[tuple[ActiveSession, int]] = []
        for sess in self.sessions.values():
            if sess.status not in BILLED_STATUSES:
                continue
            items.append((sess, self._billable_for_session(sess, now)))
        return items

    def _wallet_seconds_remaining(self, now: datetime) -> int:
        total_billable = sum(
            billable for _, billable in self._active_billed_sessions(now)
        )
        return max(0, self.prepaid_seconds - total_billable)

    def _session_costs(self, now: datetime) -> dict[str, float]:
        items = self._active_billed_sessions(now)
        total_billable = sum(billable for _, billable in items)
        if total_billable <= 0:
            return {}
        overflow = max(0, total_billable - self.prepaid_seconds)
        costs: dict[str, float] = {}
        for sess, billable in items:
            share = billable / total_billable
            overflow_seconds = overflow * share
            costs[sess.scooter_id] = round(
                (overflow_seconds / 60) * PER_MINUTE_RATE, 2
            )
        return costs

    def _build_session_response(self, sess: ActiveSession) -> SessionResponse:
        scooter = self._get_scooter_by_id(sess.scooter_id)
        now = datetime.utcnow()
        riding_seconds = 0
        waiting_total = 0
        waiting_session = 0
        cost = 0.0
        free_wait_remaining: Optional[int] = None
        wallet_minutes_remaining: Optional[int] = None

        if sess.status == SessionStatus.RESERVED and sess.reserved_at:
            elapsed = int((now - sess.reserved_at).total_seconds())
            free_wait_remaining = max(0, FREE_WAIT_SECONDS - elapsed)
            if self.prepaid_seconds > 0:
                wallet_minutes_remaining = int(self.prepaid_seconds // 60)
        elif sess.status in BILLED_STATUSES:
            riding_seconds = self._riding_seconds(sess, now)
            waiting_total = self._waiting_total_seconds(sess, now)
            waiting_session = self._waiting_session_seconds(sess, now)
            costs = self._session_costs(now)
            cost = costs.get(sess.scooter_id, 0.0)
            wallet_minutes_remaining = int(self._wallet_seconds_remaining(now) // 60)

        battery = scooter.battery
        if sess.status == SessionStatus.RIDING and riding_seconds > 0:
            battery = max(10, scooter.battery - riding_seconds // 120)

        range_hours = max(0.5, scooter.range_hours - riding_seconds / 3600)

        return SessionResponse(
            status=sess.status,
            scooter_number=scooter.number,
            scooter_id=scooter.id,
            battery=battery,
            range_hours=round(range_hours, 1),
            lat_pct=scooter.lat_pct,
            lng_pct=scooter.lng_pct,
            tariff=sess.tariff,
            elapsed_seconds=riding_seconds,
            riding_seconds=riding_seconds,
            waiting_total_seconds=waiting_total,
            waiting_session_seconds=waiting_session,
            cost_rub=cost,
            free_wait_remaining_seconds=free_wait_remaining,
            wallet_minutes_remaining=wallet_minutes_remaining,
            server_time=now,
        )


store = InMemoryStore()
