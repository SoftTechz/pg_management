from fastapi import APIRouter

from app.schemas.room import Room, RoomCreate, RoomUpdate
from app.services.room_service import RoomService

router = APIRouter()


@router.get("", response_model=list[Room])
def list_rooms() -> list[dict]:
    return RoomService().list_rooms()


@router.get("/{room_id}", response_model=Room)
def get_room(room_id: str) -> dict:
    return RoomService().get_room(room_id)


@router.post("", response_model=Room, status_code=201)
def create_room(payload: RoomCreate) -> dict:
    return RoomService().create_room(payload)


@router.put("/{room_id}", response_model=Room)
def update_room(room_id: str, payload: RoomUpdate) -> dict:
    return RoomService().update_room(room_id, payload)


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: str) -> None:
    RoomService().delete_room(room_id)
