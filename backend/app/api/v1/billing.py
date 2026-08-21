from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.core.firebase import get_firestore
from app.schemas.payments import PaymentsCreate, PaymentsUpdate
from app.services.dashboard_stats_service import (
    decrement_payments,
    get_dashboard_stats,
    increment_payments,
)

router = APIRouter()


def _normalize_payments_fields(data: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            normalized[key] = value if value else None
        else:
            normalized[key] = value
    return normalized


def normalize_name(name: str | None) -> str | None:
    if name is None:
        return None
    stripped = " ".join(name.strip().split())
    return stripped.lower()


def _reduce_inventoryItem_inventory(db, items: list[dict[str, Any]]) -> None:
    if not items:
        return

    inventoryItems_ref = db.collection("inventoryItems")
    now = datetime.now(timezone.utc)

    for item in items:
        service_name = (item.get("service_or_item") or "").strip()
        if not service_name:
            continue

        quantity_to_reduce = float(item.get("quantity", 0) or 0)
        if quantity_to_reduce <= 0:
            continue

        normalized_service = normalize_name(service_name)
        query = inventoryItems_ref.where("name_lower", "==", normalized_service).limit(1)
        matched = list(query.stream())

        if not matched:
            continue

        inventoryItem_doc = matched[0]
        inventoryItem_ref = inventoryItems_ref.document(inventoryItem_doc.id)
        inventoryItem_data = inventoryItem_doc.to_dict() or {}

        current_quantity = float(inventoryItem_data.get("presentQuantity", 0) or 0)
        next_quantity = max(0, current_quantity - quantity_to_reduce)

        inventoryItem_ref.update({"presentQuantity": next_quantity, "updated_at": now})


@router.post("/")
def create_payments(payload: PaymentsCreate):
    try:
        db = get_firestore()
        now = datetime.now(timezone.utc)

        payments_data = _normalize_payments_fields(payload.model_dump())
        payments_data["room_name"] = payments_data.get("room_name", "").strip()
        payments_data["room_name_lower"] = normalize_name(
            payments_data.get("room_name")
        )

        # Recalculate amounts to enforce consistency
        items = []
        total = 0.0
        for item in payments_data.get("items", []):
            q = float(item.get("quantity", 0) or 0)
            r = float(item.get("rate", 0) or 0)
            a = q * r
            items.append(
                {
                    "service_or_item": item.get("service_or_item", "").strip(),
                    "quantity": q,
                    "rate": r,
                    "amount": a,
                }
            )
            total += a

        payments_data["items"] = items
        payments_data["total_amount"] = float(total)

        # Reduce inventoryItem inventory for billed items
        _reduce_inventoryItem_inventory(db, items)

        doc_ref = db.collection("payments").document()

        doc_ref.set(
            {
                "id": doc_ref.id,
                **payments_data,
                "created_at": now,
                "updated_at": None,
            }
        )
        increment_payments()

        return {"success": True, "payments_id": doc_ref.id, "id": doc_ref.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{payments_id}")
def update_payments(payments_id: str, payload: PaymentsUpdate):
    db = get_firestore()
    doc_ref = db.collection("payments").document(payments_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Payments record not found")

    update_data = payload.model_dump(exclude_unset=True)
    update_data = _normalize_payments_fields(update_data)

    if "room_name" in update_data and update_data["room_name"] is None:
        raise HTTPException(status_code=422, detail="Room name cannot be empty")

    if "room_name" in update_data and update_data["room_name"]:
        update_data["room_name_lower"] = normalize_name(update_data["room_name"])

    if "items" in update_data and update_data.get("items") is not None:
        items = []
        total = 0.0
        for item in update_data["items"]:
            q = float(item.get("quantity", 0) or 0)
            r = float(item.get("rate", 0) or 0)
            a = q * r
            items.append(
                {
                    "service_or_item": item.get("service_or_item", "").strip(),
                    "quantity": q,
                    "rate": r,
                    "amount": a,
                }
            )
            total += a
        update_data["items"] = items
        update_data["total_amount"] = float(total)

    if "total_amount" in update_data and update_data.get("total_amount") is None:
        update_data.pop("total_amount", None)

    if "items" in update_data and update_data.get("items") is not None:
        _reduce_inventoryItem_inventory(db, update_data["items"])

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.now(timezone.utc)
    doc_ref.update(update_data)

    return {"success": True}


@router.get("/")
def get_all_payments(
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = Query(None),
    search: str | None = Query(None, min_length=1),
):
    db = get_firestore()
    payments_ref = db.collection("payments")

    def normalize_doc(doc):
        d = doc.to_dict() or {}
        return {
            "id": doc.id,
            "room_name": d.get("room_name"),
            "phone_number": d.get("phone_number"),
            "pet_name": d.get("pet_name"),
            "address": d.get("address"),
            "date": d.get("date"),
            "total_amount": d.get("total_amount", 0),
        }

    if search:
        term = normalize_name(search)
        if term is None or term == "":
            term = ""

        query = (
            payments_ref.order_by("room_name_lower")
            .start_at([term])
            .end_at([f"{term}\uf8ff"])
        )
    else:
        query = payments_ref.order_by("created_at", direction="DESCENDING")

    if cursor:
        cursor_doc = payments_ref.document(cursor).get()
        if cursor_doc.exists:
            query = query.start_after(cursor_doc)

    query = query.limit(limit + 1)

    docs = list(query.stream())
    has_next = len(docs) > limit
    selected_docs = docs[:limit] if has_next else docs

    paymentss = [normalize_doc(doc) for doc in selected_docs]

    next_cursor = selected_docs[-1].id if has_next and selected_docs else None

    # stats = get_dashboard_stats()
    # total = int(stats.get("total_payments", 0) or 0)

    return {
        "paymentss": paymentss,
        "limit": limit,
        "next_cursor": next_cursor,
        "has_next": has_next,
        # "total": total,
    }


@router.delete("/{payments_id}")
def delete_payments(payments_id: str):
    db = get_firestore()
    doc_ref = db.collection("payments").document(payments_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Payments record not found")

    doc_ref.delete()
    decrement_payments()

    return {"success": True}


# @router.get("/")
# def get_all_payments(
#     limit: int = Query(10, ge=1, le=100),
#     cursor: str | None = Query(None),
#     search: str | None = Query(None, min_length=1),
# ):
#     start_total = time.time()
#
#     t0 = time.time()
#     db = get_firestore()
#     payments_ref = db.collection("payments")
#     print(f"[TIME] Payments DB init: {time.time() - t0:.4f}s")
#
#     def normalize_doc(doc):
#         d = doc.to_dict() or {}
#         return {
#             "id": doc.id,
#             "room_name": d.get("room_name"),
#             "phone_number": d.get("phone_number"),
#             "pet_name": d.get("pet_name"),
#             "address": d.get("address"),
#             "date": d.get("date"),
#             "total_amount": d.get("total_amount", 0),
#         }
#
#     t1 = time.time()
#     if search:
#         term = normalize_name(search) or ""
#         query = (
#             payments_ref.order_by("room_name_lower")
#             .start_at([term])
#             .end_at([f"{term}\uf8ff"])
#         )
#         count_query = query
#     else:
#         query = payments_ref.order_by("created_at", direction="DESCENDING")
#         count_query = payments_ref
#     print(f"[TIME] Payments query build: {time.time() - t1:.4f}s")
#
#     t2 = time.time()
#     if cursor:
#         cursor_doc = payments_ref.document(cursor).get()
#         if cursor_doc.exists:
#             query = query.start_after(cursor_doc)
#     print(f"[TIME] Payments cursor handling: {time.time() - t2:.4f}s")
#
#     query = query.limit(limit + 1)
#
#     t3 = time.time()
#     docs = list(query.stream())
#     print(f"[TIME] Payments DB fetch (stream): {time.time() - t3:.4f}s")
#
#     has_next = len(docs) > limit
#     selected_docs = docs[:limit] if has_next else docs
#
#     t4 = time.time()
#     paymentss = [normalize_doc(doc) for doc in selected_docs]
#     print(f"[TIME] Payments normalize: {time.time() - t4:.4f}s")
#
#     next_cursor = selected_docs[-1].id if has_next and selected_docs else None
#
#     t5 = time.time()
#     total = 0
#     try:
#         count_agg = count_query.count()
#         count_snapshot = count_agg.get()
#         if count_snapshot:
#             total = int(count_snapshot[0].value)
#     except Exception:
#         total = sum(1 for _ in count_query.stream())
#     print(f"[TIME] Payments count query: {time.time() - t5:.4f}s")
#
#     print(f"[TIME] Payments TOTAL API: {time.time() - start_total:.4f}s")
#
#     return {
#         "paymentss": paymentss,
#         "limit": limit,
#         "next_cursor": next_cursor,
#         "has_next": has_next,
#         "total": total,
#     }


@router.get("/{payments_id}")
def get_payments_by_id(payments_id: str):
    db = get_firestore()
    doc_ref = db.collection("payments").document(payments_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Payments record not found")

    payments_data = doc.to_dict() or {}
    payments_data["id"] = doc.id

    return {"payments": payments_data}
