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


def initialize_firebase() -> None:
    if firebase_admin._apps:
        return

    options: dict[str, str] = {}
    credential_path = settings.resolved_firebase_credentials_path
    service_account = _load_service_account(credential_path)
    storage_bucket = settings.firebase_storage_bucket

    if not storage_bucket and service_account and service_account.get("project_id"):
        storage_bucket = f"{service_account['project_id']}.firebasestorage.app"

    if storage_bucket:
        options["storageBucket"] = storage_bucket

    if settings.firebase_credentials_json:
        try:
            service_account = json.loads(settings.firebase_credentials_json)
        except json.JSONDecodeError as error:
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not valid JSON") from error
        if service_account.get("type") != "service_account":
            raise RuntimeError("FIREBASE_CREDENTIALS_JSON is not a service account")
        if not settings.firebase_storage_bucket and service_account.get("project_id"):
            options.setdefault(
                "storageBucket", f"{service_account['project_id']}.firebasestorage.app"
            )
        cert = credentials.Certificate(service_account)
        firebase_admin.initialize_app(cert, options)
        return

    if credential_path:
        cert = credentials.Certificate(credential_path)
        firebase_admin.initialize_app(cert, options)
        return

    if service_account:
        firebase_admin.initialize_app(credentials.Certificate(service_account), options)
        return

    raise RuntimeError(
        "Firebase credentials are not configured. Set FIREBASE_CREDENTIALS_PATH or "
        "FIREBASE_CREDENTIALS_JSON, or place a service-account JSON under app/core."
    )


def get_firestore_client():
    initialize_firebase()
    return firestore.client()


def get_storage_bucket():
    initialize_firebase()
    return storage.bucket()
