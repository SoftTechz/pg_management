from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from app.core.firebase import get_firestore
from app.schemas.inventoryItem import (
    InventoryItemCreate,
    InventoryItemEntryCreate,
    InventoryItemQuantityAdjustmentCreate,
    InventoryItemNameUpdate,
    InventoryItemTemplateCreate,
)
from app.services.dashboard_stats_service import (
    decrement_inventoryItems,
    get_dashboard_stats,
    increment_inventoryItems,
)

router = APIRouter()


def _normalize_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def normalize_name(name: str | None) -> str | None:
    if name is None:
        return None
    cleaned = " ".join(name.strip().split())
    return cleaned.lower()


def _build_history_entry(
    date: str,
    quantity: float,
    price: float,
    gst_percent: float = 0,
) -> dict[str, Any]:
    qty = _normalize_number(quantity)
    unit_price = _normalize_number(price)
    gst_value = _normalize_number(gst_percent)
    base_amount = qty * unit_price
    gst_amount = base_amount * gst_value / 100
    return {
        "id": f"entry_{uuid4().hex}",
        "date": date,
        "entryType": "stock_entry",
        "quantity": qty,
        "price": unit_price,
        "gstPercent": gst_value,
        "baseAmount": base_amount,
        "gstAmount": gst_amount,
        "totalBill": base_amount + gst_amount,
        "reason": "Stock purchase",
        # "remark": "",
    }


def _build_adjustment_entry(
    date: str,
    adjustment_type: str,
    quantity: float,
    price: float,
    gst_percent: float,
    reason: str,
    # remark: str | None,
) -> dict[str, Any]:
    normalized_adjustment = (adjustment_type or "").strip().lower()
    qty = _normalize_number(quantity)
    unit_price = _normalize_number(price)
    gst_value = _normalize_number(gst_percent)
    signed_quantity = qty if normalized_adjustment == "add" else -qty
    base_amount = signed_quantity * unit_price
    gst_amount = base_amount * gst_value / 100

    return {
        "id": f"entry_{uuid4().hex}",
        "date": date,
        "entryType": "adjustment",
        "adjustmentType": normalized_adjustment,
        "quantity": signed_quantity,
        "price": unit_price,
        "gstPercent": gst_value,
        "baseAmount": base_amount,
        "gstAmount": gst_amount,
        "totalBill": base_amount + gst_amount,
        "reason": (reason or "").strip(),
        # "remark": (remark or "").strip(),
    }


def _recalculate_inventoryItem_fields(inventoryItem_data: dict[str, Any]) -> dict[str, Any]:
    history = inventoryItem_data.get("history") or []
    present_quantity = sum(
        _normalize_number(entry.get("quantity")) for entry in history
    )
    if present_quantity < 0:
        present_quantity = 0
    total_bill = sum(_normalize_number(entry.get("totalBill")) for entry in history)

    purchase_entries = [
        entry
        for entry in history
        if _normalize_number(entry.get("price")) > 0
        or entry.get("entryType") == "stock_entry"
    ]
    latest_purchase_entry = purchase_entries[0] if purchase_entries else None
    oldest_purchase_entry = purchase_entries[-1] if purchase_entries else None

    return {
        **inventoryItem_data,
        "presentQuantity": present_quantity,
        "totalBill": total_bill,
        "latestPrice": (
            _normalize_number(latest_purchase_entry.get("price"))
            if latest_purchase_entry
            else 0
        ),
        "lastAddedDate": (
            latest_purchase_entry.get("date") if latest_purchase_entry else None
        ),
        "addedOn": (
            oldest_purchase_entry.get("date")
            if oldest_purchase_entry
            else inventoryItem_data.get("addedOn")
        ),
    }


