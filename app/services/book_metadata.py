"""Book metadata lookup using Open Library API (no auth needed)."""

import re

import httpx

from app.schemas.book_detect import BookCandidate, BookDetectionResult
from app.services.ocr import extract_text_from_url

OPEN_LIBRARY_ISBN = "https://openlibrary.org/isbn/{isbn}.json"
OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"

# Simple ISBN regex (10 or 13 digits, possibly with hyphens)
ISBN_PATTERN = re.compile(r"\b(?:\d[- ]?){9}[\dXx]\b|\b(?:\d[- ]?){13}\b")


def _clean_isbn(raw: str) -> str:
    return re.sub(r"[- ]", "", raw)


async def _fetch_by_isbn(isbn: str) -> BookCandidate | None:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(OPEN_LIBRARY_ISBN.format(isbn=isbn), follow_redirects=True)
            if resp.status_code != 200:
                return None
            data = resp.json()
            title = data.get("title", "")
            authors_keys = data.get("authors", [])
            author = ""
            if authors_keys:
                # Fetch first author name
                akey = authors_keys[0].get("key", "")
                if akey:
                    ar = await client.get(f"https://openlibrary.org{akey}.json", follow_redirects=True)
                    if ar.status_code == 200:
                        author = ar.json().get("name", "")
            return BookCandidate(
                title=title,
                author=author,
                isbn=isbn,
                publisher=", ".join(data.get("publishers", [])) or None,
                year=str(data.get("publish_date", "")) or None,
            )
        except Exception:
            return None


async def _search_open_library(query: str) -> list[BookCandidate]:
    candidates = []
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                OPEN_LIBRARY_SEARCH,
                params={"q": query, "limit": 5, "fields": "title,author_name,isbn,publisher,first_publish_year,cover_i"},
            )
            if resp.status_code != 200:
                return []
            data = resp.json()
            for doc in data.get("docs", [])[:5]:
                isbns = doc.get("isbn", [])
                cover_id = doc.get("cover_i")
                candidates.append(BookCandidate(
                    title=doc.get("title", ""),
                    author=", ".join(doc.get("author_name", [])[:2]),
                    isbn=isbns[0] if isbns else None,
                    publisher=", ".join(doc.get("publisher", [])[:1]) or None,
                    year=str(doc.get("first_publish_year", "")) or None,
                    cover_url=f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
                ))
        except Exception:
            pass
    return candidates


def _extract_title_author_from_text(text: str) -> tuple[str, str]:
    """Best-effort extraction of title and author from OCR text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    title = lines[0] if lines else ""
    author = ""
    # Heuristic: look for a line with "by" or the second prominent line
    for line in lines[1:]:
        lower = line.lower()
        if lower.startswith("by "):
            author = line[3:].strip()
            break
        # Check for common author-like patterns
        if len(line) > 3 and not any(kw in lower for kw in ["edition", "isbn", "copyright", "published"]):
            author = line
            break
    return title, author


async def detect_book_from_image(image_url: str) -> BookDetectionResult:
    """Full pipeline: OCR -> ISBN detect -> Open Library lookup."""
    result = BookDetectionResult()

    # Step 1: OCR
    ocr_text = await extract_text_from_url(image_url)
    if not ocr_text:
        return result
    result.ocr_text = ocr_text

    # Step 2: Try to find ISBN in OCR text
    isbn_matches = ISBN_PATTERN.findall(ocr_text)
    if isbn_matches:
        isbn = _clean_isbn(isbn_matches[0])
        result.detected_isbn = isbn
        candidate = await _fetch_by_isbn(isbn)
        if candidate:
            result.detected_title = candidate.title
            result.detected_author = candidate.author
            result.confidence = "high"
            result.candidates = [candidate]
            return result

    # Step 3: Extract title/author from OCR text and search
    title, author = _extract_title_author_from_text(ocr_text)
    result.detected_title = title
    result.detected_author = author

    query = f"{title} {author}".strip()
    if query:
        candidates = await _search_open_library(query)
        result.candidates = candidates
        if candidates:
            result.confidence = "medium"
            # Use top candidate as detected
            result.detected_title = candidates[0].title or title
            result.detected_author = candidates[0].author or author
            result.detected_isbn = candidates[0].isbn
        else:
            result.confidence = "low"

    return result
