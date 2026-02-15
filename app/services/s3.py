import uuid

import boto3
from botocore.config import Config

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_upload(filename: str, content_type: str) -> dict:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Content type {content_type} not allowed. Use JPEG, PNG, or WebP.")

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    object_key = f"uploads/{uuid.uuid4().hex}.{ext}"

    client = _get_s3_client()
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": object_key,
            "ContentType": content_type,
        },
        ExpiresIn=600,  # 10 minutes
    )

    public_url = f"{settings.S3_PUBLIC_URL}/{object_key}" if settings.S3_PUBLIC_URL else url.split("?")[0]

    return {
        "upload_url": url,
        "object_key": object_key,
        "public_url": public_url,
    }
