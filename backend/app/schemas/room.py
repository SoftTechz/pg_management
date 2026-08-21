from pydantic import BaseModel, Field, field_validator

from app.core.constants import ROOM_STATUSES


class RoomBase(BaseModel):
    room_number: str = Field(min_length=1)
    floor: str | None = None
    total_beds: int = Field(gt=0)
    status: str = "Available"

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str) -> str:
        if value not in ROOM_STATUSES:
            raise ValueError("Invalid room status")
        return value


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    room_number: str | None = None
    floor: str | None = None
    total_beds: int | None = Field(default=None, gt=0)
    status: str | None = None


class Room(RoomBase):
    id: str
    occupied_beds: int = 0
    available_beds: int = 0
    occupants: list[dict] = []
    created_at: str
    updated_at: str
