from uuid import uuid4

from fastapi import UploadFile

from app.core.firebase import get_storage_bucket


class StorageService:
    allowed_content_types = {"image/jpeg", "image/png", "image/webp"}

    def upload_customer_photo(self, customer_id: str, file: UploadFile | None) -> str | None:
        if not file or not file.filename:
            return None
        if file.content_type not in self.allowed_content_types:
            raise ValueError("Only JPG, PNG, and WEBP profile photos are allowed")

        bucket = get_storage_bucket()
        if bucket is None:
            raise ValueError("Firebase Storage bucket is not configured")

        extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
        path = f"customers/{customer_id}/profile-photo-{uuid4().hex}.{extension}"
        blob = bucket.blob(path)
        blob.upload_from_file(file.file, content_type=file.content_type)
        blob.make_public()
        return blob.public_url
