from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api.routes import (
    allocations,
    auth,
    customers,
    dashboard,
    payments,
    registrations,
    reports,
    rooms,
    settings,
)
from app.api.routes import pgs
from app.core.config import settings as app_settings
from app.core.pg_context import DEFAULT_PG_ID, set_current_pg_id


class PGContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        set_current_pg_id(request.headers.get("X-PG-ID") or DEFAULT_PG_ID)
        return await call_next(request)


def create_app() -> FastAPI:
    app = FastAPI(title=app_settings.app_name, version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(PGContextMiddleware)

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
    app.include_router(
        registrations.router, prefix="/api/registrations", tags=["registrations"]
    )
    app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
    app.include_router(
        allocations.router, prefix="/api/allocations", tags=["allocations"]
    )
    app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
    app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
    app.include_router(pgs.router, prefix="/api/pgs", tags=["pgs"])

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
