from fastapi import APIRouter, HTTPException

from pydantic import BaseModel, Field

from app.schemas.auth import PinLoginRequest, PinLoginResponse
from app.services.auth_service import AuthService

router = APIRouter()


class PinChangeRequest(BaseModel):
    current_pin: str = Field(pattern=r"^\d{4}$")
    new_pin: str = Field(pattern=r"^\d{4}$")


@router.post("/login", response_model=PinLoginResponse)
def login(payload: PinLoginRequest) -> PinLoginResponse:
    if not AuthService().validate_pin(payload.pin):
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return PinLoginResponse(authenticated=True, message="Login successful")


@router.post("/change-pin")
def change_pin(payload: PinChangeRequest) -> dict:
    auth_service = AuthService()
    if not auth_service.validate_pin(payload.current_pin):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    if payload.current_pin == payload.new_pin:
        raise HTTPException(
            status_code=400, detail="New PIN must be different from current PIN"
        )
    auth_service.update_pin(payload.new_pin)
    return {"success": True, "message": "PIN changed successfully"}
