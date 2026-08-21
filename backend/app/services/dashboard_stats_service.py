from __future__ import annotations

from datetime import datetime
from typing import Any

from google.api_core.exceptions import NotFound
from google.cloud.firestore import Increment

from app.core.firebase import get_firestore


DEFAULT_DASHBOARD_STATS = {
    "total_rooms": 0,
    "total_inventoryItems": 0,
    "total_revenue": 0,
    "total_payments": 0,
    "total_allocations_active": 0,
    "total_allocations_completed": 0,
    "total_allocations_cancelled": 0,
}


def _stats_doc_ref():
    db = get_firestore()
    return db.collection("metadata").document("dashboard")


def _ensure_dashboard_doc() -> None:
    doc_ref = _stats_doc_ref()
    snapshot = doc_ref.get()
    if not snapshot.exists:
        doc_ref.set(
            {
                **DEFAULT_DASHBOARD_STATS,
                # "updated_at": datetime.utcnow(),
            }
        )
        return

    existing = snapshot.to_dict() or {}
    missing_fields = {
        key: value
        for key, value in DEFAULT_DASHBOARD_STATS.items()
        if key not in existing
    }
    if missing_fields:
        doc_ref.set(
            {
                **missing_fields,
                # "updated_at": datetime.utcnow(),
            },
            merge=True,
        )


def _increment(field_name: str, value: float | int) -> None:
    if not value:
        return

    doc_ref = _stats_doc_ref()
    payload = {
        field_name: Increment(value),
        # "updated_at": datetime.utcnow(),
    }
    try:
        doc_ref.update(payload)
    except NotFound:
        _ensure_dashboard_doc()
        doc_ref.update(payload)


def _normalize_allocation_status(status: str | None) -> str:
    normalized = (status or "active").strip().lower()
    if normalized in {"active", "completed", "cancelled"}:
        return normalized
    return "active"


def get_dashboard_stats() -> dict[str, Any]:
    _ensure_dashboard_doc()
    doc = _stats_doc_ref().get()
    if not doc.exists:
        return {
            **DEFAULT_DASHBOARD_STATS,
            "total_allocations": 0,
        }

    data = doc.to_dict() or {}
    stats = {**DEFAULT_DASHBOARD_STATS, **data}
    legacy_closed = int(stats.get("total_allocations_closed", 0) or 0)
    if legacy_closed:
        stats["total_allocations_completed"] = (
            int(stats.get("total_allocations_completed", 0) or 0) + legacy_closed
        )
    stats["total_allocations"] = (
        int(stats.get("total_allocations_active", 0) or 0)
        + int(stats.get("total_allocations_completed", 0) or 0)
        + int(stats.get("total_allocations_cancelled", 0) or 0)
    )
    return stats


def increment_rooms() -> None:
    _increment("total_rooms", 1)


def decrement_rooms() -> None:
    _increment("total_rooms", -1)


def increment_inventoryItems() -> None:
    _increment("total_inventoryItems", 1)


def decrement_inventoryItems() -> None:
    _increment("total_inventoryItems", -1)


# def update_inventoryItem_quantity(delta_quantity: int | int) -> None:
#     _increment("total_inventoryItems", delta_quantity)


def increment_active_allocations() -> None:
    _increment("total_allocations_active", 1)


def decrement_active_allocations() -> None:
    _increment("total_allocations_active", -1)


def increment_completed_allocations() -> None:
    _increment("total_allocations_completed", 1)


def decrement_completed_allocations() -> None:
    _increment("total_allocations_completed", -1)


def increment_cancelled_allocations() -> None:
    _increment("total_allocations_cancelled", 1)


def decrement_cancelled_allocations() -> None:
    _increment("total_allocations_cancelled", -1)


def increment_revenue(amount: float | int) -> None:
    _increment("total_revenue", abs(float(amount or 0)))


def decrement_revenue(amount: float | int) -> None:
    _increment("total_revenue", -abs(float(amount or 0)))


def increment_payments() -> None:
    _increment("total_payments", 1)


def decrement_payments() -> None:
    _increment("total_payments", -1)


def apply_allocation_status_delta(
    old_status: str | None, new_status: str | None
) -> None:
    previous = (
        _normalize_allocation_status(old_status) if old_status is not None else None
    )
    current = (
        _normalize_allocation_status(new_status) if new_status is not None else None
    )

    if previous == current:
        return

    if previous == "active":
        decrement_active_allocations()
    elif previous == "completed":
        decrement_completed_allocations()
    elif previous == "cancelled":
        decrement_cancelled_allocations()

    if current == "active":
        increment_active_allocations()
    elif current == "completed":
        increment_completed_allocations()
    elif current == "cancelled":
        increment_cancelled_allocations()


def status_bucket(status: str | None) -> str:
    return _normalize_allocation_status(status)


# Backward-compatible aliases.
def increment_closed_allocations() -> None:
    increment_completed_allocations()


def decrement_closed_allocations() -> None:
    decrement_completed_allocations()


def rebuild_dashboard_stats() -> dict[str, Any]:
    db = get_firestore()

    total_rooms = 0
    for _ in db.collection("rooms").stream():
        total_rooms += 1

    total_inventoryItems = 0
    for _ in db.collection("inventoryItems").stream():
        total_inventoryItems += 1

    total_payments = 0
    for _ in db.collection("payments").stream():
        total_payments += 1

    total_revenue = 0.0
    total_active = 0
    total_completed = 0
    total_cancelled = 0
    for doc in db.collection("allocations").stream():
        data = doc.to_dict() or {}
        bucket = status_bucket(data.get("status"))
        if bucket == "active":
            total_active += 1
        elif bucket == "completed":
            total_completed += 1
            try:
                total_revenue += float(data.get("doctorFee", 0) or 0)
            except (TypeError, ValueError):
                pass
        elif bucket == "cancelled":
            total_cancelled += 1

    rebuilt = {
        "total_rooms": int(total_rooms),
        "total_inventoryItems": int(total_inventoryItems),
        "total_revenue": float(total_revenue),
        "total_payments": int(total_payments),
        "total_allocations_active": int(total_active),
        "total_allocations_completed": int(total_completed),
        "total_allocations_cancelled": int(total_cancelled),
        # "updated_at": datetime.utcnow(),
    }

    _stats_doc_ref().set(rebuilt, merge=True)
    return get_dashboard_stats()
