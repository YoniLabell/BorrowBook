from fastapi import APIRouter

from app.api.v1 import (
    auth,
    blocks,
    book_detect,
    chat,
    discovery,
    listings,
    notifications,
    ratings,
    reports,
    requests as requests_router,
    transactions,
    uploads,
    users,
)

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(listings.router, prefix="/listings", tags=["listings"])
router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
router.include_router(discovery.router, prefix="/discovery", tags=["discovery"])
router.include_router(requests_router.router, prefix="/requests", tags=["requests"])
router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(ratings.router, prefix="/ratings", tags=["ratings"])
router.include_router(blocks.router, prefix="/blocks", tags=["blocks"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(book_detect.router, prefix="/books", tags=["book-detection"])
