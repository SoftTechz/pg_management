from pydantic import BaseModel


class DashboardSummary(BaseModel):
    month: str
    month_label: str
    rent_due_date: str
    is_due_or_overdue: bool
    total_rooms: int
    total_customers: int
    total_beds: int
    occupied_beds: int
    available_beds: int
    expected_monthly_rent: float
    collected_monthly_rent: float
    pending_monthly_rent: float
    paid_customers: int
    partial_customers: int
    unpaid_customers: int
    overdue_customers: list[dict]
