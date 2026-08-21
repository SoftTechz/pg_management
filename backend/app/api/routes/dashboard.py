from fastapi import APIRouter

from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter()


@router.get("", response_model=DashboardSummary)
def dashboard(month: str | None = None) -> dict:
    return DashboardService().summary(month=month)
