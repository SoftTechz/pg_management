from fastapi import APIRouter
from app.api.v1 import allocations, auth, rooms, dashboard, reports

# items, invoices, dashboard

router = APIRouter()

# Include all routers
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
router.include_router(
    allocations.router, prefix="/allocations", tags=["allocations"]
)
router.include_router(reports.router, prefix="/reports", tags=["reports"])
# router.include_router(items.router, prefix="/items", tags=["items"])
# router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
