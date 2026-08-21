"""Backfill existing domain documents into the legacy Brindavan PG."""

from app.services.pg_service import PGService

if __name__ == "__main__":
    pg = PGService().ensure_legacy_pg()
    print(f"Migrated existing data to {pg['pg_id']}: {pg['pg_name']}")
