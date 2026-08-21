from __future__ import annotations

from copy import deepcopy
from uuid import uuid4

from app.core.firebase import get_firestore_client
from app.core.pg_context import get_current_pg_id

UNSCOPED_COLLECTIONS = {"pgs", "Login", "settings", "metadata"}


class FirestoreRepository:
    def __init__(self):
        self.client = get_firestore_client()

    def list(self, collection: str) -> list[dict]:
        collection_ref = self.client.collection(collection)
        if collection not in UNSCOPED_COLLECTIONS:
            documents = collection_ref.where(
                "pg_id", "==", get_current_pg_id()
            ).stream()
        else:
            documents = collection_ref.stream()
        rows = [_with_id(doc.id, doc.to_dict() or {}) for doc in documents]
        if collection in UNSCOPED_COLLECTIONS:
            return rows
        return [row for row in rows if row.get("pg_id") == get_current_pg_id()]

    def get(self, collection: str, item_id: str) -> dict | None:
        doc = self.client.collection(collection).document(item_id).get()
        if not doc.exists:
            return None
        row = _with_id(doc.id, doc.to_dict() or {})
        if (
            collection not in UNSCOPED_COLLECTIONS
            and row.get("pg_id") != get_current_pg_id()
        ):
            return None
        return row

    def create(self, collection: str, data: dict) -> dict:
        doc_ref = self.client.collection(collection).document()
        scoped_data = dict(data)
        if collection not in UNSCOPED_COLLECTIONS:
            scoped_data.setdefault("pg_id", get_current_pg_id())
        doc_ref.set(scoped_data)
        return _with_id(doc_ref.id, scoped_data)

    def set(self, collection: str, item_id: str, data: dict) -> dict:
        scoped_data = dict(data)
        if collection not in UNSCOPED_COLLECTIONS:
            scoped_data.setdefault("pg_id", get_current_pg_id())
        self.client.collection(collection).document(item_id).set(scoped_data)
        return _with_id(item_id, scoped_data)

    def update(self, collection: str, item_id: str, data: dict) -> dict | None:
        doc_ref = self.client.collection(collection).document(item_id)
        existing = self.get(collection, item_id)
        if not existing:
            return None
        doc_ref.update(data)
        existing.update(data)
        return existing

    def delete(self, collection: str, item_id: str) -> None:
        if self.get(collection, item_id):
            self.client.collection(collection).document(item_id).delete()


class MemoryRepository:
    def __init__(self):
        self.data: dict[str, dict[str, dict]] = {}

    def list(self, collection: str) -> list[dict]:
        rows = [
            _with_id(item_id, data)
            for item_id, data in self.data.get(collection, {}).items()
        ]
        if collection in UNSCOPED_COLLECTIONS:
            return rows
        return [row for row in rows if row.get("pg_id") == get_current_pg_id()]

    def get(self, collection: str, item_id: str) -> dict | None:
        item = self.data.get(collection, {}).get(item_id)
        if item is None:
            return None
        row = _with_id(item_id, item)
        if (
            collection not in UNSCOPED_COLLECTIONS
            and row.get("pg_id") != get_current_pg_id()
        ):
            return None
        return row

    def create(self, collection: str, data: dict) -> dict:
        item_id = uuid4().hex
        scoped_data = deepcopy(data)
        if collection not in UNSCOPED_COLLECTIONS:
            scoped_data.setdefault("pg_id", get_current_pg_id())
        self.data.setdefault(collection, {})[item_id] = scoped_data
        return _with_id(item_id, scoped_data)

    def set(self, collection: str, item_id: str, data: dict) -> dict:
        scoped_data = deepcopy(data)
        if collection not in UNSCOPED_COLLECTIONS:
            scoped_data.setdefault("pg_id", get_current_pg_id())
        self.data.setdefault(collection, {})[item_id] = scoped_data
        return _with_id(item_id, scoped_data)

    def update(self, collection: str, item_id: str, data: dict) -> dict | None:
        if not self.get(collection, item_id):
            return None
        self.data[collection][item_id].update(deepcopy(data))
        return self.get(collection, item_id)

    def delete(self, collection: str, item_id: str) -> None:
        self.data.get(collection, {}).pop(item_id, None)


def _with_id(item_id: str, data: dict) -> dict:
    payload = deepcopy(data)
    payload["id"] = item_id
    return payload
