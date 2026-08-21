from app.services.payment_service import PaymentService
from app.services.repository import FirestoreRepository
from app.services.room_service import RoomService
from app.utils.dates import month_key


class ReportService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()
        self.payments = PaymentService(self.repo)
        self.rooms = RoomService(self.repo)

    def customers(self, status: str | None = None) -> list[dict]:
        rows = self.repo.list("customers")
        if status:
            rows = [r for r in rows if r.get("status") == status]
        return rows

    def monthly_rent(self, month: str, status: str | None = None) -> list[dict]:
        rows = self.payments.get_monthly_rows(month)
        if status:
            rows = [row for row in rows if row.get("payment_status") == status]
        return rows

    def outstanding(self, month: str) -> list[dict]:
        return [
            r
            for r in self.payments.get_monthly_rows(month)
            if r["remaining_amount"] > 0
        ]

    def occupancy(self) -> list[dict]:
        return self.rooms.list_rooms(include_occupants=False)

    def payment_history(self, customer_id: str | None = None) -> list[dict]:
        rows = self.payments.list_payments(customer_id=customer_id)
        if customer_id:
            current_month = month_key()
            if not any(row.get("month") == current_month for row in rows):
                rows.extend(
                    row
                    for row in self.payments.get_monthly_rows(current_month)
                    if row.get("customer_id") == customer_id
                )
        return rows
