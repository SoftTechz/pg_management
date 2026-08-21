from __future__ import annotations

from copy import deepcopy
from uuid import uuid4

from app.core.firebase import get_firestore_client


class FirestoreRepository:
    def __init__(self):
        self.client = get_firestore_client()

    def list(self, collection: str) -> list[dict]:
        return [_with_id(doc.id, doc.to_dict() or {}) for doc in self.client.collection(collection).stream()]

    def get(self, collection: str, item_id: str) -> dict | None:
        doc = self.client.collection(collection).document(item_id).get()
        if not doc.exists:
            return None
        return _with_id(doc.id, doc.to_dict() or {})

    def create(self, collection: str, data: dict) -> dict:
        doc_ref = self.client.collection(collection).document()
        doc_ref.set(data)
        return _with_id(doc_ref.id, data)

    def set(self, collection: str, item_id: str, data: dict) -> dict:
        self.client.collection(collection).document(item_id).set(data)
        return _with_id(item_id, data)

    def update(self, collection: str, item_id: str, data: dict) -> dict | None:
        doc_ref = self.client.collection(collection).document(item_id)
        if not doc_ref.get().exists:
            return None
        doc_ref.update(data)
        return self.get(collection, item_id)

    def delete(self, collection: str, item_id: str) -> None:
        self.client.collection(collection).document(item_id).delete()


class MemoryRepository:
    def __init__(self):
        self.data: dict[str, dict[str, dict]] = {}

    def list(self, collection: str) -> list[dict]:
        return [_with_id(item_id, data) for item_id, data in self.data.get(collection, {}).items()]

    def get(self, collection: str, item_id: str) -> dict | None:
        item = self.data.get(collection, {}).get(item_id)
        return _with_id(item_id, item) if item is not None else None

    def create(self, collection: str, data: dict) -> dict:
        item_id = uuid4().hex
        self.data.setdefault(collection, {})[item_id] = deepcopy(data)
        return _with_id(item_id, data)

    def set(self, collection: str, item_id: str, data: dict) -> dict:
        self.data.setdefault(collection, {})[item_id] = deepcopy(data)
        return _with_id(item_id, data)

    def update(self, collection: str, item_id: str, data: dict) -> dict | None:
        if item_id not in self.data.get(collection, {}):
            return None
        self.data[collection][item_id].update(deepcopy(data))
        return self.get(collection, item_id)

    def delete(self, collection: str, item_id: str) -> None:
        self.data.get(collection, {}).pop(item_id, None)


def _with_id(item_id: str, data: dict) -> dict:
    payload = deepcopy(data)
    payload["id"] = item_id
    return payload
