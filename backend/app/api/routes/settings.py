from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.auth_service import AuthService

router = APIRouter()


class PinUpdate(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$")


@router.put("/owner-pin")
def update_owner_pin(payload: PinUpdate) -> dict:
    AuthService().update_pin(payload.pin)
    return {"message": "Owner PIN updated successfully"}
