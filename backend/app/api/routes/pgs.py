from fastapi import APIRouter

from app.schemas.pg import PG, PGCreate
from app.services.pg_service import PGService

router = APIRouter()


@router.get("", response_model=list[PG])
def list_pgs() -> list[dict]:
    return PGService().list_pgs()


@router.post("", response_model=PG, status_code=201)
def create_pg(payload: PGCreate) -> dict:
    return PGService().create_pg(payload)
