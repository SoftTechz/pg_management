from fastapi import HTTPException

from app.schemas.payment import PaymentCreate, PaymentUpdate
from app.services.repository import FirestoreRepository
from app.utils.dates import utc_now_iso


def calculate_payment_status(
    monthly_rent: float, amount_paid: float
) -> tuple[float, str]:
    if amount_paid > monthly_rent:
        raise ValueError("Amount paid cannot exceed monthly rent")
    remaining = monthly_rent - amount_paid
    if amount_paid >= monthly_rent:
        return 0, "Paid"
    if amount_paid > 0:
        return remaining, "Partially Paid"
    return remaining, "Unpaid"


class PaymentService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()

    def list_payments(
        self, month: str | None = None, customer_id: str | None = None
    ) -> list[dict]:
        payments = self.repo.list("payments")
        if month:
            payments = [p for p in payments if p.get("month") == month]
        if customer_id:
            payments = [p for p in payments if p.get("customer_id") == customer_id]
        customers = {
            customer["id"]: customer for customer in self.repo.list("customers")
        }
        return sorted(
            [self._attach_customer(payment, customers) for payment in payments],
            key=lambda payment: payment.get("month", ""),
            reverse=True,
        )

    def get_monthly_rows(self, month: str) -> list[dict]:
        active_customers = [
            c for c in self.repo.list("customers") if c.get("status") == "Active"
        ]
        payments = {
            p.get("customer_id"): p
            for p in self.repo.list("payments")
            if p.get("month") == month
        }
        rows = []
        for customer in active_customers:
            payment = payments.get(customer["id"])
            rent = float(
                payment.get("monthly_rent")
                if payment
                else customer.get("monthly_rent", 0)
            )
            paid = float(payment.get("amount_paid") if payment else 0)
            remaining, status = calculate_payment_status(rent, paid)
            rows.append(
                {
                    "customer_id": customer["id"],
                    "customer_name": customer.get("name"),
                    "room_number": customer.get("room_number"),
                    "month": month,
                    "monthly_rent": rent,
                    "amount_paid": paid,
                    "remaining_amount": remaining,
                    "payment_status": status,
                    "payment_id": payment.get("id") if payment else None,
                    "payment_date": payment.get("payment_date") if payment else None,
                    "payment_method": (
                        payment.get("payment_method") if payment else None
                    ),
                    "remarks": payment.get("remarks") if payment else None,
                }
            )
        return rows

    def create_payment(self, payload: PaymentCreate) -> dict:
        customer = self.repo.get("customers", payload.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        existing = [
            p
            for p in self.repo.list("payments")
            if p.get("customer_id") == payload.customer_id
            and p.get("month") == payload.month
        ]
        data = payload.model_dump()
        try:
            remaining, status = calculate_payment_status(
                payload.monthly_rent, payload.amount_paid
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        data.update(
            {
                "customer_name": customer.get("name"),
                "room_number": customer.get("room_number"),
                "remaining_amount": remaining,
                "payment_status": status,
                "updated_at": utc_now_iso(),
            }
        )
        if existing:
            data["created_at"] = existing[0].get("created_at")
            return self.repo.set("payments", existing[0]["id"], data)
        data["created_at"] = utc_now_iso()
        return self.repo.create("payments", data)

    def update_payment(self, payment_id: str, payload: PaymentUpdate) -> dict:
        existing = self.repo.get("payments", payment_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Payment not found")
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        merged = {**existing, **data}
        try:
            remaining, status = calculate_payment_status(
                float(merged["monthly_rent"]), float(merged["amount_paid"])
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        data.update(
            {
                "remaining_amount": remaining,
                "payment_status": status,
                "updated_at": utc_now_iso(),
            }
        )
        return self.repo.update("payments", payment_id, data)

    def _attach_customer(
        self, payment: dict, customers: dict[str, dict] | None = None
    ) -> dict:
        if payment.get("customer_name"):
            return payment
        customer = (customers or {}).get(payment.get("customer_id", ""))
        if customer:
            payment["customer_name"] = customer.get("name")
            payment["room_number"] = customer.get("room_number")
        return payment
