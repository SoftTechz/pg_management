from datetime import datetime, timezone
from typing import Any
import time

from fastapi import APIRouter, HTTPException, Query

from app.core.firebase import get_firestore
from app.schemas.room import RoomCreate, RoomUpdate
from app.services.dashboard_stats_service import (
    decrement_rooms,
    get_dashboard_stats,
    increment_rooms,
)

router = APIRouter()


def _normalize_room_fields(data: dict[str, Any]) -> dict[str, Any]:
    """Trim string fields and convert empty strings to None."""
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


def _is_phone_duplicate(
    db, phone: str | None, exclude_room_id: str | None = None
) -> bool:
    if not phone:
        return False

    docs = db.collection("rooms").where("phone", "==", phone).stream()
    for doc in docs:
        if exclude_room_id and doc.id == exclude_room_id:
            continue
        return True
    return False


# ---------------------------
# Create Room
# ---------------------------
@router.post("/")
def create_room(payload: RoomCreate):
    try:
        db = get_firestore()
        now = datetime.now(timezone.utc)
        room_data = _normalize_room_fields(payload.model_dump())
        room_data["name"] = payload.name.strip()
        room_data["name_lower"] = normalize_name(room_data["name"])
        # if _is_phone_duplicate(db, room_data.get("phone")):
        #     raise HTTPException(status_code=409, detail="Phone number already exists")

        doc_ref = db.collection("rooms").document()

        doc_ref.set(
            {
                "id": doc_ref.id,
                **room_data,
                "created_at": now,
                "updated_at": None,
            }
        )
        increment_rooms()

        return {
            "success": True,
            "room_id": doc_ref.id,
            "id": doc_ref.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------
# Update Room
# ---------------------------
@router.put("/{room_id}")
def update_room(room_id: str, payload: RoomUpdate):
    db = get_firestore()
    doc_ref = db.collection("rooms").document(room_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Room not found")

    update_data = payload.model_dump(exclude_unset=True)
    update_data = _normalize_room_fields(update_data)

    if "name" in update_data and update_data["name"] is None:
        raise HTTPException(status_code=422, detail="Room name cannot be empty")

    if "name" in update_data and update_data["name"]:
        update_data["name_lower"] = normalize_name(update_data["name"])

    # if "phone" in update_data and _is_phone_duplicate(
    #     db, update_data.get("phone"), exclude_room_id=room_id
    # ):
    #     raise HTTPException(status_code=409, detail="Phone number already exists")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.now(timezone.utc)

    doc_ref.update(update_data)

    return {"success": True}


# ---------------------------
# Delete Room
# ---------------------------
@router.delete("/{room_id}")
def delete_room(room_id: str):
    db = get_firestore()
    doc_ref = db.collection("rooms").document(room_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Room not found")

    doc_ref.delete()
    decrement_rooms()

    return {"success": True}


# @router.get("/")
# def get_all_rooms(
#     limit: int = Query(10, ge=1, le=100),
#     cursor: str | None = Query(None),
#     search: str | None = Query(None, min_length=1),
# ):
#     start_total = time.time()

#     # 🔹 DB init timing
#     t0 = time.time()
#     db = get_firestore()
#     rooms_ref = db.collection("rooms")
#     print(f"[TIME] DB init: {time.time() - t0:.4f}s")

#     def normalize(doc):
#         data = doc.to_dict() or {}
#         return {
#             "id": doc.id,
#             "name": data.get("name"),
#             "phone": data.get("phone"),
#             "petName": data.get("petName"),
#             "petType": data.get("petType"),
#         }

#     # 🔹 Query build timing
#     t1 = time.time()
#     if search:
#         term = normalize_name(search) or ""

#         query = (
#             rooms_ref.order_by("name_lower")
#             .start_at([term])
#             .end_at([f"{term}\uf8ff"])
#         )
#         count_query = query  # ⚠️ same query
#     else:
#         query = rooms_ref.order_by("created_at", direction="DESCENDING")
#         count_query = rooms_ref
#     print(f"[TIME] Query build: {time.time() - t1:.4f}s")

#     # 🔹 Cursor handling
#     t2 = time.time()
#     if cursor:
#         cursor_doc = rooms_ref.document(cursor).get()
#         if cursor_doc.exists:
#             query = query.start_after(cursor_doc)
#     print(f"[TIME] Cursor handling: {time.time() - t2:.4f}s")

#     query = query.limit(limit + 1)

#     # 🔹 Fetch data
#     t3 = time.time()
#     docs = list(query.stream())
#     print(f"[TIME] DB fetch (stream): {time.time() - t3:.4f}s")

#     has_next = len(docs) > limit
#     selected_docs = docs[:limit] if has_next else docs

#     # 🔹 Normalize data
#     t4 = time.time()
#     rooms = [normalize(doc) for doc in selected_docs]
#     print(f"[TIME] Normalize: {time.time() - t4:.4f}s")

#     next_cursor = None
#     if has_next and selected_docs:
#         next_cursor = selected_docs[-1].id

#     # 🔥 COUNT TIMING (MAIN BOTTLENECK)
#     t5 = time.time()
#     total = 0
#     try:
#         count_agg = count_query.count()
#         count_snapshot = count_agg.get()
#         if count_snapshot:
#             total = int(count_snapshot[0].value)
#     except Exception:
#         total = sum(1 for _ in count_query.stream())
#     print(f"[TIME] COUNT query: {time.time() - t5:.4f}s")

#     print(f"[TIME] TOTAL API: {time.time() - start_total:.4f}s")

#     return {
#         "rooms": rooms,
#         "limit": limit,
#         "next_cursor": next_cursor,
#         "has_next": has_next,
#         "total": total,
#     }


# ---------------------------
# Get All Rooms with pagination and optional search
# ---------------------------
@router.get("/")
def get_all_rooms(
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = Query(None),
    search: str | None = Query(None, min_length=1),
):
    db = get_firestore()
    rooms_ref = db.collection("rooms")

    def normalize(doc):
        data = doc.to_dict() or {}
        return {
            "id": doc.id,
            "name": data.get("name"),
            "phone": data.get("phone"),
            "petName": data.get("petName"),
            "petType": data.get("petType"),
        }

    # Build base query
    if search:
        term = normalize_name(search)
        if term is None or term == "":
            term = ""

        query = (
            rooms_ref.order_by("name_lower")
            .start_at([term])
            .end_at([f"{term}\uf8ff"])
        )
    else:
        query = rooms_ref.order_by("created_at", direction="DESCENDING")

    # Apply cursor pagination
    if cursor:
        cursor_doc = rooms_ref.document(cursor).get()
        if cursor_doc.exists:
            query = query.start_after(cursor_doc)

    query = query.limit(limit + 1)

    docs = list(query.stream())
    has_next = len(docs) > limit

    selected_docs = docs[:limit] if has_next else docs

    rooms = [normalize(doc) for doc in selected_docs]

    next_cursor = None
    if has_next and selected_docs:
        next_cursor = selected_docs[-1].id

    # stats = get_dashboard_stats()
    # total_rooms = int(stats.get("total_rooms", 0) or 0)

    return {
        "rooms": rooms,
        "limit": limit,
        "next_cursor": next_cursor,
        "has_next": has_next,
        # "total": total_rooms,
    }


# ---------------------------
# Get Room by ID
# ---------------------------
@router.get("/{room_id}")
def get_room_by_id(room_id: str):
    db = get_firestore()
    doc_ref = db.collection("rooms").document(room_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Room not found")

    room_data = doc.to_dict() or {}
    room_data["id"] = doc.id

    return {"room": room_data}
