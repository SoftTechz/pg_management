from fastapi import APIRouter

from app.schemas.allocation import Allocation, AllocationCreate
from app.services.allocation_service import AllocationService

router = APIRouter()


@router.get("", response_model=list[Allocation])
def list_allocations() -> list[dict]:
    return AllocationService().list_allocations()


@router.post("", response_model=Allocation, status_code=201)
def allocate(payload: AllocationCreate) -> dict:
    return AllocationService().allocate(payload)


@router.delete("/{allocation_id}", response_model=Allocation)
def vacate(allocation_id: str) -> dict:
    return AllocationService().vacate(allocation_id)