@router.post("/")
def create_inventoryItem(payload: InventoryItemCreate):
    try:
        db = get_firestore()
        inventoryItems_ref = db.collection("inventoryItems")

        name = payload.name.strip()
        existing = list(inventoryItems_ref.where("name", "==", name).stream())
        if existing:
            raise HTTPException(status_code=400, detail="InventoryItem name already exists")

        now = datetime.now(timezone.utc)
        doc_ref = inventoryItems_ref.document()

        entry = _build_history_entry(
            payload.date,
            payload.quantity,
            payload.price,
            payload.gstPercent,
        )
        doc_ref.set(
            {
                "id": doc_ref.id,
                "name": name,
                "name_lower": normalize_name(name),
                "addedOn": payload.date,
                "lastAddedDate": payload.date,
                "presentQuantity": entry["quantity"],
                "latestPrice": entry["price"],
                "totalBill": entry["totalBill"],
                "history": [entry],
                "created_at": now,
                "updated_at": None,
            }
        )
        increment_inventoryItems()

        return {"success": True, "inventoryItem_id": doc_ref.id, "id": doc_ref.id}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/")
def get_all_inventoryItems(
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = Query(None),
    search: str | None = Query(None),
):
    db = get_firestore()
    inventoryItems_ref = db.collection("inventoryItems")

    term = normalize_name(search) if search else None
    if term:
        query = (
            inventoryItems_ref.order_by("name_lower").start_at([term]).end_at([f"{term}\uf8ff"])
        )
    else:
        query = inventoryItems_ref.order_by("created_at", direction="DESCENDING")

    if cursor:
        cursor_doc = inventoryItems_ref.document(cursor).get()
        if cursor_doc.exists:
            query = query.start_after(cursor_doc)

    query = query.limit(limit + 1)

    docs = list(query.stream())
    has_next = len(docs) > limit
    selected_docs = docs[:limit] if has_next else docs

    inventoryItems = []
    for doc in selected_docs:
        inventoryItem_data = doc.to_dict() or {}
        inventoryItem_data["id"] = doc.id
        inventoryItems.append(inventoryItem_data)

    next_cursor = selected_docs[-1].id if has_next and selected_docs else None

    # stats = get_dashboard_stats()
    # total = int(stats.get("total_inventoryItems", 0) or 0)

    return {
        "inventoryItems": inventoryItems,
        "limit": limit,
        "next_cursor": next_cursor,
        "has_next": has_next,
        # "total": total,
    }


# @router.get("/")
# def get_all_inventoryItems(
#     limit: int = Query(10, ge=1, le=100),
#     cursor: str | None = Query(None),
#     search: str | None = Query(None),
# ):
#     start_total = time.time()
#
#     t0 = time.time()
#     db = get_firestore()
#     inventoryItems_ref = db.collection("inventoryItems")
#     print(f"[TIME] InventoryItems DB init: {time.time() - t0:.4f}s")
#
#     t1 = time.time()
#     term = normalize_name(search) if search else None
#     if term:
#         query = (
#             inventoryItems_ref.order_by("name_lower").start_at([term]).end_at([f"{term}\uf8ff"])
#         )
#         count_query = query
#     else:
#         query = inventoryItems_ref.order_by("created_at", direction="DESCENDING")
#         count_query = inventoryItems_ref
#     print(f"[TIME] InventoryItems query build: {time.time() - t1:.4f}s")
#
#     t2 = time.time()
#     if cursor:
#         cursor_doc = inventoryItems_ref.document(cursor).get()
#         if cursor_doc.exists:
#             query = query.start_after(cursor_doc)
#     print(f"[TIME] InventoryItems cursor handling: {time.time() - t2:.4f}s")
#
#     query = query.limit(limit + 1)
#
#     t3 = time.time()
#     docs = list(query.stream())
#     print(f"[TIME] InventoryItems DB fetch (stream): {time.time() - t3:.4f}s")
#
#     has_next = len(docs) > limit
#     selected_docs = docs[:limit] if has_next else docs
#
#     t4 = time.time()
#     inventoryItems = []
#     for doc in selected_docs:
#         inventoryItem_data = doc.to_dict() or {}
#         inventoryItem_data["id"] = doc.id
#         inventoryItems.append(inventoryItem_data)
#     print(f"[TIME] InventoryItems normalize: {time.time() - t4:.4f}s")
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
#     print(f"[TIME] InventoryItems count query: {time.time() - t5:.4f}s")
#
#     print(f"[TIME] InventoryItems TOTAL API: {time.time() - start_total:.4f}s")
#
#     return {
#         "inventoryItems": inventoryItems,
#         "limit": limit,
#         "next_cursor": next_cursor,
#         "has_next": has_next,
#         "total": total,
#     }


