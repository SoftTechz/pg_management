from pydantic import BaseModel, Field, field_validator

from app.core.constants import PAYMENT_METHODS


class PaymentBase(BaseModel):
    customer_id: str
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    monthly_rent: float = Field(gt=0)
    amount_paid: float = Field(default=0, ge=0)
    payment_date: str | None = None
    payment_method: str = "Cash"
    remarks: str | None = None

    @field_validator("payment_method")
    @classmethod
    def valid_method(cls, value: str) -> str:
        if value not in PAYMENT_METHODS:
            raise ValueError("Invalid payment method")
        return value


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    monthly_rent: float | None = Field(default=None, gt=0)
    amount_paid: float | None = Field(default=None, ge=0)
    payment_date: str | None = None
    payment_method: str | None = None
    remarks: str | None = None


class Payment(PaymentBase):
    id: str
    customer_name: str | None = None
    room_number: str | None = None
    remaining_amount: float
    payment_status: str
    created_at: str
    updated_at: str
