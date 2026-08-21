from fastapi import HTTPException

from app.schemas.room import RoomCreate, RoomUpdate
from app.services.repository import FirestoreRepository
from app.utils.dates import utc_now_iso


def derive_room_status(total_beds: int, occupied_beds: int, current_status: str | None = None) -> str:
    if current_status == "Maintenance":
        return "Maintenance"
    if occupied_beds <= 0:
        return "Available"
    if occupied_beds >= total_beds:
        return "Full"
    return "Partially Occupied"


class RoomService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()

    def list_rooms(self) -> list[dict]:
        return sorted([self._hydrate_room(r) for r in self.repo.list("rooms")], key=lambda r: r.get("room_number", ""))

    def get_room(self, room_id: str) -> dict:
        room = self.repo.get("rooms", room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        return self._hydrate_room(room)

    def create_room(self, payload: RoomCreate) -> dict:
        now = utc_now_iso()
        data = payload.model_dump()
        data.update(
            {
                "occupied_beds": 0,
                "available_beds": payload.total_beds,
                "status": derive_room_status(payload.total_beds, 0, payload.status),
                "created_at": now,
                "updated_at": now,
            }
        )
        return self.repo.create("rooms", data)

    def update_room(self, room_id: str, payload: RoomUpdate) -> dict:
        room = self.get_room(room_id)
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        total = int(data.get("total_beds", room["total_beds"]))
        occupied = int(room.get("occupied_beds", 0))
        if total < occupied:
            raise HTTPException(status_code=400, detail="Total beds cannot be less than occupied beds")
        data["available_beds"] = total - occupied
        data["status"] = derive_room_status(total, occupied, data.get("status", room.get("status")))
        data["updated_at"] = utc_now_iso()
        return self.repo.update("rooms", room_id, data)

    def delete_room(self, room_id: str) -> None:
        room = self.get_room(room_id)
        if room.get("occupied_beds", 0) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete an occupied room")
        self.repo.delete("rooms", room_id)

    def refresh_room_occupancy(self, room_id: str) -> dict:
        room = self.repo.get("rooms", room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allocations = [
            a for a in self.repo.list("allocations")
            if a.get("room_id") == room_id and a.get("status") == "Active"
        ]
        occupied = len(allocations)
        total = int(room.get("total_beds", 0))
        updates = {
            "occupied_beds": occupied,
            "available_beds": max(total - occupied, 0),
            "status": derive_room_status(total, occupied, room.get("status")),
            "updated_at": utc_now_iso(),
        }
        return self.repo.update("rooms", room_id, updates)

    def _hydrate_room(self, room: dict) -> dict:
        allocations = [
            a for a in self.repo.list("allocations")
            if a.get("room_id") == room["id"] and a.get("status") == "Active"
        ]
        occupants = []
        for allocation in allocations:
            customer = self.repo.get("customers", allocation.get("customer_id", ""))
            if customer:
                occupants.append({"id": customer["id"], "name": customer.get("name"), "bed_number": allocation.get("bed_number")})
        room["occupants"] = occupants
        return room
