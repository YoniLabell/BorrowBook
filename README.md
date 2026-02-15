# BorrowBook

Location-based book lending & selling social app.

## Features

- **User accounts** with JWT auth (access + refresh tokens)
- **Book listings** (LEND or SELL) with images, conditions, and metadata
- **Near-me discovery** with radius search using Haversine distance
- **Book detection** from cover photos (OCR + Open Library lookup)
- **Request workflow**: request → accept/decline → transaction state machine
- **In-app chat** per transaction (polling-based)
- **Notifications** (in-app, stored in DB)
- **Ratings** after completed transactions
- **Block & report** users
- **Privacy**: approximate location only by default

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Query
- **Storage**: S3-compatible (AWS S3 / Cloudflare R2) via presigned URLs
- **OCR**: OCR.Space free-tier API (no system deps)
- **Book metadata**: Open Library API (no auth needed)
- **Deploy**: Render (Blueprint)

## Local Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend)

### Quick Start

```bash
# 1. Clone and copy env
cp .env.example .env

# 2. Start backend + database
docker compose up --build

# 3. Backend is now at http://localhost:8000
#    API docs at http://localhost:8000/docs

# 4. Start frontend (in another terminal)
cd frontend
npm install
npm run dev
# Frontend at http://localhost:5173
```

### Without Docker

```bash
# Start PostgreSQL locally, then:
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Deploy to Render

### Blueprint Deploy (Recommended)

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/) → **Blueprints** → **New Blueprint Instance**
3. Connect this repo and select `render.yaml`
4. Render will create:
   - `borrowbook-db` — PostgreSQL database
   - `borrowbook-api` — Web service (FastAPI)
5. After deploy, set these env vars on the web service:
   - `S3_ENDPOINT_URL` — Your S3/R2 endpoint
   - `S3_ACCESS_KEY_ID` — Access key
   - `S3_SECRET_ACCESS_KEY` — Secret key
   - `S3_BUCKET_NAME` — Bucket name
   - `S3_PUBLIC_URL` — Public URL for the bucket
   - `OCR_SPACE_API_KEY` — (Optional) OCR.Space API key
   - `CORS_ORIGINS` — Your frontend domain

### Manual Deploy

```bash
# Render uses the Dockerfile:
# - Runs alembic upgrade head on start
# - Uses gunicorn + uvicorn workers
# - Listens on $PORT
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/borrowbook` |
| `SECRET_KEY` | JWT signing key | `change-me-in-production` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `S3_ENDPOINT_URL` | S3/R2 endpoint | — |
| `S3_ACCESS_KEY_ID` | S3 access key | — |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | — |
| `S3_BUCKET_NAME` | S3 bucket name | `borrowbook` |
| `S3_PUBLIC_URL` | Public URL prefix for uploads | — |
| `OCR_SPACE_API_KEY` | OCR.Space API key | `helloworld` (free test key) |
| `DEBUG` | Enable debug mode | `false` |

## API Endpoints

All endpoints are under `/api/v1`. Full OpenAPI docs at `/docs`.

### Auth
```
POST /api/v1/auth/register   — Register new user
POST /api/v1/auth/login      — Login
POST /api/v1/auth/refresh    — Refresh tokens
```

### Users
```
GET    /api/v1/users/me       — Get current user
PATCH  /api/v1/users/me       — Update profile
GET    /api/v1/users/{id}     — Get public profile
```

### Listings
```
POST   /api/v1/listings       — Create listing
GET    /api/v1/listings       — My listings
GET    /api/v1/listings/{id}  — Get listing
PATCH  /api/v1/listings/{id}  — Update listing
DELETE /api/v1/listings/{id}  — Delete listing
```

### Discovery
```
GET /api/v1/discovery?q=&radius_km=&lat=&lng=&listing_type=&sort=
```

### Uploads
```
POST /api/v1/uploads/presign  — Get presigned upload URL
```

### Book Detection
```
GET /api/v1/books/detect?image_url=  — Auto-detect book metadata from image
```

### Requests
```
POST /api/v1/requests               — Create request
GET  /api/v1/requests               — List my requests
POST /api/v1/requests/{id}/accept   — Accept request
POST /api/v1/requests/{id}/decline  — Decline request
POST /api/v1/requests/{id}/cancel   — Cancel request
```

### Transactions
```
GET  /api/v1/transactions           — List my transactions
GET  /api/v1/transactions/{id}      — Get transaction
POST /api/v1/transactions/{id}/advance — Advance state machine
     body: { "action": "handover_confirmed" | "returned_confirmed" | "completed" }
```

### Chat
```
GET  /api/v1/chat/conversations                      — List conversations
GET  /api/v1/chat/conversations/{id}/messages         — Get messages
POST /api/v1/chat/conversations/{id}/messages         — Send message
```

### Notifications
```
GET  /api/v1/notifications            — List notifications
POST /api/v1/notifications/{id}/read  — Mark as read
POST /api/v1/notifications/read-all   — Mark all as read
```

### Ratings
```
POST /api/v1/ratings              — Create rating
GET  /api/v1/ratings/user/{id}    — Get user ratings
```

### Blocks & Reports
```
POST   /api/v1/blocks             — Block user
DELETE /api/v1/blocks/{id}        — Unblock user
GET    /api/v1/blocks             — List blocked users
POST   /api/v1/reports            — Report user
```

## Sample curl Calls

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123","display_name":"Alice"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Create listing (use token from login response)
curl -X POST http://localhost:8000/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "listing_type": "LEND",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "condition": "GOOD",
    "max_lend_days": 14,
    "latitude": 40.7128,
    "longitude": -74.0060
  }'

# Discover near me
curl "http://localhost:8000/api/v1/discovery?lat=40.71&lng=-74.01&radius_km=10&sort=distance"

# Detect book from image
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/v1/books/detect?image_url=https://example.com/book.jpg"
```

## Project Structure

```
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   ├── config.py        # Settings (env vars)
│   │   ├── security.py      # JWT + password hashing
│   │   └── deps.py          # Dependency injection
│   ├── db/
│   │   ├── base.py          # SQLAlchemy Base
│   │   └── session.py       # Async session factory
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── api/v1/              # API route handlers
│   ├── services/            # S3, OCR, book detection
│   └── tests/               # Tests
├── alembic/                 # Database migrations
├── frontend/                # React + Vite + Tailwind
├── docker-compose.yml       # Local dev
├── Dockerfile               # Production build
├── render.yaml              # Render Blueprint
├── requirements.txt         # Python dependencies
└── .env.example             # Environment template
```

## TODO (Enhancements)

- [ ] WebSocket chat (replace polling)
- [ ] Push notifications
- [ ] Image moderation (NSFW detection)
- [ ] Admin panel
- [ ] Full-text search with PostgreSQL tsvector
- [ ] PostGIS for spatial queries
- [ ] Email verification
- [ ] Password reset flow
- [ ] Rate limiting with Redis
- [ ] Celery background tasks for due-date reminders
- [ ] Frontend image upload with presigned URLs
- [ ] User avatar upload
- [ ] Multiple image gallery on listing detail
