from fastapi import APIRouter

from app.schemas.payment import Payment, PaymentCreate, PaymentUpdate
from app.services.payment_service import PaymentService
from app.utils.dates import month_key

router = APIRouter()


@router.get("", response_model=list[Payment])
def list_payments(month: str | None = None, customer_id: str | None = None) -> list[dict]:
    return PaymentService().list_payments(month=month, customer_id=customer_id)


@router.get("/monthly")
def monthly_rows(month: str | None = None) -> list[dict]:
    return PaymentService().get_monthly_rows(month or month_key())


@router.post("", response_model=Payment, status_code=201)
def create_payment(payload: PaymentCreate) -> dict:
    return PaymentService().create_payment(payload)


@router.put("/{payment_id}", response_model=Payment)
def update_payment(payment_id: str, payload: PaymentUpdate) -> dict:
    return PaymentService().update_payment(payment_id, payload)
