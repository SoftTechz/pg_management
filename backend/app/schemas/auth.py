from pydantic import BaseModel, Field


class PinLoginRequest(BaseModel):
    pin: str = Field(pattern=r"^\d{4}$")


class PinLoginResponse(BaseModel):
    authenticated: bool
    message: str
