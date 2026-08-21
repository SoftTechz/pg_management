from fastapi import HTTPException

from app.schemas.allocation import AllocationCreate
from app.services.repository import FirestoreRepository
from app.services.room_service import RoomService
from app.utils.dates import utc_now_iso


class AllocationService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()
        self.rooms = RoomService(self.repo)

    def list_allocations(self) -> list[dict]:
        return sorted(
            self.repo.list("allocations"),
            key=lambda a: a.get("created_at", ""),
            reverse=True,
        )

    def allocate(self, payload: AllocationCreate) -> dict:
        customer = self.repo.get("customers", payload.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        room = self.repo.get("rooms", payload.room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.get("status") == "Maintenance":
            raise HTTPException(status_code=400, detail="Room is under maintenance")

        active_allocations = [
            allocation
            for allocation in self.repo.list("allocations")
            if allocation.get("status") == "Active"
        ]
        room_allocations = [
            allocation
            for allocation in active_allocations
            if allocation.get("room_id") == payload.room_id
        ]
        if len(room_allocations) >= int(room.get("total_beds", 0)):
            raise HTTPException(status_code=400, detail="Room has no available beds")
        if any(
            int(a.get("bed_number", 0)) == payload.bed_number for a in room_allocations
        ):
            raise HTTPException(
                status_code=400, detail="Selected bed is already occupied"
            )
        if any(a.get("customer_id") == payload.customer_id for a in active_allocations):
            raise HTTPException(status_code=400, detail="Customer is already allocated")

        now = utc_now_iso()
        data = payload.model_dump()
        data.update(
            {
                "customer_name": customer.get("name"),
                "room_number": room.get("room_number"),
                "status": "Active",
                "created_at": now,
                "updated_at": now,
            }
        )
        allocation = self.repo.create("allocations", data)
        self.repo.update(
            "customers",
            payload.customer_id,
            {"room_number": room.get("room_number"), "updated_at": now},
        )
        self.rooms.refresh_room_occupancy(payload.room_id)
        return allocation

    def vacate(self, allocation_id: str) -> dict:
        allocation = self.repo.get("allocations", allocation_id)
        if not allocation:
            raise HTTPException(status_code=404, detail="Allocation not found")
        if allocation.get("status") != "Active":
            return allocation
        now = utc_now_iso()
        updated = self.repo.update(
            "allocations",
            allocation_id,
            {"status": "Vacated", "end_date": now[:10], "updated_at": now},
        )
        self.repo.update(
            "customers",
            allocation["customer_id"],
            {"room_number": None, "status": "Vacated", "updated_at": now},
        )
        self.rooms.refresh_room_occupancy(allocation["room_id"])
        return updated
