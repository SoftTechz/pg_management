from datetime import datetime, timezone

from app.core.pg_context import DEFAULT_PG_ID
from app.schemas.pg import PGCreate
from app.services.repository import FirestoreRepository

LEGACY_PG_NAME = "Brindavan Elite PG For Gents Old"
DOMAIN_COLLECTIONS = {
    "rooms",
    "customers",
    "allocations",
    "payments",
    "expenses",
    "inventoryItems",
    "inventoryItem_templates",
}


class PGService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()

    def list_pgs(self) -> list[dict]:
        self.ensure_legacy_pg(migrate=True)
        return sorted(self.repo.list("pgs"), key=lambda pg: pg.get("created_at", ""))

    def create_pg(self, payload: PGCreate) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        return self.repo.create(
            "pgs",
            {
                "pg_id": self._new_pg_id(payload.pg_name),
                "pg_name": payload.pg_name.strip(),
                "pg_type": payload.pg_type,
                "address": payload.address.strip(),
                "created_at": now,
                "is_active": payload.is_active,
            },
        )

    def ensure_legacy_pg(self, migrate: bool = True) -> dict:
        existing = self.repo.get("pgs", DEFAULT_PG_ID)
        now = datetime.now(timezone.utc).isoformat()
        if not existing:
            existing = self.repo.set(
                "pgs",
                DEFAULT_PG_ID,
                {
                    "pg_id": DEFAULT_PG_ID,
                    "pg_name": LEGACY_PG_NAME,
                    "pg_type": "GENTS",
                    "address": "",
                    "created_at": now,
                    "is_active": True,
                },
            )
        if migrate and not existing.get("legacy_data_migrated"):
            self._backfill_legacy_data()
            existing = (
                self.repo.update("pgs", DEFAULT_PG_ID, {"legacy_data_migrated": True})
                or existing
            )
        return existing

    def _backfill_legacy_data(self) -> None:
        client = getattr(self.repo, "client", None)
        if client is None:
            return
        for collection in DOMAIN_COLLECTIONS:
            for document in client.collection(collection).stream():
                if "pg_id" not in (document.to_dict() or {}):
                    document.reference.update({"pg_id": DEFAULT_PG_ID})

    @staticmethod
    def _new_pg_id(name: str) -> str:
        slug = "-".join(name.lower().split())
        return f"{slug}-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
