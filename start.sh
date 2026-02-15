#!/bin/sh

# Prefer internal URL (Render paid), fall back to external
DB_URL="${DATABASE_INTERNAL_URL:-$DATABASE_URL}"

start_server() {
    echo "==> Starting server on port ${PORT:-8000}..."
    exec gunicorn app.main:app \
        -w 2 \
        -k uvicorn.workers.UvicornWorker \
        --bind "0.0.0.0:${PORT:-8000}" \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
}

# ── If DATABASE_URL is empty, start without DB ──────────────────────
if [ -z "$DB_URL" ]; then
    echo "============================================================"
    echo "WARNING: DATABASE_URL is not set."
    echo ""
    echo "This is expected on the FIRST Render Blueprint deploy —"
    echo "the database is still provisioning."
    echo ""
    echo "NEXT STEP: Once the database shows 'Available' in the Render"
    echo "dashboard, click 'Manual Deploy' on this web service."
    echo "============================================================"
    echo ""
    echo "==> Starting server WITHOUT database (health check will pass)..."
    start_server
fi

# ── DATABASE_URL is set — wait for the DB to accept connections ─────
echo "==> Waiting for database to accept connections..."
MAX_RETRIES=10
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if python -c "
import sys, os

url = os.environ.get('DATABASE_INTERNAL_URL', '').strip() or os.environ.get('DATABASE_URL', '').strip()

# Sanitized display
try:
    from urllib.parse import urlparse
    p = urlparse(url)
    print(f'Trying {p.scheme}://{p.username}:***@{p.hostname}:{p.port}{p.path}')
except Exception:
    pass

# Normalize for psycopg2
if url.startswith('postgres://'):
    url = url.replace('postgres://', 'postgresql://', 1)
elif url.startswith('postgresql+asyncpg://'):
    url = url.replace('postgresql+asyncpg://', 'postgresql://', 1)

import psycopg2
conn = psycopg2.connect(url, connect_timeout=5)
conn.close()
" 2>&1; then
        echo "==> Database is ready"
        break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
        echo "==> WARNING: Could not connect to DB after $MAX_RETRIES attempts."
        echo "==> Starting server WITHOUT migrations — DB endpoints will error."
        echo "==> Fix the connection and trigger a manual deploy."
        start_server
    fi
    WAIT=$((RETRY * 2))
    echo "==> Retry $RETRY/$MAX_RETRIES in ${WAIT}s..."
    sleep $WAIT
done

echo "==> Running migrations..."
alembic upgrade head

start_server