@router.get("/name-quantity")
def get_inventoryItem_name_and_quantity(
    search: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
):
    db = get_firestore()
    inventoryItems_ref = db.collection("inventoryItems")

    term = normalize_name(search) if search else None

    if term:
        query = (
            inventoryItems_ref.order_by("name_lower").start_at([term]).end_at([f"{term}\uf8ff"])
        )
    else:
        query = inventoryItems_ref.order_by("created_at", direction="DESCENDING")

    query = query.limit(limit)
    docs = list(query.stream())

    inventoryItems = []
    for doc in docs:
        inventoryItem_data = doc.to_dict() or {}
        inventoryItems.append(
            {
                "id": doc.id,
                "name": inventoryItem_data.get("name", ""),
                "presentQuantity": inventoryItem_data.get("presentQuantity", 0),
            }
        )

    return {"inventoryItems": inventoryItems}


@router.get("/{inventoryItem_id}")
def get_inventoryItem_by_id(inventoryItem_id: str):
    db = get_firestore()
    doc_ref = db.collection("inventoryItems").document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    inventoryItem_data = doc.to_dict() or {}
    inventoryItem_data["id"] = doc.id
    return {"inventoryItem": inventoryItem_data}


@router.put("/{inventoryItem_id}/name")
def update_inventoryItem_name(inventoryItem_id: str, payload: InventoryItemNameUpdate):
    db = get_firestore()
    inventoryItems_ref = db.collection("inventoryItems")
    doc_ref = inventoryItems_ref.document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="InventoryItem name is required")
    existing = list(inventoryItems_ref.where("name", "==", name).stream())
    if any(match.id != inventoryItem_id for match in existing):
        raise HTTPException(status_code=400, detail="InventoryItem name already exists")

    doc_ref.update(
        {
            "name": name,
            "name_lower": normalize_name(name),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    return {"success": True}


@router.post("/{inventoryItem_id}/entries")
def add_inventoryItem_entry(inventoryItem_id: str, payload: InventoryItemEntryCreate):
    db = get_firestore()
    doc_ref = db.collection("inventoryItems").document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    current = doc.to_dict() or {}
    history = current.get("history") or []
    entry = _build_history_entry(
        payload.date,
        payload.quantity,
        payload.price,
        payload.gstPercent,
    )
    updated_history = [entry, *history]

    updated = _recalculate_inventoryItem_fields({**current, "history": updated_history})
    updated["updated_at"] = datetime.now(timezone.utc)

    doc_ref.update(
        {
            "history": updated["history"],
            "presentQuantity": updated["presentQuantity"],
            "totalBill": updated["totalBill"],
            "latestPrice": updated["latestPrice"],
            "lastAddedDate": updated["lastAddedDate"],
            "addedOn": updated["addedOn"],
            "updated_at": updated["updated_at"],
        }
    )
    return {"success": True}


@router.post("/{inventoryItem_id}/adjustments")
def adjust_inventoryItem_quantity(inventoryItem_id: str, payload: InventoryItemQuantityAdjustmentCreate):
    db = get_firestore()
    doc_ref = db.collection("inventoryItems").document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    current = doc.to_dict() or {}
    history = current.get("history") or []
    current_quantity = _normalize_number(current.get("presentQuantity"))

    adjustment_type = payload.adjustmentType.strip().lower()
    adjustment_quantity = _normalize_number(payload.quantity)
    if adjustment_type == "reduce" and adjustment_quantity > current_quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient stock to reduce the requested quantity",
        )

    reason = payload.reason.strip()
    # if not reason:
    #     raise HTTPException(status_code=422, detail="Reason is required")

    entry = _build_adjustment_entry(
        payload.date,
        adjustment_type,
        adjustment_quantity,
        payload.price,
        payload.gstPercent,
        reason,
        # payload.remark,
    )

    updated_history = [entry, *history]
    updated = _recalculate_inventoryItem_fields({**current, "history": updated_history})
    updated["updated_at"] = datetime.now(timezone.utc)

    doc_ref.update(
        {
            "history": updated["history"],
            "presentQuantity": updated["presentQuantity"],
            "totalBill": updated["totalBill"],
            "latestPrice": updated["latestPrice"],
            "lastAddedDate": updated["lastAddedDate"],
            "addedOn": updated["addedOn"],
            "updated_at": updated["updated_at"],
        }
    )
    return {"success": True}


@router.delete("/{inventoryItem_id}/entries/{entry_id}")
def delete_inventoryItem_entry(inventoryItem_id: str, entry_id: str):
    db = get_firestore()
    doc_ref = db.collection("inventoryItems").document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    current = doc.to_dict() or {}
    history = current.get("history") or []
    updated_history = [entry for entry in history if entry.get("id") != entry_id]
    if len(updated_history) == len(history):
        raise HTTPException(status_code=404, detail="History entry not found")

    updated = _recalculate_inventoryItem_fields({**current, "history": updated_history})
    updated["updated_at"] = datetime.now(timezone.utc)

    doc_ref.update(
        {
            "history": updated["history"],
            "presentQuantity": updated["presentQuantity"],
            "totalBill": updated["totalBill"],
            "latestPrice": updated["latestPrice"],
            "lastAddedDate": updated["lastAddedDate"],
            "addedOn": updated["addedOn"],
            "updated_at": updated["updated_at"],
        }
    )
    return {"success": True}


@router.delete("/{inventoryItem_id}")
def delete_inventoryItem(inventoryItem_id: str):
    db = get_firestore()
    doc_ref = db.collection("inventoryItems").document(inventoryItem_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="InventoryItem not found")

    doc_ref.delete()
    decrement_inventoryItems()
    return {"success": True}


@router.post("/manage/templates")
def create_inventoryItem_template(payload: InventoryItemTemplateCreate):
    try:
        db = get_firestore()
        templates_ref = db.collection("inventoryItem_templates")
        name = payload.templateName.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Template name is required")

        existing = list(
            templates_ref.where("templateName", "==", name).limit(1).stream()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Template name already exists")

        now = datetime.now(timezone.utc)
        doc_ref = templates_ref.document()
        doc_ref.set(
            {
                "id": doc_ref.id,
                "templateName": name,
                "medicines": payload.medicines or [],
                "created_at": now,
                "updated_at": None,
            }
        )
        return {"success": True, "template_id": doc_ref.id, "id": doc_ref.id}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@router.get("/manage/templates")
def get_all_inventoryItem_templates():
    db = get_firestore()
    docs = (
        db.collection("inventoryItem_templates")
        .select(["templateName", "medicines", "created_at"])
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )

    templates = []
    for doc in docs:
        item = doc.to_dict() or {}
        item["id"] = doc.id
        templates.append(item)

    return {"templates": templates}


@router.get("/manage/templates/{template_id}")
def get_inventoryItem_template_by_id(template_id: str):
    db = get_firestore()
    doc_ref = db.collection("inventoryItem_templates").document(template_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Template not found")
    template = doc.to_dict() or {}
    template["id"] = doc.id
    return {"template": template}


@router.delete("/manage/templates/{template_id}")
def delete_inventoryItem_template(template_id: str):
    db = get_firestore()
    doc_ref = db.collection("inventoryItem_templates").document(template_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Template not found")
    doc_ref.delete()
    return {"success": True}
