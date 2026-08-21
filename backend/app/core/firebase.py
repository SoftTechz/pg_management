import json

import firebase_admin
from firebase_admin import credentials, firestore, storage

from app.core.config import settings


def _load_service_account(path: str | None) -> dict | None:
    if not path:
        return None
    try:
        with open(path, encoding="utf-8") as service_file:
            service_account = json.load(service_file)
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(
            f"Unable to load Firebase credentials from {path}: {error}"
        ) from error

    if service_account.get("type") != "service_account":
        raise RuntimeError(
            f"Firebase credentials at {path} are not a service account file"
        )
    return service_account


# ---------------------------------------------------------------------------
# Production Firebase initialization
# ---------------------------------------------------------------------------
def initialize_firebase_production() -> None:
    """Initialize Firebase with credentials supplied through environment variables."""
    if firebase_admin._apps:
        return

    service_account = None
    if settings.firebase_credentials_json:
        try:
            service_account = json.loads(settings.firebase_credentials_json)
        except json.JSONDecodeError as error:
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not valid JSON") from error
        if service_account.get("type") != "service_account":
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not a service account")
    elif settings.firebase_credentials_path:
        service_account = _load_service_account(
            settings.resolved_firebase_credentials_path
        )

    if not service_account:
        raise RuntimeError(
            "Firebase credentials are not configured. Set FIREBASE_CREDENTIALS_JSON "
            "or FIREBASE_CREDENTIALS_PATH for the deployed environment."
        )

    options: dict[str, str] = {}
    storage_bucket = settings.firebase_storage_bucket
    if not storage_bucket and service_account.get("project_id"):
        storage_bucket = f"{service_account['project_id']}.firebasestorage.app"
    if storage_bucket:
        options["storageBucket"] = storage_bucket

    firebase_admin.initialize_app(credentials.Certificate(service_account), options)


# ---------------------------------------------------------------------------
# Local test Firebase initialization
# ---------------------------------------------------------------------------
# Keep this function commented out until local Firebase testing is enabled.
# def initialize_firebase_test() -> None:
#     """Initialize Firebase from the local service-account JSON file."""
#     if firebase_admin._apps:
#         return
#
#     credential_path = settings.resolved_firebase_credentials_path
#     service_account = _load_service_account(credential_path)
#     if not service_account:
#         raise RuntimeError(
#             "Local Firebase credentials were not found under backend/app/core."
#         )
#
#     storage_bucket = settings.firebase_storage_bucket
#     if not storage_bucket and service_account.get("project_id"):
#         storage_bucket = f"{service_account['project_id']}.firebasestorage.app"
#     options = {"storageBucket": storage_bucket} if storage_bucket else {}
#     firebase_admin.initialize_app(credentials.Certificate(service_account), options)


def initialize_firebase() -> None:
    """Use the production initializer for deployed and current runtime access."""
    initialize_firebase_production()


def get_firestore_client():
    initialize_firebase()
    return firestore.client()


def get_storage_bucket():
    initialize_firebase()
    return storage.bucket()
