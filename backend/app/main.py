from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import allocations, auth, customers, dashboard, payments, registrations, reports, rooms, settings
from app.core.config import settings as app_settings


def create_app() -> FastAPI:
    app = FastAPI(title=app_settings.app_name, version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
    app.include_router(registrations.router, prefix="/api/registrations", tags=["registrations"])
    app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
    app.include_router(allocations.router, prefix="/api/allocations", tags=["allocations"])
    app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
    app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
    app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
    app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
