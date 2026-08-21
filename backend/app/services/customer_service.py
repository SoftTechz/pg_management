from fastapi import HTTPException

from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.repository import FirestoreRepository
from app.utils.dates import utc_now_iso


class CustomerService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()

    def list_customers(self, search: str | None = None, status: str | None = None) -> list[dict]:
        customers = self.repo.list("customers")
        if status:
            customers = [c for c in customers if c.get("status") == status]
        if search:
            term = search.lower()
            customers = [
                c for c in customers
                if term in str(c.get("name", "")).lower()
                or term in str(c.get("mobile_number", "")).lower()
                or term in str(c.get("room_number", "")).lower()
            ]
        return sorted(customers, key=lambda c: c.get("name", ""))

    def get_customer(self, customer_id: str) -> dict:
        customer = self.repo.get("customers", customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer

    def create_customer(self, payload: CustomerCreate) -> dict:
        now = utc_now_iso()
        data = payload.model_dump()
        data.update({"created_at": now, "updated_at": now})
        return self.repo.create("customers", data)

    def update_customer(self, customer_id: str, payload: CustomerUpdate) -> dict:
        self.get_customer(customer_id)
        data = {k: v for k, v in payload.model_dump().items() if v is not None}
        data["updated_at"] = utc_now_iso()
        updated = self.repo.update("customers", customer_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Customer not found")
        return updated

    def delete_customer(self, customer_id: str) -> None:
        self.get_customer(customer_id)
        self.repo.delete("customers", customer_id)
