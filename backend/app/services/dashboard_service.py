from datetime import date

from app.services.payment_service import PaymentService
from app.services.repository import FirestoreRepository
from app.utils.dates import due_date_for_month, is_due_or_overdue, month_key, month_label


class DashboardService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()
        self.payments = PaymentService(self.repo)

    def summary(self, month: str | None = None, today: date | None = None) -> dict:
        target_month = month or month_key(today)
        customers = self.repo.list("customers")
        active_customers = [c for c in customers if c.get("status") == "Active"]
        rooms = self.repo.list("rooms")
        payment_rows = self.payments.get_monthly_rows(target_month)

        expected = sum(float(row["monthly_rent"]) for row in payment_rows)
        collected = sum(float(row["amount_paid"]) for row in payment_rows)
        pending = sum(float(row["remaining_amount"]) for row in payment_rows)
        due = is_due_or_overdue(target_month, today)
        overdue = [
            row for row in payment_rows
            if due and row["payment_status"] in {"Unpaid", "Partially Paid"}
        ]

        return {
            "month": target_month,
            "month_label": month_label(target_month),
            "rent_due_date": due_date_for_month(target_month).isoformat(),
            "is_due_or_overdue": due,
            "total_rooms": len(rooms),
            "total_customers": len(active_customers),
            "total_beds": sum(int(r.get("total_beds", 0)) for r in rooms),
            "occupied_beds": sum(int(r.get("occupied_beds", 0)) for r in rooms),
            "available_beds": sum(int(r.get("available_beds", 0)) for r in rooms),
            "expected_monthly_rent": expected,
            "collected_monthly_rent": collected,
            "pending_monthly_rent": pending,
            "paid_customers": len([r for r in payment_rows if r["payment_status"] == "Paid"]),
            "partial_customers": len([r for r in payment_rows if r["payment_status"] == "Partially Paid"]),
            "unpaid_customers": len([r for r in payment_rows if r["payment_status"] == "Unpaid"]),
            "overdue_customers": overdue,
        }
