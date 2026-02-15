"""OCR service using OCR.Space free-tier API (no system deps needed on Render)."""

import httpx

from app.core.config import settings

OCR_SPACE_URL = "https://api.ocr.space/parse/imageurl"


async def extract_text_from_url(image_url: str) -> str | None:
    """Send an image URL to OCR.Space and return extracted text."""
    api_key = settings.OCR_SPACE_API_KEY or "helloworld"  # free-tier test key

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                OCR_SPACE_URL,
                data={
                    "url": image_url,
                    "apikey": api_key,
                    "language": "eng",
                    "isOverlayRequired": "false",
                    "OCREngine": "2",
                },
            )
            resp.raise_for_status()
            data = resp.json()

            if data.get("IsErroredOnProcessing"):
                return None

            results = data.get("ParsedResults", [])
            if results:
                return results[0].get("ParsedText", "").strip()
        except Exception:
            return None

    return None
